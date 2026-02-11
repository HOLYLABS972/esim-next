/**
 * Utility functions for country code and name mapping
 */

import { edgeFunctions } from '../services/edgeFunctionService';

// Cache for country data to avoid repeated API calls
let countriesCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get country name from country code
 * @param {string} countryCode - ISO country code (e.g., 'NL', 'US')
 * @returns {Promise<string>} - Country name or the code if not found
 */
export async function getCountryNameFromCode(countryCode) {
  if (!countryCode) return null;
  
  try {
    // Check cache first
    const now = Date.now();
    if (countriesCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
      const country = countriesCache.find(c => c.code === countryCode);
      if (country) return country.name;
    }
    
    // Fetch from Edge Function
    try {
      const data = await edgeFunctions.getCountries();
      if (data.success && data.data?.countries) {
        // Update cache
        countriesCache = data.data.countries;
        cacheTimestamp = now;
        
        const country = countriesCache.find(c => c.code === countryCode);
        if (country) return country.name;
      }
    } catch (error) {
      console.warn('Could not fetch countries from Edge Function:', error);
    }
  } catch (error) {
    console.warn('Could not fetch country name from API:', error);
  }
  
  // Fallback to basic mapping
  return getBasicCountryName(countryCode);
}

/**
 * Get country code from country name
 * @param {string} countryName - Country name (e.g., 'Netherlands', 'United States')
 * @returns {Promise<string>} - Country code or null if not found
 */
export async function getCountryCodeFromName(countryName) {
  if (!countryName) return null;
  
  try {
    // Check cache first
    const now = Date.now();
    if (countriesCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
      const country = countriesCache.find(c => 
        c.name.toLowerCase() === countryName.toLowerCase()
      );
      if (country) return country.code;
    }
    
    // Fetch from API
    const response = await fetch('/api/public/countries');
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data?.countries) {
        // Update cache
        countriesCache = data.data.countries;
        cacheTimestamp = now;
        
        const country = countriesCache.find(c => 
          c.name.toLowerCase() === countryName.toLowerCase()
        );
        if (country) return country.code;
      }
    }
  } catch (error) {
    console.warn('Could not fetch country code from API:', error);
  }
  
  // Fallback to basic mapping
  return getBasicCountryCode(countryName);
}

/**
 * Basic country name mapping for common countries (fallback).
 * Exported for use in API routes that rely only on esim_packages (no esim_countries).
 */
export function getBasicCountryName(countryCode) {
  const basicCountryMap = {
    // Europe
    'NL': 'Netherlands',
    'DE': 'Germany',
    'FR': 'France',
    'ES': 'Spain',
    'IT': 'Italy',
    'GB': 'United Kingdom',
    'IE': 'Ireland',
    'PT': 'Portugal',
    'BE': 'Belgium',
    'AT': 'Austria',
    'CH': 'Switzerland',
    'SE': 'Sweden',
    'NO': 'Norway',
    'DK': 'Denmark',
    'FI': 'Finland',
    'PL': 'Poland',
    'CZ': 'Czech Republic',
    'HU': 'Hungary',
    'SK': 'Slovakia',
    'SI': 'Slovenia',
    'HR': 'Croatia',
    'RO': 'Romania',
    'BG': 'Bulgaria',
    'GR': 'Greece',
    'CY': 'Cyprus',
    'MT': 'Malta',
    'LU': 'Luxembourg',
    'EE': 'Estonia',
    'LV': 'Latvia',
    'LT': 'Lithuania',
    
    // North America
    'US': 'United States',
    'CA': 'Canada',
    'MX': 'Mexico',
    
    // Asia Pacific
    'JP': 'Japan',
    'KR': 'South Korea',
    'CN': 'China',
    'IN': 'India',
    'AU': 'Australia',
    'NZ': 'New Zealand',
    'SG': 'Singapore',
    'HK': 'Hong Kong',
    'TW': 'Taiwan',
    'TH': 'Thailand',
    'MY': 'Malaysia',
    'ID': 'Indonesia',
    'PH': 'Philippines',
    'VN': 'Vietnam',
    
    // South America
    'BR': 'Brazil',
    'AR': 'Argentina',
    'CL': 'Chile',
    'PE': 'Peru',
    'CO': 'Colombia',
    'VE': 'Venezuela',
    'UY': 'Uruguay',
    'PY': 'Paraguay',
    'BO': 'Bolivia',
    'EC': 'Ecuador',
    'GY': 'Guyana',
    'SR': 'Suriname',
    
    // Middle East & Africa
    'AE': 'United Arab Emirates',
    'SA': 'Saudi Arabia',
    'IL': 'Israel',
    'TR': 'Turkey',
    'EG': 'Egypt',
    'ZA': 'South Africa',
    'NG': 'Nigeria',
    'KE': 'Kenya',
    'MA': 'Morocco',
    'TN': 'Tunisia',
    
    // Others
    'RU': 'Russia',
    'UA': 'Ukraine',
    'BY': 'Belarus',
    'KZ': 'Kazakhstan',
    'UZ': 'Uzbekistan'
  };
  
  return basicCountryMap[countryCode] || countryCode;
}

