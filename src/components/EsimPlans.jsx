'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
// import { getCountriesWithPricing } from '../services/plansService'; // Removed - causes client-side issues
// import { getRegularSettings } from '../services/settingsService'; // Removed - causes client-side issues
import { useI18n } from '../contexts/I18nContext';
import { useBrand } from '../contexts/BrandContext';
import { formatPriceFromItem, getDisplayAmountFromItem, formatPrice } from '../services/currencyService';
import toast from 'react-hot-toast';
import { detectPlatform, shouldRedirectToDownload, isMobileDevice } from '../utils/platformDetection';
import { getMobileCountries } from '../data/mobileCountries';
import { getLanguageDirection, detectLanguageFromPath } from '../utils/languageUtils';
import { translateCountries, translateCountryName } from '../utils/countryUtils';
import { translateRegionName, getHumanFriendlyPlanName, getPlanDisplayTitle, translateDescriptionToRussian } from '../utils/planTranslations';
import smartCountryService from '../services/smartCountryService';
import { formatDataAndDays } from '../utils/languageUtils';

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

// Country name aliases for better search
const countryAliases = {
  'United States': ['USA', 'US', 'America', 'United States of America'],
  'United Kingdom': ['UK', 'Britain', 'Great Britain', 'England'],
  'United Arab Emirates': ['UAE', 'Emirates'],
  'South Korea': ['Korea', 'ROK', 'Republic of Korea'],
  'Czech Republic': ['Czechia'],
  'Netherlands': ['Holland'],
  'Switzerland': ['Swiss'],
  'New Zealand': ['NZ'],
  'South Africa': ['RSA'],
  'Dominican Republic': ['DR'],
  'Costa Rica': ['CR']
};

// Helper function to check if search term matches country name or aliases
const matchesCountrySearch = (countryName, searchTerm) => {
  const lowerSearch = searchTerm.toLowerCase();
  const lowerCountry = countryName.toLowerCase();

  // Direct name match
  if (lowerCountry.includes(lowerSearch)) {
    return true;
  }

  // Check aliases
  const aliases = countryAliases[countryName] || [];
  return aliases.some(alias => alias.toLowerCase().includes(lowerSearch) || lowerSearch.includes(alias.toLowerCase()));
};

const STORE_MAP_SVG_URL = '/images/frontend/home/361053945_fb50482a-76fc-47ca-82b4-9fd33e920ad6.svg';

// Match mobile app region card images (Supabase Storage)
const SUPABASE_REGION_IMAGE_BASE_URL =
  'https://kfawcvdjsqrcquknwgac.supabase.co/storage/v1/object/public/region_image';

const REGION_IMAGE_FILES = {
  'global-172': 'global-172.avif',
  'global-143': 'global-143.avif',
  europe: 'europe.avif',
  'europe-uk': 'europe-uk.avif',
  asia: 'asia.avif',
  africa: 'africa.avif',
  caribbean: 'caribbean.avif',
  'latin-america': 'latin-america.avif',
  'north-america': 'latin-america.avif', // Use Latin America image as replacement for missing North America image
  oceania: 'oceania.avif',
  'middle-east': 'middle-east.avif',
  cis: 'cis.avif',
};

const getRegionImageUrlBySlug = (slug) => {
  if (!slug) return null;
  
  // Try exact match first
  let filename = REGION_IMAGE_FILES[slug];
  if (filename) {
    return `${SUPABASE_REGION_IMAGE_BASE_URL}/${filename}`;
  }
  
  // Fallback: try variations for America
  if (slug.includes('america') || slug.includes('americas')) {
    // Try north-america first
    filename = REGION_IMAGE_FILES['north-america'];
    if (filename) {
      return `${SUPABASE_REGION_IMAGE_BASE_URL}/${filename}`;
    }
    // If north-america doesn't exist, try latin-america as fallback
    filename = REGION_IMAGE_FILES['latin-america'];
    if (filename) {
      return `${SUPABASE_REGION_IMAGE_BASE_URL}/${filename}`;
    }
  }
  
  // Fallback: "Other" might be Oceania
  if (slug.toLowerCase() === 'other') {
    filename = REGION_IMAGE_FILES['oceania'];
    if (filename) {
      return `${SUPABASE_REGION_IMAGE_BASE_URL}/${filename}`;
    }
  }
  
  // Fallback: try lowercase version
  const lowerSlug = slug.toLowerCase();
  filename = REGION_IMAGE_FILES[lowerSlug];
  if (filename) {
    return `${SUPABASE_REGION_IMAGE_BASE_URL}/${filename}`;
  }
  
  return null;
};

const normalizeRegionKeyToSlug = (regionKey) => {
  const key = (regionKey || '').toString().trim().toLowerCase();
  if (!key) return null;
  if (key.includes('europe') && key.includes('uk')) return 'europe-uk';
  // Handle America variations - try multiple patterns
  if (key === 'americas' || key === 'north america' || key === 'america' || 
      key.includes('north america') || key.includes('north-america')) {
    return 'north-america';
  }
  return key.replace(/\s+/g, '-');
};

const extractCountryCodesFromPlan = (plan) => {
  const codes = plan?.country_codes || plan?.countries || [];
  if (!Array.isArray(codes)) return [];

  // Some APIs return nested arrays; normalize.
  return codes.flatMap((c) => (Array.isArray(c) ? c : [c])).filter(Boolean);
};

// Parse plan data to MB (1GB = 1024, 5GB = 5120, etc.)
const getPlanDataMB = (plan) => {
  const d = plan?.data || plan?.dataAmount || '';
  if (typeof d === 'number' && d > 0) return d >= 1024 ? d : d * 1024;
  if (typeof d !== 'string') return 0;
  const gb = d.match(/(\d+(?:\.\d+)?)\s*GB/i);
  if (gb) return Math.round(parseFloat(gb[1]) * 1024);
  const mb = d.match(/(\d+)\s*MB/i);
  if (mb) return parseInt(mb[1], 10);
  return 0;
};

// Get cheapest 1GB plan from list (1GB = 1024 MB, allow small tolerance)
const getCheapest1GBPlan = (plans) => {
  if (!plans?.length) return null;
  const oneGB = plans.filter((p) => {
    const mb = getPlanDataMB(p);
    return mb >= 1024 && mb < 2048;
  });
  if (!oneGB.length) return null;
  oneGB.sort((a, b) => (parseFloat(a.price) || 999) - (parseFloat(b.price) || 999));
  return oneGB[0];
};



const SUPPORTED_LOCALE_CODES = ['en', 'ru', 'he', 'es', 'fr', 'de', 'ar'];

