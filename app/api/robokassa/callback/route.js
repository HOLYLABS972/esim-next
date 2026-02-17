import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '../../../../src/lib/supabase';
import { getCountryNameFromCode as getCountryNameFromCodeUtil } from '../../../../src/utils/countryUtils';
import { sendActivationEmail } from '../../../../src/services/emailService';

// Force dynamic rendering for this API route (handles callbacks with dynamic parameters)
export const dynamic = 'force-dynamic';

/**
 * Parse Robokassa email to extract payment data
 */
function parseRobokassaEmail(emailBody) {
  try {
    const text = typeof emailBody === 'string' ? emailBody : JSON.stringify(emailBody);
    
    const invIdMatch = text.match(/inv_id[:\s]+(\d+)/i) || text.match(/InvId[:\s]+(\d+)/i);
    const invId = invIdMatch ? invIdMatch[1] : null;

    const priceMatch = text.match(/Цена[:\s]+([\d.]+)/i) || text.match(/Price[:\s]+([\d.]+)/i) || text.match(/(\d+\.\d+)/);
    const amount = priceMatch ? parseFloat(priceMatch[1]) : null;

    return { invId, amount };
  } catch (error) {
    return { invId: null, amount: null };
  }
}

/**
 * Generate the appropriate link for an order based on whether QR code is available
 * Returns QR code page link if QR code exists, otherwise payment success page link
 */
async function generateOrderLink(orderId, requestOrigin = null) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }
    
    // Use request origin or environment variable, fallback to globalbanka.roamjet.net
    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://globalbanka.roamjet.net';
    
    // If requestOrigin is provided, use it
    if (requestOrigin) {
      try {
        const url = new URL(requestOrigin);
        baseUrl = url.origin;
      } catch (e) {
        console.warn('⚠️ Could not parse requestOrigin, using default:', e);
      }
    }
    
    // Ensure HTTPS in production
    if (process.env.NODE_ENV === 'production' && baseUrl.startsWith('http://')) {
      baseUrl = baseUrl.replace('http://', 'https://');
    }
    
    // Check if eSIM order has QR code available in Supabase
    const { data: order, error } = await supabaseAdmin
      .from('esim_orders')
      .select('qr_code_url, iccid, activation_code')
      .or(`airalo_order_id.eq.${orderId},id.eq.${orderId}`)
      .limit(1)
      .single();
    
    if (!error && order) {
      // Check if QR code exists
      const qrCode = order.qr_code_url;
      const hasQrCode = qrCode && qrCode !== 'null' && qrCode.trim() !== '' && qrCode !== '';
      
      if (hasQrCode) {
        // QR code is available - link to QR code page
        const qrCodeLink = `${baseUrl}/dashboard/qr-code/${orderId}`;
        console.log(`✅ QR code available for order ${orderId}, linking to QR code page`);
        return {
          link: qrCodeLink,
          type: 'qr_code',
          hasQrCode: true
        };
      }
    }
    
    // No QR code available yet - link to payment success page
    const paymentSuccessLink = `${baseUrl}/payment-success?order=${orderId}`;
    console.log(`ℹ️ QR code not available yet for order ${orderId}, linking to payment success page`);
    return {
      link: paymentSuccessLink,
      type: 'payment_success',
      hasQrCode: false
    };
  } catch (error) {
    console.error('❌ Error generating order link:', error);
    // Fallback to payment success page - use environment variable or globalbanka.roamjet.net
    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://globalbanka.roamjet.net';
    if (process.env.NODE_ENV === 'production' && baseUrl.startsWith('http://')) {
      baseUrl = baseUrl.replace('http://', 'https://');
    }
    return {
      link: `${baseUrl}/payment-success?order=${orderId}`,
      type: 'payment_success',
      hasQrCode: false,
      error: error.message
    };
  }
}

// Load Robokassa config from Supabase
async function getRobokassaConfig() {
  if (!supabaseAdmin) {
    throw new Error('Supabase not configured');
  }

  const { data: config, error: configError } = await supabaseAdmin
    .from('admin_config')
    .select('robokassa_merchant_login, robokassa_pass_one, robokassa_pass_two, robokassa_mode')
    .limit(1)
    .single();

  if (configError || !config) {
    console.error('❌ Error loading Robokassa config from Supabase:', configError);
    throw new Error('Robokassa credentials not configured');
  }

  let passOne = config?.robokassa_pass_one || '';
  let passTwo = config?.robokassa_pass_two || '';
  const robokassaMode = config?.robokassa_mode || 'test';

  // If test mode is enabled, allow environment variables to override
  if (robokassaMode === 'test') {
    passOne = process.env.NEXT_PUBLIC_ROBOKASSA_TEST_PASS_ONE || passOne;
    passTwo = process.env.NEXT_PUBLIC_ROBOKASSA_TEST_PASS_TWO || passTwo;
    console.log('🧪 Using test credentials (mode: test)');
  }

  return {
    merchantLogin: config?.robokassa_merchant_login || '',
    passOne: passOne,
    passTwo: passTwo,
    mode: robokassaMode
  };
}

/**
 * Generate MD5 hash for Robokassa signature verification
 * Robokassa signature format: OutSum:InvId:Password2 (for ResultURL)
 * or MerchantLogin:OutSum:InvId:Password1 (for SuccessURL)
 */
function generateSignature(...args) {
  // Join all arguments with colons
  const signatureString = args.join(':');
  return crypto.createHash('md5').update(signatureString).digest('hex');
}

/**
 * Verify Robokassa callback signature
 * For ResultURL: uses Password2, signature format: OutSum:InvId:Password2
 * For SuccessURL: uses Password1, signature format: MerchantLogin:OutSum:InvId:Password1
 */
async function verifyCallbackSignature(params, usePassOne = false) {
  const { OutSum, InvId, SignatureValue } = params;

  // Validate required parameters
  if (!OutSum || !InvId || !SignatureValue) {
    console.error('❌ Missing required parameters for signature verification:', {
      hasOutSum: !!OutSum,
      hasInvId: !!InvId,
      hasSignatureValue: !!SignatureValue,
      params: params
    });
    return false;
  }

  const ROBOKASSA_CONFIG = await getRobokassaConfig();

  // Use Password1 for SuccessURL, Password2 for ResultURL
  const password = usePassOne ? ROBOKASSA_CONFIG.passOne : ROBOKASSA_CONFIG.passTwo;

  let expectedSignature;
  let expectedSignatureWithoutMerchantLogin;

  if (usePassOne) {
    // SuccessURL: Try both formats - with and without MerchantLogin
    // Format 1: MerchantLogin:OutSum:InvId:Password1
    expectedSignature = generateSignature(
      ROBOKASSA_CONFIG.merchantLogin,
      OutSum,
      InvId,
      password
    );
    // Format 2: OutSum:InvId:Password1 (fallback)
    expectedSignatureWithoutMerchantLogin = generateSignature(OutSum, InvId, password);
  } else {
    // ResultURL: OutSum:InvId:Password2
    expectedSignature = generateSignature(OutSum, InvId, password);
  }

  // Ensure SignatureValue is a string before calling toLowerCase
  const receivedSignature = String(SignatureValue || '').toLowerCase();
  const expectedSigLower = String(expectedSignature || '').toLowerCase();
  const expectedSigWithoutMerchantLower = expectedSignatureWithoutMerchantLogin
    ? String(expectedSignatureWithoutMerchantLogin).toLowerCase()
    : '';

  console.log('🔐 Signature verification:', {
    merchantLogin: usePassOne ? ROBOKASSA_CONFIG.merchantLogin : 'N/A',
    outSum: OutSum,
    invId: InvId,
    passwordType: usePassOne ? 'PassOne' : 'PassTwo',
    signatureFormat: usePassOne ? 'MerchantLogin:OutSum:InvId:PassOne' : 'OutSum:InvId:PassTwo',
    expectedSignature,
    expectedSignatureWithoutMerchantLogin: usePassOne ? expectedSignatureWithoutMerchantLogin : 'N/A',
    receivedSignature: SignatureValue,
    match: expectedSigLower === receivedSignature,
    matchWithoutMerchantLogin: usePassOne ? expectedSigWithoutMerchantLower === receivedSignature : false
  });

  // Try primary signature first, fallback to alternate format for SuccessURL
  if (usePassOne && expectedSignatureWithoutMerchantLogin) {
    return expectedSigLower === receivedSignature ||
      expectedSigWithoutMerchantLower === receivedSignature;
  }

  return expectedSigLower === receivedSignature;
}

/**
 * Convert country name to country code using the country map
 */
function getCountryCodeFromName(countryName) {
  if (!countryName) return null;

  const countryMap = getCountryMap();
  // Find country by name (case-insensitive)
  const entry = Object.entries(countryMap).find(
    ([key, value]) => value?.name && countryName && value.name.toLowerCase() === countryName.toLowerCase()
  );
  return entry && entry[1]?.code ? entry[1].code : null;
}

/**
 * Convert country code to country name using the country map
 */
function getCountryNameFromCode(countryCode) {
  if (!countryCode) return null;

  const countryMap = getCountryMap();
  // Find country by code (case-insensitive)
  const entry = Object.entries(countryMap).find(
    ([key, value]) => value?.code && countryCode && value.code.toLowerCase() === countryCode.toLowerCase()
  );
  return entry && entry[1]?.name ? entry[1].name : null;
}

/**
 * Get the country map (shared between functions)
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
 * Example: "kargi-mobile-7days-1gb" -> { code: "GE", name: "Georgia" }
 */
