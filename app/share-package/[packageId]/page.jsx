'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, usePathname, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Globe, 
  Wifi, 
  Clock, 
  Shield, 
  Zap,
  Smartphone,
} from 'lucide-react';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useI18n } from '../../../src/contexts/I18nContext';
import { useBrand } from '../../../src/contexts/BrandContext';
import { formatPriceFromItem } from '../../../src/services/currencyService';
import { getLanguageDirection } from '../../../src/utils/languageUtils';
import toast from 'react-hot-toast';

// Sub-region names (regional plans: Asia, Europe, CIS, etc.) — match mobile
const SUB_REGION_NAME_RU = {
  'Latin America': 'Латинская Америка',
  'North America': 'Северная Америка',
  Europe: 'Европа',
  Africa: 'Африка',
  Caribbean: 'Карибы',
  Asia: 'Азия',
  'Middle East': 'Ближний Восток',
  Oceania: 'Океания',
  'CIS Countries': 'Страны СНГ',
  Other: 'Другие',
};

function extractSubRegion(plan) {
  const regionSource = ((plan?.operator || '') + ' ' + (plan?.package_id || plan?.slug || '')).toLowerCase();
  if (regionSource.includes('latamlink') || regionSource.includes('latam') || regionSource.includes('latin-america')) return 'Latin America';
  if (regionSource.includes('americanmex') || regionSource.includes('north-america')) return 'North America';
  if (regionSource.includes('eurolink') || regionSource.includes('euconnect') || regionSource.includes('europe')) return 'Europe';
  if (regionSource.includes('hello-africa') || regionSource.includes('africa')) return 'Africa';
  if (regionSource.includes('island-hopper') || regionSource.includes('caribbean')) return 'Caribbean';
  if (regionSource.includes('asia')) return 'Asia';
  if (regionSource.includes('middle-east') || regionSource.includes('mena')) return 'Middle East';
  if (regionSource.includes('oceania')) return 'Oceania';
  if (regionSource.includes('cis')) return 'CIS Countries';
  if (regionSource.includes('rogers') || regionSource.includes('telus') || regionSource.includes('bell') || regionSource.includes('videotron')) return 'North America';
  if (regionSource.includes('optus') || regionSource.includes('telstra')) return 'Oceania';
  if (regionSource.includes('zain') || regionSource.includes('stc')) return 'Middle East';
  if (regionSource.includes('beeline')) return 'CIS Countries';
  if (regionSource.includes('china mobile') || regionSource.includes('china unicom') || regionSource.includes('china telecom') || regionSource.includes('china,')) return 'Asia';
  if (regionSource.includes('celcom') || regionSource.includes('maxis') || regionSource.includes('telkomsel') || regionSource.includes('metfone')) return 'Asia';
  if (regionSource.includes('telekom.al') || regionSource.includes('vodafone')) return 'Europe';
  return 'Other';
}

const TIER_MB = [1024, 2048, 5120, 10240, 20480, 51200]; // 1GB, 2GB, 5GB, 10GB, 20GB, 50GB