/**
 * Russian country name mapping (fallback for API routes without esim_countries).
 */
export function getBasicCountryNameRu(countryCode) {
  const map = {
    'NL': 'Нидерланды', 'DE': 'Германия', 'FR': 'Франция', 'ES': 'Испания',
    'IT': 'Италия', 'GB': 'Великобритания', 'IE': 'Ирландия', 'PT': 'Португалия',
    'BE': 'Бельгия', 'AT': 'Австрия', 'CH': 'Швейцария', 'SE': 'Швеция',
    'NO': 'Норвегия', 'DK': 'Дания', 'FI': 'Финляндия', 'PL': 'Польша',
    'CZ': 'Чехия', 'HU': 'Венгрия', 'SK': 'Словакия', 'SI': 'Словения',
    'HR': 'Хорватия', 'RO': 'Румыния', 'BG': 'Болгария', 'GR': 'Греция',
    'CY': 'Кипр', 'MT': 'Мальта', 'LU': 'Люксембург', 'EE': 'Эстония',
    'LV': 'Латвия', 'LT': 'Литва', 'IS': 'Исландия',
    'US': 'США', 'CA': 'Канада', 'MX': 'Мексика',
    'JP': 'Япония', 'KR': 'Южная Корея', 'CN': 'Китай', 'IN': 'Индия',
    'AU': 'Австралия', 'NZ': 'Новая Зеландия', 'SG': 'Сингапур',
    'HK': 'Гонконг', 'TW': 'Тайвань', 'TH': 'Таиланд', 'MY': 'Малайзия',
    'ID': 'Индонезия', 'PH': 'Филиппины', 'VN': 'Вьетнам',
    'BR': 'Бразилия', 'AR': 'Аргентина', 'CL': 'Чили', 'PE': 'Перу',
    'CO': 'Колумбия', 'VE': 'Венесуэла', 'UY': 'Уругвай', 'PY': 'Парагвай',
    'BO': 'Боливия', 'EC': 'Эквадор', 'GY': 'Гайана', 'SR': 'Суринам',
    'AE': 'ОАЭ', 'SA': 'Саудовская Аравия', 'IL': 'Израиль', 'TR': 'Турция',
    'EG': 'Египет', 'ZA': 'ЮАР', 'NG': 'Нигерия', 'KE': 'Кения',
    'MA': 'Марокко', 'TN': 'Тунис',
    'RU': 'Россия', 'UA': 'Украина', 'BY': 'Беларусь',
    'KZ': 'Казахстан', 'UZ': 'Узбекистан',
    'AL': 'Албания', 'AM': 'Армения', 'AZ': 'Азербайджан',
    'BA': 'Босния и Герцеговина', 'GE': 'Грузия', 'ME': 'Черногория',
    'MK': 'Северная Македония', 'RS': 'Сербия', 'XK': 'Косово',
    'MD': 'Молдова', 'AX': 'Аландские острова',
    'BD': 'Бангладеш', 'BN': 'Бруней', 'BT': 'Бутан', 'KH': 'Камбоджа',
    'LA': 'Лаос', 'LK': 'Шри-Ланка', 'MM': 'Мьянма', 'MN': 'Монголия',
    'MV': 'Мальдивы', 'NP': 'Непал', 'PK': 'Пакистан',
    'BH': 'Бахрейн', 'IQ': 'Ирак', 'JO': 'Иордания', 'KW': 'Кувейт',
    'LB': 'Ливан', 'OM': 'Оман', 'QA': 'Катар',
    'FJ': 'Фиджи', 'PG': 'Папуа — Новая Гвинея',
    'GH': 'Гана', 'TZ': 'Танзания', 'UG': 'Уганда',
    'CR': 'Коста-Рика', 'PA': 'Панама', 'DO': 'Доминиканская Республика',
    'JM': 'Ямайка', 'GT': 'Гватемала', 'HN': 'Гондурас', 'SV': 'Сальвадор',
    'NI': 'Никарагуа', 'CU': 'Куба', 'HT': 'Гаити', 'PR': 'Пуэрто-Рико',
    'KG': 'Киргизия', 'TJ': 'Таджикистан', 'TM': 'Туркменистан',
  };
  return map[countryCode] || null;
}

