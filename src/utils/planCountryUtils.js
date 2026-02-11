/**
 * Utility functions to derive country information from plan IDs
 * This ensures that orders display the correct country even if the stored country code is incorrect
 */

/**
 * Get country map - maps plan slugs to country codes and names
 */
function getCountryMap() {
  return {
    'sohbat-mobile': { code: "AF", name: "Afghanistan" },
    'hej-telecom': { code: "AL", name: "Albania" },
    'hehe-plus': { code: "NL", name: "Netherlands" },
    'hehe': { code: "NL", name: "Netherlands" },
    'algecom': { code: "DZ", name: "Algeria" },
    'handi': { code: "AD", name: "Andorra" },
    'dolphin-mobile': { code: "AI", name: "Anguilla" },
    '17-miles': { code: "AG", name: "Antigua And Barbuda" },
    '17miles': { code: "AG", name: "Antigua And Barbuda" },
    'saba-mobile': { code: "AN", name: "Antilles" },
    'abrazo': { code: "AR", name: "Argentina" },
    'arpi-telecom': { code: "AM", name: "Armenia" },
    'noord-communications-in': { code: "AW", name: "Aruba" },
    'yes-go': { code: "AU", name: "Australia" },
    'viennetz-mobil': { code: "AT", name: "Austria" },
    'yaxsi-mobile': { code: "AZ", name: "Azerbaijan" },
    'pico': { code: "PT", name: "Azores" },
    'jitney-mobile': { code: "BS", name: "Bahamas" },
    'saar-mobile': { code: "BH", name: "Bahrain" },
    'fatafati-in': { code: "BD", name: "Bangladesh" },
    'barbnet': { code: "BB", name: "Barbados" },
    'norach-telecom': { code: "BY", name: "Belarus" },
    'belganet': { code: "BE", name: "Belgium" },
    'cho': { code: "BZ", name: "Belize" },
    'cotton-mobile': { code: "BJ", name: "Benin" },
    'bermy-mobile': { code: "BM", name: "Bermuda" },
    'paro': { code: "BT", name: "Bhutan" },
    'wa-mobile': { code: "BO", name: "Bolivia" },
    'hatonet': { code: "BQ", name: "Bonaire" },
    'bosher': { code: "BA", name: "Bosnia and Herzegovina" },
    'maun-telecom': { code: "BW", name: "Botswana" },
    'joia': { code: "BR", name: "Brazil" },
    'muara-mobile': { code: "BN", name: "Brunei" },
    'bultel': { code: "BG", name: "Bulgaria" },
    'burj-mobile': { code: "AE", name: "United Arab Emirates" },
    'burj': { code: "AE", name: "United Arab Emirates" },
    'volta': { code: "BF", name: "Burkina Faso" },
    'connect-cambodia': { code: "KH", name: "Cambodia" },
    'kamtok-telecom': { code: "CM", name: "Cameroon" },
    'canada-mobile': { code: "CA", name: "Canada" },
    'mansetel': { code: "ES", name: "Canary Islands" },
    'fogotel': { code: "CV", name: "Cape Verde" },
    'atlantis-telecom': { code: "KY", name: "Cayman Islands" },
    'chinko': { code: "CF", name: "Central African Republic" },
    'first-well': { code: "TD", name: "Chad" },
    'altoque': { code: "CL", name: "Chile" },
    'chinacom': { code: "CN", name: "China" },
    'hartonet': { code: "CO", name: "Colombia" },
    'hot-telecom': { code: "CR", name: "Costa Rica" },
    'nouchi-mobile': { code: "CI", name: "Côte d\'Ivoire" },
    'cronet': { code: "HR", name: "Croatia" },
    'dushi-mobile': { code: "CW", name: "Curaçao" },
    'dekanet': { code: "CY", name: "Cyprus" },
    'prosim': { code: "CZ", name: "Czech Republic" },
    'hygge-mobile': { code: "DK", name: "Denmark" },
    'djibnet': { code: "DJ", name: "Djibouti" },
    'nature-mobile': { code: "DM", name: "Dominica" },
    'caribe-mobile': { code: "DO", name: "Dominican Republic" },
    'mitad-mobile': { code: "EC", name: "Ecuador" },
    'nile-mobile': { code: "EG", name: "Egypt" },
    'chivo': { code: "SV", name: "El Salvador" },
    'malabo-mobile': { code: "GQ", name: "Equatorial Guinea" },
    'eritcom': { code: "ER", name: "Eritrea" },
    'estonia-mobile': { code: "EE", name: "Estonia" },
    'eswatini-communications': { code: "SZ", name: "Eswatini" },
    'habesha-mobile': { code: "ET", name: "Ethiopia" },
    'bula-mobile': { code: "FJ", name: "Fiji" },
    'suomi-mobile': { code: "FI", name: "Finland" },
    'elan': { code: "FR", name: "France" },
    'okoume-mobile': { code: "GA", name: "Gabon" },
    'teranga-mobile': { code: "GM", name: "Gambia" },
    'kargi': { code: "GE", name: "Georgia" },
    'hallo-mobil': { code: "DE", name: "Germany" },
    'akwaaba-mobile': { code: "GH", name: "Ghana" },
    'meraki-mobile': { code: "GR", name: "Greece" },
    'spice-mobile': { code: "GD", name: "Grenada" },
    'chapin-mobile': { code: "GT", name: "Guatemala" },
    'guinee-mobile': { code: "GN", name: "Guinea" },
    'guinea-bissau-mobile': { code: "GW", name: "Guinea-Bissau" },
    'guyana-mobile': { code: "GY", name: "Guyana" },
    'ayiti-mobile': { code: "HT", name: "Haiti" },
    'catracho-mobile': { code: "HN", name: "Honduras" },
    'hkmobile': { code: "HK", name: "Hong Kong" },
    'magyar-mobile': { code: "HU", name: "Hungary" },
    'island-mobile': { code: "IS", name: "Iceland" },
    'kallur-digital': { code: "IN", name: "India" },
    'indonesia-mobile': { code: "ID", name: "Indonesia" },
    'iran-mobile': { code: "IR", name: "Iran" },
    'iraq-mobile': { code: "IQ", name: "Iraq" },
    'eire-mobile': { code: "IE", name: "Ireland" },
    'isle-of-man-mobile': { code: "IM", name: "Isle of Man" },
    'ahava': { code: "IL", name: "Israel" },
    'mamma-mia': { code: "IT", name: "Italy" },
    'jamaica-mobile': { code: "JM", name: "Jamaica" },
    'moshi-moshi': { code: "JP", name: "Japan" },
    'jersey-mobile': { code: "JE", name: "Jersey" },
    'jordan-mobile': { code: "JO", name: "Jordan" },
    'kazakhstan-mobile': { code: "KZ", name: "Kazakhstan" },
    'kenya-mobile': { code: "KE", name: "Kenya" },
    'kiribati-mobile': { code: "KI", name: "Kiribati" },
    'plisi': { code: "XK", name: "Kosovo" },
    'kuwait-mobile': { code: "KW", name: "Kuwait" },
    'kyrgyzstan-mobile': { code: "KG", name: "Kyrgyzstan" },
    'laos-mobile': { code: "LA", name: "Laos" },
    'latvia-mobile': { code: "LV", name: "Latvia" },
    'lebanon-mobile': { code: "LB", name: "Lebanon" },
    'lesotho-mobile': { code: "LS", name: "Lesotho" },
    'liberia-mobile': { code: "LR", name: "Liberia" },
    'libya-mobile': { code: "LY", name: "Libya" },
    'liechtenstein-mobile': { code: "LI", name: "Liechtenstein" },
    'lithuania-mobile': { code: "LT", name: "Lithuania" },
    'luxembourg-mobile': { code: "LU", name: "Luxembourg" },
    'macau-mobile': { code: "MO", name: "Macau" },
    'madagascar-mobile': { code: "MG", name: "Madagascar" },
    'porto': { code: "PT", name: "Madeira" },
    'malawi-mobile': { code: "MW", name: "Malawi" },
    'sambungkan': { code: "MY", name: "Malaysia" },
    'maldives-mobile': { code: "MV", name: "Maldives" },
    'mali-mobile': { code: "ML", name: "Mali" },
    'malta-mobile': { code: "MT", name: "Malta" },
    'marshall-mobile': { code: "MH", name: "Marshall Islands" },
    'mauritania-mobile': { code: "MR", name: "Mauritania" },
    'mauritius-mobile': { code: "MU", name: "Mauritius" },
    'chido': { code: "MX", name: "Mexico" },
    'micronesia-mobile': { code: "FM", name: "Micronesia" },
    'moldova-mobile': { code: "MD", name: "Moldova" },
    'monaco-mobile': { code: "MC", name: "Monaco" },
    'mongolia-mobile': { code: "MN", name: "Mongolia" },
    'montenegro-mobile': { code: "ME", name: "Montenegro" },
    'morocco-mobile': { code: "MA", name: "Morocco" },
    'mozambique-mobile': { code: "MZ", name: "Mozambique" },
    'myanmar-mobile': { code: "MM", name: "Myanmar" },
    'namibia-mobile': { code: "NA", name: "Namibia" },
    'nauru-mobile': { code: "NR", name: "Nauru" },
    'nepal-mobile': { code: "NP", name: "Nepal" },
    'netherlands-mobile': { code: "NL", name: "Netherlands" },
    'netherlands': { code: "NL", name: "Netherlands" },
    'nl-mobile': { code: "NL", name: "Netherlands" },
    'nl': { code: "NL", name: "Netherlands" },
    'dutch-mobile': { code: "NL", name: "Netherlands" },
    'dutch': { code: "NL", name: "Netherlands" },
    'holland-mobile': { code: "NL", name: "Netherlands" },
    'holland': { code: "NL", name: "Netherlands" },
    'new-zealand-mobile': { code: "NZ", name: "New Zealand" },
    'nicaragua-mobile': { code: "NI", name: "Nicaragua" },
    'niger-mobile': { code: "NE", name: "Niger" },
    'nigeria-mobile': { code: "NG", name: "Nigeria" },
    'north-korea-mobile': { code: "KP", name: "North Korea" },
    'north-macedonia-mobile': { code: "MK", name: "North Macedonia" },
    'adanet': { code: "CY", name: "Northern Cyprus" },
    'norway-mobile': { code: "NO", name: "Norway" },
    'oman-mobile': { code: "OM", name: "Oman" },
    'pakistan-mobile': { code: "PK", name: "Pakistan" },
    'palau-mobile': { code: "PW", name: "Palau" },
    'palestine-mobile': { code: "PS", name: "Palestine" },
    'panama-mobile': { code: "PA", name: "Panama" },
    'papua-new-guinea-mobile': { code: "PG", name: "Papua New Guinea" },
    'paraguay-mobile': { code: "PY", name: "Paraguay" },
    'peru-mobile': { code: "PE", name: "Peru" },
    'philippines-mobile': { code: "PH", name: "Philippines" },
    'poland-mobile': { code: "PL", name: "Poland" },
    'portugal-mobile': { code: "PT", name: "Portugal" },
    'boricua-in-mobile': { code: "PR", name: "Puerto Rico" },
    'qatar-mobile': { code: "QA", name: "Qatar" },
    'romania-mobile': { code: "RO", name: "Romania" },
    'russia-mobile': { code: "RU", name: "Russia" },
    'rwanda-mobile': { code: "RW", name: "Rwanda" },
    'saint-kitts-mobile': { code: "KN", name: "Saint Kitts and Nevis" },
    'saint-lucia-mobile': { code: "LC", name: "Saint Lucia" },
    'tobago': { code: "VC", name: "Saint Vincent and the Grenadines" },
    'faaf-mobile': { code: "WS", name: "Samoa" },
    'san-marino-mobile': { code: "SM", name: "San Marino" },
    'sao-tome-mobile': { code: "ST", name: "Sao Tome and Principe" },
    'red-sand': { code: "SA", name: "Saudi Arabia" },
    'nessietel': { code: "GB", name: "Scotland" },
    'retba-mobile': { code: "SN", name: "Senegal" },
    'serbia-mobile': { code: "RS", name: "Serbia" },
    'laziocom': { code: "SC", name: "Seychelles" },
    'buncenet': { code: "SL", name: "Sierra Leone" },
    'connect-lah': { code: "SG", name: "Singapore" },
    'dobry-den': { code: "SK", name: "Slovakia" },
    'zivjo': { code: "SI", name: "Slovenia" },
    'solomon-mobile': { code: "SB", name: "Solomon Islands" },
    'somalia-mobile': { code: "SO", name: "Somalia" },
    'cellsa': { code: "ZA", name: "South Africa" },
    'jang': { code: "KR", name: "South Korea" },
    'south-sudan-mobile': { code: "SS", name: "South Sudan" },
    'guay-mobile': { code: "ES", name: "Spain" },
    'sri-lanka-mobile': { code: "LK", name: "Sri Lanka" },
    'sudan-mobile': { code: "SD", name: "Sudan" },
    'pondocom': { code: "SR", name: "Suriname" },
    'van': { code: "SE", name: "Sweden" },
    'switzerland-mobile': { code: "CH", name: "Switzerland" },
    'pilatus': { code: "CH", name: "Switzerland" },
    'pilatus-mobile': { code: "CH", name: "Switzerland" },
    'pilatus-mobile-in': { code: "CH", name: "Switzerland" },
    'syria-mobile': { code: "SY", name: "Syria" },
    'taiwan-mobile': { code: "TW", name: "Taiwan" },
    'tajikistan-mobile': { code: "TJ", name: "Tajikistan" },
    'tanzania-mobile': { code: "TZ", name: "Tanzania" },
    'thailand-mobile': { code: "TH", name: "Thailand" },
    'timor-mobile': { code: "TL", name: "Timor-Leste" },
    'togo-mobile': { code: "TG", name: "Togo" },
    'tonga-mobile': { code: "TO", name: "Tonga" },
    'trinidad-mobile': { code: "TT", name: "Trinidad and Tobago" },
    'tunisia-mobile': { code: "TN", name: "Tunisia" },
    'turkey-mobile': { code: "TR", name: "Turkey" },
    'turkmenistan-mobile': { code: "TM", name: "Turkmenistan" },
    'tuvalu-mobile': { code: "TV", name: "Tuvalu" },
    'uganda-mobile': { code: "UG", name: "Uganda" },
    'ukraine-mobile': { code: "UA", name: "Ukraine" },
    'uae-mobile': { code: "AE", name: "United Arab Emirates" },
    'uk-mobile': { code: "GB", name: "United Kingdom" },
    'uki-mobile': { code: "GB", name: "United Kingdom" },
    'uki': { code: "GB", name: "United Kingdom" },
    'usa-mobile': { code: "US", name: "United States" },
    'uruguay-mobile': { code: "UY", name: "Uruguay" },
    'uzbekistan-mobile': { code: "UZ", name: "Uzbekistan" },
    'vanuatu-mobile': { code: "VU", name: "Vanuatu" },
    'vatican-mobile': { code: "VA", name: "Vatican City" },
    'venezuela-mobile': { code: "VE", name: "Venezuela" },
    'vietnam-mobile': { code: "VN", name: "Vietnam" },
    'wales-mobile': { code: "GB", name: "Wales" },
    'yemen-mobile': { code: "YE", name: "Yemen" },
    'zambia-mobile': { code: "ZM", name: "Zambia" },
    'zimbabwe-mobile': { code: "ZW", name: "Zimbabwe" },
  };
}

