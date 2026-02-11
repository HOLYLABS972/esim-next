/**
 * Store Configuration Service
 * Fetches payment methods and store settings from Supabase store_payment_config.
 * Enables multi-store payment routing: store=globalbanka → Robokassa, other stores → Stripe/Coinbase.
 */

import { supabase } from '../lib/supabase';

// Map crypto → coinbase (crypto is UI/config alias for Coinbase)
const PAYMENT_ALIASES = { crypto: 'coinbase' };
const resolvePaymentMethod = (m) => PAYMENT_ALIASES[m] || m;

// Cache for store config (5 min TTL)
let configCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Get current store ID (from env or default)
 */
export function getStoreId() {
  return process.env.NEXT_PUBLIC_STORE_ID || 'globalbanka';
}

/**
 * Fetch store payment config from Supabase
 * @param {string} storeId - Store identifier (e.g. 'globalbanka', 'roamjet')
 * @returns {Promise<{storeId: string, paymentMethods: string[], defaultCurrency: string}>}
 */
export async function getStorePaymentConfig(storeId) {
  const cacheKey = `store_config_${storeId}`;
  const cached = configCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const fallback = {
    storeId: storeId || getStoreId(),
    paymentMethods: ['robokassa'],
    defaultCurrency: 'RUB',
  };

  try {
    if (!supabase) {
      return fallback;
    }

    const { data, error } = await supabase
      .from('store_payment_config')
      .select('store_id, payment_methods, default_currency')
      .eq('store_id', storeId || getStoreId())
      .eq('is_active', true)
      .limit(1)
      .single();

    if (error || !data) {
      return fallback;
    }

    const rawMethods = Array.isArray(data.payment_methods) ? data.payment_methods : fallback.paymentMethods;
    const result = {
      storeId: data.store_id,
      paymentMethods: rawMethods.map((m) => resolvePaymentMethod(m)),
      defaultCurrency: data.default_currency || fallback.defaultCurrency,
    };

    configCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (err) {
    console.warn('⚠️ storeConfigService: Could not fetch config, using fallback:', err.message);
    return fallback;
  }
}

/**
 * Check if a payment method is enabled for the store
 * Accepts 'crypto' as alias for 'coinbase'
 */
export async function isPaymentMethodEnabled(storeId, paymentMethod) {
  const config = await getStorePaymentConfig(storeId);
  const resolved = resolvePaymentMethod(paymentMethod);
  return config.paymentMethods.includes(resolved) || config.paymentMethods.includes(paymentMethod);
}

/**
 * Get available payment methods for the current store
 */
export async function getAvailablePaymentMethods(storeId) {
  const config = await getStorePaymentConfig(storeId);
  return config.paymentMethods;
}
