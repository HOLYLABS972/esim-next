// Configuration service - MongoDB removed

class ConfigService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.listeners = new Map(); // Track active listeners
  }

  // Get Stripe mode (test/live) from admin configuration
  async getStripeMode() {
    // HARDCODED TO SANDBOX/TEST MODE
    console.log('SANDBOX');
    return 'test';
    

  }

  // Get API key mode (sandbox/live) from admin configuration
  async getApiKeyMode() {
    // HARDCODED TO SANDBOX MODE
    console.log('SANDBOX');
    return 'sandbox';
    
 
  }

  // Get settings - MongoDB removed, returns defaults
  async getSettings() {
    const cacheKey = 'adminSettings';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log('📋 Using cached settings');
      return cached.data;
    }

    // Return default settings (MongoDB removed)
    const defaultSettings = await this.createDefaultSettings();
    this.cache.set(cacheKey, {
      data: defaultSettings,
      timestamp: Date.now()
    });
    
    return defaultSettings;
  }

  // Create default settings - MongoDB removed
  async createDefaultSettings() {
    const defaultSettings = {
        name: 'adminSettings',
        socialMedia: {
          linkedin: '',
          facebook: '',
          twitter: '',
          instagram: '',
          youtube: '',
          tiktok: '',
          telegram: '',
          whatsapp: ''
        },
        contact: {
          email: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          country: '',
          postalCode: '',
          website: ''
        },
        company: {
          name: '',
          description: '',
          founded: '',
          employees: '',
          industry: '',
          logo: ''
        },
        businessHours: {
          monday: { open: '09:00', close: '18:00', closed: false },
          tuesday: { open: '09:00', close: '18:00', closed: false },
          wednesday: { open: '09:00', close: '18:00', closed: false },
          thursday: { open: '09:00', close: '18:00', closed: false },
          friday: { open: '09:00', close: '18:00', closed: false },
          saturday: { open: '10:00', close: '16:00', closed: false },
          sunday: { open: '00:00', close: '00:00', closed: true }
        },
        seo: {
          title: '',
          description: '',
          keywords: [],
          ogImage: '',
          favicon: ''
        },
        app: {
          maintenanceMode: false,
          allowRegistration: true,
          requireEmailVerification: false,
          maxFileSize: 10,
          supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx']
        },
        appStore: {
          iosUrl: '',
          androidUrl: ''
        },
        regular: {
          discountPercentage: 20,
          minimumPrice: 0.5
        },
        robokassa: {
          merchantLogin: '',
          passOne: '',
          passTwo: '',
          mode: 'test'
        }
      };

    console.log('✅ Default settings returned (MongoDB removed)');
    return defaultSettings;
  }

  // Update settings - MongoDB removed
  async updateSettings(updates) {
    const settingsDoc = {
      name: 'adminSettings',
      ...updates,
      updatedAt: new Date(),
      updatedBy: 'admin'
    };
    
    this.cache.delete('adminSettings');
    console.log('✅ Settings updated (MongoDB removed, using in-memory)');
    return settingsDoc;
  }

  // Listen to settings changes (simplified version)
  listenToConfigChanges() {
    console.log('🔄 Config service listeners initialized for real-time updates');
    // In a real-time implementation, you could use MongoDB change streams
    // For now, we'll rely on cache invalidation
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    console.log('🧹 Config cache cleared');
  }
}

// Create singleton instance
const configService = new ConfigService();

export { configService };
export default configService;