/**
 * Get country info from plan ID (extracts country from plan slug)
 * Example: "prosim-15days-2gb" -> { code: "CZ", name: "Czech Republic" }
 * Example: "kargi-mobile-7days-1gb" -> { code: "GE", name: "Georgia" }
 * 
 * @param {string} planId - The plan ID (e.g., "prosim-15days-2gb")
 * @returns {{code: string, name: string}} - Country code and name
 */
export function getCountryFromPlan(planId) {
  if (!planId) return { code: "US", name: "United States" };

  const planIdLower = planId.toLowerCase();
  
  // Debug logging (only for discover packages)
  if (planIdLower.includes('discover')) {
    console.log('🔍 getCountryFromPlan input:', planId, 'lowercase:', planIdLower);
  }
  
  // Check for global plans first
  if (planIdLower.startsWith('discover') || 
      planIdLower.includes('global') ||
      planIdLower.startsWith('global')) {
    console.log('✅ Detected GLOBAL plan');
    return { code: "GLOBAL", name: "Global" };
  }
  
  // Check for regional plans
  const regionalIdentifiers = [
    'asia', 'europe', 'africa', 'americas', 'middle-east', 'middle east',
    'oceania', 'caribbean', 'latin-america', 'latin america',
    'north-america', 'south-america', 'central-america',
    'eastern-europe', 'western-europe', 'scandinavia',
    'asean', 'gcc', 'european-union', 'eu', 'mena',
    'middle-east-and-north-africa', 'middle-east-north-africa',
    'euconnect', 'euroconnect', 'americanmex'
  ];
  
  const isRegional = regionalIdentifiers.some(identifier => 
    planIdLower.includes(identifier) || planIdLower.startsWith(identifier)
  );
  
  if (isRegional) {
    // Try to determine specific region
    if (planIdLower.includes('europe') || planIdLower.includes('euconnect') || planIdLower.includes('eu')) {
      return { code: "EUROPE", name: "Europe" };
    }
    if (planIdLower.includes('asia') || planIdLower.includes('asean')) {
      return { code: "ASIA", name: "Asia" };
    }
    if (planIdLower.includes('america') || planIdLower.includes('americanmex')) {
      return { code: "AMERICAS", name: "Americas" };
    }
    if (planIdLower.includes('africa') || planIdLower.includes('mena')) {
      return { code: "AFRICA", name: "Africa" };
    }
    return { code: "REGIONAL", name: "Regional" };
  }

  // Extract the base plan slug (first part before any dashes)
  const planSlug = planId.split('-')[0];
  
  const countryMap = getCountryMap();

  // Try exact match first
  if (countryMap[planId]) {
    return countryMap[planId];
  }

  // Try matching by base slug
  if (countryMap[planSlug]) {
    return countryMap[planSlug];
  }

  // Try matching by plan slug with -mobile suffix
  const planSlugWithMobile = `${planSlug}-mobile`;
  if (countryMap[planSlugWithMobile]) {
    return countryMap[planSlugWithMobile];
  }

  // Try matching by first two parts (e.g., "uki-mobile" from "uki-mobile-in-7days-1gb")
  const planParts = planId.split('-');
  if (planParts.length >= 2) {
    const twoPartSlug = `${planParts[0]}-${planParts[1]}`;
    if (countryMap[twoPartSlug]) {
      return countryMap[twoPartSlug];
    }
  }

  // Try matching by first three parts (e.g., "noord-communications-in" from "noord-communications-in-7days-1gb")
  if (planParts.length >= 3) {
    const threePartSlug = `${planParts[0]}-${planParts[1]}-${planParts[2]}`;
    if (countryMap[threePartSlug]) {
      return countryMap[threePartSlug];
    }
  }

  // Default fallback
  return { code: "US", name: "United States" };
}

