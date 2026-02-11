/**
 * Store Payment Service - Unified payment router
 * Routes payments to the correct processor based on store config:
 * - store=globalbanka → Robokassa (via /api/robokassa/create-payment)
 * - other stores → Stripe Connect or Coinbase (when configured)
 */

import { getStorePaymentConfig, isPaymentMethodEnabled } from './storeConfigService';
import { paymentService } from './paymentService';

// Map crypto → coinbase (crypto is config/UI alias for Coinbase)
const PAYMENT_ALIASES = { crypto: 'coinbase' };
const resolveMethod = (m) => PAYMENT_ALIASES[m] || m;

/**
 * Create Robokassa payment via local API (reads config from Supabase admin_config)
 */
async function createRobokassaPayment(orderData) {
  const response = await fetch('/api/robokassa/create-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order: orderData.orderId,
      email: orderData.customerEmail,
      name: orderData.planName,
      total: orderData.amount,
      currency: orderData.currency || 'RUB',
      domain: typeof window !== 'undefined' ? window.location.origin : undefined,
      description: orderData.description || orderData.planName || 'eSIM Package',
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Failed to create payment' }));
    throw new Error(err.error || 'Robokassa payment failed');
  }

  const result = await response.json();
  if (result.paymentUrl) {
    if (typeof window !== 'undefined') {
      window.location.href = result.paymentUrl;
    }
    return result;
  }
  throw new Error('No payment URL received');
}

/**
 * Create checkout/payment and redirect based on store + payment method
 * @param {Object} params
 * @param {string} params.storeId - Store identifier (default: from env)
 * @param {string} params.paymentMethod - 'robokassa' | 'stripe' | 'coinbase'
 * @param {Object} params.orderData - { orderId, planId, planName, customerEmail, amount, currency, ... }
 */
export async function createStoreCheckout({ storeId, paymentMethod, orderData }) {
  const effectiveStoreId = storeId || process.env.NEXT_PUBLIC_STORE_ID || 'globalbanka';
  const resolvedMethod = resolveMethod(paymentMethod);

  const enabled = await isPaymentMethodEnabled(effectiveStoreId, resolvedMethod);
  if (!enabled) {
    throw new Error(`Payment method "${paymentMethod}" is not enabled for store "${effectiveStoreId}"`);
  }

  switch (resolvedMethod) {
    case 'robokassa':
      return createRobokassaPayment(orderData);
    case 'stripe':
      return paymentService.createCheckoutSession({ ...orderData, storeId: effectiveStoreId });
    case 'coinbase':
      // Add coinbaseService import when configured for this store
      throw new Error('Coinbase payment is not configured for this store');
    default:
      throw new Error(`Unknown payment method: ${paymentMethod}`);
  }
}

/**
 * Get available payment methods for the store (for UI)
 */
export async function getStorePaymentMethods(storeId) {
  const config = await getStorePaymentConfig(storeId);
  return config.paymentMethods;
}
