// Client-safe plans service - uses Edge Functions for Supabase data
import { edgeFunctions } from './edgeFunctionService';
import axios from 'axios';

// Use public API endpoint for plans (config route removed)
const LOCAL_PLANS_API = '/api/public/plans';

// Helper function to get flag emoji from country code
const getFlagEmoji = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return '🌍';
  
  // Handle special cases like PT-MA, multi-region codes, etc.
  if (countryCode.includes('-') || countryCode.length > 2) {
    return '🌍';
  }
  
  try {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt());
    
    return String.fromCodePoint(...codePoints);
  } catch (error) {
    console.warn('Invalid country code: ' + countryCode, error);
    return '🌍';
  }
};

// Get all plans from Supabase (only enabled plans)
// Uses our local API endpoint that applies discount from config
export const getAllPlans = async () => {
  try {
    console.log('📦 Fetching plans from Supabase API:', LOCAL_PLANS_API);
    const response = await axios.get(LOCAL_PLANS_API);
    
    if (response.data.success) {
      const plans = response.data.data.plans;
      const source = response.data.data.source || 'supabase';
      console.log(`✅ Loaded ${plans.length} plans from ${source}`);
      return plans;
    } else {
      throw new Error('Failed to fetch plans from API');
    }
  } catch (error) {
    console.error('❌ Error getting plans from API:', error);
    throw error;
  }
};

// Get all countries - NOW USES EDGE FUNCTION
export const getAllCountries = async () => {
  try {
    console.log('🌍 Fetching countries from Edge Function');
    const response = await edgeFunctions.getCountries();
    
    if (response.success && response.data) {
      const countries = response.data.countries || [];
      console.log(`✅ Loaded ${countries.length} countries from Edge Function`);
      return countries;
    } else {
      throw new Error('Failed to fetch countries from Edge Function');
    }
  } catch (error) {
    console.error('❌ Error getting countries from Edge Function:', error);
    throw error;
  }
};

// Get countries with pricing (from esim_packages only via public API)
export const getCountriesWithPricing = async () => {
  try {
    console.log('🌍 Fetching countries from API (esim_packages only)...');
    const response = await axios.get(`/api/public/countries?t=${Date.now()}`, {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });
    if (response.data?.success && response.data?.data?.countries) {
      const data = response.data.data;
      const countries = data.countries;
      const labels = data.labels || null;
      const discountPercentage = data.discountPercentage ?? 0;
      console.log(`✅ Loaded ${countries.length} countries (esim_packages only)`);
      const mapped = countries.map((c) => ({
        ...c,
        flagEmoji: c.flagEmoji || getFlagEmoji(c.code),
        plans: c.plans || [],
      }));
      return { countries: mapped, labels, discountPercentage };
    }
    return { countries: [], labels: null };
  } catch (error) {
    console.error('❌ Error getting countries with pricing:', error);
    throw error;
  }
};

// Export all functions
export default {
  getAllPlans,
  getAllCountries,
  getCountriesWithPricing
};