const SharePackagePage = () => {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currentUser } = useAuth();
  const { t, locale } = useI18n();
  const { defaultCurrency, paymentMethods: brandPaymentMethods } = useBrand();
  const displayCurrency = defaultCurrency || 'USD';
  const configuredPayment = Array.isArray(brandPaymentMethods) && brandPaymentMethods.length > 0
    ? (brandPaymentMethods[0] === 'coinbase' ? 'crypto' : brandPaymentMethods[0])
    : 'robokassa';
  const paymentFromUrl = (searchParams.get('payment') || '').toLowerCase();
  const effectivePayment = ['robokassa', 'stripe', 'crypto', 'coinbase'].includes(paymentFromUrl)
    ? (paymentFromUrl === 'coinbase' ? 'crypto' : paymentFromUrl)
    : configuredPayment;

  // Build query string that preserves language, currency, theme, country, flag, payment for links
  const currentQuery = () => {
    const q = new URLSearchParams();
    const country = searchParams.get('country') || urlCountryCode;
    const flag = searchParams.get('flag') || urlCountryFlag;
    if (country) q.set('country', country);
    if (flag) q.set('flag', flag);
    const lang = searchParams.get('language');
    const currency = searchParams.get('currency');
    const theme = searchParams.get('theme');
    if (lang) q.set('language', lang);
    if (currency) q.set('currency', currency);
    if (theme) q.set('theme', theme);
    q.set('payment', effectivePayment);
    return q.toString();
  };
  // packageId from route params; fallback from pathname if params missing (e.g. some locale setups)
  const packageId = params?.packageId ?? (typeof pathname === 'string' ? pathname.split('/').filter(Boolean).pop() : null);
  
  // RTL support
  const isRTL = getLanguageDirection(locale) === 'rtl';
  
  // Get country info from URL parameters
  const [urlCountryCode, setUrlCountryCode] = useState(null);
  const [urlCountryFlag, setUrlCountryFlag] = useState(null);
  const [flagImageError, setFlagImageError] = useState(false);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    setUrlCountryCode(sp.get('country'));
    setUrlCountryFlag(sp.get('flag'));
    if (!sp.has('payment')) {
      const q = new URLSearchParams(window.location.search);
      q.set('payment', configuredPayment);
      router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    }
  }, [pathname, configuredPayment]);
  
  const [packageData, setPackageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [otherTierPlans, setOtherTierPlans] = useState([]);
  const [allRegionalPlans, setAllRegionalPlans] = useState([]);
  const [regionalSubRegionGroups, setRegionalSubRegionGroups] = useState([]);
  const [selectedSubRegion, setSelectedSubRegion] = useState(null);

  const loadPackageData = useCallback(async () => {
    if (packageId == null || packageId === '') {
      setLoading(false);
      return;
    }
    const id = String(packageId).trim();
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const base = typeof window !== 'undefined' ? window.location.origin : '';
      const url = `${base}/api/public/plans/${encodeURIComponent(id)}`;
      const response = await fetch(url, { cache: 'no-store' });
      let data;
      try {
        data = await response.json();
      } catch (_) {
        data = null;
      }
      if (response.ok && data?.success && data?.data?.plan) {
        setPackageData(data.data.plan);
      } else {
        setPackageData(null);
        if (response.status === 404) {
          toast.error(t('errors.planNotFound', 'Тариф не найден'));
        } else if (!response.ok) {
          toast.error(data?.error || 'Failed to load package information');
        }
      }
    } catch (err) {
      setPackageData(null);
      toast.error('Failed to load package information');
    } finally {
      setLoading(false);
    }
  }, [packageId, urlCountryCode, t]);


  useEffect(() => {
    if (packageId) {
      loadPackageData();
      setFlagImageError(false); // Reset flag error state when loading new package
    }
  }, [packageId, loadPackageData]);


  const getDataMB = (p) => {
    const d = p?.data || p?.dataAmount || '';
    if (typeof d === 'number' && d > 0) return d >= 1024 ? d : d * 1024;
    if (typeof d !== 'string') return 0;
    const gb = (d + '').match(/(\d+(?:\.\d+)?)\s*GB/i);
    if (gb) return Math.round(parseFloat(gb[1]) * 1024);
    const mb = (d + '').match(/(\d+)\s*MB/i);
    return mb ? parseInt(mb[1], 10) : 0;
  };

  const isUnlimitedPlan = (p) => {
    const d = p?.data || p?.dataAmount;
    if (d === 'Unlimited' || d === 'unlimited' || d === -1) return true;
    if (p?.is_unlimited === true) return true;
    const mb = getDataMB(p);
    return mb === 0;
  };

  // Load tier plans for same country/scope (before checkout). For regional: group by sub-region, filter by selected.
  useEffect(() => {
    if (!packageData) {
      setOtherTierPlans([]);
      setAllRegionalPlans([]);
      setRegionalSubRegionGroups([]);
      setSelectedSubRegion(null);
      return;
    }
    const planType = packageData.plan_type || packageData.package_type || '';
    const countryCode = packageData.country_code || packageData.country || urlCountryCode || '';
    const isGlobal = planType === 'global';
    const isRegional = planType === 'regional';
    const url = isGlobal
      ? '/api/public/plans?type=global&limit=500'
      : isRegional
        ? '/api/public/plans?type=regional&limit=500'
        : `/api/public/plans?country=${countryCode}&limit=500`;
    fetch(url)
      .then((res) => res.ok ? res.json() : { success: false })
      .then((data) => {
        const plans = data?.success ? (data.data?.plans || []) : [];
        const filtered = plans.filter((p) => {
          if (isUnlimitedPlan(p)) return false;
          const mb = getDataMB(p);
          return TIER_MB.some((tier) => Math.abs(mb - tier) < 100);
        });
        if (isRegional) {
          setAllRegionalPlans(filtered);
          const groups = {};
          filtered.forEach((p) => {
            const sub = extractSubRegion(p);
            if (!groups[sub]) groups[sub] = [];
            groups[sub].push(p);
          });
          const groupList = Object.entries(groups).map(([name, regionPlans]) => ({
            name,
            nameRu: SUB_REGION_NAME_RU[name] || name,
            plans: regionPlans,
          })).sort((a, b) => b.plans.length - a.plans.length);
          setRegionalSubRegionGroups(groupList);
          setSelectedSubRegion((prev) => {
            const fromPackage = extractSubRegion(packageData);
            if (prev && groupList.some((g) => g.name === prev)) return prev;
            return fromPackage;
          });
        } else {
          setAllRegionalPlans([]);
          setRegionalSubRegionGroups([]);
          setSelectedSubRegion(null);
          const byTier = new Map();
          filtered.forEach((p) => {
            const mb = getDataMB(p);
            const tier = TIER_MB.find((t) => Math.abs(mb - t) < 100);
            const price = parseFloat(p.price) || 999;
            if (!byTier.has(tier) || price < (parseFloat(byTier.get(tier).price) || 999)) {
              byTier.set(tier, p);
            }
          });
          setOtherTierPlans(Array.from(byTier.values()).sort((a, b) => getDataMB(a) - getDataMB(b)));
        }
      })
      .catch(() => {
        setOtherTierPlans([]);
        setAllRegionalPlans([]);
        setRegionalSubRegionGroups([]);
      });
  }, [packageData, packageId, urlCountryCode]);

  // For regional: derive otherTierPlans from selected sub-region
  useEffect(() => {
    if (!packageData) return;
    const planType = packageData.plan_type || packageData.package_type || '';
    if (planType !== 'regional' || !selectedSubRegion || allRegionalPlans.length === 0) return;
    const subPlans = allRegionalPlans.filter((p) => extractSubRegion(p) === selectedSubRegion);
    const filtered = subPlans.filter((p) => {
      if (isUnlimitedPlan(p)) return false;
      const mb = getDataMB(p);
      return TIER_MB.some((tier) => Math.abs(mb - tier) < 100);
    });
    const byTier = new Map();
    filtered.forEach((p) => {
      const mb = getDataMB(p);
      const tier = TIER_MB.find((t) => Math.abs(mb - t) < 100);
      const price = parseFloat(p.price) || 999;
      if (!byTier.has(tier) || price < (parseFloat(byTier.get(tier).price) || 999)) {
        byTier.set(tier, p);
      }
    });
    setOtherTierPlans(Array.from(byTier.values()).sort((a, b) => getDataMB(a) - getDataMB(b)));
  }, [packageData, selectedSubRegion, allRegionalPlans]);


  const handlePurchase = async () => {
    if (!currentUser) {
      toast.error(t('auth.loginRequired', 'Please log in to purchase this package'));
      const qs = currentQuery();
      router.push(`/login${qs ? `?${qs}` : ''}`);
      return;
    }
    
    if (!packageData) {
      toast.error('Package data not loaded yet');
      return;
    }
    
    // packageData.price is already discounted from API; original_price is pre-discount when discount applied
    const finalPrice = Math.round((parseFloat(packageData.price) || 0) * 100) / 100;
    const priceRUBValue = parseFloat(packageData.price_rub) || 0;
    const priceILSValue = parseFloat(packageData.price_ils) || 0;
    const originalPrice = packageData.original_price != null ? parseFloat(packageData.original_price) : finalPrice;
    
    // Extract country code - prioritize URL parameter, then packageData
    let countryCode = urlCountryCode || null;
    let countryName = null;
    
    // If no URL country code, try to get from packageData
    if (!countryCode) {
      // Try country_codes array first (most common)
      if (packageData.country_codes && packageData.country_codes.length > 0) {
        countryCode = packageData.country_codes[0];
      } 
      // Fallback to country_code field
      else if (packageData.country_code) {
        countryCode = packageData.country_code;
      }
      // Fallback to country field
      else if (packageData.country) {
        countryCode = packageData.country;
      }
    }
    
    // Get country name if available
    if (packageData.countries && packageData.countries.length > 0) {
      const country = packageData.countries.find(c => 
        (typeof c === 'object' && c.code === countryCode) || 
        c === countryCode
      );
      if (country && typeof country === 'object' && country.name) {
        countryName = country.name;
      }
    }
    
    // If still no country name, fetch it from API
    if (!countryName && countryCode) {
      try {
        const countriesResponse = await fetch('/api/public/countries');
        if (countriesResponse.ok) {
          const countriesData = await countriesResponse.json();
          if (countriesData.success && countriesData.data?.countries) {
            const country = countriesData.data.countries.find(c => c.code === countryCode);
            if (country) {
              countryName = country.name;
            }
          }
        }
      } catch (error) {
      }
    }
    
    const planSlug = packageData.slug || packageId;
    const validPayment = ['robokassa', 'stripe', 'crypto', 'coinbase'].includes(effectivePayment) ? effectivePayment : 'robokassa';

    // Store package data in localStorage for the checkout process
    const checkoutData = {
      packageId: packageId,
      packageSlug: planSlug,
      packageName: packageData.name,
      paymentMethod: validPayment,
      packageDescription: packageData.description,
      // Use snake_case for consistency with API response
      price: finalPrice,
      price_usd: finalPrice,
      price_rub: priceRUBValue,
      price_ils: priceILSValue,
      // Legacy camelCase for backwards compatibility
      priceUSD: finalPrice,
      priceRUB: priceRUBValue,
      priceILS: priceILSValue,
      originalPrice: originalPrice,
      currency: displayCurrency,
      data: packageData.data,
      dataUnit: t('units.gb', 'GB'),
      period: packageData.validity || packageData.period || packageData.duration,
      country_code: countryCode,
      country_codes: packageData.country_codes || (countryCode ? [countryCode] : []),
      countryName: countryName,
      benefits: packageData.benefits || [],
      speed: packageData.speed
    };

    localStorage.setItem('selectedPackage', JSON.stringify(checkoutData));
    router.push(`/checkout?payment=${validPayment}`);
  };

  const formatData = (data, unit) => {
    const gbUnit = unit ?? t('units.gb', 'GB');
    const mbUnit = t('units.mb', 'MB');
    const unlimitedText = t('units.unlimited', 'Unlimited');
    if (!data && data !== 0) return 'N/A';
    if (data === 'Unlimited' || data === 'unlimited' || data === -1) return unlimitedText;
    let numericValue = 0;
    let isMB = false;
    if (typeof data === 'string') {
      const cleaned = data.replace(/GB/gi, '').replace(/MB/gi, '').replace(/гб/gi, '').replace(/мб/gi, '').replace(/\s/g, '');
      numericValue = parseFloat(cleaned) || 0;
      isMB = /MB|мб/i.test(data);
    } else {
      numericValue = parseFloat(data) || 0;
    }
    if (isMB && numericValue >= 1024) {
      const gbValue = numericValue / 1024;
      return `${gbValue.toFixed(gbValue % 1 === 0 ? 0 : 1)} ${gbUnit}`;
    }
    if (isMB) return `${numericValue} ${mbUnit}`;
    return `${numericValue} ${gbUnit}`;
  };

  const getCountryFlag = (countryCode) => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">{t('sharePackage.loadingPackageInfo', 'Loading package information...')}</p>
        </div>
      </div>
    );
  }

  if (!packageData) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Globe size={24} className="text-gray-500 dark:text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('sharePackage.packageNotFound', 'Package Not Found')}</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {t('sharePackage.packageNotFoundDesc', "The package you're looking for doesn't exist or has been removed")}
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-400 dark:hover:bg-blue-500 text-white px-6 py-2 rounded-lg transition-colors"
          >
            {t('sharePackage.backToPlans', 'Back to Plans')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-900/90 backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-gray-700/50 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('sharePackage.packageDetails', 'Package Details')}</h1>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Package Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800/90 backdrop-blur-md shadow-lg rounded-xl overflow-hidden lg:col-span-1 border border-gray-200 dark:border-gray-700/50"
          >
          {/* Package Title */}
          <div className="bg-gray-100 dark:bg-gray-800/90 backdrop-blur-md p-4">
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-300 text-lg">{t('sharePackage.noPhoneNumber', "This eSIM doesn't come with a number")}</p>
            </div>
          </div>
          
          {/* Package Stats */}
          <div className="bg-gray-100 dark:bg-gray-800/90 backdrop-blur-md px-4 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-200/80 dark:bg-gray-700/50 backdrop-blur-sm rounded-lg p-3">
                <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                  <Wifi className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{t('sharePackage.data', 'Data')}</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {(() => {
                        // Try multiple fields like other screens do
                        const dataValue = packageData.data || packageData.dataAmount;
                        
                        // If still not found, try to extract from name
                        if (!dataValue && packageData.name) {
                          const nameMatch = packageData.name.match(/(\d+)\s*GB/i);
                          if (nameMatch) {
                            return formatData(nameMatch[1], packageData.dataUnit || t('units.gb', 'GB'));
                          }
                        }
                        
                        return formatData(dataValue, packageData.dataUnit || t('units.gb', 'GB'));
                      })()}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-200/80 dark:bg-gray-700/50 backdrop-blur-sm rounded-lg p-3">
                <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                  <Clock className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{t('sharePackage.validity', 'Validity')}</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {(() => {
                        const validityValue = packageData.validity || packageData.period || packageData.duration;
                        if (!validityValue) return 'N/A';
                        
                        // Extract just the number from validity (remove any text like "days", "дней", etc.)
                        let numericDays = validityValue;
                        if (typeof validityValue === 'string') {
                          const match = validityValue.match(/(\d+)/);
                          if (match) {
                            numericDays = parseInt(match[1], 10);
                          } else {
                            return validityValue; // Return as-is if no number found
                          }
                        }
                        
                        // Format with proper pluralization using translation
                        const daysNum = parseInt(numericDays, 10);
                        if (isNaN(daysNum)) return validityValue;
                        
                        let daysText = t('units.days', 'дней');
                        if (daysNum > 0) {
                          const mod10 = daysNum % 10;
                          const mod100 = daysNum % 100;
                          if (mod10 === 1 && mod100 !== 11) {
                            daysText = t('units.day', 'день');
                          } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
                            daysText = t('units.days2', 'дня');
                          }
                        }
                        
                        return `${daysNum} ${daysText}`;
                      })()}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-200/80 dark:bg-gray-700/50 backdrop-blur-sm rounded-lg p-3">
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{t('sharePackage.price', 'Price')}</div>
                  <div className="font-semibold text-green-600 dark:text-green-400">
                    {packageData.original_price != null && packageData.original_price > (parseFloat(packageData.price) || 0) ? (
                      <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
                        <span className="text-red-500 line-through text-sm">
                          {formatPriceFromItem({
                            price: packageData.original_price,
                            price_rub: packageData.original_price_rub ?? packageData.price_rub,
                            price_ils: packageData.original_price_ils ?? packageData.price_ils,
                          }, displayCurrency).formatted}
                        </span>
                        <span>{formatPriceFromItem(packageData, displayCurrency).formatted}</span>
                      </span>
                    ) : (
                      formatPriceFromItem(packageData, displayCurrency).formatted
                    )}
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-200/80 dark:bg-gray-700/50 backdrop-blur-sm rounded-lg p-3">
                <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                  {(() => {
                    // Check if plan is global or regional
                    const isGlobal = packageData.planType === 'global' || packageData.type === 'global' || 
                                     (packageData.slug && packageData.slug.toLowerCase().startsWith('discover'));
                    const isRegional = packageData.planType === 'regional' || packageData.type === 'regional';
                    
                    // Use Airalo flag URL from package data if available
                    const flagUrl = packageData.flag_url || packageData.flag;
                    const fallbackFlag = urlCountryFlag || (packageData.country_code ? getCountryFlag(packageData.country_code) : '🌍');
                    
                    if (isGlobal) {
                      return <span className="text-2xl">🌍</span>;
                    } else if (isRegional) {
                      return <span className="text-2xl">🗺️</span>;
                    } else if (flagUrl && flagUrl.startsWith('http') && !flagImageError) {
                      // Use Airalo's flag image URL
                      return (
                        <img 
                          src={flagUrl} 
                          alt={packageData.country_name || packageData.country_code || 'Country flag'}
                          className="w-8 h-8 rounded object-cover"
                          onError={() => {
                            // Fallback to emoji if image fails to load
                            setFlagImageError(true);
                          }}
                        />
                      );
                    } else {
                      // Fallback to emoji from URL or generated
                      return <span className="text-2xl">{fallbackFlag}</span>;
                    }
                  })()}
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{t('sharePackage.country', 'Country')}</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {(() => {
                        // Check if plan is global or regional
                        const isGlobal = packageData.planType === 'global' || packageData.type === 'global' || 
                                         (packageData.slug && packageData.slug.toLowerCase().startsWith('discover'));
                        const isRegional = packageData.planType === 'regional' || packageData.type === 'regional';
                        
                        if (isGlobal) {
                          return t('home.globalPlans', 'Global');
                        } else if (isRegional) {
                          return packageData.region || packageData.region_slug || t('home.regionalPlans', 'Regional');
                        } else {
                          // Use locale: en -> country_name, ru -> country_name_ru, he -> country_name_he, ar -> country_name_ar
                          const byLocale = locale === 'ru' ? (packageData.country_name_ru || packageData.country_name)
                            : locale === 'he' ? (packageData.country_name_he || packageData.country_name)
                            : locale === 'ar' ? (packageData.country_name_ar || packageData.country_name)
                            : (packageData.country_name || packageData.country_name_ru);
                          return byLocale || urlCountryCode || packageData.country_code || packageData.country || 'N/A';
                        }
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Regional: sub-region selector (Asia, Europe, CIS, etc.) */}
          {(packageData?.plan_type === 'regional' || packageData?.package_type === 'regional') && regionalSubRegionGroups.length > 0 && (
            <div className="px-4 pb-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">{t('sharePackage.selectRegion', 'Select region')}</h3>
              <div className="flex flex-wrap gap-2">
                {regionalSubRegionGroups.map((group) => {
                  const isCurrent = group.name === selectedSubRegion;
                  return (
                    <button
                      key={group.name}
                      type="button"
                      onClick={() => setSelectedSubRegion(group.name)}
                      className={`px-4 py-2 rounded-lg border text-left transition-colors ${
                        isCurrent
                          ? 'bg-blue-500/30 border-blue-500 dark:border-blue-400 ring-1 ring-blue-500 dark:ring-blue-400'
                          : 'bg-gray-200 dark:bg-gray-700/70 hover:bg-gray-300 dark:hover:bg-gray-600/70 border-gray-300 dark:border-gray-600/50'
                      }`}
                    >
                      <span className="font-medium text-gray-900 dark:text-white">{locale === 'ru' ? group.nameRu : group.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Data tier options: 1GB, 2GB, 5GB, 10GB, 20GB, 50GB */}
          {otherTierPlans.length > 0 && (
            <div className="px-4 pb-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">{t('sharePackage.selectVolume', 'Select data amount')}</h3>
              <div className="flex flex-wrap gap-2">
                {otherTierPlans.map((plan, index) => {
                  const planMB = getDataMB(plan);
                  const currentMB = getDataMB(packageData);
                  const planTier = TIER_MB.find((t) => Math.abs(planMB - t) < 100);
                  const currentTier = TIER_MB.find((t) => Math.abs(currentMB - t) < 100);
                  const isCurrent = planTier != null && planTier === currentTier;
                  const qs = currentQuery();
                  const slug = plan?.slug ?? plan?.package_id ?? plan?.id ?? plan?._id;
                  return (
                    <button
                      key={plan.id || plan.slug || index}
                      type="button"
                      onClick={() => { if (!isCurrent && slug) router.push(`/share-package/${encodeURIComponent(slug)}${qs ? `?${qs}` : ''}`); }}
                      className={`px-4 py-2 rounded-lg border text-left transition-colors ${
                        isCurrent
                          ? 'bg-blue-500/30 border-blue-500 dark:border-blue-400 ring-1 ring-blue-500 dark:ring-blue-400'
                          : 'bg-gray-200 dark:bg-gray-700/70 hover:bg-gray-300 dark:hover:bg-gray-600/70 border-gray-300 dark:border-gray-600/50'
                      }`}
                    >
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatData(plan.data || plan.dataAmount, t('units.gb', 'GB'))}
                      </span>
                      <span className="block text-sm text-green-600 dark:text-green-400">
                        {formatPriceFromItem(plan, displayCurrency).formatted}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Package Actions */}
          <div className="p-6">
            <div className="max-w-2xl mx-auto">
              {/* Get Package Section */}
              <div className="text-center mb-8">
                <h3 className={`text-2xl font-semibold text-gray-900 dark:text-white mb-4 ${isRTL ? 'text-right' : 'text-center'}`}>{t('sharePackage.getThisPackage', 'Get This Package')}</h3>
                <button
                  onClick={handlePurchase}
                  disabled={!packageData}
                  className={`w-full max-w-md mx-auto flex items-center justify-center space-x-3 py-4 px-6 rounded-xl transition-colors font-medium text-lg shadow-lg ${
                    !packageData
                      ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed text-gray-500 dark:text-gray-300'
                      : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-400 dark:hover:bg-blue-500 text-white'
                  }`}
                >
                  <Smartphone className="w-6 h-6" />
                  <span>
                    {!packageData
                      ? t('common.loading', 'Loading...')
                      : t('sharePackage.purchaseNow', 'Purchase Now')}
                  </span>
                </button>
              </div>

            </div>
          </div>
        </motion.div>
        
        {/* Right Column - How to Use */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:block"
        >
          <div className="p-6">
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 text-center">{t('sharePackage.howToUse', 'How to Use')}</h3>
            <div className="space-y-6">
              <div className="flex flex-col items-center text-center">
                <div className="bg-yellow-400/20 backdrop-blur-sm p-3 rounded-full mb-3">
                  <Zap className="w-8 h-8 text-yellow-500 dark:text-yellow-400" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{t('sharePackage.instantActivation', 'Instant Activation')}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">{t('sharePackage.instantActivationDesc', 'Get connected immediately after purchase')}</p>
              </div>
              
              <div className="flex flex-col items-center text-center">
                <div className="bg-green-400/20 backdrop-blur-sm p-3 rounded-full mb-3">
                  <Shield className="w-8 h-8 text-green-500 dark:text-green-400" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{t('sharePackage.secureReliable', 'Secure & Reliable')}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">{t('sharePackage.secureReliableDesc', 'Trusted by millions of travelers worldwide')}</p>
              </div>
              
              <div className="flex flex-col items-center text-center">
                <div className="bg-blue-400/20 backdrop-blur-sm p-3 rounded-full mb-3">
                  <Globe className="w-8 h-8 text-blue-500 dark:text-blue-400" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{t('sharePackage.globalCoverage', 'Global Coverage')}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">{t('sharePackage.globalCoverageDesc', 'Stay connected wherever you go')}</p>
              </div>
            </div>
          </div>
        </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SharePackagePage;
