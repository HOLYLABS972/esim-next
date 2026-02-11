'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Globe, Star, Check, SortAsc, Smartphone, Map } from 'lucide-react';
import BottomSheet from './BottomSheet';
import { useAuth } from '../contexts/AuthContext';
// import { getRegularSettings } from '../services/settingsService'; // Removed - causes client-side issues
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useI18n } from '../contexts/I18nContext';
import { getLanguageDirection, detectLanguageFromPath } from '../utils/languageUtils';
import { formatPriceFromItem, getDisplayAmountFromItem, formatPrice } from '../services/currencyService';
import { useBrand } from '../contexts/BrandContext';
import { formatDataAndDays } from '../utils/languageUtils';
import { translateDescriptionToRussian, getHumanFriendlyPlanName } from '../utils/planTranslations';

const PlanCard = ({ plan, isSelected, onClick, index, regularSettings, displayCurrency }) => {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const currency = displayCurrency || 'RUB';

  // Use locale from context first (set from URL ?language=), then pathname
  const currentLanguage = locale || (pathname.startsWith('/en/') || pathname === '/en' ? 'en' : pathname.startsWith('/ru') ? 'ru' : pathname.startsWith('/he') ? 'he' : pathname.startsWith('/ar') ? 'ar' : pathname.startsWith('/de') ? 'de' : pathname.startsWith('/fr') ? 'fr' : pathname.startsWith('/es') ? 'es' : 'ru');
  const isRTL = getLanguageDirection(currentLanguage) === 'rtl';

  // Use stored column for display currency (no client conversion, like Russian currency)
  const { amount: originalAmount } = getDisplayAmountFromItem(plan, currency);
  const discountPercentage = regularSettings?.discountPercentage || 0;
  const minimumPrice = regularSettings?.minimumPrice || 0.5;
  const discountedAmount = Math.max(minimumPrice, originalAmount * (100 - discountPercentage) / 100);
  const hasDiscount = discountedAmount < originalAmount;

  // Extract data and days from plan name or object - clean extraction
  const extractedData = (() => {
    if (plan.data) {
      // If plan.data is a string like "1024MB" or "1GB"
      const dataStr = String(plan.data);
      
      // Check for MB format
      const mbMatch = dataStr.match(/(\d+)\s*MB/i);
      if (mbMatch) {
        const mb = parseInt(mbMatch[1]);
        if (mb === 0) return 'unlimited'; // 0MB means unlimited
        // Convert MB to GB if >= 1024MB
        if (mb >= 1024) {
          return mb / 1024; // Return as GB
        }
        return mb; // Return as MB
      }
      
      // Check for GB format
      const gbMatch = dataStr.match(/(\d+)\s*GB/i);
      if (gbMatch) {
        const gb = parseInt(gbMatch[1]);
        if (gb === 0) return 'unlimited'; // 0GB means unlimited
        return gb;
      }
      
      // Just a number - treat as MB
      const numMatch = dataStr.match(/(\d+)/);
      if (numMatch) {
        const num = parseInt(numMatch[1]);
        if (num === 0) return 'unlimited'; // 0 means unlimited
        if (num >= 1024) return num / 1024; // Convert to GB
        return num;
      }
      
      return 1;
    }
    // Extract from plan name
    const nameMatch = plan.name?.match(/(\d+)\s*GB/i);
    if (nameMatch) {
      const gb = parseInt(nameMatch[1]);
      if (gb === 0) return 'unlimited';
      return gb;
    }
    return 1;
  })();
  const extractedDays = (() => {
    let days = plan.validity || plan.period || plan.duration;

    // If days is a string like "30 Days" or "30 дней", extract just the number
    if (typeof days === 'string') {
      const cleanedDays = days
        .replace(/days?/gi, '') // Remove "day" or "days"
        .replace(/дней?/gi, '') // Remove "дней" or "дня"
        .replace(/день/gi, '') // Remove "день"
        .replace(/\s+/g, '') // Remove all whitespace
        .trim();

      const daysMatch = cleanedDays.match(/(\d+)/);
      if (daysMatch) {
        return parseInt(daysMatch[1], 10);
      }
    }

    // If days is a number, use it directly
    if (typeof days === 'number') {
      return days;
    }

    // Try to extract from plan name
    const nameMatch = plan.name?.match(/(\d+)\s*days?/i);
    if (nameMatch) {
      return parseInt(nameMatch[1], 10);
    }

    return 7; // Default
  })();

  // console.log('💳 PlanCard calculation:', {
  //   planName: plan.name,
  //   originalPrice,
  //   discountPercentage,
  //   discountedPrice,
  //   hasDiscount
  // });

  // Helper function to get flag emoji from country code
  const getFlagEmoji = (countryCode) => {
    if (!countryCode || countryCode.length !== 2) return null;

    // Handle special cases like PT-MA, multi-region codes, etc.
    if (countryCode.includes('-') || countryCode.length > 2) {
      return null;
    }

    try {
      const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt());

      return String.fromCodePoint(...codePoints);
    } catch (error) {
      console.warn('Invalid country code: ' + countryCode, error);
      return null;
    }
  };

  // Get plan display title - use Russian title if available, otherwise use translation utility
  const getPlanDisplayTitle = () => {
    // Use title_ru if available and current language is Russian
    if (currentLanguage === 'ru' && plan.title_ru) {
      return plan.title_ru;
    }
    
    // Use title if available and current language is not Russian
    if (currentLanguage !== 'ru' && plan.title) {
      return plan.title;
    }
    
    // Use getHumanFriendlyPlanName for plan slugs
    if (plan.slug) {
      const friendlyName = getHumanFriendlyPlanName(plan.slug, currentLanguage);
      if (friendlyName && friendlyName !== plan.slug) {
        return friendlyName;
      }
    }
    
    // Fallback to formatDataAndDays for data/days display
    if (plan.is_unlimited || plan.name?.toLowerCase().includes('unlimited') || plan.data === 'unlimited' || plan.data === 'Unlimited') {
      return formatDataAndDays('unlimited', extractedDays, t, currentLanguage || locale || 'ru');
    }
    
    return formatDataAndDays(extractedData, extractedDays, t, currentLanguage || locale || 'ru');
  };

  // Detect Plan Type for Icon
  const getPlanIcon = () => {
    const packageType = (plan.package_type || '').toLowerCase();

    // Global Plan Detection
    if (packageType === 'global') {
      return <Globe className="w-8 h-8 text-blue-400" />;
    }

    // Regional Plan Detection
    if (packageType === 'regional') {
      return <Map className="w-8 h-8 text-blue-400" />;
    }

    // For country plans, show flag if available
    const countryCode = plan.country_code || plan.country_id || (plan.country_codes && plan.country_codes[0]);
    if (countryCode && countryCode.length === 2) {
      const flagEmoji = getFlagEmoji(countryCode);
      if (flagEmoji) {
        return <span className="text-3xl">{flagEmoji}</span>;
      }
    }

    // Default SIM Icon
    return (
      <svg
        className="w-8 h-8 text-blue-400"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zM4 6h16v12H4V6zm2 3h4v2H6V9zm6 0h4v2h-4V9zm-6 4h4v2H6v-2zm6 0h4v2h-4v-2z" />
      </svg>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:border-blue-400 hover:shadow-md ${isSelected
        ? 'border-blue-400 bg-blue-400/10 shadow-lg'
        : 'border-gray-700 bg-gray-800'
        }`}
      onClick={onClick}
    >
      {/* Popular Badge */}
      {plan.popular && (
        <div className={`absolute -top-2 ${isRTL ? '-left-2' : '-right-2'} bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-medium`}>
          <Star size={12} className={`inline ${isRTL ? 'ml-1' : 'mr-1'}`} />
          Популярный
        </div>
      )}


      {/* Plan Header */}
      <div className={`flex items-start justify-between mb-3 ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className={`flex items-start ${isRTL ? 'space-x-reverse space-x-4' : 'space-x-4'}`}>
          <div className="flex-shrink-0 bg-blue-400/20 p-3 rounded-xl">
            {getPlanIcon()}
          </div>
          <div>
            <h3 className={`font-semibold text-white text-lg ${isRTL ? 'text-right' : 'text-left'}`}>
              {getPlanDisplayTitle()}
            </h3>
          </div>
        </div>
        <div className={isRTL ? 'text-left' : 'text-right'}>
          {hasDiscount ? (
            <div>
              <div className="text-2xl font-bold text-green-400">
                {formatPrice(discountedAmount, currency)}
              </div>
              <div className="text-sm text-red-400 line-through">
                {formatPrice(originalAmount, currency)}
              </div>
            </div>
          ) : (
            <div className="text-2xl font-bold text-green-400">
              {formatPrice(originalAmount, currency)}
            </div>
          )}
          <div className="text-xs text-gray-400">
            {currency}
          </div>
        </div>
      </div>

      {/* Plan Features */}
      <div className="space-y-2 mb-4">
        <div className={`flex items-center text-sm text-gray-300 ${isRTL ? 'text-right' : 'text-left'}`}>
          {hasDiscount ? (
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white text-xs px-2 py-1 rounded-full font-medium inline-flex items-center">
              Горячее предложение
            </div>
          ) : null}
        </div>
        {plan.speed && (
          <div className={`flex items-center text-sm text-gray-300 ${isRTL ? 'text-right' : 'text-left'}`}>
            <span>{t('planSelection.upTo', 'До', { speed: plan.speed })}</span>
          </div>
        )}
      </div>

      {/* Plan Benefits */}
      {plan.benefits && plan.benefits.length > 0 && (
        <div className="border-t border-gray-700 pt-3">
          <div className="flex flex-wrap gap-2">
            {plan.benefits.map((benefit, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-1 bg-green-400/20 text-green-400 text-xs rounded-full"
              >
                <Check size={12} className={`${isRTL ? 'ml-1' : 'mr-1'}`} />
                {benefit}
              </span>
            ))}
          </div>
        </div>
      )}


    </motion.div>
  );
};

