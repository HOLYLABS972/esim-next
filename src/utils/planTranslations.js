/**
 * Plan and region name translations utility
 * Provides human-friendly translations for plan slugs and region names
 */

// Region labels: always from DB (ui_labels). No code-based fallback.
export const regionTranslations = {};

/**
 * Translate region name – always from DB only (no fallback).
 * @param {string|Object} regionNameOrObject - Region name or { region_name, region_name_ru }
 * @param {string} locale - en, ru, he, ar
 * @param {Object} regionLabelsFromDb - { Europe: { en, ru, he, ar }, ... } from API labels.regions
 * @returns {string} - Value from DB or ''
 */
export const translateRegionName = (regionNameOrObject, locale = 'en', regionLabelsFromDb = null) => {
  let regionName = regionNameOrObject;
  if (typeof regionNameOrObject === 'object' && regionNameOrObject !== null) {
    regionName = regionNameOrObject.region_name || regionNameOrObject.name || '';
  }
  if (!regionName) return '';

  // Map "Other" to "Oceania" since "Other" is typically Oceania
  if (regionName === 'Other' || regionName === 'other') {
    regionName = 'Oceania';
  }

  // Always from DB only – no fallback
  if (!regionLabelsFromDb || typeof regionLabelsFromDb !== 'object') {
    return '';
  }
  const byRegion = regionLabelsFromDb[regionName];
  return (byRegion && byRegion[locale]) ? byRegion[locale] : '';
};

/**
 * Convert plan slug to human-friendly name in Russian
 * Examples:
 *   "discover-60days-5gb-px" -> "Глобальный план: 5 ГБ на 60 дней"
 *   "discover-365days-20gb-px" -> "Глобальный план: 20 ГБ на 365 дней"
 * @param {string} slug - Plan slug
 * @param {string} locale - Target locale (default: 'ru')
 * @returns {string} - Human-friendly plan name
 */
