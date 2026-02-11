// MongoDB removed - using Supabase via admin_config table
import { supabaseAdmin } from '../lib/supabase';

let configCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Load admin configuration from Supabase admin_config table
 * Results are cached for 5 minutes to reduce database queries
 */
export async function loadAdminConfig() {
  // Return cached config if still valid
  if (configCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
    return configCache;
  }

  try {
    // Get config from Supabase admin_config table
    const { data: dbConfig, error } = await supabaseAdmin
      .from('admin_config')
      .select('*')
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error loading admin config from Supabase:', error);
      throw error;
    }
    
    // Use Supabase config only, no ENV fallback
    const roamjetMode = dbConfig?.roamjet_mode || dbConfig?.roamjetMode || 'production'; // Default to production
    const config = {
      googleId: dbConfig?.google_id || dbConfig?.googleId || '',
      googleSecret: dbConfig?.google_secret || dbConfig?.googleSecret || '',
      googleAuthEnabled: dbConfig?.google_auth_enabled ?? dbConfig?.googleAuthEnabled ?? true,
      yandexAppId: dbConfig?.yandex_app_id || dbConfig?.yandexAppId || '',
      yandexAppSecret: dbConfig?.yandex_app_secret || dbConfig?.yandexAppSecret || '',
      yandexAuthEnabled: dbConfig?.yandex_auth_enabled ?? dbConfig?.yandexAuthEnabled ?? true,
      roamjetApiKey: dbConfig?.roamjet_api_key || dbConfig?.roamjetApiKey || '',
      roamjetMode,
      roamjetApiUrl: roamjetMode === 'production' ? 'https://api.roamjet.net' : 'https://sandbox.roamjet.net',
      robokassaMerchantLogin: dbConfig?.robokassa_merchant_login || dbConfig?.robokassaMerchantLogin || '',
      robokassaPassOne: dbConfig?.robokassa_pass_one || dbConfig?.robokassaPassOne || '',
      robokassaPassTwo: dbConfig?.robokassa_pass_two || dbConfig?.robokassaPassTwo || '',
      robokassaMode: dbConfig?.robokassa_mode || dbConfig?.robokassaMode || 'production',
      discountPercentage: dbConfig?.discount_percentage || dbConfig?.discountPercentage || 0,
      usdToRubRate: dbConfig?.usd_to_rub_rate || dbConfig?.usdToRubRate || 100
    };
    
    // Update cache
    configCache = config;
    cacheTimestamp = Date.now();
    
    return config;
  } catch (error) {
    console.error('❌ Error loading admin config:', error);
    
    // Return minimal defaults on error, no ENV fallback - always production/enabled
    const roamjetMode = 'production'; // Default to production
    const defaultConfig = {
      googleId: '',
      googleSecret: '',
      googleAuthEnabled: true, // Always enabled
      yandexAppId: '',
      yandexAppSecret: '',
      yandexAuthEnabled: true, // Always enabled
      roamjetApiKey: '',
      roamjetMode,
      roamjetApiUrl: roamjetMode === 'production' ? 'https://api.roamjet.net' : 'https://sandbox.roamjet.net',
      robokassaMerchantLogin: '',
      robokassaPassOne: '',
      robokassaPassTwo: '',
      robokassaMode: 'production', // Default to production
      discountPercentage: 0,
      usdToRubRate: 100
    };
    
    configCache = defaultConfig;
    cacheTimestamp = Date.now();
    
    return defaultConfig;
  }
}

/**
 * Clear the config cache (useful after updating config)
 */
export function clearConfigCache() {
  configCache = null;
  cacheTimestamp = null;
}

