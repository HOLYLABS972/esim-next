// Supported languages (max 7); Russian and Hebrew are required. Countries are translated for all.
export const supportedLanguages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
];

export const supportedLanguageCodes = supportedLanguages.map(lang => lang.code);

/**
 * Domain to language mapping
 * Maps domains to their default language
 */
export const domainLanguageMap = {
  'ru.roamjet.net': 'ru',
  'esim.roamjet.net': 'en',
  'www.roamjet.net': 'en',
  'roamjet.net': 'en',
  // Add more domains as needed
  'ar.roamjet.net': 'ar',
  'he.roamjet.net': 'he',
  'de.roamjet.net': 'de',
  'fr.roamjet.net': 'fr',
  'es.roamjet.net': 'es',
};

/**
 * Detect language from domain
 * @param {string} hostname - Domain hostname (e.g., 'ru.roamjet.net')
 * @returns {string|null} - Language code or null if not found
 */
export const detectLanguageFromDomain = (hostname) => {
  if (!hostname) return null;

  // Remove www. prefix if present for matching
  const cleanHostname = hostname.replace(/^www\./, '');

  // Check direct match first
  if (domainLanguageMap[hostname]) {
    return domainLanguageMap[hostname];
  }

  // Check cleaned hostname
  if (domainLanguageMap[cleanHostname]) {
    return domainLanguageMap[cleanHostname];
  }

  // Extract subdomain and check if it's a language code
  const subdomain = hostname.split('.')[0];
  if (supportedLanguageCodes.includes(subdomain)) {
    return subdomain;
  }

  return null;
};

/**
 * Language to domain mapping (reverse of domainLanguageMap)
 */
export const languageToDomainMap = {
  'en': 'esim.roamjet.net',
  'ru': 'ru.roamjet.net',
  'ar': 'ar.roamjet.net',
  'he': 'he.roamjet.net',
  'de': 'de.roamjet.net',
  'fr': 'fr.roamjet.net',
  'es': 'es.roamjet.net'
};

/**
 * Get domain for a language code
 * @param {string} languageCode - Language code (e.g., 'ru', 'en')
 * @returns {string} - Domain for that language
 */
export const getDomainForLanguage = (languageCode) => {
  return languageToDomainMap[languageCode] || languageToDomainMap['en'];
};

/**
 * Build cross-domain URL for language switch
 * @param {string} languageCode - Target language code
 * @param {string} currentPath - Current path (will be cleaned of language prefixes)
 * @param {string} protocol - Protocol (http: or https:), defaults to https:
 * @returns {string} - Full URL with domain and path
 */
export const buildLanguageDomainUrl = (languageCode, currentPath = '/', protocol = 'https:') => {
  const targetDomain = getDomainForLanguage(languageCode);

  // Clean the path - remove language prefixes
  let cleanPath = currentPath;
  const languagePrefixes = ['/he', '/ar', '/ru', '/de', '/fr', '/es', '/hebrew', '/arabic', '/russian', '/german', '/french', '/spanish'];

  for (const prefix of languagePrefixes) {
    if (cleanPath.startsWith(prefix)) {
      cleanPath = cleanPath.substring(prefix.length) || '/';
      break;
    }
  }

  // Ensure cleanPath starts with /
  if (!cleanPath.startsWith('/')) {
    cleanPath = '/' + cleanPath;
  }

  return `${protocol}//${targetDomain}${cleanPath}`;
};

/**
 * Detect current language from URL path
 * @param {string} pathname - Current pathname (e.g., '/es/blog', '/blog', '/fr/blog/post-slug')
 * @returns {string} - Language code (e.g., 'es', 'en', 'fr')
 */
