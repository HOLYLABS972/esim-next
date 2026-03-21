/**
 * Currency display service – no conversion on frontend.
 * All amounts come from server (DB columns: price, price_rub, price_ils, etc.).
 */

// No exchange rate cache on frontend – server provides values only.

// Currency symbols and formatting
const CURRENCY_CONFIG = {
  USD: {
    symbol: '$',
    code: 'USD',
    name: 'US Dollar',
    position: 'before',
  },
  RUB: {
    symbol: '₽',
    code: 'RUB',
    name: 'Russian Ruble',
    position: 'after',
  },
  ILS: {
    symbol: '₪',
    code: 'ILS',
    name: 'Israeli Shekel',
    position: 'before',
  },
  EUR: {
    symbol: '€',
    code: 'EUR',
    name: 'Euro',
    position: 'before',
  },
  AUD: {
    symbol: 'A$',
    code: 'AUD',
    name: 'Australian Dollar',
    position: 'before',
  },
  CAD: {
    symbol: 'C$',
    code: 'CAD',
    name: 'Canadian Dollar',
    position: 'before',
  },
};

/**
 * Format price with appropriate currency symbol and positioning.
 * USD/ILS: 2 decimals. RUB: one decimal with comma (534,5₽).
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code ('USD', 'RUB', 'ILS')
 * @returns {string} Formatted price string
 */
export const formatPrice = (amount, currency = 'USD') => {
  const curr = (currency || 'USD').toUpperCase();
  const config = CURRENCY_CONFIG[curr] || CURRENCY_CONFIG.USD;
  if (amount == null || isNaN(amount)) return config.position === 'after' ? `0${config.symbol}` : `${config.symbol}0.00`;
  const num = Number(amount);
  const roundedAmount = curr === 'RUB' ? Math.round(num * 10) / 10 : Math.round(num * 100) / 100;
  const formatted = curr === 'RUB' ? roundedAmount.toFixed(1).replace('.', ',') : roundedAmount.toFixed(2);
  if (config.position === 'before') return `${config.symbol}${formatted}`;
  return `${formatted}${config.symbol}`;
};

/**
 * Get currency symbol for a given currency code
 * @param {string} currency - Currency code
 * @returns {string} Currency symbol
 */
export const getCurrencySymbol = (currency) => {
  return CURRENCY_CONFIG[currency]?.symbol || '$';
};

/**
 * Get display amount from a plan or country using stored columns only. No conversion on frontend – server provides values.
 * @param {object} item - Plan { price, price_rub, price_ils, price_aud } or country { minPrice, minPriceRub, minPriceIls, minPriceAud }
 * @param {string} displayCurrency - 'USD' | 'RUB' | 'ILS' | 'AUD'
 * @returns {{ amount: number, currency: string }} Amount and currency from DB; if requested currency column missing, returns USD amount in USD.
 */
export const getDisplayAmountFromItem = (item, displayCurrency) => {
  if (!item) return { amount: 0, currency: 'USD' };
  const curr = (displayCurrency || 'USD').toUpperCase();
  if (curr === 'RUB') {
    const rub = item.price_rub ?? item.minPriceRub;
    if (rub != null && Number(rub) > 0) return { amount: Number(rub), currency: 'RUB' };
  }
  if (curr === 'AUD') {
    const aud = item.price_aud ?? item.minPriceAud;
    if (aud != null && Number(aud) > 0) return { amount: Number(aud), currency: 'AUD' };
  }
  if (curr === 'ILS') {
    const ils = item.price_ils ?? item.minPriceIls;
    if (ils != null && Number(ils) > 0) return { amount: Number(ils), currency: 'ILS' };
  }
  const usd = item.price ?? item.minPrice;
  const amount = usd != null && !isNaN(usd) ? Number(usd) : 0;
  return { amount, currency: 'USD' };
};

/**
 * Format price from plan or country using stored column for displayCurrency. Server values only, no conversion.
 * @param {object} item - Plan or country with price / price_rub / price_ils or minPrice / minPriceRub / minPriceIls
 * @param {string} displayCurrency - 'USD' | 'RUB' | 'ILS' | 'AUD'
 * @returns {object} { amount, formatted, currency, symbol }
 */
export const formatPriceFromItem = (item, displayCurrency) => {
  const { amount, currency } = getDisplayAmountFromItem(item, displayCurrency);
  return {
    amount,
    formatted: formatPrice(amount, currency),
    currency,
    symbol: getCurrencySymbol(currency)
  };
};

export default {
  formatPrice,
  getCurrencySymbol,
  getDisplayAmountFromItem,
  formatPriceFromItem
};