export const getHumanFriendlyPlanName = (slug, locale = 'en') => {
  if (!slug) return '';

  const slugLower = slug.toLowerCase();

  const isRussian = locale === 'ru';

  // Check if it's a global/discover plan
  if (slugLower.startsWith('discover') || slugLower.includes('global')) {
    // Extract data and days from slug
    // Pattern: discover-Xdays-Ygb-px or discover-Ygb-Xdays-px
    const dataMatch = slugLower.match(/(\d+)\s*(?:gb|гб)/i);
    const daysMatch = slugLower.match(/(\d+)\s*(?:days?|дней?|дня|день)/i);

    const data = dataMatch ? parseInt(dataMatch[1], 10) : null;
    const days = daysMatch ? parseInt(daysMatch[1], 10) : null;

    if (isRussian) {
      if (data && days) {
        // Format days with proper pluralization
        let daysText = 'дней';
        if (days > 0) {
          const mod10 = days % 10;
          const mod100 = days % 100;
          if (mod10 === 1 && mod100 !== 11) {
            daysText = 'день';
          } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
            daysText = 'дня';
          }
        }
        return `Глобальный план: ${data} ГБ на ${days} ${daysText}`;
      } else if (data) {
        return `Глобальный план: ${data} ГБ`;
      } else if (days) {
        let daysText = 'дней';
        if (days > 0) {
          const mod10 = days % 10;
          const mod100 = days % 100;
          if (mod10 === 1 && mod100 !== 11) {
            daysText = 'день';
          } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
            daysText = 'дня';
          }
        }
        return `Глобальный план на ${days} ${daysText}`;
      }
      return 'Глобальный план';
    } else {
      // English fallback only for non-Russian locales
      if (data && days) {
        return `Global Plan: ${data} GB for ${days} days`;
      } else if (data) {
        return `Global Plan: ${data} GB`;
      } else if (days) {
        return `Global Plan for ${days} days`;
      }
      return 'Global Plan';
    }
  }

  // For regional plans, try to extract region and plan details
  if (slugLower.includes('asia') || slugLower.includes('europe') ||
    slugLower.includes('africa') || slugLower.includes('americas') ||
    slugLower.includes('caribbean') || slugLower.includes('latin-america') ||
    slugLower.includes('latam')) {
    const dataMatch = slugLower.match(/(\d+)\s*(?:gb|гб)/i);
    const daysMatch = slugLower.match(/(\d+)\s*(?:days?|дней?|дня|день)/i);

    const data = dataMatch ? parseInt(dataMatch[1], 10) : null;
    const days = daysMatch ? parseInt(daysMatch[1], 10) : null;

    // Extract region name - ALWAYS Russian for Russian locale
    let regionName = '';
    if (slugLower.includes('latin-america') || slugLower.includes('latam')) {
      regionName = isRussian ? 'Латинская Америка' : 'Latin America';
    } else if (slugLower.includes('asia')) {
      regionName = isRussian ? 'Азия' : 'Asia';
    } else if (slugLower.includes('europe')) {
      regionName = isRussian ? 'Европа' : 'Europe';
    } else if (slugLower.includes('africa')) {
      regionName = isRussian ? 'Африка' : 'Africa';
    } else if (slugLower.includes('americas')) {
      regionName = isRussian ? 'Америка' : 'Americas';
    } else if (slugLower.includes('caribbean')) {
      regionName = isRussian ? 'Карибы' : 'Caribbean';
    }

    if (isRussian) {
      if (data && days) {
        let daysText = 'дней';
        if (days > 0) {
          const mod10 = days % 10;
          const mod100 = days % 100;
          if (mod10 === 1 && mod100 !== 11) {
            daysText = 'день';
          } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
            daysText = 'дня';
          }
        }
        return `${regionName}: ${data} ГБ на ${days} ${daysText}`;
      } else if (data) {
        return `${regionName}: ${data} ГБ`;
      } else if (days) {
        let daysText = 'дней';
        if (days > 0) {
          const mod10 = days % 10;
          const mod100 = days % 100;
          if (mod10 === 1 && mod100 !== 11) {
            daysText = 'день';
          } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
            daysText = 'дня';
          }
        }
        return `${regionName}: ${days} ${daysText}`;
      }
      return regionName || 'Региональный план';
    } else {
      if (data && days) {
        return `${regionName}: ${data} GB for ${days} days`;
      } else if (data) {
        return `${regionName}: ${data} GB`;
      } else if (days) {
        return `${regionName}: ${days} days`;
      }
      return regionName || 'Regional Plan';
    }
  }

  // Fallback: translate GB and days in slug even if we can't parse it fully
  if (isRussian) {
    let translated = slug;
    // Translate GB to ГБ
    translated = translated.replace(/\bGB\b/g, 'ГБ');
    translated = translated.replace(/\bgb\b/gi, 'ГБ');
    // Translate days to дней/дня/день
    translated = translated.replace(/(\d+)\s*days?\b/gi, (match, num) => {
      const daysNum = parseInt(num, 10);
      let daysText = 'дней';
      if (daysNum > 0) {
        const mod10 = daysNum % 10;
        const mod100 = daysNum % 100;
        if (mod10 === 1 && mod100 !== 11) {
          daysText = 'день';
        } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
          daysText = 'дня';
        }
      }
      return `${daysNum} ${daysText}`;
    });
    return translated;
  }

  // Fallback: return slug as-is only for non-Russian locales
  return slug;
};

/**
 * Translate English description to Russian
 * Converts descriptions like "5 GB for 60 days" to "5 ГБ на 60 дней"
 * @param {string} description - Description in English
 * @returns {string} - Translated description in Russian
 */
export const translateDescriptionToRussian = (description) => {
  if (!description) return '';

  let translated = description;

  // Pattern 1: "X GB for Y days" -> "X ГБ на Y дней"
  translated = translated.replace(/(\d+)\s*GB\s+for\s+(\d+)\s+days?/gi, (match, gb, days) => {
    const daysNum = parseInt(days, 10);
    let daysText = 'дней';

    if (daysNum > 0) {
      const mod10 = daysNum % 10;
      const mod100 = daysNum % 100;
      if (mod10 === 1 && mod100 !== 11) {
        daysText = 'день';
      } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
        daysText = 'дня';
      }
    }

    return `${gb} ГБ на ${daysNum} ${daysText}`;
  });

  // Pattern 2: "X GB • Y days" or "X GB · Y days" -> "X ГБ • Y дней"
  translated = translated.replace(/(\d+)\s*GB\s*[•·]\s*(\d+)\s+days?/gi, (match, gb, days) => {
    const daysNum = parseInt(days, 10);
    let daysText = 'дней';

    if (daysNum > 0) {
      const mod10 = daysNum % 10;
      const mod100 = daysNum % 100;
      if (mod10 === 1 && mod100 !== 11) {
        daysText = 'день';
      } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
        daysText = 'дня';
      }
    }

    return `${gb} ГБ • ${daysNum} ${daysText}`;
  });

  // Pattern 3: "X GB - Y days" -> "X ГБ - Y дней"
  translated = translated.replace(/(\d+)\s*GB\s*[-–—]\s*(\d+)\s+days?/gi, (match, gb, days) => {
    const daysNum = parseInt(days, 10);
    let daysText = 'дней';

    if (daysNum > 0) {
      const mod10 = daysNum % 10;
      const mod100 = daysNum % 100;
      if (mod10 === 1 && mod100 !== 11) {
        daysText = 'день';
      } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
        daysText = 'дня';
      }
    }

    return `${gb} ГБ - ${daysNum} ${daysText}`;
  });

  // Standalone replacements for any remaining GB/days
  translated = translated.replace(/\bGB\b/g, 'ГБ');
  translated = translated.replace(/\bgb\b/gi, 'ГБ');

  // Replace standalone "days" with proper pluralization if preceded by a number
  translated = translated.replace(/(\d+)\s+days?/gi, (match, num) => {
    const daysNum = parseInt(num, 10);
    let daysText = 'дней';

    if (daysNum > 0) {
      const mod10 = daysNum % 10;
      const mod100 = daysNum % 100;
      if (mod10 === 1 && mod100 !== 11) {
        daysText = 'день';
      } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
        daysText = 'дня';
      }
    }

    return `${daysNum} ${daysText}`;
  });

  return translated;
};