export const detectLanguageFromPath = (pathname) => {
  if (!pathname) return 'en';

  // Remove leading slash and split path
  const pathSegments = pathname.replace(/^\//, '').split('/');
  const firstSegment = pathSegments[0];

  // Check if first segment matches a language code directly
  if (supportedLanguageCodes.includes(firstSegment)) {
    return firstSegment;
  }

  // Check if first segment matches old language route names (for backward compatibility)
  const languageRoutes = {
    'spanish': 'es',
    'french': 'fr',
    'german': 'de',
    'arabic': 'ar',
    'hebrew': 'he',
    'russian': 'ru'
  };

  return languageRoutes[firstSegment] || 'en';
};

/**
 * Get language name from code
 * @param {string} code - Language code
 * @returns {string} - Language name
 */
export const getLanguageName = (code) => {
  const language = supportedLanguages.find(lang => lang.code === code);
  return language ? language.name : 'English';
};

/**
 * Get language flag from code
 * @param {string} code - Language code
 * @returns {string} - Language flag emoji
 */
export const getLanguageFlag = (code) => {
  const language = supportedLanguages.find(lang => lang.code === code);
  return language ? language.flag : '🇺🇸';
};

/**
 * Get text direction for language
 * @param {string} code - Language code
 * @returns {string} - 'rtl' or 'ltr'
 */
export const getLanguageDirection = (code) => {
  const rtlLanguages = ['ar', 'he']; // Arabic and Hebrew are RTL
  return rtlLanguages.includes(code) ? 'rtl' : 'ltr';
};

/**
 * Generate localized blog URL
 * @param {string} slug - Blog post slug
 * @param {string} language - Language code
 * @returns {string} - Localized URL
 */
export const getLocalizedBlogUrl = (slug, language = 'en') => {
  if (language === 'en') {
    return `/blog/${slug}`;
  }

  // Use language codes directly in URLs
  if (supportedLanguageCodes.includes(language)) {
    return `/${language}/blog/${slug}`;
  }

  return `/blog/${slug}`;
};

/**
 * Generate localized blog list URL
 * @param {string} language - Language code
 * @returns {string} - Localized blog list URL
 */
export const getLocalizedBlogListUrl = (language = 'en') => {
  if (language === 'en') {
    return '/blog';
  }

  // Use language codes directly in URLs
  if (supportedLanguageCodes.includes(language)) {
    return `/${language}/blog`;
  }

  return '/blog';
};

/**
 * Format data and duration with proper pluralization and translation
 * @param {number} data - Data amount in GB
 * @param {number} days - Number of days
 * @param {object} t - Translation function from I18nContext
 * @param {string} locale - Current locale
 * @returns {string} - Formatted string like "1GB • 7 Days" or "1ГБ • 7 дней"
 */
export const formatDataAndDays = (data, days, t, locale) => {
  console.log('🔧 formatDataAndDays called with:', { data, days, locale });

  // Handle undefined/null data
  if (data === undefined || data === null || data === '') {
    console.warn('⚠️ formatDataAndDays: data is undefined/null/empty');
    return t('plans.noDataAvailable', 'Данные недоступны');
  }

  // Handle combined string format like "1GB - 7days", "1GB-7days", "1GB • 7 days", or "5GB • 60 days"
  if (typeof data === 'string' && (data.includes('days') || data.includes('Days') || data.includes('дней') || data.includes('GB') || data.includes('gb'))) {
    // Extract both data and days from combined string - handle various separators: -, –, —, •, space
    // Try multiple patterns to catch different formats
    const patterns = [
      /(\d+)\s*(?:GB|ГБ|gb|гб)\s*[·•]\s*(\d+)\s*(?:days?|Days?|дней?|дня|день)/i,  // "5GB · 60 days" or "5GB • 60 days"
      /(\d+)\s*(?:GB|ГБ|gb|гб)\s*[-–—]\s*(\d+)\s*(?:days?|Days?|дней?|дня|день)/i,  // "5GB - 60 days"
      /(\d+)\s*(?:GB|ГБ|gb|гб)\s+(\d+)\s*(?:days?|Days?|дней?|дня|день)/i,  // "5GB 60 days" (space separator)
      /(\d+)\s*(?:GB|ГБ|gb|гб)\s*[-–—•·]?\s*(\d+)\s*(?:days?|Days?|дней?|дня|день)/i,  // More flexible
    ];

    for (const pattern of patterns) {
      const match = data.match(pattern);
      if (match) {
        const extractedData = match[1];
        const extractedDays = match[2];
        // Recursively call with extracted values
        return formatDataAndDays(extractedData, extractedDays, t, locale);
      }
    }

    // If no match found, try to translate GB and days in the string directly
    let translated = data;
    if (locale === 'ru') {
      // Translate GB to ГБ (handle both standalone and in context)
      translated = translated.replace(/(\d+)\s*GB\b/gi, (match, num) => `${num}${t('units.gb', 'ГБ')}`);
      translated = translated.replace(/(\d+)\s*gb\b/gi, (match, num) => `${num}${t('units.gb', 'ГБ')}`);
      translated = translated.replace(/\bGB\b/g, t('units.gb', 'ГБ'));
      translated = translated.replace(/\bgb\b/gi, t('units.gb', 'ГБ'));

      // Translate days with proper pluralization (handle various separators: ·, •, -, space)
      translated = translated.replace(/(\d+)\s*[·•-]?\s*days?\b/gi, (match, num) => {
        const daysNum = parseInt(num, 10);
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
      });
      translated = translated.replace(/(\d+)\s*[·•-]?\s*Days?\b/g, (match, num) => {
        const daysNum = parseInt(num, 10);
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
      });
      // Replace separator · with • for consistency
      translated = translated.replace(/·/g, '•');
      return translated;
    }
  }

  // Handle unlimited plans
  if (data === 'unlimited' || data === 'Unlimited' || data === -1) {
    // Extract numeric days value - remove any day text first
    let numericDays = days || 0;
    if (typeof days === 'string') {
      // Remove any day-related text (English and Russian) and extract just the number
      const cleanedDays = days
        .replace(/days?/gi, '') // Remove "day" or "days"
        .replace(/дней?/gi, '') // Remove "дней" or "дня"
        .replace(/день/gi, '') // Remove "день"
        .replace(/\s+/g, '') // Remove all whitespace
        .trim();

      const daysMatch = cleanedDays.match(/(\d+)/);
      if (daysMatch) {
        numericDays = parseInt(daysMatch[1], 10);
      } else {
        // Try original string if cleaned version doesn't work
        const originalMatch = days.match(/(\d+)/);
        if (originalMatch) {
          numericDays = parseInt(originalMatch[1], 10);
        } else {
          numericDays = 0;
        }
      }
    }

    // Get proper pluralization for Russian
    let daysText;
    if (locale === 'ru') {
      const daysMod10 = numericDays % 10;
      const daysMod100 = numericDays % 100;
      if (daysMod10 === 1 && daysMod100 !== 11) {
        daysText = t('units.day', 'день');
      } else if (daysMod10 >= 2 && daysMod10 <= 4 && (daysMod100 < 10 || daysMod100 >= 20)) {
        daysText = t('units.days2', 'дня');
      } else {
        daysText = t('units.days', 'дней');
      }
    } else {
      daysText = numericDays === 1 ? t('units.day', 'day') : t('units.days', 'days');
    }

    return `${t('plans.unlimited', 'Безлимитный')} • ${numericDays} ${daysText}`;
  }

  // Extract numeric value from data if it's a string like "1GB" or "1 ГБ"
  let numericData = data;
  if (typeof data === 'string') {
    const match = data.match(/(\d+)/);
    if (match) {
      numericData = match[1];
    } else {
      console.warn('⚠️ formatDataAndDays: could not extract number from data:', data);
      return t('plans.noDataAvailable', 'Данные недоступны');
    }
  }

  // Ensure days is a valid number - extract number if it's a string like "7 дней", "7 days", "365 Days", etc.
  let numericDays = days || 0;
  if (typeof days === 'string') {
    // Remove any day-related text (English and Russian) and extract just the number
    const cleanedDays = days
      .replace(/days?/gi, '') // Remove "day" or "days"
      .replace(/дней?/gi, '') // Remove "дней" or "дня"
      .replace(/день/gi, '') // Remove "день"
      .replace(/\s+/g, '') // Remove all whitespace
      .trim();

    const daysMatch = cleanedDays.match(/(\d+)/);
    if (daysMatch) {
      numericDays = parseInt(daysMatch[1], 10);
    } else {
      // Try original string if cleaned version doesn't work
      const originalMatch = days.match(/(\d+)/);
      if (originalMatch) {
        numericDays = parseInt(originalMatch[1], 10);
      } else {
        numericDays = 0;
      }
    }
  } else if (typeof days === 'number') {
    numericDays = days;
  }

  // Get unit abbreviations - force Russian if locale is ru
  const gbUnit = locale === 'ru' ? 'ГБ' : t('units.gb', 'ГБ');
  const daysUnit = numericDays === 1 ?
    (locale === 'ru' ? 'день' : t('units.day', 'день')) :
    (locale === 'ru' ? 'дней' : t('units.days', 'дней'));

  console.log('🔧 formatDataAndDays units:', { gbUnit, daysUnit });

  // Handle Russian pluralization for days
  if (locale === 'ru') {
    let daysText;
    const daysMod10 = numericDays % 10;
    const daysMod100 = numericDays % 100;

    if (daysMod10 === 1 && daysMod100 !== 11) {
      daysText = 'день';
    } else if (daysMod10 >= 2 && daysMod10 <= 4 && (daysMod100 < 10 || daysMod100 >= 20)) {
      daysText = 'дня';
    } else {
      daysText = 'дней';
    }

    let result = `${numericData}${gbUnit} • ${numericDays} ${daysText}`;
    // Ensure any remaining GB/Days text is translated (in case of edge cases)
    result = result.replace(/\bGB\b/g, gbUnit);
    result = result.replace(/\bgb\b/gi, gbUnit);
    result = result.replace(/\bDays?\b/g, daysText);
    result = result.replace(/\bdays?\b/gi, daysText);
    result = result.replace(/·/g, '•'); // Normalize separator
    console.log('🔧 formatDataAndDays result (Russian):', result);
    return result;
  }

  // For other languages, use simple pluralization
  let result = `${numericData}${gbUnit} • ${numericDays} ${daysUnit}`;
  // Ensure any remaining GB/Days text is translated (in case of edge cases)
  result = result.replace(/\bGB\b/g, gbUnit);
  result = result.replace(/\bgb\b/gi, gbUnit);
  result = result.replace(/\bDays?\b/g, daysUnit);
  result = result.replace(/\bdays?\b/gi, daysUnit);
  console.log('🔧 formatDataAndDays result (other):', result);
  return result;
};