import { CACHED_COUNTRIES, getFlagEmoji } from '../data/cachedCountries';
import { getAllCountries } from './plansServiceClient';
import { translateCountryName } from '../utils/countryUtils';

class SmartCountryService {
  constructor() {
    this.fullCountriesCache = null;
    this.isLoadingFullCountries = false;
    this.loadingPromise = null;
  }

  /**
   * Get countries immediately - returns cached popular countries first
   * @returns {Array} Array of popular countries
   */
  getImmediateCountries() {
    return CACHED_COUNTRIES;
  }

  /**
   * Search countries - loads full list if needed
   * Supports searching in multiple languages (English, Russian, etc.)
   * @param {string} searchTerm - Search term to filter countries
   * @param {string} locale - Locale for translations (default: 'en')
   * @returns {Promise<Array>} Filtered countries
   */
  async searchCountries(searchTerm = '', locale = 'en') {
    // If no search term, return cached countries
    if (!searchTerm.trim()) {
      return this.getImmediateCountries();
    }

    // Load full countries if not already loaded
    await this.ensureFullCountriesLoaded();

    // Filter countries based on search term
    const allCountries = this.fullCountriesCache || CACHED_COUNTRIES;
    const searchLower = searchTerm.toLowerCase().trim();
    
    const filtered = allCountries.filter(country => {
      const namesToCheck = [
        country.name,
        country.country_name,
        country.country_name_ru,
        country.name_ru,
        country.country_name_he,
        country.name_he,
        country.country_name_ar,
        country.name_ar,
      ].filter(Boolean);

      for (const n of namesToCheck) {
        if (typeof n === 'string' && n.toLowerCase().includes(searchLower)) {
          return true;
        }
      }

      if (country.code && country.code.toLowerCase().includes(searchLower)) {
        return true;
      }

      return false;
    });

    return filtered;
  }

  /**
   * Get all countries - loads full list from API
   * @returns {Promise<Array>} All countries
   */
  async getAllCountries() {
    await this.ensureFullCountriesLoaded();
    return this.fullCountriesCache || CACHED_COUNTRIES;
  }

  /**
   * Ensure full countries are loaded from API
   * @returns {Promise<void>}
   */
  async ensureFullCountriesLoaded() {
    // If already loaded, return immediately
    if (this.fullCountriesCache) {
      return;
    }

    // If already loading, wait for existing promise
    if (this.isLoadingFullCountries && this.loadingPromise) {
      return this.loadingPromise;
    }

    // Start loading
    this.isLoadingFullCountries = true;
    this.loadingPromise = this.loadFullCountries();
    
    try {
      await this.loadingPromise;
    } finally {
      this.isLoadingFullCountries = false;
      this.loadingPromise = null;
    }
  }

  /**
   * Load full countries from API
   * @returns {Promise<void>}
   */
  async loadFullCountries() {
    try {
      const countries = await getAllCountries();

      // Add flag emojis to countries that don't have them
      const countriesWithEmojis = countries.map(country => ({
        ...country,
        flagEmoji: country.flagEmoji || getFlagEmoji(country.code)
      }));

      this.fullCountriesCache = countriesWithEmojis;
    } catch (error) {
      console.error('❌ Failed to load full countries, using cached:', error);
      // Fallback to cached countries if API fails
      this.fullCountriesCache = CACHED_COUNTRIES;
    }
  }

  /**
   * Preload full countries in background (optional)
   * Call this to start loading countries without waiting
   */
  preloadCountries() {
    if (!this.fullCountriesCache && !this.isLoadingFullCountries) {
      this.ensureFullCountriesLoaded().catch(() => {});
    }
  }

  /**
   * Clear cache (for testing or refresh)
   */
  clearCache() {
    this.fullCountriesCache = null;
    this.isLoadingFullCountries = false;
    this.loadingPromise = null;
  }

  /**
   * Get cache status
   * @returns {Object} Cache status info
   */
  getCacheStatus() {
    return {
      hasCachedCountries: CACHED_COUNTRIES.length > 0,
      hasFullCountries: !!this.fullCountriesCache,
      isLoading: this.isLoadingFullCountries,
      cachedCount: CACHED_COUNTRIES.length,
      fullCount: this.fullCountriesCache?.length || 0
    };
  }
}

// Export singleton instance
const smartCountryService = new SmartCountryService();
export default smartCountryService;