const EsimPlansContent = ({ filterType = 'countries' }) => {
  const { t, locale: contextLocale } = useI18n();
  const searchParams = useSearchParams();
  const urlLanguage = searchParams.get('language');
  const validUrlLocale = urlLanguage && SUPPORTED_LOCALE_CODES.includes(urlLanguage) ? urlLanguage : null;
  const locale = contextLocale ?? validUrlLocale ?? 'en';
  const { defaultCurrency, discountPercentage: brandDiscount } = useBrand();
  const displayCurrency = defaultCurrency || 'USD';

  const { currentUser, userProfile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Determine if this is the dedicated plans page or landing page
  const isPlansPage = pathname === '/esim-plans' || pathname.includes('/esim-plans') ||
    pathname.includes('/ar/esim-plans') || pathname.includes('/he/esim-plans') ||
    pathname.includes('/ru/esim-plans') || pathname.includes('/de/esim-plans') ||
    pathname.includes('/fr/esim-plans') || pathname.includes('/es/esim-plans');

  // Mobile-store design is shown on the main home + plans page (incl. language paths /ru, /he, etc.)
  const isLanguageHome = ['/ru', '/he', '/ar', '/es', '/fr', '/de'].includes(pathname);
  const isStoreLayoutPage = pathname === '/esim-plans' || pathname === '/' || isLanguageHome;
  const isHomePage = pathname === '/' || isLanguageHome;

  // Detect RTL language
  const getCurrentLanguage = () => {
    if (locale) return locale;
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('roamjet-language');
      if (savedLanguage) return savedLanguage;
    }
    return detectLanguageFromPath(pathname);
  };

  const currentLanguage = getCurrentLanguage();
  const isRTL = getLanguageDirection(currentLanguage) === 'rtl';

  // Check if parent already has RTL direction set
  const parentHasRTL = typeof document !== 'undefined' &&
    document.querySelector('[dir="rtl"]') !== null;

  // Get search term from URL params
  const urlSearchTerm = searchParams.get('search') || '';
  const [searchTerm, setSearchTerm] = useState(urlSearchTerm);
  const [countries, setCountries] = useState([]);
  const [filteredCountries, setFilteredCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [platformInfo, setPlatformInfo] = useState(null);

  // Plan selection and checkout state
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Store-like (mobile design) state for dedicated plans page
  const [showAllCountries, setShowAllCountries] = useState(false);
  const [storeGlobalPlans, setStoreGlobalPlans] = useState([]);
  const [storeRegionalPlans, setStoreRegionalPlans] = useState([]);
  const [loadingStoreGlobalPlans, setLoadingStoreGlobalPlans] = useState(false);
  const [loadingStoreRegionalPlans, setLoadingStoreRegionalPlans] = useState(false);

  // Direct plans loading for global/regional filters from MongoDB
  const [directPlans, setDirectPlans] = useState([]);
  const [loadingDirectPlans, setLoadingDirectPlans] = useState(false);

  // Collapsible regions state
  const [expandedRegions, setExpandedRegions] = useState({});

  // Collapsible countries state for grouping
  const [expandedCountries, setExpandedCountries] = useState({});


  // Simplified state - no sorting or grouping
  const [groupByDays, setGroupByDays] = useState(false); // Disable grouping by days

  // Sync search term with URL params
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    if (urlSearch !== searchTerm) {
      setSearchTerm(urlSearch);
    }
  }, [searchParams]);

  // Platform detection and authentication check
  useEffect(() => {
    const detectedPlatform = detectPlatform();
    setPlatformInfo(detectedPlatform);

    // No automatic redirect - users can browse freely
    // They will be prompted to download app when they tap on countries
  }, [currentUser, router]);



  // Fetch countries - ALWAYS use API data for truth
  const { data: countriesData, isLoading: countriesLoading, error: countriesError } = useQuery({
    queryKey: ['countries-with-pricing', locale],
    queryFn: async () => {
      try {
        const { getCountriesWithPricing } = await import('../services/plansServiceClient');
        const result = await getCountriesWithPricing();
        const countriesWithPricing = result.countries ?? (Array.isArray(result) ? result : []);
        const labels = result.labels ?? null;
        const discountPercentage = result.discountPercentage ?? 0;
        const totalCountriesCount = countriesWithPricing.length; // Total from API (including those without packages)

        // For homepage/popular: only show countries with packages
        // For search: show all countries (filter happens later)
        const countriesWithRealPricing = countriesWithPricing.filter(country =>
          country.minPrice < 999 && country.plansCount > 0
        );

        // Sort by minimum price (cheapest first)
        countriesWithRealPricing.sort((a, b) => a.minPrice - b.minPrice);

        // Limit to 8 only for legacy home list; store layout needs the full list for counts/search
        const shouldLimitCountries = !isPlansPage && !isStoreLayoutPage;
        const limitedCountries = shouldLimitCountries ? countriesWithRealPricing.slice(0, 8) : countriesWithRealPricing;

        return { countries: limitedCountries, labels, discountPercentage, totalCountriesCount };
      } catch (error) {
        console.error('API error fetching countries:', error);
        return { countries: [], labels: null, discountPercentage: 0, totalCountriesCount: 0 };
      }
    },
    retry: 1,
    staleTime: 0, // Always refetch so home "from X" matches share page after sync
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchOnMount: 'always', // Fresh prices when opening home
    refetchOnWindowFocus: true, // Refetch when tab gains focus (e.g. after saving discount in config)
  });



  useEffect(() => {
    if (countriesData) {
      const list = countriesData.countries ?? (Array.isArray(countriesData) ? countriesData : []);
      const translatedCountries = translateCountries(list, locale);
      setCountries(translatedCountries);
      setFilteredCountries(translatedCountries);
    } else if (countriesError) {
      setCountries([]);
      setFilteredCountries([]);
    }
  }, [countriesData, countriesError, countriesLoading, locale]);

  // Region labels from DB only (no fallback)
  const regionLabels = countriesData?.labels?.regions ?? null;

  // Search function - searches ALL countries (including those without packages)
  const searchCountries = async (term) => {
    if (!term || term.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      // Fetch ALL countries from API (including those without packages)
      const response = await fetch('/api/public/countries');
      const data = await response.json();
      const allCountries = data?.success ? (data.data?.countries || []) : [];

      // Filter by search term
      const term_lower = term.toLowerCase();
      const filtered = allCountries.filter(country => {
        const name = (country.name || '').toLowerCase();
        const code = (country.code || '').toLowerCase();
        const name_ru = (country.name_ru || '').toLowerCase();
        const name_he = (country.name_he || '').toLowerCase();
        const name_ar = (country.name_ar || '').toLowerCase();

        return name.includes(term_lower) ||
               code.includes(term_lower) ||
               name_ru.includes(term_lower) ||
               name_he.includes(term_lower) ||
               name_ar.includes(term_lower);
      });

      setSearchResults(filtered);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
    setIsSearching(false);
  };

  // Handle search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm) {
        searchCountries(searchTerm);
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 200); // 200ms debounce for faster response

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Format price using brand currency and DB columns (price/price_rub/price_ils or minPrice/minPriceRub/minPriceIls)
  const formatItemPrice = (item) => formatPriceFromItem(item, displayCurrency).formatted;

  // Discount from countries API or brand
  const discountPct = countriesData?.discountPercentage ?? Number(brandDiscount) ?? 0;

  // Render price with original (red strikethrough) + discounted when discount applies
  const renderPriceWithDiscount = (item) => {
    const orig = item.minPriceOriginal ?? item.minPrice;
    const hasDiscount = discountPct > 0 && orig != null && item.minPrice != null && item.minPrice < orig;
    if (hasDiscount) {
      const origItem = { ...item, minPrice: orig, minPriceRub: item.minPriceRubOriginal ?? item.minPriceRub, minPriceIls: item.minPriceIlsOriginal ?? item.minPriceIls };
      return (
        <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-red-500 line-through text-sm">{formatPriceFromItem(origItem, displayCurrency).formatted}</span>
          <span className="font-semibold text-gray-900 dark:text-white">{formatPriceFromItem(item, displayCurrency).formatted}</span>
        </span>
      );
    }
    return formatPriceFromItem(item, displayCurrency).formatted;
  };

  // Render plan price (price, price_rub, price_ils) with discount – original red strikethrough + new price
  const renderPlanPriceWithDiscount = (plan) => {
    const { amount: origAmount, currency } = getDisplayAmountFromItem(plan, displayCurrency);
    const discountedAmount = origAmount > 0 && discountPct > 0
      ? Math.max(0.5, (origAmount * (100 - discountPct)) / 100)
      : origAmount;
    const hasDiscount = discountPct > 0 && discountedAmount < origAmount;
    if (hasDiscount) {
      return (
        <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-red-500 line-through text-sm">{formatPrice(origAmount, currency)}</span>
          <span className="font-semibold text-gray-900 dark:text-white">{formatPrice(discountedAmount, currency)}</span>
        </span>
      );
    }
    return formatItemPrice(plan);
  };

  // Simple filter function with priority countries for plans page
  const filterCountries = (countriesList) => {
    // Priority countries for plans page
    const priorityCountries = [
      'United States', 'USA', 'South Korea', 'Korea', 'Japan',
      'Belgium', 'Spain', 'Canada', 'Portugal', 'Thailand'
    ];

    if (isPlansPage && !searchTerm) {
      // Separate priority countries and others
      const priority = [];
      const others = [];

      countriesList.forEach(country => {
        const isPriority = priorityCountries.some(pc =>
          country.name.toLowerCase().includes(pc.toLowerCase()) ||
          pc.toLowerCase().includes(country.name.toLowerCase())
        );

        if (isPriority) {
          priority.push(country);
        } else {
          others.push(country);
        }
      });

      // Return priority countries first, then others
      return [...priority, ...others];
    }

    return [...countriesList]; // Return countries as-is for other cases
  };


  // Filter countries based on search term and plan type
  useEffect(() => {
    // Don't override if a country is selected (bottom sheet is open)
    if (selectedCountry && showCheckoutModal) {
      return;
    }

    let countriesToFilter = searchTerm ? searchResults : countries;
    let filtered = filterCountries(countriesToFilter);

    // Apply type-based filtering
    if (filterType && filterType !== 'countries') {
      // For global and regional, we might want to show different countries
      // or modify the behavior - for now, show all countries
      // In the future, you could categorize countries by their available plan types
    }

    setFilteredCountries(filtered);
  }, [searchTerm, countries, searchResults, filterType, selectedCountry, showCheckoutModal]);

  // Load plans directly when filterType is global or regional
  useEffect(() => {
    if (filterType === 'global' || filterType === 'regional') {
      loadPlansByType(filterType);
    } else {
      setDirectPlans([]);
    }
  }, [filterType]);

  const handleCountrySelect = async (country) => {
    setLoadingPlans(true);
    try {
      const res = await fetch(`/api/public/plans?country=${country.code}`);
      if (!res.ok) throw new Error('Failed to load plans');
      const data = await res.json();
      const plans = data?.success ? (data.data.plans || []) : [];
      const plan1GB = getCheapest1GBPlan(plans);
      if (plan1GB) {
        const flag = country.flag?.startsWith('http') ? '' : (country.flagEmoji || getFlagEmoji(country.code));
        navigateToSharePackage(plan1GB, country.code, flag);
      } else {
        // No packages available for this country - show message
        toast.error(`${t('errors.noPackagesAvailable', 'No packages available for')} ${country.name || country.code}`, {
          duration: 3000,
          style: {
            background: '#FEE2E2',
            color: '#991B1B',
          },
        });
      }
    } catch (e) {
      console.error('Error loading plans for country:', e);
    } finally {
      setLoadingPlans(false);
    }
  };

  const handlePlanSelect = (plan) => {
    const code = plan.country_code || plan.country || (plan.package_type === 'global' ? 'GL' : plan.package_type === 'regional' ? 'RG' : '');
    const flag = plan.package_type === 'global' ? '🌍' : plan.package_type === 'regional' ? '🗺️' : getFlagEmoji(plan.country_code || plan.country);
    navigateToSharePackage(plan, code, flag);
  };

  const toggleRegion = (regionName) => {
    setExpandedRegions(prev => ({
      ...prev,
      [regionName]: !prev[regionName]
    }));
  };

  const toggleCountry = (countryCode) => {
    setExpandedCountries(prev => ({
      ...prev,
      [countryCode]: !prev[countryCode]
    }));
  };

  // Helper function to get primary country from plan
  const getPrimaryCountry = (plan) => {
    if (plan.country_codes && plan.country_codes.length > 0) {
      return plan.country_codes[0];
    }
    if (plan.countries && plan.countries.length > 0) {
      return Array.isArray(plan.countries[0]) ? plan.countries[0] : plan.countries[0];
    }
    if (plan.country) {
      return plan.country;
    }
    return null;
  };

  // Helper function to get country name from code
  const getCountryName = (countryCode) => {
    if (!countryCode) return null;
    const country = countries.find(c => c.code === countryCode);
    if (country) {
      // Pass the full country object to use country_name_ru from database
      return translateCountryName(country, locale);
    }
    return countryCode;
  };

  const fetchPlansByType = async (planType) => {
    // Use Supabase API endpoint that loads from Supabase
    const response = await fetch(`/api/public/plans?type=${planType}&limit=10000`);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    if (!data?.success || !data?.data) {
      throw new Error(data?.error || 'Failed to load plans');
    }

    const allPlans = data.data.plans || [];

    // Add extracted region info to plans (for regional plans, extract from operator/slug)
    const plansWithRegions = allPlans.map(plan => {
      let extractedRegion = plan.region || plan.region_slug;

      // For regional plans, extract region from operator or slug if not already set
      if (planType === 'regional' && (!extractedRegion || extractedRegion.toLowerCase() === 'n/a')) {
        const slug = (plan.slug || '').toLowerCase();
        const operator = (plan.operator || '').toLowerCase();

        // Check operator first, then slug
        const regionSource = operator || slug;

        // Latin America
        if (regionSource.includes('latamlink') || regionSource.includes('latam') || regionSource.includes('latin-america')) {
          extractedRegion = 'Latin America';
        }
        // Americas (americanmex operator) - normalize to north-america for image lookup
        else if (regionSource.includes('americanmex')) {
          extractedRegion = 'North America';
        }
        // Europe
        else if (regionSource.includes('eurolink') || regionSource.includes('euconnect') || regionSource.includes('europe')) {
          extractedRegion = 'Europe';
        }
        // Africa
        else if (regionSource.includes('hello-africa') || regionSource.includes('africa')) {
          extractedRegion = 'Africa';
        }
        // Caribbean
        else if (regionSource.includes('island-hopper') || regionSource.includes('caribbean')) {
          extractedRegion = 'Caribbean';
        }
        // Asia
        else if (regionSource.includes('asia')) {
          extractedRegion = 'Asia';
        }
        // Middle East
        else if (regionSource.includes('middle-east') || regionSource.includes('mena')) {
          extractedRegion = 'Middle East';
        }
        // Oceania
        else if (regionSource.includes('oceania')) {
          extractedRegion = 'Oceania';
        }
        // If no region detected and it's a regional plan, default to Oceania (since "Other" is typically Oceania)
        else if (!extractedRegion || extractedRegion.toLowerCase() === 'n/a') {
          extractedRegion = 'Oceania';
        }
      }

      // For global plans, no region needed
      if (planType === 'global') {
        extractedRegion = 'Global';
      }

      // Translate region name to current locale
      const translatedRegion = extractedRegion ? translateRegionName(extractedRegion, locale, regionLabels) : null;

      return {
        ...plan,
        extractedRegion: extractedRegion || 'Oceania', // Default to Oceania instead of "Other"
        translatedRegion
      };
    });

    // Group plans by region for regional plans
    let finalPlans = plansWithRegions;
    if (planType === 'regional') {
      // Group by extracted region
      const groupedByRegion = plansWithRegions.reduce((groups, plan) => {
        const region = plan.extractedRegion || plan.region || plan.region_slug || 'Oceania';
        if (!groups[region]) {
          groups[region] = [];
        }
        groups[region].push(plan);
        return groups;
      }, {});

      // Sort regions alphabetically and flatten back to array
      const sortedRegions = Object.keys(groupedByRegion).sort();
      finalPlans = sortedRegions.flatMap(region => {
        // Sort plans within each region by price
        return groupedByRegion[region].sort((a, b) => (a.price || 0) - (b.price || 0));
      });
    }

    return finalPlans;
  };

  // Load plans directly from Supabase by type (global, regional) for legacy views
  const loadPlansByType = async (planType) => {
    try {
      setLoadingDirectPlans(true);
      const finalPlans = await fetchPlansByType(planType);
      setDirectPlans(finalPlans);
    } catch (error) {
      console.error(`❌ Error loading ${planType} plans:`, error);
      setDirectPlans([]);
    } finally {
      setLoadingDirectPlans(false);
    }
  };

  // Preload global/regional for the store-like design on the plans page only (not on home)
  useEffect(() => {
    if (!isStoreLayoutPage || isHomePage) return;

    let cancelled = false;
    const loadStorePlans = async () => {
      setLoadingStoreGlobalPlans(true);
      setLoadingStoreRegionalPlans(true);
      try {
        const [globalPlans, regionalPlans] = await Promise.all([
          fetchPlansByType('global'),
          fetchPlansByType('regional'),
        ]);

        if (cancelled) return;
        setStoreGlobalPlans(globalPlans);
        setStoreRegionalPlans(regionalPlans);
      } catch (error) {
        console.error('❌ Error preloading store plans:', error);
        if (!cancelled) {
          setStoreGlobalPlans([]);
          setStoreRegionalPlans([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingStoreGlobalPlans(false);
          setLoadingStoreRegionalPlans(false);
        }
      }
    };

    loadStorePlans();
    return () => {
      cancelled = true;
    };
  }, [isStoreLayoutPage, isHomePage]);

  // Load available plans for a specific country
  const loadAvailablePlansForCountry = async (countryCode) => {
    try {
      const response = await fetch(`/api/public/plans?country=${countryCode}`);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        let plans = data.data.plans || [];
        
        // Filter out topup plans before setting available plans - comprehensive check
        plans = plans.filter(plan => {
          const planType = (plan.plan_type || plan.package_type || '').toLowerCase();
          const titleLower = (plan.title || plan.name || plan.title_ru || '').toLowerCase();
          const descriptionLower = (plan.description || '').toLowerCase();
          // CRITICAL: Check slug/package_id separately - this is where topups are usually identified
          const slugLower = (plan.slug || plan.package_id || '').toLowerCase();
          
          const isTopup = plan.is_topup === true || 
                         plan.is_topup_package === true ||
                         plan.available_for_topup === true ||
                         planType === 'topup' || 
                         planType === 'top-up' ||
                         slugLower.includes('topup') ||
                         slugLower.includes('top-up') ||
                         slugLower.includes('top up') ||
                         slugLower.includes('топ-ап') ||
                         slugLower.includes('топап') ||
                         titleLower.includes('topup') ||
                         titleLower.includes('top-up') ||
                         titleLower.includes('top up') ||
                         titleLower.includes('топ-ап') ||
                         titleLower.includes('топап') ||
                         descriptionLower.includes('topup') ||
                         descriptionLower.includes('top-up') ||
                         descriptionLower.includes('top up') ||
                         descriptionLower.includes('топ-ап') ||
                         descriptionLower.includes('топап');
          
          return !isTopup;
        });
        
        setAvailablePlans(plans);
      } else {
        throw new Error(data.error || 'Failed to fetch plans');
      }
    } catch (error) {
      console.error('❌ Error loading plans for country:', error);
      setAvailablePlans([]);
    } finally {
      setLoadingPlans(false);
    }
  };


  // No fallback timeout - only show real API data

  const syncSearchToUrl = (nextSearch) => {
    if (!isStoreLayoutPage) return;
    const nextValue = (nextSearch || '').trim();
    if (nextValue === urlSearchTerm) return;

    const params = new URLSearchParams(searchParams.toString());
    if (nextValue) params.set('search', nextValue);
    else params.delete('search');

    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Navigate to share package page (1GB plan). Use slug (package_id) so API finds plan reliably.
  // Preserve language, currency, theme from current URL so share page keeps Hebrew/ILS/theme.
  const navigateToSharePackage = (plan, countryCode, flag = '') => {
    const slug = plan?.slug ?? plan?.package_id ?? plan?.id ?? plan?._id;
    if (!slug) return;
    const langMatch = pathname.match(/^\/(ar|de|es|fr|he|ru)\//);
    const langPrefix = langMatch ? `/${langMatch[1]}` : '';
    const params = new URLSearchParams();
    if (countryCode) params.set('country', countryCode);
    if (flag) params.set('flag', flag);
    const lang = searchParams.get('language') || locale;
    const currency = searchParams.get('currency') || displayCurrency;
    const theme = searchParams.get('theme');
    if (lang) params.set('language', lang);
    if (currency) params.set('currency', currency);
    if (theme) params.set('theme', theme);
    const qs = params.toString();
    router.push(`${langPrefix}/share-package/${encodeURIComponent(String(slug))}${qs ? `?${qs}` : ''}`);
  };

  const openPlansList = (plans, scope = { countryCode: '', flag: '' }) => {
    const plan1GB = getCheapest1GBPlan(plans || []);
    if (plan1GB) {
      navigateToSharePackage(plan1GB, scope.countryCode || '', scope.flag || '');
    }
    // No modal fallback: only 1GB auto-select and share page
  };

  // Store summaries (for mobile-like design)
  // Use total count from API (includes countries without packages) for display counter
  const storeCountriesCount = countriesData?.totalCountriesCount || countries.length;
  const applyDiscountToPrice = (price) => {
    if (price == null || price <= 0) return price;
    const pct = discountPct;
    return Math.max(0.5, (price * (100 - pct)) / 100);
  };

  const storeGlobalPricesRaw = storeGlobalPlans.map(p => p.price || 0).filter(p => p > 0);
  const storeGlobalMinPriceOriginal = storeGlobalPricesRaw.length ? Math.min(...storeGlobalPricesRaw) : null;
  const storeGlobalMinPrice = storeGlobalMinPriceOriginal != null ? applyDiscountToPrice(storeGlobalMinPriceOriginal) : null;
  const storeGlobalPricesRub = storeGlobalPlans.map(p => p.price_rub || 0).filter(p => p > 0);
  const storeGlobalMinPriceRubOriginal = storeGlobalPricesRub.length ? Math.min(...storeGlobalPricesRub) : null;
  const storeGlobalMinPriceRub = storeGlobalMinPriceRubOriginal != null ? applyDiscountToPrice(storeGlobalMinPriceRubOriginal) : null;
  const storeGlobalPricesIls = storeGlobalPlans.map(p => p.price_ils || 0).filter(p => p > 0);
  const storeGlobalMinPriceIlsOriginal = storeGlobalPricesIls.length ? Math.min(...storeGlobalPricesIls) : null;
  const storeGlobalMinPriceIls = storeGlobalMinPriceIlsOriginal != null ? applyDiscountToPrice(storeGlobalMinPriceIlsOriginal) : null;

  const storeGlobalCountryCodes = new Set(
    storeGlobalPlans.flatMap(p => extractCountryCodesFromPlan(p))
  );
  
  const storeGlobalImageSlug = storeGlobalCountryCodes.size >= 160 ? 'global-172' : 'global-143';
  const storeGlobalImageUrl = getRegionImageUrlBySlug(storeGlobalImageSlug) || getRegionImageUrlBySlug('global-172');

  const storeRegionalCards = (() => {
    const grouped = storeRegionalPlans.reduce((acc, plan) => {
      const key = plan.extractedRegion || plan.region || plan.region_slug || 'Oceania';
      if (!acc[key]) acc[key] = [];
      acc[key].push(plan);
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([regionKey, plans]) => {
        const prices = plans.map(p => p.price || 0).filter(p => (p || 0) > 0);
        const minPriceOriginal = prices.length ? Math.min(...prices) : null;
        const minPrice = minPriceOriginal != null ? applyDiscountToPrice(minPriceOriginal) : null;
        const pricesRub = plans.map(p => p.price_rub || 0).filter(p => (p || 0) > 0);
        const minPriceRubOriginal = pricesRub.length ? Math.min(...pricesRub) : null;
        const minPriceRub = minPriceRubOriginal != null ? applyDiscountToPrice(minPriceRubOriginal) : null;
        const pricesIls = plans.map(p => p.price_ils || 0).filter(p => (p || 0) > 0);
        const minPriceIlsOriginal = pricesIls.length ? Math.min(...pricesIls) : null;
        const minPriceIls = minPriceIlsOriginal != null ? applyDiscountToPrice(minPriceIlsOriginal) : null;
        const codes = new Set(plans.flatMap(p => extractCountryCodesFromPlan(p)));
        const regionNameFromDb = (regionKey === 'Regional' || regionKey === 'regional')
          ? (countriesData?.labels?.regional?.[locale] ?? '')
          : (countriesData?.labels?.regions?.[regionKey]?.[locale] ?? '');
        return {
          regionKey,
          regionName: regionNameFromDb,
          plansCount: plans.length,
          minPrice: Number.isFinite(minPrice) ? minPrice : null,
          minPriceOriginal: minPriceOriginal,
          minPriceRub,
          minPriceRubOriginal,
          minPriceIls,
          minPriceIlsOriginal,
          countriesCount: codes.size,
          plans,
        };
      })
      .sort((a, b) => (b.countriesCount || 0) - (a.countriesCount || 0));
  })();

  const storeRegionsCount = storeRegionalCards.length;

  const storePopularCountries = (() => {
    const list = [...countries];
    list.sort((a, b) => (b.plansCount || 0) - (a.plansCount || 0));
    return list.slice(0, 6);
  })();

  const storeCountriesGrid = searchTerm
    ? filteredCountries
    : (showAllCountries ? filteredCountries : filteredCountries.slice(0, 12));


  return (
    <>
      {isStoreLayoutPage ? (
        <section className="py-0">
          <div className="max-w-5xl mx-auto">
            {/* Dashboard card: search + stats */}
            <div className="mb-6">
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {storeCountriesCount} {t('plans.countries', 'countries')}
                    {!isHomePage && storeRegionsCount > 0 && <> · {storeRegionsCount} {t('plans.regions', 'regions')}</>}
                  </p>
                </div>
                <div className="relative">
                  <Search className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 ${isRTL ? 'right-4' : 'left-4'}`} />
                  <input
                    value={searchTerm}
                    onChange={(e) => {
                      const next = e.target.value;
                      setSearchTerm(next);
                      syncSearchToUrl(next);
                    }}
                    placeholder={t('search.destinationPlaceholder', 'Search country or region...')}
                    className={`w-full bg-gray-50 dark:bg-gray-800/60 rounded-xl py-3 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-blue-400/30 dark:focus:ring-blue-500/30 ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'}`}
                  />
                </div>
              </div>
            </div>

            {/* Global & regional tariffs — hidden on home; on /esim-plans only when there is data */}
            {!isHomePage && (storeRegionalCards.length > 0 || storeGlobalPlans.length > 0) && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('plans.globalAndRegional', 'Global & regional plans')}
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
                {/* Global card */}
                <button
                  type="button"
                  onClick={() => openPlansList(storeGlobalPlans, { countryCode: 'GL', flag: '🌍' })}
                  className="shrink-0 w-[260px] sm:w-[300px] rounded-xl overflow-hidden bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors text-left disabled:opacity-50"
                  disabled={loadingStoreGlobalPlans || storeGlobalPlans.length === 0}
                >
                  <div className="relative h-28 bg-gray-100 dark:bg-gray-700/30">
                    {storeGlobalImageUrl ? (
                      <img
                        src={storeGlobalImageUrl}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                        aria-hidden="true"
                        loading="lazy"
                      />
                    ) : (
                      <img
                        src={STORE_MAP_SVG_URL}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-15"
                        aria-hidden="true"
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="text-base font-semibold text-gray-900 dark:text-white truncate">
                      {countriesData?.labels?.global?.[locale] ?? ''}
                    </div>
                    <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      5 {t('plans.tariffs', 'plans')}
                    </div>
                    <div className="mt-2 text-lg font-semibold text-blue-600 dark:text-blue-400">
                      {storeGlobalMinPrice
                        ? <>{t('plan.from', 'от')} {renderPriceWithDiscount({ minPrice: storeGlobalMinPrice, minPriceOriginal: storeGlobalMinPriceOriginal, minPriceRub: storeGlobalMinPriceRub, minPriceRubOriginal: storeGlobalMinPriceRubOriginal, minPriceIls: storeGlobalMinPriceIls, minPriceIlsOriginal: storeGlobalMinPriceIlsOriginal })}</>
                        : t('plans.noPlansAvailable', 'Планы недоступны')}
                    </div>
                  </div>
                </button>

                {/* Regional cards */}
                {loadingStoreRegionalPlans ? (
                  Array.from({ length: 3 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="shrink-0 w-[260px] sm:w-[300px] rounded-xl overflow-hidden bg-white dark:bg-gray-800/50 animate-pulse"
                    >
                      <div className="h-28 bg-gray-200 dark:bg-gray-700/30" />
                      <div className="p-4 space-y-2 border-t border-gray-100 dark:border-gray-700">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700/40 rounded w-32" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-700/40 rounded w-24" />
                        <div className="h-5 bg-gray-200 dark:bg-gray-700/40 rounded w-20" />
                      </div>
                    </div>
                  ))
                ) : (
                  storeRegionalCards.map((region) => (
                    (() => {
                      const slug = normalizeRegionKeyToSlug(region.regionKey);
                      const imageUrl = slug ? getRegionImageUrlBySlug(slug) : null;
                      return (
                    <button
                      key={region.regionKey}
                      type="button"
                      onClick={() => openPlansList(region.plans, { countryCode: 'RG', flag: '🗺️' })}
                      className="shrink-0 w-[260px] sm:w-[300px] rounded-xl overflow-hidden bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors text-left disabled:opacity-50"
                      disabled={!region.plans?.length}
                    >
                      <div className="relative h-28 bg-gray-100 dark:bg-gray-700/30">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                            aria-hidden="true"
                            loading="lazy"
                            onError={(e) => {
                              e.target.src = STORE_MAP_SVG_URL;
                              e.target.className = 'absolute inset-0 w-full h-full object-cover opacity-15';
                            }}
                          />
                        ) : (
                          <img
                            src={STORE_MAP_SVG_URL}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover opacity-15"
                            aria-hidden="true"
                            loading="lazy"
                          />
                        )}
                      </div>
                      <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                        <div className="text-base font-semibold text-gray-900 dark:text-white truncate">
                          {(region.regionKey === 'Regional' || region.regionKey === 'regional')
                            ? (countriesData?.labels?.regional?.[locale] ?? '')
                            : (countriesData?.labels?.regions?.[region.regionKey]?.[locale] ?? '')}
                        </div>
                        <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          5 {t('plans.tariffs', 'plans')}
                        </div>
                        <div className="mt-2 text-lg font-semibold text-blue-600 dark:text-blue-400">
                          {region.minPrice
                            ? <>{t('plan.from', 'от')} {renderPriceWithDiscount(region)}</>
                            : t('plans.noPlansAvailable', 'Планы недоступны')}
                        </div>
                      </div>
                    </button>
                      );
                    })()
                  ))
                )}
              </div>
            </div>
            )}

            {/* Countries — dashboard card */}
            <div>
              <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700">
                {searchTerm ? (
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t('search.searchingFor', 'Search:')} <span className="text-blue-600 dark:text-blue-400">{searchTerm}</span>
                  </h2>
                ) : (
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t('search.popularDestinations', 'Popular destinations')}
                  </h2>
                )}
              </div>

              {!searchTerm && (
                <div className="p-4 sm:p-6 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {storePopularCountries.map((country) => (
                    <button
                      key={country.id}
                      type="button"
                      onClick={() => handleCountrySelect(country)}
                      className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors text-left p-4 flex items-center gap-4 shadow-sm"
                    >
                      <div className="shrink-0">
                        {country.flag && country.flag.startsWith('http') ? (
                          <img
                            src={country.flag}
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : country.flagEmoji ? (
                          <div className="w-12 h-12 rounded-lg bg-white dark:bg-gray-700/50 flex items-center justify-center text-2xl">
                            {country.flagEmoji}
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 font-semibold text-sm">
                            {country.code || '??'}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-base font-semibold text-gray-900 dark:text-white truncate">
                            {translateCountryName(country, locale) || country.name}
                          </div>
                          <span className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                            {country.plansCount || 0} {t('plans.tariffs', 'plans')}
                          </span>
                        </div>
                        <div className="mt-1 text-base font-semibold text-blue-600 dark:text-blue-400">
                          {country.minPrice && country.minPrice < 999
                            ? <>{t('plan.from', 'From')} {renderPriceWithDiscount(country)}</>
                            : t('plans.noPlansAvailable', 'No plans available')}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="px-4 sm:px-6 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t('plans.allCountries', 'All countries')}
                </h3>
                {!searchTerm && (
                  <button
                    type="button"
                    onClick={() => setShowAllCountries(v => !v)}
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    {showAllCountries ? t('plans.showLess', 'Show less') : t('plans.showAll', 'Show all')}
                  </button>
                )}
              </div>

              <div className="p-4 sm:p-6 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {countriesLoading && countries.length === 0 ? (
                  Array.from({ length: 6 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-4 animate-pulse shadow-sm"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40" />
                          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-28" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  storeCountriesGrid.map((country) => (
                    <button
                      key={country.id}
                      type="button"
                      onClick={() => handleCountrySelect(country)}
className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors text-left p-4 flex items-center gap-4 shadow-sm"
                    >
                      <div className="shrink-0">
                        {country.flag && country.flag.startsWith('http') ? (
                            <img
                            src={country.flag}
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : country.flagEmoji ? (
                          <div className="w-12 h-12 rounded-lg bg-white dark:bg-gray-700/50 flex items-center justify-center text-2xl">
                            {country.flagEmoji}
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 font-semibold text-sm">
                            {country.code || '??'}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-base font-semibold text-gray-900 dark:text-white truncate">
                          {translateCountryName(country, locale) || country.name}
                        </div>
                        <div className="mt-1 text-base font-semibold text-blue-600 dark:text-blue-400">
                          {country.minPrice && country.minPrice < 999
                            ? <>{t('plan.from', 'From')} {renderPriceWithDiscount(country)}</>
                            : t('plans.noPlansAvailable', 'No plans available')}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="destination py-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Active Search Badge */}
          {searchTerm && (
            <div className="mb-6 flex justify-center items-center gap-3">
              <span className="text-sm text-gray-300">
                Поиск по: <span className="font-semibold text-blue-400">{searchTerm}</span>
              </span>
              <button
                onClick={() => {
                  setSearchTerm('');
                  router.push(pathname);
                }}
                className="text-xs px-3 py-1 rounded-full bg-gray-200 dark:bg-gray-700/50 hover:bg-gray-300 dark:hover:bg-gray-700/70 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Очистить
              </button>
            </div>
          )}

          {/* Local eSIMs Content */}
          <div className={`tab-content ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className={`tab-pane fade show active ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
              {/* Loading state for countries */}
              {countriesLoading && countries.length === 0 ? (
                <div className="flex justify-center items-center min-h-64">
                  <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-tufts-blue"></div>
                  <p className="ml-4 text-gray-600">{t('plans.loadingPlans', 'Загрузка планов...')}</p>
                </div>
              ) : (
                <>

                  {/* Desktop Records Layout */}
                  <div className="hidden sm:block max-w-4xl mx-auto">
                    <div className="bg-white dark:bg-gray-800/50 rounded-2xl overflow-hidden">
                      {(filterType === 'global' || filterType === 'regional') ? (
                        // Show plans directly for global/regional
                        loadingDirectPlans ? (
                          // Loading skeleton
                          Array.from({ length: 5 }).map((_, index) => (
                            <div key={index} className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/50 last:border-b-0 animate-pulse">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                                  <div className="space-y-1">
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                                  </div>
                                </div>
                                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                              </div>
                            </div>
                          ))
                        ) : directPlans.length > 0 ? (
                          (() => {
                            if (filterType === 'global') {
                              // Group all global plans into one card - go to share with 1GB
                              const minPrice = Math.min(...directPlans.map(p => p.price || 0));
                              const minPriceRub = Math.min(...directPlans.map(p => p.price_rub || 0).filter(x => x > 0)) || null;
                              const minPriceIls = Math.min(...directPlans.map(p => p.price_ils || 0).filter(x => x > 0)) || null;
                              const sortedPlans = [...directPlans].sort((a, b) => (a.price || 0) - (b.price || 0));

                              return (
                                <button
                                  className="w-full px-6 py-4 border-b border-gray-100 dark:border-gray-700/50 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors duration-200 flex items-center justify-between"
                                  onClick={() => openPlansList(sortedPlans, { countryCode: 'GL', flag: '🌍' })}
                                >
                                  <div className="flex items-center space-x-3">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center text-xl">
                                      🌍
                                    </div>
                                    <div className="text-left">
                                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {t('plan.globalPlans', 'Global plans')}
                                      </h3>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {t('plan.worksIn', 'Works in 100+ countries')}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                      {t('plan.from', 'From')} {formatPriceFromItem({ price: minPrice, price_rub: minPriceRub, price_ils: minPriceIls }, displayCurrency).formatted}
                                    </div>
                                    <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                      {sortedPlans.length} {t('plan.options', 'options')}
                                    </div>
                                  </div>
                                </button>
                              );
                            }

                            if (filterType === 'regional') {
                              // Group plans by region
                              const groupedByRegion = directPlans.reduce((groups, plan) => {
                                const regionName = plan.extractedRegion || plan.region || plan.region_slug || 'Oceania';
                                if (!groups[regionName]) {
                                  groups[regionName] = [];
                                }
                                groups[regionName].push(plan);
                                return groups;
                              }, {});

                              const sortedRegions = Object.keys(groupedByRegion).sort((a, b) => {
                                // Sort by translated name if possible
                                const nameA = translateRegionName(a, locale, regionLabels) || a;
                                const nameB = translateRegionName(b, locale, regionLabels) || b;
                                return nameA.localeCompare(nameB, locale);
                              });

                              return sortedRegions.map(regionKey => {
                                const plans = groupedByRegion[regionKey];
                                const minPrice = Math.min(...plans.map(p => p.price || 0));
                                const minPriceRub = Math.min(...plans.map(p => p.price_rub || 0).filter(x => x > 0)) || null;
                                const minPriceIls = Math.min(...plans.map(p => p.price_ils || 0).filter(x => x > 0)) || null;
                                const regionName = translateRegionName(regionKey, locale, regionLabels);

                                return (
                                  <button
                                    key={regionKey}
                                    className="w-full px-6 py-4 border-b border-gray-100 dark:border-gray-700/50 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors duration-200 flex items-center justify-between"
                                    onClick={() => {
                                      const regionPlans = directPlans.filter(p =>
                                        (p.extractedRegion || p.region || p.region_slug || 'Oceania') === regionKey
                                      );
                                      openPlansList(regionPlans, { countryCode: 'RG', flag: '🗺️' });
                                    }}
                                  >
                                    <div className="flex items-center space-x-3">
                                      <div className="flex-shrink-0">
                                        <span className="text-2xl">🗺️</span>
                                      </div>
                                      <div className="text-left">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                          {regionName}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                          {t('plan.from', 'от')} {formatPriceFromItem({ price: minPrice, price_rub: minPriceRub, price_ils: minPriceIls }, displayCurrency).formatted}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                        {plans.length} {t('plan.options', 'вариантов')}
                                      </div>
                                    </div>
                                  </button>
                                );
                              });
                            }

                            // Group plans by country for regional/other
                            const groupedByCountry = directPlans.reduce((groups, plan) => {
                              const countryCode = getPrimaryCountry(plan) || 'OTHER';
                              if (!groups[countryCode]) {
                                groups[countryCode] = [];
                              }
                              groups[countryCode].push(plan);
                              return groups;
                            }, {});

                            // Sort countries and flatten plans - filter out 'OTHER'
                            const sortedCountryCodes = Object.keys(groupedByCountry)
                              .filter(countryCode => countryCode !== 'OTHER')
                              .sort((a, b) => {
                                const nameA = getCountryName(a) || a;
                                const nameB = getCountryName(b) || b;
                                return nameA.localeCompare(nameB, locale);
                              });

                            // Add OTHER plans without header if they exist
                            const otherPlans = groupedByCountry['OTHER'] || [];

                            const flattenedPlans = [
                              ...sortedCountryCodes.flatMap(countryCode => {
                                const countryPlans = groupedByCountry[countryCode];
                                // Add a marker plan with country info
                                return [{ _isCountryHeader: true, countryCode, planCount: countryPlans.length }, ...countryPlans];
                              }),
                              // Add OTHER plans directly without header
                              ...otherPlans
                            ];

                            return flattenedPlans.map((plan, index) => {
                              // Check if this is a country header
                              if (plan._isCountryHeader) {
                                const countryCode = plan.countryCode;
                                const countryName = getCountryName(countryCode) || countryCode;
                                const countryFlag = getFlagEmoji(countryCode);
                                const isExpanded = expandedCountries[countryCode] !== false; // Default to expanded

                                return (
                                  <button
                                    key={`country-header-${countryCode}`}
                                    className="w-full px-6 py-3 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors duration-200"
                                    onClick={() => toggleCountry(countryCode)}
                                  >
                                    <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center justify-between">
                                      <span className="flex items-center gap-2">
                                        {countryFlag} {countryName} ({plan.planCount})
                                      </span>
                                      <span className="text-gray-500 dark:text-gray-400">
                                        {isExpanded ? '▼' : '▶'}
                                      </span>
                                    </h3>
                                  </button>
                                );
                              }

                              // Show region header for regional plans (if not grouping by country)
                              const prevRegion = flattenedPlans[index - 1]?.extractedRegion || flattenedPlans[index - 1]?.region || flattenedPlans[index - 1]?.region_slug || 'Oceania';
                              const currentRegion = plan.extractedRegion || plan.region || plan.region_slug || 'Oceania';
                              const showRegionHeader = filterType === 'regional' &&
                                (index === 0 || flattenedPlans[index - 1]._isCountryHeader || prevRegion !== currentRegion);

                              const countryCode = getPrimaryCountry(plan) || 'OTHER';
                              const isCountryExpanded = expandedCountries[countryCode] !== false; // Default to expanded

                              // Skip if country is collapsed
                              if (!isCountryExpanded) return null;

                              return (
                                <React.Fragment key={plan.id || index}>
                                  {showRegionHeader && (
                                    <button
                                      className="w-full px-6 py-3 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors duration-200"
                                      onClick={() => toggleRegion(currentRegion)}
                                    >
                                      <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center justify-between">
                                        <span className="flex items-center gap-2">
                                          🗺️ {plan.translatedRegion || translateRegionName(currentRegion, locale, regionLabels)}
                                        </span>
                                        <span className="text-gray-500 dark:text-gray-400">
                                          {expandedRegions[currentRegion] ? '▼' : '▶'}
                                        </span>
                                      </h3>
                                    </button>
                                  )}
                                  {(filterType !== 'regional' || expandedRegions[currentRegion]) && (
                                    <button
                                      className="w-full px-6 py-4 border-b border-gray-100 dark:border-gray-700/50 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors duration-200 flex items-center justify-between"
                                      onClick={() => handlePlanSelect(plan)}
                                    >
                                      <div className="flex items-center space-x-3">
                                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center text-xl">
                                          {filterType === 'global' ? '🌍' : '🗺️'}
                                        </div>
                                        <div className="text-left">
                                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {getPlanDisplayTitle(plan, locale)}
                                          </h3>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                          {renderPlanPriceWithDiscount(plan)}
                                        </div>
                                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                          {filterType === 'global' ?
                                            t('home.globalPlans', 'Глобальные планы') :
                                            filterType === 'regional' ?
                                              `${plan.translatedRegion || translateRegionName(plan.extractedRegion || plan.region || plan.region_slug, locale, regionLabels)}` :
                                              `${(plan.countries || plan.country_codes || []).slice(0, 2).join(', ') || t('home.countryPlans', 'Планы по странам')}`
                                          }
                                        </div>
                                      </div>
                                    </button>
                                  )}
                                </React.Fragment>
                              );
                            })
                          })()
                        ) : (
                          <div className="px-6 py-8 text-center">
                            <p className="text-gray-500 dark:text-gray-400">
                              {t('plans.noPlansFound', 'Планы не найдены для этой категории')}
                            </p>
                          </div>
                        )
                      ) : (
                        // Show countries for country plans
                        (isPlansPage || searchTerm ? filteredCountries : filteredCountries.slice(0, 8)).map((country, index) => (
                          <button
                            key={country.id}
                            className="w-full px-6 py-4 border-b border-gray-200 dark:border-gray-700/30 last:border-b-0 hover:bg-gray-200 dark:hover:bg-gray-700/30 transition-colors duration-200 flex items-center justify-between"
                            onClick={() => handleCountrySelect(country)}
                          >
                            <div className="flex items-center space-x-4">
                              <div className="flex-shrink-0">
                                {country.flag && country.flag.startsWith('http') ? (
                                  <img 
                                    src={country.flag} 
                                    alt={`${country.name} flag`}
                                    className="w-8 h-8 rounded object-cover"
                                    onError={(e) => {
                                      // Fallback to emoji if image fails to load
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'block';
                                    }}
                                  />
                                ) : country.flagEmoji ? (
                                  <span className="text-2xl">{country.flagEmoji}</span>
                                ) : (
                                  <div className="w-8 h-8 bg-tufts-blue rounded-full flex items-center justify-center">
                                    <span className="text-gray-900 dark:text-white font-bold text-sm">
                                      {country.code || '??'}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="text-left">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                  {translateCountryName(country, locale) || country.name}
                                </h3>
                                {/* Removed hardcoded technical details */}
                              </div>
                            </div>
                            <div className="text-right">
                              {country.minPrice && country.minPrice < 999 ? (
                                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                  {renderPriceWithDiscount(country)}
                                </div>
                              ) : (
                                <div className="text-lg font-medium text-gray-500">{t('plans.noPlansAvailable', 'Планы недоступны')}</div>
                              )}
                            </div>
                          </button>
                        )))}
                    </div>
                  </div>

                  {/* Mobile Records Layout */}
                  <div className="sm:hidden">
                    <div className="bg-white dark:bg-gray-800/50 rounded-2xl overflow-hidden">
                      {(filterType === 'global' || filterType === 'regional') ? (
                        // Show plans directly for global/regional
                        loadingDirectPlans ? (
                          // Loading skeleton
                          Array.from({ length: 5 }).map((_, index) => (
                            <div key={index} className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 last:border-b-0 animate-pulse">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                                  <div className="space-y-1">
                                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                                  </div>
                                </div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                              </div>
                            </div>
                          ))
                        ) : directPlans.length > 0 ? (
                          (() => {
                            if (filterType === 'global') {
                              const minPrice = Math.min(...directPlans.map(p => p.price || 0));
                              const minPriceRub = Math.min(...directPlans.map(p => p.price_rub || 0).filter(x => x > 0)) || null;
                              const minPriceIls = Math.min(...directPlans.map(p => p.price_ils || 0).filter(x => x > 0)) || null;
                              const sortedPlans = [...directPlans].sort((a, b) => (a.price || 0) - (b.price || 0));
                              return (
                                <button
                                  className="w-full px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors duration-200 flex items-center justify-between"
                                  onClick={() => openPlansList(sortedPlans, { countryCode: 'GL', flag: '🌍' })}
                                >
                                  <div className="flex items-center space-x-3">
                                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center text-lg">
                                      🌍
                                    </div>
                                    <div className="text-left">
                                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {t('plan.globalPlans', 'Global plans')}
                                      </h3>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {t('plan.worksIn', 'Works in 100+ countries')}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                      {t('plan.from', 'From')} {formatPriceFromItem({ price: minPrice, price_rub: minPriceRub, price_ils: minPriceIls }, displayCurrency).formatted}
                                    </div>
                                    <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                      {sortedPlans.length} {t('plan.options', 'options')}
                                    </div>
                                  </div>
                                </button>
                              );
                            }

                            if (filterType === 'regional') {
                              // Group plans by region
                              const groupedByRegion = directPlans.reduce((groups, plan) => {
                                const regionName = plan.extractedRegion || plan.region || plan.region_slug || 'Oceania';
                                if (!groups[regionName]) {
                                  groups[regionName] = [];
                                }
                                groups[regionName].push(plan);
                                return groups;
                              }, {});

                              const sortedRegions = Object.keys(groupedByRegion).sort((a, b) => {
                                // Sort by translated name if possible
                                const nameA = translateRegionName(a, locale, regionLabels) || a;
                                const nameB = translateRegionName(b, locale, regionLabels) || b;
                                return nameA.localeCompare(nameB, locale);
                              });

                              return sortedRegions.map(regionKey => {
                                const plans = groupedByRegion[regionKey];
                                const minPrice = Math.min(...plans.map(p => p.price || 0));
                                const minPriceRub = Math.min(...plans.map(p => p.price_rub || 0).filter(x => x > 0)) || null;
                                const minPriceIls = Math.min(...plans.map(p => p.price_ils || 0).filter(x => x > 0)) || null;
                                const regionName = translateRegionName(regionKey, locale, regionLabels);

                                return (
                                  <button
                                    key={regionKey}
                                    className="w-full px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors duration-200 flex items-center justify-between"
                                    onClick={() => {
                                      const regionPlans = directPlans.filter(p =>
                                        (p.extractedRegion || p.region || p.region_slug || 'Oceania') === regionKey
                                      );
                                      openPlansList(regionPlans, { countryCode: 'RG', flag: '🗺️' });
                                    }}
                                  >
                                    <div className="flex items-center space-x-3">
                                      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center text-lg">
                                        🗺️
                                      </div>
                                      <div className="text-left">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                          {regionName}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                          {t('plan.from', 'от')} {formatPriceFromItem({ price: minPrice, price_rub: minPriceRub, price_ils: minPriceIls }, displayCurrency).formatted}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                        {plans.length} {t('plan.options', 'вариантов')}
                                      </div>
                                    </div>
                                  </button>
                                );
                              });
                            }

                            return directPlans.map((plan, index) => {
                              // Show region header for regional plans
                              const prevRegion = directPlans[index - 1]?.extractedRegion || directPlans[index - 1]?.region || directPlans[index - 1]?.region_slug || 'Oceania';
                              const currentRegion = plan.extractedRegion || plan.region || plan.region_slug || 'Oceania';
                              const showRegionHeader = filterType === 'regional' &&
                                (index === 0 || prevRegion !== currentRegion);

                              return (
                                <React.Fragment key={plan.id || index}>
                                  {showRegionHeader && (
                                    <button
                                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors duration-200"
                                      onClick={() => toggleRegion(currentRegion)}
                                    >
                                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center justify-between">
                                        <span className="flex items-center gap-2">
                                          🗺️ {plan.translatedRegion || translateRegionName(currentRegion, locale, regionLabels)}
                                        </span>
                                        <span className="text-gray-500 dark:text-gray-400">
                                          {expandedRegions[currentRegion] ? '▼' : '▶'}
                                        </span>
                                      </h3>
                                    </button>
                                  )}
                                  {(filterType !== 'regional' || expandedRegions[currentRegion]) && (
                                    <button
                                      className="w-full px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors duration-200 flex items-center justify-between"
                                      onClick={() => handlePlanSelect(plan)}
                                    >
                                      <div className="flex items-center space-x-3">
                                        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center text-lg">
                                          {filterType === 'global' ? '🌍' : '🗺️'}
                                        </div>
                                        <div className="text-left">
                                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {getPlanDisplayTitle(plan, locale)}
                                          </h3>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                          {renderPlanPriceWithDiscount(plan)}
                                        </div>
                                      </div>
                                    </button>
                                  )}
                                </React.Fragment>
                              );
                            })
                          })()
                        ) : (
                          <div className="px-3 py-4 text-center">
                            <p className="text-gray-400 text-sm">
                              {t('plans.noPlansFound', 'Планы не найдены для этой категории')}
                            </p>
                          </div>
                        )
                      ) : (
                        // Show countries for country plans
                        (isPlansPage || searchTerm ? filteredCountries : filteredCountries.slice(0, 8)).map((country, index) => (
                          <button
                            key={country.id}
                            className="w-full px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors duration-200 flex items-center justify-between"
                            onClick={() => handleCountrySelect(country)}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                {country.flag && country.flag.startsWith('http') ? (
                                  <img 
                                    src={country.flag} 
                                    alt={`${country.name} flag`}
                                    className="w-6 h-6 rounded object-cover"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      if (country.flagEmoji) {
                                        e.target.parentElement.innerHTML = `<span class="text-xl">${country.flagEmoji}</span>`;
                                      }
                                    }}
                                  />
                                ) : country.flagEmoji ? (
                                  <span className="text-xl">{country.flagEmoji}</span>
                                ) : (
                                  <div className="w-6 h-6 bg-tufts-blue rounded-full flex items-center justify-center">
                                    <span className="text-gray-900 dark:text-white font-bold text-xs">
                                      {country.code || '??'}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="text-left">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {translateCountryName(country, locale) || country.name}
                                </h3>
                                {/* Removed hardcoded technical details */}
                              </div>
                            </div>
                            <div className="text-right">
                              {country.minPrice && country.minPrice < 999 ? (
                                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {renderPriceWithDiscount(country)}
                                </div>
                              ) : (
                                <div className="text-sm font-medium text-gray-500">{t('plans.noPlansAvailable', 'Планы недоступны')}</div>
                              )}
                            </div>
                          </button>
                        )))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>



          {/* Empty State */}
        </div>
      </section>
      )}

    </>
  );
};

// Wrapper component with Suspense
const EsimPlans = ({ filterType = 'countries' }) => {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400"></div>
      </div>
    }>
      <EsimPlansContent filterType={filterType} />
    </Suspense>
  );
};

export default EsimPlans;
