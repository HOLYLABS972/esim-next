// eSIM service - now uses Python API for all eSIM operations
// All methods are handled through apiService.js which calls the Python backend
import { apiService } from './apiService';
import { getAllPlans, getCountriesWithPricing } from './plansService';

export const esimService = {
  // Fetch plans and countries from Firestore
  async fetchPlans() {
    try {
      console.log('📦 Fetching plans and countries from Firestore...');
      
      // Fetch plans and countries in parallel
      const [plans, countriesWithPricing] = await Promise.all([
        getAllPlans(),
        getCountriesWithPricing()
      ]);
      
      // Extract just the country data (without pricing details for the list)
      const countries = countriesWithPricing.map(country => ({
        code: country.code,
        name: country.name,
        flagEmoji: country.flagEmoji
      }));
      
      console.log('✅ Loaded plans:', plans.length, 'countries:', countries.length);
      
      return {
        success: true,
        plans: plans,
        countries: countries
      };
    } catch (error) {
      console.error('❌ Error fetching plans:', error);
      return {
        success: false,
        error: error.message,
        plans: [],
        countries: []
      };
    }
  },
  // Create eSIM order (delegates to Python API)
  async createAiraloOrder(orderData) {
    console.warn('esimService.createAiraloOrder is deprecated. Use apiService.createOrder instead.');
    return apiService.createOrder({
      package_id: orderData.package_id,
      quantity: orderData.quantity || "1",
      to_email: orderData.to_email,
      description: orderData.description
    });
  },

  // Create eSIM order V2 (delegates to Python API)
  async createAiraloOrderV2({
    package_id,
    quantity = "1",
    to_email,
    description
  }) {
    console.warn('esimService.createAiraloOrderV2 is deprecated. Use apiService.createOrder instead.');
    return apiService.createOrder({
      package_id,
      quantity,
      to_email,
      description
    });
  },

  // Get eSIM QR code (delegates to Python API)
  async getEsimQrCode(orderId) {
    console.warn('esimService.getEsimQrCode is deprecated. Use apiService.getQrCode instead.');
    return apiService.getQrCode(orderId);
  },

  // Get eSIM usage data by ICCID (delegates to Python API)
  async getEsimUsageByIccid(iccid) {
    console.warn('esimService.getEsimUsageByIccid is deprecated. Use apiService.getSimUsage instead.');
    return apiService.getSimUsage(iccid);
  },

  // Get eSIM details by ICCID (delegates to Python API)
  async getEsimDetailsByIccid(iccid) {
    console.warn('esimService.getEsimDetailsByIccid is deprecated. Use apiService.getSimDetails instead.');
    return apiService.getSimDetails(iccid);
  }
};
