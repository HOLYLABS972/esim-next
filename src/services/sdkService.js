/**
 * SDK Service - Uses sdk.roamjet.net for topup and balance operations
 * 
 * This service connects to the Airalo SDK server for:
 * - Getting topup packages
 * - Creating topups
 * - Checking balance
 */

const SDK_BASE_URL = process.env.NEXT_PUBLIC_SDK_URL || 'https://sdk.roamjet.net';

/**
 * Get auth token from localStorage
 */
const getAuthToken = () => {
  try {
    const token = localStorage.getItem('authToken');
    return token || null;
  } catch (error) {
    console.error('❌ Error getting auth token:', error);
    return null;
  }
};

/**
 * Get API key from environment
 */
const getApiKey = () => {
  const apiKey = process.env.NEXT_PUBLIC_ROAMJET_API_KEY || 
                 process.env.NEXT_PUBLIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('RoamJet API key is not configured. Please set NEXT_PUBLIC_ROAMJET_API_KEY environment variable or configure it in admin settings.');
  }
  
  return apiKey;
};

/**
 * Make request to SDK server
 */
const makeSDKRequest = async (endpoint, options = {}) => {
  try {
    const authToken = getAuthToken();
    const apiKey = getApiKey();
    
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      ...options.headers,
    };
    
    // Add auth token if available (optional for some endpoints)
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await fetch(`${SDK_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ SDK API request failed:', {
        status: response.status,
        error: data.error,
        fullResponse: data
      });
      throw new Error(data.error || `SDK request failed with status ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error(`SDK API request to ${endpoint} failed:`, error);
    throw error;
  }
};

export const sdkService = {
  /**
   * Get topup packages for an ICCID
   * @param {string} iccid - The ICCID to get topup packages for
   * @returns {Promise<Object>} Topup packages
   */
  async getTopupPackages(iccid) {
    console.log('📦 Getting topup packages from SDK for ICCID:', iccid);
    
    const result = await makeSDKRequest('/api/user/topup-packages', {
      method: 'POST',
      body: JSON.stringify({ iccid }),
    });

    console.log('✅ Topup packages retrieved from SDK');
    return result;
  },

  /**
   * Create a topup for an ICCID
   * @param {string} iccid - The ICCID to topup
   * @param {string} packageId - The package ID to use for topup
   * @returns {Promise<Object>} Topup result
   */
  async createTopup(iccid, packageId) {
    console.log('💳 Creating topup via SDK:', { iccid, packageId });
    
    const result = await makeSDKRequest('/api/user/topup', {
      method: 'POST',
      body: JSON.stringify({ 
        iccid, 
        package_id: packageId 
      }),
    });

    console.log('✅ Topup created via SDK');
    return result;
  },

  /**
   * Get user balance from Airalo
   * @returns {Promise<Object>} Balance data
   */
  async getBalance() {
    console.log('💰 Getting balance from SDK');
    
    const result = await makeSDKRequest('/api/user/balance', {
      method: 'GET',
    });

    console.log('✅ Balance retrieved from SDK');
    return result;
  },

  /**
   * Health check for SDK server
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    console.log('🏥 Checking SDK server health');
    
    const result = await makeSDKRequest('/health', {
      method: 'GET',
    });

    console.log('✅ SDK server is healthy');
    return result;
  },
};

export default sdkService;