/**
 * Get correct country information for an order
 * If the stored country code seems incorrect, derive it from the plan ID
 * 
 * @param {Object} order - Order object with countryCode, countryName, planId, planName, packageId, etc.
 * @returns {{code: string, name: string}} - Corrected country code and name
 */
export function getCorrectCountryForOrder(order) {
  // Try to get the actual package slug from various possible locations
  const possiblePackageIds = [
    order.simDetails?.package_id,           // From Airalo response
    order.orderData?.package_id,            // From orderData
    order.packageId,                        // Direct field
    order.orderSlug,                        // Alternative field
    order.planId,                          // Fallback (might be ObjectId)
    order.planName                         // Last resort
  ].filter(Boolean); // Remove null/undefined values
  
  // Use the first non-ObjectId looking value
  const planId = possiblePackageIds.find(id => 
    id && typeof id === 'string' && !id.match(/^[0-9a-f]{24}$/i) // Not a MongoDB ObjectId
  ) || possiblePackageIds[0] || '';
  
  // Debug logging to see what we're working with (only for discover packages)
  if (planId && planId.toLowerCase().includes('discover')) {
    console.log('🔍 getCorrectCountryForOrder debug:', {
      orderId: order.orderId || order.id,
      possiblePackageIds,
      selectedPlanId: planId,
      storedCountry: { code: order.countryCode, name: order.countryName }
    });
  }
  
  const countryFromPlan = getCountryFromPlan(planId);
  
  if (planId && planId.toLowerCase().includes('discover')) {
    console.log('🌍 Country from plan:', countryFromPlan);
  }
  
  // If we have a stored country code, check if it matches the plan-derived country
  const storedCountryCode = order.countryCode;
  const storedCountryName = order.countryName;
  
  // If stored country matches plan-derived country, use stored (might have better name)
  if (storedCountryCode && storedCountryCode === countryFromPlan.code) {
    return {
      code: storedCountryCode,
      name: storedCountryName || countryFromPlan.name
    };
  }
  
  // If they don't match, prefer the plan-derived country (it's more reliable)
  // This fixes cases where orders were stored with incorrect country codes
  return countryFromPlan;
}