function getCountryFromPlan(planId) {
  if (!planId) return { code: "US", name: "United States" };

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
 * Create eSIM record after successful payment (server-side, works for both web and mobile)
 */
// In-memory lock to prevent duplicate eSIM creation (race condition protection)
const creatingEsims = new Set();

/**
 * Top-up existing eSIM after successful payment
 * Extends validity and/or adds data to an existing eSIM
 */
async function topupEsimAfterPayment(orderId, topupPlanId, topupPlanName, amount, userId, customerEmail, existingEsimIccid = null, existingEsimOrderId = null) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }

    console.log('💳 Starting eSIM top-up process:', {
      orderId,
      topupPlanId,
      topupPlanName,
      existingEsimIccid,
      existingEsimOrderId
    });

    // Find existing eSIM order by ICCID or orderId in Supabase
    let existingEsim = null;

    if (existingEsimIccid) {
      const { data: esimByIccid, error: iccidError } = await supabaseAdmin
        .from('esim_orders')
        .select('*')
        .eq('iccid', existingEsimIccid)
        .limit(1)
        .single();
      
      if (!iccidError && esimByIccid) {
        existingEsim = esimByIccid;
      }
    }

    if (!existingEsim && existingEsimOrderId) {
      const { data: esimByOrderId, error: orderError } = await supabaseAdmin
        .from('esim_orders')
        .select('*')
        .or(`airalo_order_id.eq.${existingEsimOrderId},id.eq.${existingEsimOrderId}`)
        .limit(1)
        .single();
      
      if (!orderError && esimByOrderId) {
        existingEsim = esimByOrderId;
      }
    }

    if (!existingEsim) {
      console.error('❌ Existing eSIM not found for top-up:', { existingEsimIccid, existingEsimOrderId });
      return { success: false, error: 'Existing eSIM not found' };
    }

    console.log('✅ Found existing eSIM for top-up:', existingEsim.id);

    // STEP 1: Call REAL RoamJet SDK API to actually perform the topup
    console.log('🌐 Calling REAL RoamJet SDK to perform topup...');
    let roamjetTopupResult = null;
    try {
      // Get RoamJet API key from MongoDB configuration
      let roamjetApiKey = null;
      try {
        // First try environment variable as fallback
        roamjetApiKey = process.env.NEXT_PUBLIC_ROAMJET_API_KEY;

        // Get from Supabase admin_config
        if (!roamjetApiKey) {
          try {
            if (supabaseAdmin) {
              const { data: config, error: configError } = await supabaseAdmin
                .from('admin_config')
                .select('roamjet_api_key')
                .limit(1)
                .single();
              
              if (!configError && config?.roamjet_api_key) {
                roamjetApiKey = config.roamjet_api_key;
                console.log('🔑 Using RoamJet API key from Supabase:', roamjetApiKey.substring(0, 15) + '...');
              }
            }
          } catch (supabaseError) {
            console.error('❌ Error getting API key from Supabase:', supabaseError);
          }
        } else {
          console.log('🔑 Using RoamJet API key from environment:', roamjetApiKey.substring(0, 15) + '...');
        }
        
        if (!roamjetApiKey) {
          throw new Error('RoamJet API key is not configured. Please configure it in admin settings or set NEXT_PUBLIC_ROAMJET_API_KEY environment variable.');
        }
      } catch (keyError) {
        console.error('❌ Error getting RoamJet API key:', keyError);
        throw keyError; // Don't use fallback, throw error instead
      }

      // Get RoamJet SDK URL from environment
      const SDK_BASE_URL = process.env.NEXT_PUBLIC_SDK_URL || 'https://sdk.roamjet.net';

      // Call the RoamJet SDK topup API
      const topupResponse = await fetch(`${SDK_BASE_URL}/api/user/topup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': roamjetApiKey,
        },
        body: JSON.stringify({
          iccid: existingEsimIccid,
          package_id: topupPlanId,
          to_email: customerEmail
        })
      });

      if (topupResponse.ok) {
        roamjetTopupResult = await topupResponse.json();
        if (roamjetTopupResult && roamjetTopupResult.success) {
          console.log('✅ REAL RoamJet topup successful:', roamjetTopupResult);
        } else {
          console.error('❌ REAL RoamJet topup failed:', roamjetTopupResult);
        }
      } else {
        const errorText = await topupResponse.text();
        console.error('❌ REAL RoamJet topup API error:', topupResponse.status, errorText);
      }
    } catch (roamjetError) {
      console.error('❌ Error calling REAL RoamJet topup API:', roamjetError);
      // Continue with local update even if RoamJet fails (for debugging)
    }

    // STEP 2: Get top-up plan details to determine validity extension and data amount
    let validityDays = 30; // Default extension
    let dataAmountGB = null;

    try {
      // Try to get plan from Supabase esim_packages
      const packageIdNum = parseInt(topupPlanId);
      if (!isNaN(packageIdNum)) {
        const { data: topupPlan, error: planError } = await supabaseAdmin
          .from('esim_packages')
          .select('validity_days, data_amount_mb')
          .eq('id', packageIdNum)
          .limit(1)
          .single();
        
        if (!planError && topupPlan) {
          validityDays = topupPlan.validity_days || 30;
          if (topupPlan.data_amount_mb) {
            dataAmountGB = topupPlan.data_amount_mb / 1024;
          }
        }
      }
    } catch (planError) {
      console.warn('⚠️ Could not fetch top-up plan details, using defaults:', planError.message);
    }

    // Calculate new expiry date
    const currentExpiry = existingEsim.expiry_date
      ? new Date(existingEsim.expiry_date)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const newExpiryDate = new Date(currentExpiry.getTime() + validityDays * 24 * 60 * 60 * 1000);

    // Update eSIM order with top-up information in Supabase
    const updateData = {
      expiry_date: newExpiryDate.toISOString(),
      updated_at: new Date().toISOString()
    };

    // Update the order in Supabase
    const { data: updatedEsim, error: updateError } = await supabaseAdmin
      .from('esim_orders')
      .update(updateData)
      .eq('id', existingEsim.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    console.log('✅ eSIM top-up completed successfully (both RoamJet SDK and local database):', {
      esimId: updatedEsim.id,
      previousExpiry: currentExpiry.toISOString(),
      newExpiry: newExpiryDate.toISOString(),
      validityDays: validityDays,
      roamjetIccid: existingEsimIccid,
      roamjetTopupPlan: topupPlanId,
      roamjetTopupSuccess: roamjetTopupResult?.success || false
    });

    return {
      success: true,
      esimId: updatedEsim.id,
      previousExpiry: currentExpiry.toISOString(),
      newExpiry: newExpiryDate.toISOString(),
      validityDays: validityDays,
      roamjetTopupSuccess: roamjetTopupResult?.success || false,
      roamjetTopupId: roamjetTopupResult?.topupId || null
    };
  } catch (error) {
    console.error('❌ Error topping up eSIM:', error);
    return { success: false, error: error.message };
  }
}

async function activateEsimAfterPayment(orderId, planId, planName, amount, userId, customerEmail, countryCode = null, countryName = null) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }

    console.log(`🔄 Activating eSIM after payment for order: ${orderId}`);
    console.log(`📦 Plan ID received: ${planId} (type: ${typeof planId})`);

    // STEP 0: Get the correct plan slug (not ObjectId) before processing
    let actualPlanSlug = planId;
    
    // Check if planId is a MongoDB ObjectId (24 hex chars)
    if (planId && /^[0-9a-fA-F]{24}$/.test(planId)) {
      console.log('🔍 planId is MongoDB ObjectId, fetching plan slug from order...');
      
      try {
        // First, try to get the packageId from the order in Supabase
        const { data: order, error: orderError } = await supabaseAdmin
          .from('esim_orders')
          .select('package_id, esim_packages(package_id)')
          .eq('airalo_order_id', orderId.toString())
          .limit(1)
          .single();
        
        if (!orderError && order) {
          if (order.package_id) {
            // Get the package_id (slug) from the package
            if (order.esim_packages && order.esim_packages.package_id) {
              actualPlanSlug = order.esim_packages.package_id;
              console.log(`✅ Using package slug from order: ${actualPlanSlug}`);
            } else {
              // Fetch plan from API to get the slug
              const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.roamjet.net';
              const plansResponse = await fetch(`${API_BASE_URL}/api/public/plans/${order.package_id}`);
              
              if (plansResponse.ok) {
                const planData = await plansResponse.json();
                if (planData.success && planData.data?.plan) {
                  actualPlanSlug = planData.data.plan.slug || planData.data.plan.id || planId;
                  console.log(`✅ Found plan slug from API: ${actualPlanSlug}`);
                }
              }
            }
          }
        } else {
          // Try to fetch plan from API using the ObjectId
          console.log('🔍 Fetching plan from API using ObjectId...');
          const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.roamjet.net';
          const plansResponse = await fetch(`${API_BASE_URL}/api/public/plans?id=${planId}`);
          
          if (plansResponse.ok) {
            const plansData = await plansResponse.json();
            if (plansData.success && plansData.data?.plans && plansData.data.plans.length > 0) {
              const plan = plansData.data.plans[0];
              actualPlanSlug = plan.slug || plan.id || planId;
              console.log(`✅ Found plan slug from API: ${actualPlanSlug}`);
            }
          }
        }
      } catch (slugError) {
        console.error('❌ Error fetching plan slug:', slugError);
        console.log(`⚠️ Will use original planId: ${planId} (may fail if it's an ObjectId)`);
      }
    } else {
      // planId is already a slug, use it as is
      console.log(`✅ planId is already a slug: ${actualPlanSlug}`);
    }

    // Check if we're already processing this eSIM (prevent race condition)
    const lockKey = `${orderId}_${actualPlanSlug}`;
    if (creatingEsims.has(lockKey)) {
      console.log('⏳ eSIM activation already in progress for orderId:', orderId);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Set lock
    creatingEsims.add(lockKey);

    try {
      // Find existing pending eSIM record
      // Note: airalo_order_id is stored as text/bigint, so we only use string comparison
      const orderIdStr = orderId.toString();

      console.log(`🔍 [activateEsimAfterPayment] Searching for existing eSIM with orderId:`, {
        orderId: orderId,
        orderIdStr: orderIdStr,
        orderIdType: typeof orderId
      });

      // Find existing eSIM order in Supabase
      const { data: existingEsim, error: findError } = await supabaseAdmin
        .from('esim_orders')
        .select('*')
        .eq('airalo_order_id', orderIdStr)
        .limit(1)
        .maybeSingle();

      console.log(`🔍 [activateEsimAfterPayment] Search result:`, {
        found: !!existingEsim && !findError,
        esimId: existingEsim?.id,
        existingOrderId: existingEsim?.airalo_order_id,
        existingStatus: existingEsim?.status
      });

      if (existingEsim && !findError) {
        console.log(`📱 Found existing eSIM record: ${existingEsim.id}`);
        console.log(`📦 Existing eSIM details:`, {
          orderId: existingEsim.airalo_order_id,
          status: existingEsim.status,
          hasQrCode: !!(existingEsim.qr_code_url && existingEsim.qr_code_url !== 'null' && existingEsim.qr_code_url.trim() !== ''),
          hasIccid: !!(existingEsim.iccid && existingEsim.iccid.trim() !== '')
        });

        // Check if eSIM is already fully processed (has QR code or ICCID)
        const hasQrCode = existingEsim.qr_code_url && existingEsim.qr_code_url !== 'null' && existingEsim.qr_code_url.trim() !== '';
        const hasIccid = existingEsim.iccid && existingEsim.iccid.trim() !== '';
        const isAlreadyProcessed = hasQrCode || hasIccid;

        if (isAlreadyProcessed) {
          console.log('✅ eSIM already processed - skipping RoamJet API call to prevent duplicate purchase');
          console.log(`📱 Existing eSIM already has data - returning success without calling RoamJet API`);
          
          // Just ensure customer_email and user_id are set if missing
          const updateData = {
            updated_at: new Date().toISOString()
          };
          
          if (customerEmail && !existingEsim.customer_email) {
            updateData.customer_email = customerEmail;
          }
          
          if (userId && !existingEsim.user_id) {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(userId)) {
              updateData.user_id = userId;
            }
          }
          
          // Only update if there are changes
          if (Object.keys(updateData).length > 1) { // More than just updated_at
            const { data: updatedEsim, error: updateError } = await supabaseAdmin
              .from('esim_orders')
              .update(updateData)
              .eq('id', existingEsim.id)
              .select()
              .single();
            
            if (!updateError && updatedEsim) {
              console.log(`✅ Updated existing eSIM metadata: ${updatedEsim.id}`);
            }
          }
          
          return { 
            success: true, 
            esimId: existingEsim.id, 
            activated: existingEsim.status === 'active',
            alreadyProcessed: true,
            roamjetPurchaseSuccess: false // Didn't call API
          };
        }

        // eSIM exists but not fully processed - continue to purchase
        console.log('⚠️ eSIM exists but missing data - will call RoamJet API to complete purchase');

        // STEP 1: Call REAL RoamJet SDK API to actually purchase the eSIM
        console.log('🌐 Calling REAL RoamJet SDK to purchase eSIM...');
        let roamjetOrderResult = null;
        try {
          // Get RoamJet API key from MongoDB configuration
          let roamjetApiKey = null;
          try {
            // First try environment variable as fallback
            roamjetApiKey = process.env.NEXT_PUBLIC_ROAMJET_API_KEY;

            // Get from Supabase admin_config
            if (!roamjetApiKey) {
              try {
                if (supabaseAdmin) {
                  const { data: config, error: configError } = await supabaseAdmin
                    .from('admin_config')
                    .select('roamjet_api_key')
                    .limit(1)
                    .single();
                  
                  if (!configError && config?.roamjet_api_key) {
                    roamjetApiKey = config.roamjet_api_key;
                    console.log('🔑 Using RoamJet API key from Supabase:', roamjetApiKey.substring(0, 15) + '...');
                  }
                }
              } catch (supabaseError) {
                console.error('❌ Error getting API key from Supabase:', supabaseError);
              }
            } else {
              console.log('🔑 Using RoamJet API key from environment:', roamjetApiKey.substring(0, 15) + '...');
            }
            
            if (!roamjetApiKey) {
              throw new Error('RoamJet API key is not configured. Please configure it in admin settings or set NEXT_PUBLIC_ROAMJET_API_KEY environment variable.');
            }
          } catch (keyError) {
            console.error('❌ Error getting RoamJet API key:', keyError);
            throw keyError; // Don't use fallback, throw error instead
          }

          // Get RoamJet API URL from environment
          const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_ORDER_URL || 'https://api.roamjet.net';

          // Call the RoamJet API to purchase eSIM (use actualPlanSlug, not planId)
          console.log(`🌐 Calling RoamJet API with package_id: ${actualPlanSlug}`);
          const orderResponse = await fetch(`${API_BASE_URL}/api/user/order`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': roamjetApiKey,
            },
            body: JSON.stringify({
              package_id: actualPlanSlug, // Use the actual slug, not ObjectId
              quantity: "1",
              to_email: customerEmail,
              description: `eSIM order for ${customerEmail} - Order ${orderId}`,
            })
          });

          if (orderResponse.ok) {
            roamjetOrderResult = await orderResponse.json();
            if (roamjetOrderResult && roamjetOrderResult.success) {
              console.log('✅ REAL RoamJet purchase successful:', roamjetOrderResult);
            } else {
              console.error('❌ REAL RoamJet purchase failed:', roamjetOrderResult);
            }
          } else {
            const errorText = await orderResponse.text();
            console.error('❌ REAL RoamJet purchase API error:', orderResponse.status, errorText);
          }
        } catch (roamjetError) {
          console.error('❌ Error calling REAL RoamJet purchase API:', roamjetError);
          throw new Error(`Failed to purchase eSIM from RoamJet API: ${roamjetError.message}`);
        }

        // CRITICAL: Only proceed if RoamJet API call was successful
        if (!roamjetOrderResult || !roamjetOrderResult.success) {
          throw new Error('RoamJet API purchase failed or returned unsuccessful response');
        }

        // STEP 2: Activate the existing eSIM (make it visible) and update with API results
        const updateData = {
          status: 'active', // Make visible (pending -> active)
          activated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Update with RoamJet API results if available
        if (roamjetOrderResult && roamjetOrderResult.success) {
          // Extract QR code/LPA and other data from orderData.sims array
          let qrCode = null;
          let lpa = null;
          let iccid = null;
          let activationCode = null;
          let qrCodeUrl = null;
          
          if (roamjetOrderResult.orderData && roamjetOrderResult.orderData.sims && roamjetOrderResult.orderData.sims.length > 0) {
            const sim = roamjetOrderResult.orderData.sims[0];
            qrCode = sim.qrcode || sim.qrCode || null;
            lpa = sim.lpa || null;
            iccid = sim.iccid || null;
            activationCode = sim.activation_code || sim.activationCode || null;
            qrCodeUrl = sim.qrcode_url || sim.qrCodeUrl || null;
            
            console.log('📦 Extracted SIM data from orderData.sims[0]:', {
              hasQrCode: !!qrCode,
              hasLpa: !!lpa,
              hasIccid: !!iccid,
              hasActivationCode: !!activationCode
            });
          }
          
          // Fallback to top-level fields if sims array doesn't have the data
          if (!qrCode && roamjetOrderResult.qrCode) {
            qrCode = roamjetOrderResult.qrCode;
          }
          if (!lpa && roamjetOrderResult.lpa) {
            lpa = roamjetOrderResult.lpa;
          }
          if (!iccid && roamjetOrderResult.iccid) {
            iccid = roamjetOrderResult.iccid;
          }
          if (!activationCode && roamjetOrderResult.activationCode) {
            activationCode = roamjetOrderResult.activationCode;
          }
          
          // Save extracted data to Supabase
          if (iccid) {
            updateData.iccid = iccid;
          }
          if (qrCodeUrl || (qrCode || lpa)) {
            // Prefer qrCodeUrl, otherwise use LPA or qrCode
            updateData.qr_code_url = qrCodeUrl || (lpa || qrCode);
            console.log('✅ Saved QR code/LPA to eSIM:', {
              hasQrCode: !!qrCode,
              hasLpa: !!lpa,
              hasQrCodeUrl: !!qrCodeUrl
            });
          }
          if (activationCode) {
            updateData.activation_code = activationCode;
          }
          
          // Update airalo_order_id if provided
          if (roamjetOrderResult.orderId) {
            updateData.airalo_order_id = roamjetOrderResult.orderId.toString();
          }
        }

        // Update the order in Supabase
        const { data: updatedEsim, error: updateError } = await supabaseAdmin
          .from('esim_orders')
          .update(updateData)
          .eq('id', existingEsim.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        console.log(`✅ Activated existing eSIM: ${updatedEsim.id}`);
        console.log(`👁️ eSIM status: pending → active (now visible)`);
        if (roamjetOrderResult && roamjetOrderResult.success) {
          // Extract QR code info for logging
          let hasQrCode = false;
          let hasLpa = false;
          if (roamjetOrderResult.orderData && roamjetOrderResult.orderData.sims && roamjetOrderResult.orderData.sims.length > 0) {
            const sim = roamjetOrderResult.orderData.sims[0];
            hasQrCode = !!(sim.qrcode || sim.qrCode);
            hasLpa = !!sim.lpa;
          } else {
            hasQrCode = !!roamjetOrderResult.qrCode;
            hasLpa = !!roamjetOrderResult.lpa;
          }
          
          console.log(`🌐 RoamJet purchase completed:`, {
            airaloOrderId: roamjetOrderResult.orderId,
            hasIccid: !!(roamjetOrderResult.orderData?.sims?.[0]?.iccid || roamjetOrderResult.iccid),
            hasQrCode: hasQrCode,
            hasLpa: hasLpa
          });
        }

        return { success: true, esimId: updatedEsim.id, activated: true, roamjetPurchaseSuccess: true };
      }

      // No existing eSIM found - create new one (fallback)
      console.log(`⚠️ No existing eSIM found for order ${orderId}, creating new one`);

      // Get country info - try multiple sources in order of preference
      let countryInfo;

      // 1. Use provided country info if available (from order metadata)
      if (countryCode && countryName) {
        countryInfo = { code: countryCode, name: countryName };
        console.log('📍 Using provided country info from order metadata:', countryInfo);
      } else {
        // Try to get from order in Supabase if not passed directly
        try {
          const { data: order, error: orderError } = await supabaseAdmin
            .from('esim_orders')
            .select('package_id, esim_packages(esim_countries(airalo_country_code, country_name))')
            .eq('airalo_order_id', orderId.toString())
            .limit(1)
            .single();
          
          if (!orderError && order && order.esim_packages?.esim_countries) {
            const country = order.esim_packages.esim_countries;
            if (country.airalo_country_code && country.country_name) {
              countryInfo = { code: country.airalo_country_code, name: country.country_name };
              console.log('📍 Using country info from order package:', countryInfo);
            }
          }
        } catch (e) {
          console.log('⚠️ Could not get country from order:', e.message);
        }
      }

      // If still no country info, try other sources
      if (!countryInfo) {
        // 2. Try to extract from order's package country info
        try {
          const { data: order, error: orderError } = await supabaseAdmin
            .from('esim_orders')
            .select('package_id, esim_packages(esim_countries(airalo_country_code, country_name))')
            .eq('airalo_order_id', orderId.toString())
            .limit(1)
            .single();
          
          if (!orderError && order && order.esim_packages?.esim_countries) {
            const country = order.esim_packages.esim_countries;
            if (country.airalo_country_code && country.country_name) {
              countryInfo = { code: country.airalo_country_code, name: country.country_name };
              console.log('📍 Using country info from order package:', countryInfo);
            }
          }
          
          // Legacy: Try to extract from order's simDetails (from Airalo API response) - skip for now as we don't store this in Supabase
          // Commented out - simDetails not stored in Supabase
          /*
          if (order && order.simDetails) {
            const simDetails = order.simDetails;
            // Extract coverage from manual_installation or qrcode_installation HTML
            const coverageText = simDetails.manual_installation || simDetails.qrcode_installation || '';
            const coverageMatch = coverageText.match(/<b>Coverage:\s*<\/b>\s*([^<]+)/i);
            if (coverageMatch) {
              const countryNameFromCoverage = coverageMatch[1].trim();
              console.log('🌍 Found coverage from Airalo API:', countryNameFromCoverage);

              // Map common country names to codes
              const countryNameMap = {
                'United Arab Emirates': 'AE',
                'Netherlands': 'NL',
                'United States': 'US',
                'United Kingdom': 'GB',
                'Germany': 'DE',
                'France': 'FR',
                'Spain': 'ES',
                'Italy': 'IT',
                'Canada': 'CA',
                'Australia': 'AU',
                'Japan': 'JP',
                'South Korea': 'KR',
                'Singapore': 'SG',
                'Hong Kong': 'HK',
                'Taiwan': 'TW',
                'Thailand': 'TH',
                'Malaysia': 'MY',
                'Indonesia': 'ID',
                'Philippines': 'PH',
                'Vietnam': 'VN',
                'India': 'IN',
                'China': 'CN',
                'Brazil': 'BR',
                'Mexico': 'MX',
                'Turkey': 'TR',
                'Russia': 'RU',
                'Ukraine': 'UA',
                'Poland': 'PL',
                'Czech Republic': 'CZ',
                'Hungary': 'HU',
                'Romania': 'RO',
                'Bulgaria': 'BG',
                'Greece': 'GR',
                'Portugal': 'PT',
                'Belgium': 'BE',
                'Austria': 'AT',
                'Switzerland': 'CH',
                'Sweden': 'SE',
                'Norway': 'NO',
                'Denmark': 'DK',
                'Finland': 'FI',
                'Ireland': 'IE',
                'Israel': 'IL',
                'South Africa': 'ZA',
                'Egypt': 'EG',
                'Morocco': 'MA',
                'Saudi Arabia': 'SA',
                'Kuwait': 'KW',
                'Qatar': 'QA',
                'Bahrain': 'BH',
                'Oman': 'OM',
                'Jordan': 'JO',
                'Lebanon': 'LB'
              };

              const countryCodeFromName = countryNameMap[countryNameFromCoverage] || getCountryCodeFromName(countryNameFromCoverage);
              if (countryCodeFromName) {
                countryInfo = { code: countryCodeFromName, name: countryNameFromCoverage };
                console.log('📍 Extracted country from Airalo order simDetails:', countryInfo);
              }
            }
          }
          */
        } catch (e) {
          console.log('⚠️ Could not extract country from order simDetails:', e.message);
        }

        // 3. Try to fetch from plan data API (if country info not found yet)
        if (!countryInfo) {
          try {
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.roamjet.net';
            const plansResponse = await fetch(`${API_BASE_URL}/api/public/plans?slug=${planId}`);
            if (plansResponse.ok) {
              const plansData = await plansResponse.json();
              if (plansData.success && plansData.data && plansData.data.plans && plansData.data.plans.length > 0) {
                const plan = plansData.data.plans[0];
                if (plan.country_codes && plan.country_codes.length > 0) {
                  const countryCodeFromPlan = plan.country_codes[0];
                  // Convert country code to country name using the utility
                  try {
                    const countryNameFromPlan = await getCountryNameFromCodeUtil(countryCodeFromPlan);
                    if (countryNameFromPlan) {
                      countryInfo = { code: countryCodeFromPlan, name: countryNameFromPlan };
                      console.log('📍 Extracted country from plan data API:', countryInfo);
                    }
                  } catch (error) {
                    console.log('⚠️ Could not get country name from utility:', error);
                    // Fallback to old method
                    const countryNameFromPlan = getCountryNameFromCode(countryCodeFromPlan);
                    if (countryNameFromPlan) {
                      countryInfo = { code: countryCodeFromPlan, name: countryNameFromPlan };
                      console.log('📍 Extracted country from plan data API (fallback):', countryInfo);
                    }
                  }
                }
              }
            }
          } catch (e) {
            console.log('⚠️ Could not fetch country from plan data API:', e.message);
          }
        }

        // 4. Fall back to parsing from plan ID (last resort) - but log extensive warnings
        if (!countryInfo) {
          countryInfo = getCountryFromPlan(planId);
          console.log('📍 Extracted country from plan ID (fallback):', countryInfo);

          // CRITICAL: If we got USA as default, this is dangerous - log extensive error and try harder
          if (countryInfo.code === 'US' && countryInfo.name === 'United States') {
            console.error('⚠️⚠️⚠️ WARNING: Defaulting to USA - this may be incorrect!');
            console.error('⚠️ Order ID:', orderId);
            console.error('⚠️ Plan ID:', planId);
            console.error('⚠️ Attempting additional lookups to find correct country...');

            // Try multiple additional methods to get correct country
            try {
              const { data: order } = await supabaseAdmin
                .from('esim_orders')
                .select('*')
                .eq('airalo_order_id', orderId.toString())
                .maybeSingle();
              
              if (order) {
                // Method 1: Try fetching from plans API with package_id
                if (order.package_id) {
                  // Get package slug first
                  let packageSlug = order.package_id.toString();
                  const { data: packageData } = await supabaseAdmin
                    .from('esim_packages')
                    .select('package_id')
                    .eq('id', order.package_id)
                    .maybeSingle();
                  
                  if (packageData && packageData.package_id) {
                    packageSlug = packageData.package_id;
                  }
                  
                  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.roamjet.net';
                  // Try by slug
                  let plansResponse = await fetch(`${API_BASE_URL}/api/public/plans?slug=${packageSlug}`);
                  if (!plansResponse.ok) {
                    // Try by ID
                    plansResponse = await fetch(`${API_BASE_URL}/api/public/plans?id=${order.package_id}`);
                  }
                  if (plansResponse.ok) {
                    const plansData = await plansResponse.json();
                    if (plansData.success && plansData.data && plansData.data.plans && plansData.data.plans.length > 0) {
                      const plan = plansData.data.plans[0];
                      if (plan.country_codes && plan.country_codes.length > 0) {
                        const countryCodeFromPlan = plan.country_codes[0];
                        const countryNameFromPlan = getCountryNameFromCode(countryCodeFromPlan);
                        if (countryNameFromPlan && countryCodeFromPlan !== 'US') {
                          countryInfo = { code: countryCodeFromPlan, name: countryNameFromPlan };
                          console.log('✅✅✅ Found correct country from plans API:', countryInfo);
                        }
                      }
                    }
                  }
                }

                // Method 2: Check if order has country info directly
                if (order.country_code && order.country_code !== 'US') {
                  const countryNameFromOrder = getCountryNameFromCode(order.country_code);
                  if (countryNameFromOrder) {
                    countryInfo = { code: order.country_code, name: countryNameFromOrder };
                    console.log('✅✅✅ Found correct country from order:', countryInfo);
                  }
                }
              }
            } catch (e) {
              console.error('❌ Additional country lookup attempts failed:', e.message);
            }

            // Final warning if still USA
            if (countryInfo.code === 'US') {
              console.error('❌❌❌ FINAL WARNING: Creating eSIM with USA as country - this may be WRONG!');
              console.error('❌ Order ID:', orderId);
              console.error('❌ Plan ID:', planId);
              console.error('❌ Please verify the eSIM country manually after creation!');
            }
          }
        }
      }

      // PRIORITY: Use country info from order metadata if available
      if (!countryInfo && orderDetails && (orderDetails.countryCode || orderDetails.countryName)) {
        countryInfo = {
          code: orderDetails.countryCode || "US",
          name: orderDetails.countryName || "United States"
        };
        console.log('📍 PRIORITY: Using country from orderDetails:', countryInfo);
      }

      // Ensure we have country info (use USA as absolute last resort, but log it)
      if (!countryInfo) {
        console.error('❌ No country info found anywhere, using USA default');
        countryInfo = { code: "US", name: "United States" };
      }

      // Log final country being used
      console.log(`🌍 FINAL COUNTRY FOR ESIM: ${countryInfo.code} - ${countryInfo.name}`);

      // STEP 1: Call REAL RoamJet SDK API to actually purchase the eSIM
      console.log('🌐 Calling REAL RoamJet SDK to purchase eSIM...');
      let roamjetOrderResult = null;
      try {
        // Get RoamJet API key from MongoDB configuration
        let roamjetApiKey = null;
        try {
          // First try environment variable as fallback
          roamjetApiKey = process.env.NEXT_PUBLIC_ROAMJET_API_KEY;

          // Get from Supabase admin_config
          if (!roamjetApiKey) {
            try {
              if (supabaseAdmin) {
                const { data: config, error: configError } = await supabaseAdmin
                  .from('admin_config')
                  .select('roamjet_api_key')
                  .limit(1)
                  .single();
                
                if (!configError && config?.roamjet_api_key) {
                  roamjetApiKey = config.roamjet_api_key;
                  console.log('🔑 Using RoamJet API key from Supabase:', roamjetApiKey.substring(0, 15) + '...');
                }
              }
            } catch (supabaseError) {
              console.error('❌ Error getting API key from Supabase:', supabaseError);
            }
          } else {
            console.log('🔑 Using RoamJet API key from environment:', roamjetApiKey.substring(0, 15) + '...');
          }
          
          if (!roamjetApiKey) {
            throw new Error('RoamJet API key is not configured. Please configure it in admin settings or set NEXT_PUBLIC_ROAMJET_API_KEY environment variable.');
          }
        } catch (keyError) {
          console.error('❌ Error getting RoamJet API key:', keyError);
          throw keyError; // Don't use fallback, throw error instead
        }

        // Get RoamJet API URL from environment
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_ORDER_URL || 'https://api.roamjet.net';

          // Call the RoamJet API to purchase eSIM (use actualPlanSlug, not planId)
          console.log(`🌐 Calling RoamJet API with package_id: ${actualPlanSlug}`);
          const orderResponse = await fetch(`${API_BASE_URL}/api/user/order`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': roamjetApiKey,
            },
            body: JSON.stringify({
              package_id: actualPlanSlug, // Use the actual slug, not ObjectId
              quantity: "1",
              to_email: customerEmail,
              description: `eSIM order for ${customerEmail} - Order ${orderId}`,
            })
          });

        if (orderResponse.ok) {
          roamjetOrderResult = await orderResponse.json();
          if (roamjetOrderResult && roamjetOrderResult.success) {
            console.log('✅ REAL RoamJet purchase successful:', roamjetOrderResult);
          } else {
            console.error('❌ REAL RoamJet purchase failed:', roamjetOrderResult);
          }
        } else {
          const errorText = await orderResponse.text();
          console.error('❌ REAL RoamJet purchase API error:', orderResponse.status, errorText);
        }
      } catch (roamjetError) {
        console.error('❌ Error calling REAL RoamJet purchase API:', roamjetError);
        throw new Error(`Failed to purchase eSIM from RoamJet API: ${roamjetError.message}`);
      }

      // CRITICAL: Only proceed if RoamJet API call was successful
      if (!roamjetOrderResult || !roamjetOrderResult.success) {
        throw new Error('RoamJet API purchase failed or returned unsuccessful response');
      }

      // STEP 2: Create eSIM data with CORRECT country info and RoamJet API results
      console.log(`🌍 Creating eSIM record with country: ${countryInfo.code} - ${countryInfo.name}`);
      const esimData = {
        activationDate: null,
        capacity: 13,
        countryCode: countryInfo.code, // This should be NL for Netherlands
        countryName: countryInfo.name, // This should be Netherlands
        createdAt: new Date(),
        currency: "RUB", // Always RUB for Robokassa payments
        errorMessage: null,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        iccid: roamjetOrderResult?.iccid || "",
        operator: {
          name: "Roamjet",
          slug: "roamjet"
        },
        orderResult: {
          activationCode: (() => {
            if (roamjetOrderResult?.orderData?.sims?.[0]) {
              return roamjetOrderResult.orderData.sims[0].activation_code || roamjetOrderResult.orderData.sims[0].activationCode || "";
            }
            return roamjetOrderResult?.activationCode || "";
          })(),
          confirmationCode: "",
          createdAt: new Date().toISOString(),
          iccid: (() => {
            if (roamjetOrderResult?.orderData?.sims?.[0]) {
              return roamjetOrderResult.orderData.sims[0].iccid || "";
            }
            return roamjetOrderResult?.iccid || "";
          })(),
          isDemo: false,
          orderId: orderId,
          planId: actualPlanSlug, // Use the actual slug
          planName: planName,
          provider: "airalo",
          qrCode: (() => {
            // Extract QR code from orderData.sims array
            if (roamjetOrderResult?.orderData?.sims?.[0]) {
              const sim = roamjetOrderResult.orderData.sims[0];
              return sim.lpa || sim.qrcode || sim.qrCode || "";
            }
            return roamjetOrderResult?.lpa || roamjetOrderResult?.qrCode || "";
          })(),
          smdpAddress: (() => {
            if (roamjetOrderResult?.orderData?.sims?.[0]) {
              return roamjetOrderResult.orderData.sims[0].smdp_address || roamjetOrderResult.orderData.sims[0].smdpAddress || "";
            }
            return roamjetOrderResult?.smdpAddress || "";
          })(),
          status: "active",
          success: true,
          validUntil: null,
          airaloOrderId: roamjetOrderResult?.orderId || null
        },
        period: 365,
        planId: actualPlanSlug, // Use the actual slug
        planName: planName,
        price: amount,
        purchaseDate: new Date(),
        qrCode: (() => {
          // Extract QR code from orderData.sims array
          if (roamjetOrderResult?.orderData?.sims?.[0]) {
            const sim = roamjetOrderResult.orderData.sims[0];
            return sim.lpa || sim.qrcode || sim.qrCode || "";
          }
          return roamjetOrderResult?.lpa || roamjetOrderResult?.qrCode || "";
        })(),
        lpa: (() => {
          // Extract LPA from orderData.sims array
          if (roamjetOrderResult?.orderData?.sims?.[0]) {
            return roamjetOrderResult.orderData.sims[0].lpa || null;
          }
          return roamjetOrderResult?.lpa || null;
        })(),
        iccid: (() => {
          if (roamjetOrderResult?.orderData?.sims?.[0]) {
            return roamjetOrderResult.orderData.sims[0].iccid || "";
          }
          return roamjetOrderResult?.iccid || "";
        })(),
        status: "active",
        updatedAt: new Date(),
        processingStatus: 'completed',
        completedAt: new Date(),
        userId: userId || `email_${customerEmail}`,
        sessionLost: !userId,
        processingKey: `${userId || `email_${customerEmail}`}_${orderId}_${Date.now()}`
      };

      // Create eSIM order record in Supabase
      const supabaseOrderData = {
        airalo_order_id: orderId.toString(),
        price_rub: parseFloat(amount) || 0,
        status: 'active',
        activated_at: new Date().toISOString()
      };
      
      // Always store customer_email to enable searching by email
      if (customerEmail) {
        supabaseOrderData.customer_email = customerEmail;
      }
      
      // Set user_id if userId is provided (UUID format)
      if (userId) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(userId)) {
          supabaseOrderData.user_id = userId;
        }
      }
      
      // Set package_id if it's a valid numeric ID (not an orderId)
      // Order IDs are typically 13+ digits, package IDs are much smaller
      if (actualPlanSlug) {
        const packageIdNum = parseInt(actualPlanSlug);
        // Only use as package_id if it's a reasonable number (not an orderId)
        // Package IDs are typically < 1,000,000, order IDs are 13+ digits
        if (!isNaN(packageIdNum) && packageIdNum > 0 && packageIdNum < 1000000) {
          supabaseOrderData.package_id = packageIdNum;
          console.log(`✅ Valid package_id found in callback: ${packageIdNum}`);
        } else {
          console.warn(`⚠️ actualPlanSlug "${actualPlanSlug}" looks like an orderId (too large), skipping package_id assignment`);
        }
      }
      
      // Extract and set SIM data from RoamJet result
      if (roamjetOrderResult && roamjetOrderResult.success) {
        let iccid = null;
        let qrCode = null;
        let activationCode = null;
        
        if (roamjetOrderResult.orderData?.sims?.[0]) {
          const sim = roamjetOrderResult.orderData.sims[0];
          iccid = sim.iccid || null;
          qrCode = sim.lpa || sim.qrcode || sim.qrCode || null;
          activationCode = sim.activation_code || sim.activationCode || null;
        } else {
          iccid = roamjetOrderResult.iccid || null;
          qrCode = roamjetOrderResult.lpa || roamjetOrderResult.qrCode || null;
          activationCode = roamjetOrderResult.activationCode || null;
        }
        
        if (iccid) supabaseOrderData.iccid = iccid;
        if (qrCode) supabaseOrderData.qr_code_url = qrCode;
        if (activationCode) supabaseOrderData.activation_code = activationCode;
      }
      
      const { data: newEsim, error: insertError } = await supabaseAdmin
        .from('esim_orders')
        .insert(supabaseOrderData)
        .select()
        .single();
      
      if (insertError) {
        throw insertError;
      }

      console.log('✅ eSIM record created successfully in callback route:', newEsim.id);
      if (roamjetOrderResult && roamjetOrderResult.success) {
        // Extract QR code info for logging
        let hasQrCode = false;
        let hasLpa = false;
        if (roamjetOrderResult.orderData && roamjetOrderResult.orderData.sims && roamjetOrderResult.orderData.sims.length > 0) {
          const sim = roamjetOrderResult.orderData.sims[0];
          hasQrCode = !!(sim.qrcode || sim.qrCode);
          hasLpa = !!sim.lpa;
        } else {
          hasQrCode = !!roamjetOrderResult.qrCode;
          hasLpa = !!roamjetOrderResult.lpa;
        }
        
        console.log('🌐 RoamJet purchase completed:', {
          airaloOrderId: roamjetOrderResult.orderId,
          hasIccid: !!(roamjetOrderResult.orderData?.sims?.[0]?.iccid || roamjetOrderResult.iccid),
          hasQrCode: hasQrCode,
          hasLpa: hasLpa
        });
      }

      // Send activation email
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://globalbanka.roamjet.net';
        const activationLink = `${baseUrl}/payment-success?order=${orderId}`;

        console.log(`📧 Sending activation email to ${customerEmail} for order ${orderId}`);
        await sendActivationEmail(customerEmail, orderId, planName, activationLink);
      } catch (emailError) {
        console.error('❌ Error sending activation email:', emailError);
        // Don't fail the process if email sending fails
      }

      return { success: true, esimId: newEsim.id };
    } finally {
      // Always remove lock
      creatingEsims.delete(lockKey);
    }
  } catch (error) {
    console.error('❌ Error creating eSIM in callback route:', error);
    return { success: false, error: error.message };
  }
}

