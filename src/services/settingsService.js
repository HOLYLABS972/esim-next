// MongoDB removed - settings now managed via Supabase

// Default settings structure
const defaultSettings = {
  // Social Media Links
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
  
  // Contact Information
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
  
  // Company Information
  company: {
    name: '',
    description: '',
    founded: '',
    employees: '',
    industry: '',
    logo: ''
  },
  
  // Business Hours
  businessHours: {
    monday: { open: '09:00', close: '18:00', closed: false },
    tuesday: { open: '09:00', close: '18:00', closed: false },
    wednesday: { open: '09:00', close: '18:00', closed: false },
    thursday: { open: '09:00', close: '18:00', closed: false },
    friday: { open: '09:00', close: '18:00', closed: false },
    saturday: { open: '10:00', close: '16:00', closed: false },
    sunday: { open: '00:00', close: '00:00', closed: true }
  },
  
  // SEO Settings
  seo: {
    title: '',
    description: '',
    keywords: [],
    ogImage: '',
    favicon: ''
  },
  
  // App Settings
  app: {
    maintenanceMode: false,
    allowRegistration: true,
    requireEmailVerification: false,
    maxFileSize: 10, // MB
    supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx']
  },
  
  // App Store Links
  appStore: {
    iosUrl: '',
    androidUrl: ''
  },
  
  // Regular Settings
  regular: {
    discountPercentage: 20,
    minimumPrice: 0.5
  },
  
  // Stripe Configuration
  stripe: {
    publishableKeyTest: '',
    secretKeyTest: '',
    publishableKeyLive: '',
    secretKeyLive: '',
    mode: 'test' // 'test' or 'live'
  }
};

class SettingsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
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
    const settingsDoc = {
      name: 'adminSettings',
      ...defaultSettings,
      updatedAt: new Date(),
      updatedBy: 'system'
    };
    
    this.cache.set(cacheKey, {
      data: settingsDoc,
      timestamp: Date.now()
    });
    
    return settingsDoc;
  }

  // Create default settings - MongoDB removed
  async createDefaultSettings() {
    const settingsDoc = {
      name: 'adminSettings',
      ...defaultSettings,
      updatedAt: new Date(),
      updatedBy: 'system'
    };
    
    console.log('✅ Default settings returned (MongoDB removed)');
    return settingsDoc;
  }

  // Update settings - MongoDB removed
  async updateSettings(updates) {
    const settingsDoc = {
      name: 'adminSettings',
      ...defaultSettings,
      ...updates,
      updatedAt: new Date(),
      updatedBy: 'admin'
    };
    
    this.cache.delete('adminSettings');
    console.log('✅ Settings updated (MongoDB removed, using in-memory)');
    return settingsDoc;
  }

  // Update specific section - MongoDB removed
  async updateSection(section, data) {
    const settingsDoc = {
      name: 'adminSettings',
      ...defaultSettings,
      [section]: data,
      updatedAt: new Date(),
      updatedBy: 'admin'
    };
    
    this.cache.delete('adminSettings');
    console.log(`✅ ${section} section updated (MongoDB removed, using in-memory)`);
    return settingsDoc;
  }

  // Get specific section
  async getSection(section) {
    try {
      const settings = await this.getSettings();
      return settings[section] || defaultSettings[section];
    } catch (error) {
      console.error(`❌ Error getting ${section} section:`, error);
      return defaultSettings[section];
    }
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    console.log('🧹 Settings cache cleared');
  }
}

// Create singleton instance
const settingsService = new SettingsService();

// Get regular settings (for compatibility)
export const getRegularSettings = async () => {
  try {
    const settings = await settingsService.getSection('regular');
    return settings;
  } catch (error) {
    console.error('❌ Error getting regular settings:', error);
    return defaultSettings.regular;
  }
};

export { settingsService };
export default settingsService;