/**
 * Basic country name in Hebrew (fallback for API routes without esim_countries).
 */
export function getBasicCountryNameHe(countryCode) {
  const map = {
    'US': 'ארצות הברית', 'GB': 'בריטניה', 'DE': 'גרמניה', 'FR': 'צרפת',
    'IT': 'איטליה', 'ES': 'ספרד', 'CA': 'קנדה', 'AU': 'אוסטרליה',
    'JP': 'יפן', 'KR': 'דרום קוריאה', 'SG': 'סינגפור', 'HK': 'הונג קונג',
    'TW': 'טייוואן', 'TH': 'תאילנד', 'MY': 'מלזיה', 'ID': 'אינדונזיה',
    'PH': 'פיליפינים', 'VN': 'וייטנאם', 'IN': 'הודו', 'CN': 'סין',
    'BR': 'ברזיל', 'MX': 'מקסיקו', 'AR': 'ארגנטינה', 'CL': 'צ\'ילה',
    'CO': 'קולומביה', 'PE': 'פרו', 'ZA': 'דרום אפריקה', 'NG': 'ניגריה',
    'EG': 'מצרים', 'MA': 'מרוקו', 'KE': 'קניה', 'GH': 'גאנה',
    'RU': 'רוסיה', 'TR': 'טורקיה', 'IL': 'ישראל', 'AE': 'איחוד האמירויות',
    'SA': 'ערב הסעודית', 'KW': 'כווית', 'QA': 'קטאר', 'BH': 'בחריין',
    'OM': 'עומאן', 'JO': 'ירדן', 'LB': 'לבנון', 'CY': 'קפריסין',
    'MT': 'מלטה', 'GR': 'יוון', 'PT': 'פורטוגל', 'NL': 'הולנד',
    'BE': 'בלגיה', 'CH': 'שווייץ', 'AT': 'אוסטריה', 'SE': 'שוודיה',
    'NO': 'נורווגיה', 'DK': 'דנמרק', 'FI': 'פינלנד', 'PL': 'פולין',
    'CZ': 'צ\'כיה', 'HU': 'הונגריה', 'RO': 'רומניה', 'BG': 'בולגריה',
    'HR': 'קרואטיה', 'SI': 'סלובניה', 'SK': 'סלובקיה', 'LT': 'ליטא',
    'LV': 'לטביה', 'EE': 'אסטוניה', 'IE': 'אירלנד', 'IS': 'איסלנד',
    'LU': 'לוקסמבורג', 'NZ': 'ניו זילנד', 'PS': 'פלסטין', 'AL': 'אלבניה',
    'BA': 'בוסניה והרצגובינה', 'AD': 'אנדורה', 'BD': 'בנגלדש',
    'UA': 'אוקראינה', 'MD': 'מולדובה', 'BY': 'בלארוס', 'KZ': 'קזחסטן', 'UZ': 'אוזבקיסטן',
    'GE': 'גאורגיה', 'AM': 'ארמניה', 'AZ': 'אזרבייג\'ן', 'TN': 'תוניסיה',
    'DZ': 'אלג\'יריה', 'KH': 'קמבודיה', 'VE': 'ונצואלה', 'UY': 'אורוגוואי',
    'PY': 'פרגוואי', 'BO': 'בוליביה', 'EC': 'אקוודור', 'CR': 'קוסטה ריקה',
    'PA': 'פנמה', 'DO': 'הרפובליקה הדומיניקנית', 'JM': 'ג\'מייקה',
    'TZ': 'טנזניה', 'UG': 'אוגנדה', 'AX': 'איי אלנד', 'NE': 'ניז\'ר',
    'SN': 'סנגל', 'SC': 'סיישל', 'SD': 'סודן', 'SZ': 'אסווטיני',
    'ZM': 'זמביה', 'BF': 'בורקינה פאסו', 'MQ': 'מרטיניק',
  };
  return map[countryCode] || null;
}

/**
 * Basic country name in Arabic (fallback when esim_countries.country_name_ar is null).
 */