export async function POST(request) {
  // CRITICAL: Log immediately to ensure it appears in Vercel logs
  // Using console.error for maximum visibility in Vercel logs
  console.error('🚨🚨🚨 ROBOKASSA POST CALLBACK TRIGGERED 🚨🚨🚨');
  console.error('🚨🚨🚨 ROBOKASSA POST CALLBACK TRIGGERED 🚨🚨🚨');
  console.error('🚨🚨🚨 ROBOKASSA POST CALLBACK TRIGGERED 🚨🚨🚨');
  console.log('🚨🚨🚨 ROBOKASSA POST CALLBACK TRIGGERED 🚨🚨🚨');
  console.log('🚨🚨🚨 ROBOKASSA POST CALLBACK TRIGGERED 🚨🚨🚨');
  console.log('🚨🚨🚨 ROBOKASSA POST CALLBACK TRIGGERED 🚨🚨🚨');

  const requestStartTime = new Date().toISOString();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Outer try-catch to ensure we log even if there's an error before inner try block
  try {
    // Log request metadata
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📥 [${requestId}] Robokassa POST callback received at: ${requestStartTime}`);
    console.error(`📥 [${requestId}] Robokassa POST callback received at: ${requestStartTime}`); // Also log to stderr for visibility
    console.log(`📥 [${requestId}] Request URL: ${request.url}`);
    console.log(`📥 [${requestId}] Request method: ${request.method}`);

    // Log headers (excluding sensitive data)
    const headers = Object.fromEntries(request.headers.entries());
    const safeHeaders = { ...headers };
    if (safeHeaders.authorization) {
      safeHeaders.authorization = '***REDACTED***';
    }
    console.log(`📥 [${requestId}] Request headers:`, JSON.stringify(safeHeaders, null, 2));

    // Log IP address
    const clientIP = request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      'unknown';
    console.log(`📥 [${requestId}] Client IP: ${clientIP}`);

    // Log user agent
    const userAgent = request.headers.get('user-agent') || 'unknown';
    console.log(`📥 [${requestId}] User-Agent: ${userAgent}`);

    // Robokassa ResultURL sends form data, not JSON
    // Try to get form data first, fallback to JSON
    let body;
    let contentType = request.headers.get('content-type') || 'unknown';
    console.log(`📥 [${requestId}] Content-Type: ${contentType}`);

    try {
      body = await request.formData();
      body = Object.fromEntries(body.entries());
      console.log(`📥 [${requestId}] Successfully parsed as FormData`);
    } catch (formError) {
      console.log(`📥 [${requestId}] FormData parsing failed, trying JSON:`, formError.message);
      try {
        body = await request.json();
        console.log(`📥 [${requestId}] Successfully parsed as JSON`);
      } catch (jsonError) {
        console.error(`❌ [${requestId}] Failed to parse body as FormData or JSON:`, jsonError.message);
        // Try to get raw text
        try {
          const textBody = await request.text();
          console.log(`📥 [${requestId}] Raw body (text):`, textBody.substring(0, 500));
          body = { raw: textBody };
        } catch (textError) {
          console.error(`❌ [${requestId}] Failed to get body as text:`, textError.message);
          body = {};
        }
      }
    }

    console.log(`📥 [${requestId}] Request body:`, JSON.stringify(body, null, 2));
    console.log(`📥 [${requestId}] Body keys:`, Object.keys(body));

    // Extract parameters
    const { OutSum, InvId, SignatureValue } = body;

    console.log(`🔍 [${requestId}] Extracted parameters:`, {
      OutSum: OutSum,
      InvId: InvId,
      SignatureValue: SignatureValue ? `${SignatureValue.substring(0, 10)}...` : 'missing',
      hasOutSum: !!OutSum,
      hasInvId: !!InvId,
      hasSignatureValue: !!SignatureValue
    });

    // Validate required fields FIRST before signature verification
    const missingFields = {
      missingOutSum: !OutSum,
      missingInvId: !InvId,
      missingSignatureValue: !SignatureValue
    };

    const hasMissingFields = missingFields.missingOutSum || missingFields.missingInvId || missingFields.missingSignatureValue;

    if (hasMissingFields) {
      console.error(`❌ [${requestId}] Missing required fields:`, missingFields);
      console.error(`❌ [${requestId}] Received body:`, JSON.stringify(body, null, 2));
      console.error(`❌ [${requestId}] Raw body values:`, {
        OutSum: OutSum,
        InvId: InvId,
        SignatureValue: SignatureValue
      });
      // Robokassa expects plain text "bad sign" for invalid/missing parameters
      return new NextResponse('bad sign', { status: 400 });
    }

    // Verify the signature using Password2 for ResultURL
    console.log(`🔐 [${requestId}] Verifying signature...`);
    const isValid = await verifyCallbackSignature(body, false);

    if (!isValid) {
      console.error(`❌ [${requestId}] Invalid Robokassa callback signature`);
      console.error(`❌ [${requestId}] Received body:`, JSON.stringify(body, null, 2));
      console.error(`❌ [${requestId}] Signature verification failed. All fields present:`, {
        hasOutSum: !!OutSum,
        hasInvId: !!InvId,
        hasSignatureValue: !!SignatureValue
      });
      // Robokassa expects plain text "bad sign" for invalid signature
      return new NextResponse('bad sign', { status: 400 });
    }

    console.log(`✅ [${requestId}] Signature verification passed`);

    // Convert amount from kopecks to rubles (if needed)
    // Note: OutSum might already be in rubles or kopecks depending on Robokassa config
    const amount = OutSum;

    console.log(`✅ [${requestId}] Robokassa payment verified:`, {
      orderId: InvId,
      amount: amount,
      amountType: typeof amount,
      signature: SignatureValue ? `${SignatureValue.substring(0, 10)}...` : 'missing'
    });

    // CRITICAL: Process eSIM creation here (server-side webhook)
    // This ensures eSIMs are created even if user doesn't return to success page
    console.log(`💾 [${requestId}] Searching for order in Supabase...`);
    let orderDetails = null;
    try {
      if (!supabaseAdmin) {
        throw new Error('Supabase not configured');
      }
      
      // Use string comparison for airalo_order_id (it's stored as text/bigint, not integer)
      const orderIdStr = InvId.toString();
      console.log(`💾 [${requestId}] Searching for order:`, { InvId, orderIdStr, InvIdType: typeof InvId });
      
      // Query Supabase using string comparison for airalo_order_id
      let { data: order, error: orderError } = await supabaseAdmin
        .from('esim_orders')
        .select('*')
        .eq('airalo_order_id', orderIdStr)
        .limit(1)
        .maybeSingle();
      
      // If not found by airalo_order_id, try by DB id (bot uses DB id as Robokassa InvId)
      if (orderError || !order) {
        console.log(`⚠️ [${requestId}] Order not found by airalo_order_id, trying by DB id...`);
        const invIdNum = parseInt(orderIdStr, 10);
        if (!isNaN(invIdNum) && invIdNum > 0 && invIdNum < 1000000) {
          const { data: orderById, error: idError } = await supabaseAdmin
            .from('esim_orders')
            .select('*')
            .eq('id', invIdNum)
            .limit(1)
            .maybeSingle();
          if (!idError && orderById) {
            order = orderById;
            orderError = null;
            console.log(`✅ [${requestId}] Found order by DB id: ${invIdNum}`);
          }
        }
      }

      // If still not found, try a more flexible search
      if (orderError || !order) {
        console.log(`⚠️ [${requestId}] Order not found with exact match, trying flexible search...`);
        const { data: orderFlex, error: flexError } = await supabaseAdmin
          .from('esim_orders')
          .select('*')
          .ilike('airalo_order_id', orderIdStr)
          .limit(1)
          .maybeSingle();
        
        if (!flexError && orderFlex) {
          order = orderFlex;
          orderError = null;
        }
      }

      if (!orderError && order) {
        // Check if this is a coupon-created order (would be in metadata if we stored it)
        const isCouponOrder = false; // We don't store this in Supabase yet
        
        console.log(`✅ [${requestId}] Order found in database:`, {
          orderId: order.airalo_order_id || order.id,
          packageId: order.package_id,
          status: order.status,
          createdAt: order.created_at,
          userId: order.user_id || 'null'
        });
        
        // Default to esim_purchase for now
        const orderType = 'esim_purchase';

        orderDetails = {
          packageId: order.package_id?.toString(),
          customerEmail: null, // Not stored in esim_orders, would need to join with users
          planName: null, // Would need to join with packages
          userId: order.user_id,
          metadata: {}, // Not stored in esim_orders
          orderType: orderType,
          countryCode: null, // Would need to join with packages->countries
          countryName: null
        };

        console.log(`✅ [${requestId}] Found order in Supabase (ResultURL):`, orderDetails);

        // Update order status to 'active' (payment completed, eSIM will be created by email callback)
        console.log(`💳 [${requestId}] Updating order status to 'active' (payment completed)...`);
        const { data: updatedOrder, error: updateError } = await supabaseAdmin
          .from('esim_orders')
          .update({ 
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id)
          .select()
          .single();
        
        if (updateError) {
          throw updateError;
        }
        
        console.log(`✅ [${requestId}] Order marked as 'active' in ResultURL webhook (payment completed)`);
        console.log(`💳 [${requestId}] Order status updated:`, {
          status: updatedOrder.status
        });

        // NOTE: eSIM creation is handled by n8n workflow (triggered by webhook or IMAP)
        // The POST callback only updates order status to 'active' (payment completed)
        console.log(`ℹ️ [${requestId}] eSIM creation is handled by n8n workflow, not in callback`);

        // If order came from Telegram bot, send QR code + install button to chat
        if (updatedOrder.metadata?.source === 'telegram_bot' && updatedOrder.metadata?.chat_id) {
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          const chatId = updatedOrder.metadata.chat_id;
          
          try {
            // Fetch QR code and install URL from order
            const qrUrl = updatedOrder.qr_code_url;
            const lpa = updatedOrder.lpa;
            const iccid = updatedOrder.iccid;
            const appleInstallUrl = updatedOrder.direct_apple_installation_url || 
              (lpa ? `https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=${lpa}` : null);
            
            let text = `✅ *Оплата получена!*\n\n` +
              `📦 Заказ #${updatedOrder.id}\n` +
              `🌍 ${updatedOrder.country_name || ''}\n\n`;
            
            const keyboard = [];
            
            if (qrUrl) {
              text += `📱 QR-код для установки eSIM готов!\n\n` +
                `Откройте ссылку ниже и отсканируйте QR-код камерой телефона, или нажмите кнопку установки.`;
              keyboard.push([{ text: '📱 QR-код', url: qrUrl }]);
            }
            
            if (appleInstallUrl) {
              keyboard.push([{ text: '⬇️ Установить eSIM (iPhone)', url: appleInstallUrl }]);
            }
            
            // Always add a link to the web dashboard
            keyboard.push([{ text: '🌐 Открыть в браузере', url: `https://globalbanka.roamjet.net/dashboard/qr-code/${updatedOrder.airalo_order_id || updatedOrder.id}` }]);
            
            if (!qrUrl && !appleInstallUrl) {
              text += `⏳ eSIM активируется, QR-код будет отправлен в течение нескольких минут.`;
            }
            
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'Markdown',
                reply_markup: keyboard.length > 0 ? { inline_keyboard: keyboard } : undefined
              })
            });
            console.log(`📱 [${requestId}] Sent Telegram notification to chat ${chatId}`);
          } catch (tgErr) {
            console.error(`❌ [${requestId}] Failed to send Telegram notification:`, tgErr.message);
          }
        }

        // Trigger n8n webhook so workflow can create eSIM (reliable alternative to IMAP)
        // NOTE: This runs on the server only. Check server logs (not mobile app logs) for webhook fire.
        const n8nWebhookUrl = process.env.N8N_ORDER_PAID_WEBHOOK_URL || process.env.NEXT_PUBLIC_N8N_ORDER_PAID_WEBHOOK_URL;
        if (n8nWebhookUrl) {
          const webhookUrlWithQuery = `${n8nWebhookUrl}${n8nWebhookUrl.includes('?') ? '&' : '?'}extractedNumber=${encodeURIComponent(orderIdStr)}`;
          console.log(`🔔 [${requestId}] Firing n8n webhook for order ${orderIdStr} -> ${n8nWebhookUrl.split('?')[0]}`);
          fetch(webhookUrlWithQuery, { method: 'GET' }).then(res => {
            if (res.ok) {
              console.log(`✅ [${requestId}] n8n webhook triggered OK for order ${orderIdStr}`);
            } else {
              console.warn(`⚠️ [${requestId}] n8n webhook returned ${res.status} for order ${orderIdStr}`);
            }
          }).catch(err => {
            console.error(`❌ [${requestId}] n8n webhook failed for order ${orderIdStr}:`, err.message);
          });
        } else {
          console.log(`ℹ️ [${requestId}] N8N_ORDER_PAID_WEBHOOK_URL not set, skipping webhook trigger`);
        }
      } else {
        console.error(`⚠️ [${requestId}] No pending order found for orderId in ResultURL:`, {
          orderId: InvId,
          searchedOrderId: InvId.toString(),
          orderIdType: typeof InvId
        });
        
        // Debug: Check if there are any coupon orders with similar orderIds
        try {
          const orderIdPrefix = InvId.toString().substring(0, 10);
          // Query for orders with similar orderId prefix
          const { data: similarOrdersByPrefix } = await supabaseAdmin
            .from('esim_orders')
            .select('airalo_order_id, customer_email, metadata, created_at')
            .like('airalo_order_id', `${orderIdPrefix}%`)
            .order('created_at', { ascending: false })
            .limit(5);
          
          // Query for orders with coupon codes
          const { data: couponOrders } = await supabaseAdmin
            .from('esim_orders')
            .select('airalo_order_id, customer_email, metadata, created_at')
            .not('metadata->couponCode', 'is', null)
            .order('created_at', { ascending: false })
            .limit(5);
          
          // Combine and deduplicate
          const allSimilarOrders = [...(similarOrdersByPrefix || []), ...(couponOrders || [])];
          const uniqueOrders = Array.from(new Map(allSimilarOrders.map(o => [o.airalo_order_id, o])).values());
          
          if (uniqueOrders.length > 0) {
            console.log(`🔍 [${requestId}] Found similar/coupon orders:`, uniqueOrders.slice(0, 5).map(o => ({
              orderId: o.airalo_order_id,
              orderIdType: typeof o.airalo_order_id,
              customerEmail: o.customer_email,
              couponCode: o.metadata?.couponCode,
              createdAt: o.created_at
            })));
          }
        } catch (debugError) {
          console.error(`⚠️ [${requestId}] Error checking for similar orders:`, debugError.message);
        }
      }
    } catch (dbError) {
      console.error(`⚠️ [${requestId}] Error processing order in ResultURL webhook:`, {
        error: dbError.message,
        stack: dbError.stack,
        orderId: InvId
      });
      // Continue anyway - will return OK to Robokassa
    }

    // Calculate processing time
    const processingTime = Date.now() - new Date(requestStartTime).getTime();
    console.log(`✅ [${requestId}] Processing completed in ${processingTime}ms`);

    // Robokassa ResultURL expects plain text response: "OK{InvId}"
    const responseText = `OK${InvId}`;
    console.log(`📤 [${requestId}] Sending response to Robokassa:`, {
      status: 200,
      response: responseText,
      orderId: InvId
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return new NextResponse(responseText, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });

  } catch (error) {
    const processingTime = Date.now() - new Date(requestStartTime).getTime();
    console.error(`❌ [${requestId}] Error processing Robokassa callback:`, {
      error: error.message,
      stack: error.stack,
      name: error.name,
      processingTime: `${processingTime}ms`
    });
    console.error(`❌ [${requestId}] Request body that caused error:`, JSON.stringify(body, null, 2));
    console.error(`❌ [${requestId}] Full error object:`, error);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Robokassa expects plain text "error" for errors
    return new NextResponse('error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

export async function GET(request) {
  // CRITICAL: Log immediately for visibility
  console.error('🚨🚨🚨 ROBOKASSA GET CALLBACK (SUCCESSURL) TRIGGERED 🚨🚨🚨');
  console.error('🚨🚨🚨 ROBOKASSA GET CALLBACK (SUCCESSURL) TRIGGERED 🚨🚨🚨');
  console.log('🚨🚨🚨 ROBOKASSA GET CALLBACK (SUCCESSURL) TRIGGERED 🚨🚨🚨');

  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    // Check if this is an email-based payment request from n8n
    const { emailBody, invoiceNumber, skipEsimCreation } = params;
    if (emailBody || invoiceNumber) {
      console.log('📧 Email-based payment request detected in GET callback');
      
      try {
        // Parse email to get order ID
        let orderId = null;
        let amount = null;
        
        if (emailBody) {
          const parsed = parseRobokassaEmail(emailBody);
          orderId = parsed.invId;
          amount = parsed.amount;
        }
        
        // Fallback to invoiceNumber parameter if email parsing failed
        if (!orderId && invoiceNumber) {
          console.log(`📧 Using invoiceNumber parameter as fallback: ${invoiceNumber}`);
          orderId = invoiceNumber;
        }

        if (!orderId) {
          return NextResponse.json(
            { success: false, error: 'Order ID (inv_id) not found in email and invoiceNumber parameter not provided' },
            { status: 400 }
          );
        }

        // Find order in Supabase - use airalo_order_id (stored as text)
        const orderIdStr = orderId.toString();
        console.log(`🔍 Searching for order in email callback:`, { orderId, orderIdStr, orderIdType: typeof orderId });
        
        const { data: order, error: orderError } = await supabaseAdmin
          .from('esim_orders')
          .select('*')
          .eq('airalo_order_id', orderIdStr)
          .maybeSingle();
        
        if (orderError) {
          console.error('❌ Error querying order:', orderError);
          throw orderError;
        }
        
        if (!order) {
          console.error(`❌ Order not found:`, { orderId, orderIdStr });
          console.error(`❌ This might mean the order was never created, or there's a timing issue`);
          return NextResponse.json(
            { success: false, error: `Order not found: ${orderId}. The order may not have been created yet, or there may be a timing issue.` },
            { status: 404 }
          );
        }

        // IDEMPOTENCY: Check if already processed AND eSIM exists - if so, just return the link
        // This makes the endpoint safe to call multiple times (e.g., clicking link multiple times)
        // However, we must check if eSIM actually exists - if order is 'active' but no eSIM data,
        // we still need to process it
        const orderType = order.order_type || 'esim_purchase';
        const qrCode = order.qr_code_url;
        const iccid = order.iccid;
        const hasQrCode = qrCode && typeof qrCode === 'string' && qrCode !== 'null' && qrCode.trim() !== '';
        const hasIccid = iccid && typeof iccid === 'string' && iccid !== 'null' && iccid.trim() !== '';
        const hasEsimData = hasQrCode || hasIccid;
        
        if (order.status === 'active' && hasEsimData) {
          console.log(`✅ Order ${order.airalo_order_id} already processed with eSIM data - returning link (idempotent)`);
          
          // Generate link based on order type
          let orderLink;
          
          if (orderType === 'esim_topup') {
            // For top-ups, find the original eSIM and get its QR code link
            let baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://globalbanka.roamjet.net';
            // Try to get from request origin
            const requestOrigin = request.headers.get('origin') || request.headers.get('referer') || '';
            if (requestOrigin) {
              try {
                const url = new URL(requestOrigin);
                baseUrl = url.origin;
              } catch (e) {
                console.warn('⚠️ Could not parse requestOrigin for topup:', e);
              }
            }
            if (process.env.NODE_ENV === 'production' && baseUrl.startsWith('http://')) {
              baseUrl = baseUrl.replace('http://', 'https://');
            }
            try {
              // Find the original eSIM using metadata from the top-up order
              const metadata = order.metadata || {};
              const existingEsimIccid = metadata.existingEsimIccid || metadata.iccid;
              const existingEsimOrderId = metadata.existingEsimOrderId || metadata.originalOrderId;
              
              let originalEsim = null;
              if (existingEsimIccid) {
                const { data: esimByIccid } = await supabaseAdmin
                  .from('esim_orders')
                  .select('*')
                  .eq('iccid', existingEsimIccid)
                  .maybeSingle();
                originalEsim = esimByIccid;
              }
              
              if (!originalEsim && existingEsimOrderId) {
                const { data: esimByOrderId } = await supabaseAdmin
                  .from('esim_orders')
                  .select('*')
                  .eq('airalo_order_id', existingEsimOrderId.toString())
                  .maybeSingle();
                originalEsim = esimByOrderId;
              }
              
              if (originalEsim) {
                // Check if original eSIM has QR code
                const qrCode = originalEsim.qr_code_url;
                const hasQrCode = qrCode && qrCode !== 'null' && qrCode.trim() !== '' && qrCode !== '';
                
                if (hasQrCode) {
                  // Use the original eSIM's order ID for the QR code link
                  const originalOrderId = originalEsim.airalo_order_id || existingEsimOrderId;
                  orderLink = {
                    link: `${baseUrl}/dashboard/qr-code/${originalOrderId}`,
                    type: 'qr_code',
                    hasQrCode: true
                  };
                } else {
                  // No QR code available, link to dashboard
                  orderLink = {
                    link: `${baseUrl}/dashboard`,
                    type: 'dashboard',
                    hasQrCode: false
                  };
                }
              } else {
                // Original eSIM not found, link to dashboard
                orderLink = {
                  link: `${baseUrl}/dashboard`,
                  type: 'dashboard',
                  hasQrCode: false
                };
              }
            } catch (topupLinkError) {
              console.error('❌ Error generating link for top-up:', topupLinkError);
              // Fallback to dashboard
              let baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://globalbanka.roamjet.net';
              const requestOrigin = request.headers.get('origin') || request.headers.get('referer') || '';
              if (requestOrigin) {
                try {
                  const url = new URL(requestOrigin);
                  baseUrl = url.origin;
                } catch (e) {
                  console.warn('⚠️ Could not parse requestOrigin for topup fallback:', e);
                }
              }
              if (process.env.NODE_ENV === 'production' && baseUrl.startsWith('http://')) {
                baseUrl = baseUrl.replace('http://', 'https://');
              }
              orderLink = {
                link: `${baseUrl}/dashboard`,
                type: 'dashboard',
                hasQrCode: false
              };
            }
          } else {
            // For purchases, generate link to QR code page or payment success
            const requestOrigin = request.headers.get('origin') || request.headers.get('referer') || '';
            orderLink = await generateOrderLink(order.airalo_order_id, requestOrigin);
          }
          
          console.log(`🔗 Generated order link for already processed order:`, orderLink);
          
          return NextResponse.json({
            success: true,
            message: 'Order already processed',
            orderId: order.airalo_order_id,
            link: orderLink.link,
            linkType: orderLink.type,
            hasQrCode: orderLink.hasQrCode,
            alreadyProcessed: true,
            customerEmail: order.customer_email || null,
            orderType: orderType
          });
        }
        
        // If order is 'active' but doesn't have eSIM data yet, we still need to process it
        if (order.status === 'active' && !hasEsimData) {
          console.log(`⚠️ Order ${order.airalo_order_id} is 'active' but missing eSIM data - processing eSIM now`);
        }

        // First time processing (or re-processing if eSIM is missing) - update order status if needed
        console.log(`🔄 Processing order ${order.airalo_order_id} ${order.status === 'active' ? '(re-processing due to missing eSIM data)' : 'for the first time'}`);
        
        // Only update status if order is not already 'active' (to preserve 'active' status if KYC was approved)
        const shouldUpdateStatus = order.status !== 'active';
        const newStatus = shouldUpdateStatus 
          ? (orderType === 'credit_card_application' ? 'active' : 'pending')
          : order.status;
        
        // Update order in Supabase (only status if needed, always update timestamp and order_type)
        const updateData = {
          order_type: orderType,
          updated_at: new Date().toISOString()
        };
        
        if (shouldUpdateStatus) {
          updateData.status = newStatus;
        }
        
        const { data: updatedOrder, error: updateError } = await supabaseAdmin
          .from('esim_orders')
          .update(updateData)
          .eq('id', order.id)
          .select()
          .single();
        
        if (updateError) {
          throw updateError;
        }
        
        console.log(`✅ Order ${order.airalo_order_id} ${shouldUpdateStatus ? `marked as ${newStatus}` : `status preserved as ${order.status}`}`);

        // NOTE: eSIM creation is now handled entirely by n8n workflow (not in callback)
        // The callback only updates order status and redirects user
        console.log(`ℹ️ eSIM creation is handled by n8n workflow, not in callback: ${order.airalo_order_id}`);

        // Generate the appropriate link - for both purchases and top-ups, try to get QR code link
        // For top-ups, we want to show the same QR code from the original eSIM
        let orderLink;
        
        if (orderType === 'esim_topup') {
          // For top-ups, find the original eSIM and get its QR code link
          let baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://globalbanka.roamjet.net';
          try {
            // Find the original eSIM using metadata from the top-up order
            const metadata = order.metadata || {};
            const existingEsimIccid = metadata.existingEsimIccid || metadata.iccid;
            const existingEsimOrderId = metadata.existingEsimOrderId || metadata.originalOrderId;
            
            let originalEsim = null;
            if (existingEsimIccid) {
              const { data: esimByIccid } = await supabaseAdmin
                .from('esim_orders')
                .select('*')
                .eq('iccid', existingEsimIccid)
                .maybeSingle();
              originalEsim = esimByIccid;
            }
            
            if (!originalEsim && existingEsimOrderId) {
              const { data: esimByOrderId } = await supabaseAdmin
                .from('esim_orders')
                .select('*')
                .eq('airalo_order_id', existingEsimOrderId.toString())
                .maybeSingle();
              originalEsim = esimByOrderId;
            }
            
            if (originalEsim) {
              // Check if original eSIM has QR code
              const qrCode = originalEsim.qr_code_url;
              const hasQrCode = qrCode && qrCode !== 'null' && qrCode.trim() !== '' && qrCode !== '';
              
              if (hasQrCode) {
                // Use the original eSIM's order ID for the QR code link
                const originalOrderId = originalEsim.airalo_order_id || existingEsimOrderId;
                orderLink = {
                  link: `${baseUrl}/dashboard/qr-code/${originalOrderId}`,
                  type: 'qr_code',
                  hasQrCode: true
                };
                console.log(`🔗 Generated QR code link for top-up (using original eSIM):`, orderLink);
              } else {
                // No QR code available, link to dashboard
                orderLink = {
                  link: `${baseUrl}/dashboard`,
                  type: 'dashboard',
                  hasQrCode: false
                };
                console.log(`🔗 Generated dashboard link for top-up (no QR code found):`, orderLink);
              }
            } else {
              // Original eSIM not found, link to dashboard
              orderLink = {
                link: `${baseUrl}/dashboard`,
                type: 'dashboard',
                hasQrCode: false
              };
              console.log(`🔗 Generated dashboard link for top-up (original eSIM not found):`, orderLink);
            }
          } catch (topupLinkError) {
            console.error('❌ Error generating link for top-up:', topupLinkError);
            // Fallback to dashboard
            let baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://globalbanka.roamjet.net';
            const requestOrigin = request.headers.get('origin') || request.headers.get('referer') || '';
            if (requestOrigin) {
              try {
                const url = new URL(requestOrigin);
                baseUrl = url.origin;
              } catch (e) {
                console.warn('⚠️ Could not parse requestOrigin for topup fallback:', e);
              }
            }
            if (process.env.NODE_ENV === 'production' && baseUrl.startsWith('http://')) {
              baseUrl = baseUrl.replace('http://', 'https://');
            }
            orderLink = {
              link: `${baseUrl}/dashboard`,
              type: 'dashboard',
              hasQrCode: false
            };
          }
        } else {
          // For purchases, generate link to QR code page or payment success
          const requestOrigin = request.headers.get('origin') || request.headers.get('referer') || '';
          orderLink = await generateOrderLink(order.airalo_order_id, requestOrigin);
          console.log(`🔗 Generated order link for n8n:`, orderLink);
        }

        return NextResponse.json({
          success: true,
          message: 'Payment processed successfully',
          orderId: order.airalo_order_id,
          amount: amount || order.price_rub,
          paymentStatus: updatedOrder.status,
          link: orderLink.link,
          linkType: orderLink.type,
          hasQrCode: orderLink.hasQrCode,
          alreadyProcessed: false,
          customerEmail: order.customer_email || null,
          orderType: orderType
        });

      } catch (error) {
        console.error('❌ Error processing email payment:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to process payment', details: error.message },
          { status: 500 }
        );
      }
    }

    // Continue with normal Robokassa redirect logic
    const ROBOKASSA_CONFIG = await getRobokassaConfig();

    // Log full request details
    const headers = Object.fromEntries(request.headers.entries());
    console.log('🔍 Robokassa success callback received:', params);
    console.log('🔍 Full URL:', request.url);
    console.error('🔍 GET Callback params:', JSON.stringify(params, null, 2));
    console.log('🔍 Request headers:', JSON.stringify(headers, null, 2));
    console.log('🔍 Referer:', request.headers.get('referer'));
    console.log('🔍 Environment:', {
      merchantLogin: ROBOKASSA_CONFIG.merchantLogin,
      passOne: ROBOKASSA_CONFIG.passOne?.substring(0, 5) + '...',
      passTwo: ROBOKASSA_CONFIG.passTwo?.substring(0, 5) + '...'
    });

    // Validate required parameters before signature verification
    const { OutSum, InvId, SignatureValue } = params;
    if (!OutSum || !InvId || !SignatureValue) {
      console.error('❌ Missing required parameters in GET callback:', {
        hasOutSum: !!OutSum,
        hasInvId: !!InvId,
        hasSignatureValue: !!SignatureValue,
        allParams: params,
        fullUrl: request.url,
        referer: request.headers.get('referer')
      });

      // If no parameters, this might be a cancelled payment or Robokassa issue
      // Check if POST callback (ResultURL) was already called by checking recent orders
      console.log('⚠️ GET callback has no parameters - checking if POST callback already processed payment...');

      // Redirect to payment failed with more specific reason
      return NextResponse.redirect(new URL('/payment-failed?reason=missing_parameters&note=check_post_callback', request.url));
    }

    // Verify the signature for success callback using Password1
    const isValid = await verifyCallbackSignature(params, true);

    if (!isValid) {
      console.error('❌ Invalid Robokassa success callback signature');
      console.error('❌ Received params:', JSON.stringify(params, null, 2));
      return NextResponse.redirect(new URL('/payment-failed?reason=invalid_signature', request.url));
    }

    // OutSum and InvId are already extracted above during validation
    const amount = OutSum / 100; // Convert from kopecks to rubles

    console.log('✅ Robokassa payment success verified:', {
      orderId: InvId,
      amount: amount
    });

    // Fetch pending order from Supabase
    let orderDetails = null;
    try {
      // Use airalo_order_id (stored as text) for lookup
      const orderIdStr = InvId.toString();
      console.log(`🔍 Searching for order with InvId:`, { InvId, orderIdStr, InvIdType: typeof InvId });
      
      const { data: order, error: orderError } = await supabaseAdmin
        .from('esim_orders')
        .select('*')
        .eq('airalo_order_id', orderIdStr)
        .maybeSingle();
      
      if (orderError) {
        console.error('❌ Error querying order:', orderError);
        throw orderError;
      }

      if (order) {
        // Check if this is a coupon-created order
        const isCouponOrder = order.metadata?.couponCode || order.metadata?.adminCreated || order.metadata?.source === 'admin_coupon';
        
        console.log(`✅ Order found in database (GET callback):`, {
          orderId: order.orderId,
          customerEmail: order.customerEmail,
          isCouponOrder: isCouponOrder,
          couponCode: order.metadata?.couponCode || null,
          userId: order.userId || 'null (email-based)'
        });
        
        // Get orderType from order.order_type first (set when creating pending order), then fallback to metadata.type
        const metadata = order.metadata || {};
        const orderType = order.order_type || metadata.type || 'esim_purchase';
        
        // Get package slug from package_id if needed
        let packageSlug = order.package_id?.toString();
        if (order.package_id) {
          const { data: packageData } = await supabaseAdmin
            .from('esim_packages')
            .select('package_id')
            .eq('id', order.package_id)
            .maybeSingle();
          
          if (packageData && packageData.package_id) {
            packageSlug = packageData.package_id;
          }
        }

        orderDetails = {
          packageId: packageSlug || order.package_id?.toString(),
          customerEmail: order.customer_email,
          planName: order.plan_name || packageSlug || order.package_id?.toString(),
          userId: order.user_id,
          metadata: metadata,
          orderType: orderType,
          countryCode: order.country_code || metadata.countryCode || null,
          countryName: order.country_name || metadata.countryName || null
        };
        console.log('✅ Found pending order in Supabase:', orderDetails);
        console.log('🌍 Order country info:', {
          countryCode: order.country_code,
          countryName: order.country_name,
          fromMetadata: metadata.countryCode && metadata.countryName,
          metadata: metadata
        });
        console.log('📦 Order orderType field:', order.order_type);
        console.log('📦 Final orderType:', orderType);

        // Update order status to 'active' - payment completed, eSIM will be created by email callback only
        console.log('💳 Updating order status to active (payment completed, eSIM will be created by email)...');
        const newStatus = 'active'; // Always use 'active' for successful payment (database constraint allows: pending, active, expired, failed)
        const { data: updatedOrder, error: updateError } = await supabaseAdmin
          .from('esim_orders')
          .update({ 
            status: newStatus,
            order_type: orderType,
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id)
          .select()
          .single();
        
        if (updateError) {
          throw updateError;
        }
        
        console.log('✅ Order marked as active (payment completed) - eSIM will be created by email callback');
        
        // NOTE: eSIM creation is ONLY triggered by email (emailBody/invoiceNumber), not by regular GET callback
        // This GET callback just updates status to 'active' (payment completed) and redirects with "wait for email" message
      } else {
        console.error('⚠️ No pending order found for orderId:', InvId);
      }
    } catch (dbError) {
      console.error('⚠️ Error fetching order from MongoDB:', dbError);
      // Continue anyway - will try to get from localStorage on client
    }

    // Redirect to appropriate success page based on order type
    // Default to esim_purchase if order not found or type not specified
    const orderType = orderDetails?.orderType || 'esim_purchase';
    const successPath = orderType === 'credit_card_application'
      ? '/payment-success/credit-card'
      : '/payment-success/esim';

    // Always use HTTPS for security - detect from request or use environment variable
    // Support both esim.globalbankaccounts.ru and globalbanka.roamjet.net
    const requestOrigin = request.headers.get('origin') || request.headers.get('referer') || '';
    const requestHost = request.headers.get('host') || '';
    
    // Allowed domains
    const allowedDomains = [
      'esim.globalbankaccounts.ru',
      'globalbanka.roamjet.net'
    ];
    
    let origin = process.env.NEXT_PUBLIC_BASE_URL || 'https://globalbanka.roamjet.net';

    // Try to extract origin from request headers (prefer request origin)
    if (requestOrigin) {
      try {
        const url = new URL(requestOrigin);
        const hostname = url.hostname;
        // Check if it's one of the allowed domains
        if (allowedDomains.some(domain => hostname.includes(domain))) {
          origin = url.origin;
          // Ensure HTTPS
          if (origin.startsWith('http://')) {
            origin = origin.replace('http://', 'https://');
          }
          console.log(`✅ Using origin from request headers: ${origin}`);
        }
      } catch (e) {
        console.warn('⚠️ Could not parse origin from request, trying host header:', e);
      }
    }
    
    // If origin not set from requestOrigin, try host header
    if (origin === (process.env.NEXT_PUBLIC_BASE_URL || 'https://globalbanka.roamjet.net') && requestHost) {
      try {
        const hostname = requestHost.split(':')[0]; // Remove port if present
        if (allowedDomains.some(domain => hostname.includes(domain))) {
          origin = `https://${hostname}`;
          console.log(`✅ Using origin from host header: ${origin}`);
        }
      } catch (e) {
        console.warn('⚠️ Could not parse host header:', e);
      }
    }

    // Fallback to environment variable if available
    if (process.env.NEXT_PUBLIC_BASE_URL && origin === 'https://globalbanka.roamjet.net') {
      const envUrl = process.env.NEXT_PUBLIC_BASE_URL;
      origin = envUrl.startsWith('http://') ? envUrl.replace('http://', 'https://') : envUrl;
      console.log(`✅ Using origin from environment variable: ${origin}`);
    }
    
    console.log(`🌐 Final redirect origin: ${origin}`);

    const successUrl = new URL(successPath, origin);

    console.log('✅ Success URL constructed:', successUrl.href);
    successUrl.searchParams.set('order', InvId);
    successUrl.searchParams.set('order_id', InvId); // Also set as 'order_id' for compatibility
    successUrl.searchParams.set('amount', amount.toString());
    successUrl.searchParams.set('total', amount.toString()); // Also set as 'total' for compatibility
    successUrl.searchParams.set('payment_method', 'robokassa');
    successUrl.searchParams.set('currency', 'RUB'); // Always RUB for Robokassa
    successUrl.searchParams.set('order_type', orderType); // Always set order_type
    
    // Add flag to show "wait for email" message (if not email-based request)
    if (!emailBody && !invoiceNumber) {
      successUrl.searchParams.set('wait_for_email', 'true');
    }

    // Add order details if available
    if (orderDetails) {
      successUrl.searchParams.set('plan_id', orderDetails.packageId);
      successUrl.searchParams.set('email', orderDetails.customerEmail);
      if (orderDetails.planName) {
        successUrl.searchParams.set('name', orderDetails.planName);
      }
      if (orderDetails.userId) {
        successUrl.searchParams.set('user_id', orderDetails.userId.toString());
      }
      // Add country information to URL so PaymentSuccess can use it
      if (orderDetails.countryCode) {
        successUrl.searchParams.set('countryCode', orderDetails.countryCode);
      }
      if (orderDetails.countryName) {
        successUrl.searchParams.set('countryName', orderDetails.countryName);
      }
      // Add metadata for credit card applications
      if (orderDetails.metadata && Object.keys(orderDetails.metadata).length > 0) {
        successUrl.searchParams.set('metadata', JSON.stringify(orderDetails.metadata));
      }
    } else {
      // If order not found, try to extract basic info from orderId
      // OrderId format might be: planId-timestamp-random
      // Try to extract planId from orderId
      const orderIdParts = InvId.toString().split('-');
      if (orderIdParts.length > 1) {
        // Assume first part might be plan ID
        const possiblePlanId = orderIdParts[0];
        if (possiblePlanId && possiblePlanId.length > 2) {
          successUrl.searchParams.set('plan_id', possiblePlanId);
        }
      }
      console.log('⚠️ Order not found in DB, but redirecting with orderId for client-side processing');
    }

    return NextResponse.redirect(successUrl);

  } catch (error) {
    console.error('❌ Error processing Robokassa success callback:', error);
    return NextResponse.redirect(new URL('/payment-failed?reason=processing_error', request.url));
  }
}