/**
 * Translate Russian description to English
 * Converts descriptions like "5 ГБ на 60 дней" to "5 GB for 60 days"
 * @param {string} description - Description in Russian
 * @returns {string} - Translated description in English
 */
export const translateDescriptionToEnglish = (description) => {
  if (!description) return '';

  let translated = description;

  // Pattern 1: "X ГБ на Y дней/дня/день" -> "X GB for Y days"
  translated = translated.replace(/(\d+)\s*ГБ\s+на\s+(\d+)\s+(?:дней|дня|день)/gi, (match, gb, days) => {
    return `${gb} GB for ${days} days`;
  });

  // Pattern 2: "X ГБ • Y дней/дня/день" -> "X GB • Y days"
  translated = translated.replace(/(\d+)\s*ГБ\s*•\s*(\d+)\s+(?:дней|дня|день)/gi, (match, gb, days) => {
    return `${gb} GB • ${days} days`;
  });

  // Pattern 3: "X ГБ - Y дней/дня/день" -> "X GB - Y days"
  translated = translated.replace(/(\d+)\s*ГБ\s*[-–—]\s*(\d+)\s+(?:дней|дня|день)/gi, (match, gb, days) => {
    return `${gb} GB - ${days} days`;
  });

  // Standalone replacements
  translated = translated.replace(/\bГБ\b/g, 'GB');
  translated = translated.replace(/\bгб\b/gi, 'GB');

  // Replace standalone days
  translated = translated.replace(/(\d+)\s+(?:дней|дня|день)/gi, (match, num) => {
    return `${num} days`;
  });

  return translated;
};

/**
 * Get plan display title from DB fields by locale (title, title_ru; title_he when DB has it).
 * Reuses existing translated fields on plan - no separate translations table.
 * @param {Object} plan - Plan object with title, title_ru, slug, name
 * @param {string} locale - Current locale (e.g. 'en', 'ru', 'he')
 * @returns {string} - Display title for the selected locale
 */
export const getPlanDisplayTitle = (plan, locale = 'en') => {
  if (!plan) return '';
  if (locale === 'ru') {
    if (plan.title_ru && typeof plan.title_ru === 'string') {
      let clean = plan.title_ru.replace(/[-_]?\d+\s*(gb|гб|mb|мб|days?|дней?|дня|день).*/gi, '').replace(/[-_]\d+$/g, '').trim();
      if (clean) return clean.charAt(0).toUpperCase() + clean.slice(1);
      return plan.title_ru;
    }
    if (plan.slug) {
      const friendly = getHumanFriendlyPlanName(plan.slug, 'ru');
      if (friendly && friendly !== plan.slug) return friendly;
    }
    return plan.title || plan.name || '';
  }
  if (locale === 'he' && plan.title_he) return plan.title_he;
  if (locale === 'ar' && plan.title_ar) return plan.title_ar;
  return plan.title || plan.name || plan.title_ru || '';
};

export default {
  regionTranslations,
  translateRegionName,
  getHumanFriendlyPlanName,
  getPlanDisplayTitle,
  translateDescriptionToRussian,
  translateDescriptionToEnglish
};