export function getBasicCountryNameAr(countryCode) {
  const map = {
    'US': 'الولايات المتحدة', 'GB': 'المملكة المتحدة', 'DE': 'ألمانيا', 'FR': 'فرنسا',
    'IT': 'إيطاليا', 'ES': 'إسبانيا', 'CA': 'كندا', 'AU': 'أستراليا',
    'JP': 'اليابان', 'KR': 'كوريا الجنوبية', 'SG': 'سنغافورة', 'HK': 'هونغ كونغ',
    'TW': 'تايوان', 'TH': 'تايلاند', 'MY': 'ماليزيا', 'ID': 'إندونيسيا',
    'PH': 'الفلبين', 'VN': 'فيتنام', 'IN': 'الهند', 'CN': 'الصين',
    'BR': 'البرازيل', 'MX': 'المكسيك', 'AR': 'الأرجنتين', 'CL': 'تشيلي',
    'CO': 'كولومبيا', 'PE': 'بيرو', 'ZA': 'جنوب أفريقيا', 'NG': 'نيجيريا',
    'EG': 'مصر', 'MA': 'المغرب', 'KE': 'كينيا', 'GH': 'غانا',
    'RU': 'روسيا', 'TR': 'تركيا', 'IL': 'إسرائيل', 'AE': 'الإمارات العربية المتحدة',
    'SA': 'المملكة العربية السعودية', 'KW': 'الكويت', 'QA': 'قطر', 'BH': 'البحرين',
    'OM': 'عُمان', 'JO': 'الأردن', 'LB': 'لبنان', 'CY': 'قبرص',
    'MT': 'مالطا', 'GR': 'اليونان', 'PT': 'البرتغال', 'NL': 'هولندا',
    'BE': 'بلجيكا', 'CH': 'سويسرا', 'AT': 'النمسا', 'SE': 'السويد',
    'NO': 'النرويج', 'DK': 'الدنمارك', 'FI': 'فنلندا', 'PL': 'بولندا',
    'CZ': 'التشيك', 'HU': 'المجر', 'RO': 'رومانيا', 'BG': 'بلغاريا',
    'HR': 'كرواتيا', 'SI': 'سلوفينيا', 'SK': 'سلوفاكيا', 'LT': 'ليتوانيا',
    'LV': 'لاتفيا', 'EE': 'إستونيا', 'IE': 'أيرلندا', 'IS': 'آيسلندا',
    'LU': 'لوكسمبورغ', 'NZ': 'نيوزيلندا', 'PS': 'فلسطين', 'AL': 'ألبانيا',
    'UA': 'أوكرانيا', 'BY': 'بيلاروس', 'KZ': 'كازاخستان', 'UZ': 'أوزبكستان',
    'GE': 'جورجيا', 'AM': 'أرمينيا', 'AZ': 'أذربيجان', 'TN': 'تونس',
    'DZ': 'الجزائر', 'KH': 'كمبوديا', 'VE': 'فنزويلا', 'UY': 'أوروغواي',
    'PY': 'باراغواي', 'BO': 'بوليفيا', 'EC': 'الإكوادور', 'CR': 'كوستاريكا',
    'PA': 'بنما', 'DO': 'جمهورية الدومينيكان', 'JM': 'جامايكا',
    'TZ': 'تنزانيا', 'UG': 'أوغندا', 'AE': 'الإمارات', 'PK': 'باكستان',
    'BD': 'بنغلاديش', 'LK': 'سريلانكا', 'NP': 'نيبال', 'MM': 'ميانمار',
  };
  return map[countryCode] || null;
}

/**
 * Basic country code mapping for common countries (fallback)
 */
function getBasicCountryCode(countryName) {
  const name = countryName.toLowerCase();
  const basicCodeMap = {
    'netherlands': 'NL',
    'germany': 'DE',
    'france': 'FR',
    'spain': 'ES',
    'italy': 'IT',
    'united kingdom': 'GB',
    'ireland': 'IE',
    'portugal': 'PT',
    'belgium': 'BE',
    'austria': 'AT',
    'switzerland': 'CH',
    'sweden': 'SE',
    'norway': 'NO',
    'denmark': 'DK',
    'finland': 'FI',
    'poland': 'PL',
    'czech republic': 'CZ',
    'hungary': 'HU',
    'slovakia': 'SK',
    'slovenia': 'SI',
    'croatia': 'HR',
    'romania': 'RO',
    'bulgaria': 'BG',
    'greece': 'GR',
    'cyprus': 'CY',
    'malta': 'MT',
    'luxembourg': 'LU',
    'estonia': 'EE',
    'latvia': 'LV',
    'lithuania': 'LT',
    'united states': 'US',
    'canada': 'CA',
    'mexico': 'MX',
    'japan': 'JP',
    'south korea': 'KR',
    'china': 'CN',
    'india': 'IN',
    'australia': 'AU',
    'new zealand': 'NZ',
    'singapore': 'SG',
    'hong kong': 'HK',
    'taiwan': 'TW',
    'thailand': 'TH',
    'malaysia': 'MY',
    'indonesia': 'ID',
    'philippines': 'PH',
    'vietnam': 'VN',
    'brazil': 'BR',
    'argentina': 'AR',
    'chile': 'CL',
    'peru': 'PE',
    'colombia': 'CO',
    'venezuela': 'VE',
    'uruguay': 'UY',
    'paraguay': 'PY',
    'bolivia': 'BO',
    'ecuador': 'EC',
    'guyana': 'GY',
    'suriname': 'SR',
    'united arab emirates': 'AE',
    'saudi arabia': 'SA',
    'israel': 'IL',
    'turkey': 'TR',
    'egypt': 'EG',
    'south africa': 'ZA',
    'nigeria': 'NG',
    'kenya': 'KE',
    'morocco': 'MA',
    'tunisia': 'TN',
    'russia': 'RU',
    'ukraine': 'UA',
    'belarus': 'BY',
    'kazakhstan': 'KZ',
    'uzbekistan': 'UZ'
  };
  
  return basicCodeMap[name] || null;
}

