// Use local API endpoints only (no external API)
// All operations go through local Next.js API routes that query Supabase

// External API removed - all operations now use local Supabase endpoints

export const apiService = {
  /**
   * Create eSIM order
   * @param {Object} orderData - Order data
   * @param {string} orderData.package_id - Package ID
   * @param {string} orderData.quantity - Quantity (default: "1")
   * @param {string} orderData.to_email - Customer email
   * @param {string} orderData.description - Order description
   * @param {string} orderData.mode - Mode (test/live) - tells backend whether to use mock or real data
   * @param {string} orderData.countryCode - Country code (e.g., "NL" for Netherlands)
   * @param {string} orderData.countryName - Country name (e.g., "Netherlands")
   * @returns {Promise<Object>} Order result with orderId and airaloOrderId
   */
  async createOrder({ package_id, quantity = "1", to_email, description, mode, countryCode, countryName }) {
    console.log('📦 Creating order via local API:', { package_id, quantity, to_email, mode });

    try {
      // NOTE: Order creation is handled by n8n workflow
      // This endpoint creates a pending order record in Supabase
      // The n8n workflow will pick it up and process it with Airalo

      console.log('🌐 Using local order endpoint: /api/orders/create-pending');
      const response = await fetch('/api/orders/create-pending', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageId: package_id,
          customerEmail: to_email,
          description: description,
          mode: mode,
          countryCode: countryCode || null,
          countryName: countryName || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('❌ Order creation failed:', {
          status: response.status,
          error: result.error,
          fullResponse: result
        });
        throw new Error(result.error || `Request failed: ${response.status}`);
      }

      console.log('✅ Order created:', result);
      return result;
    } catch (error) {
      console.error('❌ Order creation failed:', error);
      throw new Error(`Order creation failed: ${error.message}`);
    }
  },

  /**
   * Get QR code for an order
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} QR code data
   */
  async getQrCode(orderId) {
    console.log('📱 Getting QR code via public API for order:', orderId);
    
    // Use public endpoint that doesn't require authentication
    try {
      const response = await fetch('/api/public/qr-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });

      const result = await response.json();
      console.log('✅ QR code retrieved:', result.success);
      return result;
    } catch (error) {
      console.error('❌ Error getting QR code:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get SIM details by ICCID
   * NOTE: This retrieves data from Supabase esim_orders table
   * @param {string} iccid - SIM ICCID
   * @returns {Promise<Object>} SIM details
   */
  async getSimDetails(iccid) {
    console.log('📱 Getting SIM details from Supabase for ICCID:', iccid);

    try {
      const response = await fetch('/api/esims/list', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to get SIM details');
      }

      // Find the SIM with matching ICCID
      const sim = result.data?.find(s => s.iccid === iccid);

      if (!sim) {
        throw new Error('SIM not found');
      }

      console.log('✅ SIM details retrieved');
      return { success: true, data: sim };
    } catch (error) {
      console.error('❌ Error getting SIM details:', error);
      throw error;
    }
  },

  /**
   * Get SIM usage by ICCID
   * NOTE: Usage data is stored in Supabase esim_orders metadata
   * @param {string} iccid - SIM ICCID
   * @returns {Promise<Object>} Usage data
   */
  async getSimUsage(iccid) {
    console.log('📊 Getting SIM usage from Supabase for ICCID:', iccid);

    try {
      const response = await fetch('/api/user/mobile-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ iccid }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to get SIM usage');
      }

      console.log('✅ SIM usage retrieved');
      return result;
    } catch (error) {
      console.error('❌ Error getting SIM usage:', error);
      throw error;
    }
  },

  /**
   * Get user balance
   * NOTE: Balance tracking via local Supabase
   * @returns {Promise<Object>} Balance data
   */
  async getBalance() {
    console.log('💰 Getting user balance from Supabase');

    // This method may not be implemented yet in local endpoints
    // Return a placeholder for now
    console.warn('⚠️ Balance tracking not implemented in local API yet');
    return {
      success: false,
      error: 'Balance tracking not implemented',
      balance: 0
    };
  }
};

export default apiService;