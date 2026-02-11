// Import Edge Function service
import { edgeFunctions } from './edgeFunctionService';

/**
 * Get JWT token for current user
 * @returns {Promise<string>} JWT token
 */
const getAuthToken = async () => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('No user logged in');
    }
    
    return token;
  } catch (error) {
    console.error('❌ Error getting auth token:', error);
    throw error;
  }
};

/**
 * Get API key from environment (legacy RoamJet key; optional).
 * Returns null if not set instead of throwing.
 * @returns {Promise<string|null>} API key or null
 */
export const getApiKey = async () => {
  const key = process.env.NEXT_PUBLIC_ROAMJET_API_KEY || process.env.NEXT_PUBLIC_API_KEY || process.env.ROAMJET_API_KEY;
  if (key && typeof key === 'string' && key.trim()) {
    return key.trim();
  }
  return null;
};

/**
 * Make authenticated request via Edge Functions
 * @deprecated This should be replaced with direct Edge Function calls
 * @param {string} endpoint - API endpoint (e.g., '/api/user/sim-usage')
 * @param {Object} options - Request options
 * @returns {Promise<Object>} Response data
 */
const makeAuthenticatedRequest = async (endpoint, options = {}) => {
  try {
    // Map endpoint to Edge Function if available
    if (endpoint === '/api/user/sim-usage' || endpoint === '/api/user/mobile-data') {
      return { success: false, data: null };
    }
    
    // For other endpoints, throw error as they should use Edge Functions
    console.warn(`⚠️ makeAuthenticatedRequest called for ${endpoint} - please use Edge Functions instead`);
    throw new Error(`Endpoint ${endpoint} should use Edge Functions. External API calls are deprecated.`);
  } catch (error) {
    // Only log non-401 errors to avoid cluttering console with expected auth failures
    if (error.status !== 401) {
      console.error(`API request to ${endpoint} failed:`, error);
    }
    throw error;
  }
};

export const apiService = {
  /**
   * Create eSIM order - NOW USES EDGE FUNCTION
   * @param {Object} orderData - Order data
   * @param {string} orderData.package_id - Package ID
   * @param {string} orderData.quantity - Quantity (default: "1")
   * @param {string} orderData.to_email - Customer email
   * @param {string} orderData.description - Order description
   * @param {string} orderData.mode - Mode (test/live) - tells backend whether to use mock or real data
   * @returns {Promise<Object>} Order result with orderId and airaloOrderId
   */
  async createOrder({ package_id, quantity = "1", to_email, description, mode }) {
    console.log('📦 Creating order via Edge Function:', { package_id, quantity, to_email, mode });
    
    try {
      const result = await edgeFunctions.createOrder({
        package_id,
        quantity,
        to_email,
        description,
        mode,
      });

      console.log('✅ Order created:', result);
      return result;
    } catch (error) {
      console.error('❌ Order creation failed:', error);
      throw error;
    }
  },

  /**
   * Get QR code for an order - NOW USES EDGE FUNCTION
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} QR code data
   */
  async getQrCode(orderId) {
    console.log('📱 Getting QR code via Edge Function for order:', orderId);
    
    try {
      const result = await edgeFunctions.getQrCode(orderId);
      console.log('✅ QR code retrieved:', result.success);
      return result;
    } catch (error) {
      console.error('❌ Error getting QR code:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get SIM details by ICCID - NOW USES EDGE FUNCTION
   * @param {string} iccid - SIM ICCID
   * @returns {Promise<Object>} SIM details
   */
  async getSimDetails(iccid) {
    console.log('📱 Getting SIM details via Edge Function for ICCID:', iccid);
    
    try {
      const result = await edgeFunctions.getMobileData({ iccid });
      console.log('✅ SIM details retrieved');
      return result;
    } catch (error) {
      console.error('❌ Error getting SIM details:', error);
      throw error;
    }
  },

  /**
   * Get SIM usage by ICCID - disabled (no Edge Function / mobile-data calls)
   * @param {string} iccid - SIM ICCID
   * @returns {Promise<Object>} { success: false } - no network call
   */
  async getSimUsage(iccid) {
    return { success: false, data: null };
  },

  /**
   * Get user balance - NOW USES EDGE FUNCTION
   * @returns {Promise<Object>} Balance data
   */
  async getBalance() {
    console.log('💰 Getting user balance via Edge Function');
    
    try {
      const result = await edgeFunctions.getUserBalance();
      console.log('✅ Balance retrieved:', result.balance);
      return result;
    } catch (error) {
      console.error('❌ Error getting balance:', error);
      throw error;
    }
  },

  /**
   * Get mobile data usage status - disabled (no Edge Function / mobile-data calls)
   * @param {Object} params - Parameters
   * @returns {Promise<Object>} { success: false } - no network call
   */
  async getMobileData({ iccid, orderId }) {
    return { success: false, data: null };
  }
};

export default apiService;