const PlanSelectionBottomSheet = ({
  isOpen,
  onClose,
  availablePlans,
  loadingPlans,
  filteredCountries
}) => {
  const { userProfile, currentUser, loading } = useAuth();
  const { brand } = useBrand();
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const displayCurrency = brand?.defaultCurrency || 'RUB';
  const brandDiscount = Number(brand?.discountPercentage) ?? 0;
  const [regularSettings, setRegularSettings] = useState({
    discountPercentage: brandDiscount || 0,
    minimumPrice: 0.5
  });
  
  // Filter state: 'all' only (SMS/unlimited filters removed)
  const [planFilter, setPlanFilter] = useState('all');

  // Debug authentication state
  // console.log('🔍 PlanSelectionBottomSheet: currentUser:', currentUser);
  // console.log('🔍 PlanSelectionBottomSheet: loading:', loading);

  // Use locale from context first (set from URL ?language=), then pathname
  const currentLanguage = locale || (pathname.startsWith('/en/') || pathname === '/en' ? 'en' : pathname.startsWith('/ru') ? 'ru' : pathname.startsWith('/he') ? 'he' : pathname.startsWith('/ar') ? 'ar' : pathname.startsWith('/de') ? 'de' : pathname.startsWith('/fr') ? 'fr' : pathname.startsWith('/es') ? 'es' : 'ru');
  const isRTL = getLanguageDirection(currentLanguage) === 'rtl';

  // Same discount as PlanCard; use stored column for display currency (no conversion)
  const getDisplayPriceForCountry = (country) => {
    const { amount } = getDisplayAmountFromItem(country, displayCurrency);
    if (amount == null || amount >= 999 || !Number.isFinite(amount)) return 10;
    const pct = regularSettings?.discountPercentage ?? 0;
    const min = regularSettings?.minimumPrice ?? 0.5;
    return Math.max(min, (amount * (100 - pct)) / 100);
  };

  // Reset filter when bottom sheet opens
  useEffect(() => {
    if (isOpen) {
      setPlanFilter('all');
    }
  }, [isOpen]);

  // Sync discount from brand when it loads (BrandProvider fetches from API)
  useEffect(() => {
    if (brandDiscount > 0 || brand?.discountPercentage === 0) {
      setRegularSettings((prev) => ({ ...prev, discountPercentage: Number(brand?.discountPercentage) ?? prev.discountPercentage }));
    }
  }, [brand?.discountPercentage, brandDiscount]);

  // Load regular settings (discount, minimumPrice) from API when bottom sheet opens
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { getRegularSettings } = await import('../services/settingsServiceClient');
        const regular = await getRegularSettings();
        setRegularSettings((prev) => ({ ...prev, ...regular }));
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    if (isOpen) {
      loadSettings();
      const interval = setInterval(loadSettings, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  // Group countries by specific days (30, 7, 10, 15 days)
  const groupCountriesByDays = (countriesList) => {
    const targetDays = [30, 7, 10, 15];
    const groups = {};

    // Initialize groups for target days
    targetDays.forEach(day => {
      groups[day] = [];
    });

    // Add countries to appropriate day groups with recalculated min prices for specific days
    countriesList.forEach(country => {
      if (country.plans && country.plans.length > 0) {
        country.plans.forEach(plan => {
          const days = plan.validity || plan.period || plan.duration;
          if (targetDays.includes(days)) {
            // Calculate the actual minimum price for this specific day duration
            const dayPlans = country.plans.filter(p => (p.validity || p.period || p.duration) === days);
            const dayMinPrice = dayPlans.length > 0
              ? Math.min(...dayPlans.map(p => parseFloat(p.price) || 999))
              : 999;

            // Debug logging for price calculation
            if (dayPlans.length > 0 && dayMinPrice < 50) {
              console.log(`${country.name} - ${days} days plans:`,
                dayPlans.map(p => ({ name: p.name, price: p.price, validity: p.validity, period: p.period, duration: p.duration })),
                'Min price:', dayMinPrice
              );
            }

            // Check if country already exists in this day group
            const existingCountry = groups[days].find(c => c.id === country.id);
            if (existingCountry) {
              // Update with the better (lower) price if this plan is cheaper
              if (dayMinPrice < existingCountry.dayMinPrice) {
                existingCountry.dayMinPrice = dayMinPrice;
              }
            } else {
              // Add country with the specific day's minimum price
              groups[days].push({
                ...country,
                dayMinPrice: dayMinPrice
              });
            }
          }
        });
      }
    });

    // Sort each group by the specific day's minimum price (cheapest first)
    Object.keys(groups).forEach(day => {
      groups[day].sort((a, b) => (a.dayMinPrice || a.minPrice) - (b.dayMinPrice || b.minPrice));

      // Debug logging for the first few countries in each group
      if (groups[day].length > 0) {
        console.log(`${day} days group - First 3 countries:`,
          groups[day].slice(0, 3).map(c => ({
            name: c.name,
            dayMinPrice: c.dayMinPrice,
            minPrice: c.minPrice
          }))
        );
      }
    });

    return groups;
  };


  // Sort plans by price (cheapest first)
  const sortPlansByPrice = (plans) => {
    return [...plans].sort((a, b) => {
      const priceA = parseFloat(a.price) || 999;
      const priceB = parseFloat(b.price) || 999;
      return priceA - priceB;
    });
  };

  const handlePlanSelect = (plan) => {
    console.log('🔍 DEBUG: handlePlanSelect called');
    console.log('🔍 DEBUG: currentUser:', currentUser);
    console.log('🔍 DEBUG: loading:', loading);
    console.log('🔍 DEBUG: plan:', plan.name);

    // Check if user is logged in - also check localStorage as backup
    const authToken = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    const isAuthenticated = currentUser || (authToken && userData);

    console.log('🔍 DEBUG: Auth check details:', {
      currentUser: !!currentUser,
      authToken: !!authToken,
      userData: !!userData,
      isAuthenticated
    });

    if (!isAuthenticated) {
      console.log('🔐 User not logged in, redirecting to login');

      // Store the intended destination to redirect back after login
      const countryCode = plan.country_codes?.[0] || plan.country_code;
      const countryFlag = countryCode ? (() => {
        const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt());
        return String.fromCodePoint(...codePoints);
      })() : '🌍';

      const slug = plan.slug ?? plan.package_id ?? plan.id;
      const returnParams = new URLSearchParams();
      returnParams.set('country', countryCode || '');
      returnParams.set('flag', countryFlag);
      if (searchParams.get('language')) returnParams.set('language', searchParams.get('language'));
      if (searchParams.get('currency')) returnParams.set('currency', searchParams.get('currency'));
      if (searchParams.get('theme')) returnParams.set('theme', searchParams.get('theme'));
      const returnUrl = `/share-package/${encodeURIComponent(String(slug))}?${returnParams.toString()}`;

      // Get language prefix from pathname
      const langMatch = pathname.match(/^\/(ar|de|es|fr|he|ru)\//);
      const langPrefix = langMatch ? `/${langMatch[1]}` : '';

      console.log('🔍 DEBUG: Redirecting to:', `${langPrefix}/login?returnUrl=${encodeURIComponent(returnUrl)}`);
      // Redirect to login with return URL
      router.push(`${langPrefix}/login?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    // User is logged in, proceed to share package page
    console.log('✅ User logged in, proceeding to checkout');
    const countryCode = plan.country_codes?.[0] || plan.country_code;
    const countryFlag = countryCode ? (() => {
      const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt());
      return String.fromCodePoint(...codePoints);
    })() : '🌍';

    // Navigate to the share package page with country, language, currency, theme
    const params = new URLSearchParams();
    params.set('country', countryCode || '');
    params.set('flag', countryFlag);
    if (searchParams.get('language')) params.set('language', searchParams.get('language'));
    if (searchParams.get('currency')) params.set('currency', searchParams.get('currency'));
    if (searchParams.get('theme')) params.set('theme', searchParams.get('theme'));

    // Get language prefix from pathname to preserve language
    const langMatch = pathname.match(/^\/(ar|de|es|fr|he|ru)(?:\/|$)/);
    const langPrefix = langMatch ? `/${langMatch[1]}` : '';

    const slug = plan.slug ?? plan.package_id ?? plan.id;
    console.log('🔍 Language Debug:', {
      pathname,
      langMatch,
      langPrefix,
      finalUrl: `${langPrefix}/share-package/${encodeURIComponent(String(slug))}?${params.toString()}`
    });

    router.push(`${langPrefix}/share-package/${encodeURIComponent(String(slug))}?${params.toString()}`);
  };


  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Выберите ваш тариф"
      maxHeight="85vh"
    >
      <div className="p-6" dir={isRTL ? 'rtl' : 'ltr'}>

        {/* Available Plans or Countries */}
        {loadingPlans ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p className={`text-gray-300 ${isRTL ? 'text-right' : 'text-left'}`}>{t('planSelection.loadingPlans', 'Загрузка доступных планов...')}</p>
            <p className={`text-sm text-gray-400 ${isRTL ? 'text-right' : 'text-left'}`}>{t('planSelection.pleaseWait', 'Пожалуйста, подождите, пока мы получаем лучшие варианты для вас')}</p>
          </div>
        ) : availablePlans.length > 0 ? (
          <div className="space-y-4">
            <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                <Smartphone className="w-5 h-5 text-blue-400" />
                <h4 className={`font-semibold text-white text-lg ${isRTL ? 'text-right' : 'text-left'}`}>
                  Доступные тарифы ({availablePlans.filter(plan => {
                    const pt = (plan.plan_type || plan.package_type || '').toLowerCase();
                    const tl = (plan.title || plan.name || plan.title_ru || plan.slug || plan.package_id || '').toLowerCase();
                    const isTopup = pt === 'topup' || pt === 'top-up' || tl.includes('topup') || tl.includes('top-up') || tl.includes('топ-ап') || tl.includes('топап');
                    return !isTopup;
                  }).length})
                </h4>
              </div>
              <div className={`flex items-center text-sm text-gray-400 ${isRTL ? 'space-x-reverse space-x-1' : 'space-x-1'}`}>
                <SortAsc className="w-4 h-4" />
                <span>Сортировка по цене</span>
              </div>
            </div>

            {sortPlansByPrice((() => {
              // Filter plans based on selected filter
              let filtered = availablePlans;
              
              // Always exclude topups - comprehensive check (STRICT FILTER)
              filtered = filtered.filter(plan => {
                // Check all possible topup indicators
                const planType = (plan.plan_type || plan.package_type || '').toLowerCase();
                const titleLower = (plan.title || plan.name || plan.title_ru || '').toLowerCase();
                const descriptionLower = (plan.description || '').toLowerCase();
                const nameLower = (plan.name || '').toLowerCase();
                // CRITICAL: Check slug/package_id separately - this is where topups are usually identified
                const slugLower = (plan.slug || plan.package_id || '').toLowerCase();
                
                // Comprehensive topup detection - CHECK SLUG FIRST
                const isTopup = 
                  plan.is_topup === true || 
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
                  descriptionLower.includes('топап') ||
                  nameLower.includes('topup') ||
                  nameLower.includes('top-up') ||
                  nameLower.includes('top up') ||
                  nameLower.includes('топ-ап') ||
                  nameLower.includes('топап');
                
                if (isTopup) {
                  console.log('🚫 BottomSheet: Filtered out topup plan:', {
                    id: plan.id,
                    slug: plan.slug || plan.package_id,
                    title: plan.title || plan.name,
                    planType: plan.plan_type || plan.package_type
                  });
                }
                
                return !isTopup;
              });
              
              // Apply selected filter
              if (planFilter === 'data') {
                filtered = filtered.filter(plan => {
                  // Check for unlimited - check database field and all text fields
                  const titleLower = (plan.title || plan.name || plan.title_ru || plan.slug || plan.description || '').toLowerCase();
                  const isUnlimited = plan.is_unlimited === true || 
                                    titleLower.includes('unlimited') ||
                                    titleLower.includes('безлимит') ||
                                    titleLower.startsWith('unlimited') ||
                                    (plan.data_amount_mb === 0 && plan.data_amount_mb !== null);
                  // Check for SMS - check database field and all text fields
                  const hasSms = plan.sms_included === true || 
                               titleLower.includes('sms') ||
                               titleLower.includes('сокращенные') || // Russian for SMS
                               /\d+\s*sms/i.test(plan.title || plan.name || plan.title_ru || '') ||
                               /\d+\s*-\s*\d+\s*sms/i.test(plan.title || plan.name || plan.title_ru || '');
                  return !isUnlimited && !hasSms;
                });
              } else if (planFilter === 'unlimited') {
                filtered = filtered.filter(plan => {
                  const titleLower = (plan.title || plan.name || plan.title_ru || plan.slug || plan.description || '').toLowerCase();
                  return plan.is_unlimited === true || 
                         titleLower.includes('unlimited') ||
                         titleLower.includes('безлимит') ||
                         titleLower.startsWith('unlimited') ||
                         titleLower.includes('unlimited -') ||
                         (plan.data_amount_mb === 0 && plan.data_amount_mb !== null);
                });
              } else if (planFilter === 'sms') {
                filtered = filtered.filter(plan => {
                  const titleLower = (plan.title || plan.name || plan.title_ru || plan.slug || plan.description || '').toLowerCase();
                  return plan.sms_included === true || 
                         titleLower.includes('sms') ||
                         titleLower.includes('сокращенные') || // Russian for SMS
                         /\d+\s*sms/i.test(plan.title || plan.name || plan.title_ru || '') ||
                         /\d+\s*-\s*\d+\s*sms/i.test(plan.title || plan.name || plan.title_ru || '');
                });
              }
              
              return filtered;
            })()).map((plan, index) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                index={index}
                regularSettings={regularSettings}
                displayCurrency={displayCurrency}
                onClick={() => handlePlanSelect(plan)}
              />
            ))}
          </div>
        ) : filteredCountries && filteredCountries.length > 0 ? (
          <div className="space-y-6">
            <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                <Smartphone className="w-5 h-5 text-blue-400" />
                <h4 className={`font-semibold text-white text-lg ${isRTL ? 'text-right' : 'text-left'}`}>
                  Доступные тарифы
                </h4>
              </div>
              <div className={`flex items-center text-sm text-gray-400 ${isRTL ? 'space-x-reverse space-x-1' : 'space-x-1'}`}>
                <SortAsc className="w-4 h-4" />
                <span>Сортировка по цене</span>
              </div>
            </div>

            {/* Auto-grouped Display by Days */}
            {(() => {
              // console.log('🔍 PlanSelectionBottomSheet - Data source check:');
              // console.log('Filtered countries count:', filteredCountries?.length);
              // console.log('Sample countries:', filteredCountries?.slice(0, 3));

              const grouped = groupCountriesByDays(filteredCountries);
              const orderedDays = [30, 7, 10, 15]; // Display order

              return orderedDays.map((days, groupIndex) => {
                const countries = grouped[days] || [];
                if (countries.length === 0) return null;

                return (
                  <div key={days} className="space-y-4">
                    {/* Divider and Header */}
                    {groupIndex > 0 && (
                      <div className="border-t border-gray-700 my-6"></div>
                    )}

                    <div className="text-center">
                      <h5 className="text-xl font-bold text-white">
                        Тарифы на {days} {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}
                      </h5>
                      <p className="text-sm text-gray-400 mt-1">
                        Доступно {countries.length} {countries.length === 1 ? 'страна' : countries.length < 5 ? 'страны' : 'стран'}
                      </p>
                    </div>

                    {/* Countries Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {countries.map((country) => (
                        <div key={`${days}-${country.id}`} className="col-span-1">
                          <button
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-4 text-left hover:border-blue-400 hover:scale-105"
                            onClick={() => {
                              // This would trigger loading plans for the country
                              console.log('Selected country:', country.name, 'for', days, 'days');
                            }}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="country-flag-display flex-shrink-0">
                                {country.flag && country.flag.startsWith('http') ? (
                                  <img 
                                    src={country.flag} 
                                    alt={`${country.name} flag`}
                                    className="w-10 h-10 rounded object-cover"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      if (country.flagEmoji) {
                                        e.target.parentElement.innerHTML = `<span class="country-flag-emoji text-3xl">${country.flagEmoji}</span>`;
                                      }
                                    }}
                                  />
                                ) : country.flagEmoji ? (
                                  <span className="country-flag-emoji text-3xl">
                                    {country.flagEmoji}
                                  </span>
                                ) : (
                                  <div className="country-code-avatar w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">
                                      {country.code || '??'}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 text-left">
                                <h6 className="font-semibold text-white text-sm mb-1">
                                  {country.name}
                                </h6>
                                <div className="flex items-center justify-between">
                                  <span className="text-blue-400 font-bold text-lg">
                                    {formatPrice(getDisplayPriceForCountry(country), displayCurrency)}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    {country.plansCount || 0} тарифов
                                  </span>
                                </div>
                              </div>
                            </div>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Тарифы недоступны</h3>
            <p className="text-gray-400 mb-4">
              Мы не смогли найти тарифы для вашего выбора
            </p>
            <p className="text-sm text-gray-500">
              Попробуйте изменить фильтры или выбрать другую страну
            </p>
          </div>
        )}

        {/* Bottom Spacing */}
        <div className="h-6" />
      </div>
    </BottomSheet>
  );
};

export default PlanSelectionBottomSheet;