/**
 * Get country display name from DB fields only (no static translations).
 * @param {string|Object} countryOrCode - Country object (with country_name_*, name_*) or country code
 * @param {string} countryName - Original name (used when first param is code string)
 * @param {string} locale - Locale: 'en', 'ru', 'he', 'ar'
 * @returns {string} Display name from DB or fallback to base name
 */
export function translateCountryName(countryOrCode, countryNameOrLocale = '', locale = 'en') {
  let country = null;
  let countryCode = countryOrCode;
  let countryName = countryNameOrLocale;
  // Detect when second arg is actually a locale (e.g. translateCountryName(country, 'ru'))
  if (typeof countryNameOrLocale === 'string' && (countryNameOrLocale === 'en' || countryNameOrLocale === 'ru' || countryNameOrLocale === 'he' || countryNameOrLocale === 'ar') && locale === 'en') {
    locale = countryNameOrLocale;
    countryName = '';
  }
  if (typeof countryOrCode === 'object' && countryOrCode !== null) {
    country = countryOrCode;
    countryCode = country.code || country.id || country.airalo_country_code;
    if (locale === 'ru') {
      countryName = country.country_name_ru || country.name_ru || country.name || country.country_name || '';
    } else if (locale === 'he') {
      countryName = country.country_name_he || country.name_he || country.name || country.country_name || '';
    } else if (locale === 'ar') {
      countryName = country.country_name_ar || country.name_ar || country.name || country.country_name || '';
    } else {
      countryName = country.name || country.country_name || '';
    }
  }

  if (locale === 'ru' && country && (country.country_name_ru || country.name_ru)) {
    const n = (country.country_name_ru || country.name_ru).trim();
    if (n) return n;
  }
  if (locale === 'he' && country && (country.country_name_he || country.name_he)) {
    const n = (country.country_name_he || country.name_he).trim();
    if (n) return n;
  }
  if (locale === 'ar' && country && (country.country_name_ar || country.name_ar)) {
    const n = (country.country_name_ar || country.name_ar).trim();
    if (n) return n;
  }
  if (!locale || locale === 'en') return countryName;
  return countryName;
}

/**
 * Translate country objects using DB fields only.
 * @param {Array} countries - Array of country objects
 * @param {string} locale - Locale
 * @returns {Array} Countries with name set from DB
 */
export function translateCountries(countries, locale = 'en') {
  if (!countries || !Array.isArray(countries)) return countries;
  return countries.map(c => {
    if (locale === 'ru') {
      const n = (c.country_name_ru || c.name_ru || '').trim();
      if (n) return { ...c, name: n };
    }
    if (locale === 'he') {
      const n = (c.country_name_he || c.name_he || '').trim();
      if (n) return { ...c, name: n };
    }
    if (locale === 'ar') {
      const n = (c.country_name_ar || c.name_ar || '').trim();
      if (n) return { ...c, name: n };
    }
    return { ...c, name: translateCountryName(c, c.name || c.country_name || '', locale) };
  });
}

/**
 * Preload countries data into cache
 */
export async function preloadCountries() {
  try {
    const response = await fetch('/api/public/countries');
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data?.countries) {
        countriesCache = data.data.countries;
        cacheTimestamp = Date.now();
        console.log('✅ Countries data preloaded:', countriesCache.length, 'countries');
      }
    }
  } catch (error) {
    console.warn('Could not preload countries data:', error);
  }
}
