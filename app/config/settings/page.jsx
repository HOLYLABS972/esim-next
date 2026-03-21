'use client';

import { useState, useEffect, useCallback } from 'react';
import { Lock, Eye, EyeOff, Save, Settings, Key, DollarSign, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../src/lib/supabase';

export default function SettingsPage() {
  const [isLocalhost, setIsLocalhost] = useState(false);
  const [isVercel, setIsVercel] = useState(false);
  const [useTestCredentials, setUseTestCredentials] = useState(false);
  const [testCredentials, setTestCredentials] = useState({ passOne: '', passTwo: '', hasPassOne: false, hasPassTwo: false });
  const [loading, setLoading] = useState(false);

  // Check if running on localhost or Vercel
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const localhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.0.');
      const vercel = hostname.includes('vercel.app') || hostname.includes('vercel.com') || hostname.includes('roamjet.net') || hostname.includes('globalbankaccounts.ru');
      
      setIsLocalhost(localhost);
      setIsVercel(vercel && !localhost);
      
      // Load test credentials preference from API
      if (vercel && !localhost) {
        fetch('/api/config/robokassa-test-mode')
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setUseTestCredentials(data.useTestCredentials || false);
              if (data.testCredentials) {
                setTestCredentials(data.testCredentials);
              }
            }
          })
          .catch(err => console.error('Failed to load test mode preference:', err));
      }
      
      // Block access if not localhost
      if (!localhost) {
        console.warn('Config page is only accessible on localhost');
      }
    }
  }, []);
  
  // Config fields
  const [config, setConfig] = useState({
    googleId: '',
    googleSecret: '',
    googleAuthEnabled: true, // Always enabled
    yandexAppId: '',
    yandexAppSecret: '',
    yandexAuthEnabled: true, // Always enabled
    roamjetApiKey: '',
    roamjetMode: 'production', // Always production
    robokassaMerchantLogin: '',
    robokassaPassOne: '',
    robokassaPassTwo: '',
    robokassaMode: 'production', // Always production
    discountPercentage: 0,
    usdToRubRate: 100
  });
  
  const [showPasswords, setShowPasswords] = useState({
    googleSecret: false,
    yandexAppSecret: false,
    roamjetApiKey: false,
    robokassaPassOne: false,
    robokassaPassTwo: false
  });

  // Users management state
  const [users, setUsers] = useState([]);
  const [userStats, setUserStats] = useState({ total: 0, active: 0, customers: 0, admins: 0, businesses: 0 });
  const [usersLoading, setUsersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedOrderForJson, setSelectedOrderForJson] = useState(null);
  const [orderJsonData, setOrderJsonData] = useState(null);
  const [loadingJson, setLoadingJson] = useState(false);
  
  // Plans and Countries state
  const [copyingPlans, setCopyingPlans] = useState(false);
  const [copyingCountries, setCopyingCountries] = useState(false);
  const [clearingPlans, setClearingPlans] = useState(false);
  const [clearingCountries, setClearingCountries] = useState(false);
  const [plansStats, setPlansStats] = useState(null);
  const [countriesStats, setCountriesStats] = useState(null);
  const [countries, setCountries] = useState([]);
  const [plans, setPlans] = useState([]);
  const [allCountries, setAllCountries] = useState([]);
  const [allPlans, setAllPlans] = useState([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansPage, setPlansPage] = useState(1);
  const [plansTotalPages, setPlansTotalPages] = useState(1);
  const [countriesSearchQuery, setCountriesSearchQuery] = useState('');
  const [plansSearchQuery, setPlansSearchQuery] = useState('');

  const loadConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/config/get');
      const data = await response.json();
      
      if (data.success && data.config) {
        console.log('📥 Loaded config:', {
          hasOpenRouterApiKey: 'openRouterApiKey' in data.config,
          openRouterApiKeyValue: data.config.openRouterApiKey ? `${data.config.openRouterApiKey.substring(0, 10)}...` : 'empty',
          openRouterApiKeyLength: data.config.openRouterApiKey?.length || 0,
          allKeys: Object.keys(data.config)
        });
        
        // Ensure all fields are present (set defaults if missing)
        const configWithDefaults = {
          ...data.config,
          openRouterApiKey: data.config.openRouterApiKey || '',
          roamjetMode: data.config.roamjetMode || 'production',
        };
        
        console.log('📥 Loaded config with defaults:', {
          roamjetMode: configWithDefaults.roamjetMode,
          openRouterApiKey: configWithDefaults.openRouterApiKey ? `${configWithDefaults.openRouterApiKey.substring(0, 10)}...` : 'empty'
        });
        
        setConfig(configWithDefaults);
      }
    } catch (error) {
      console.error('Error loading config:', error);
      toast.error('Failed to load configuration');
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    setLoading(true);
    
    try {
      console.log('💾 Saving config:', {
        roamjetMode: config.roamjetMode,
        hasRoamjetMode: 'roamjetMode' in config,
        openRouterApiKey: config.openRouterApiKey ? `${config.openRouterApiKey.substring(0, 10)}...` : 'empty',
        openRouterApiKeyLength: config.openRouterApiKey?.length || 0,
        hasOpenRouterApiKey: 'openRouterApiKey' in config,
        allConfigKeys: Object.keys(config)
      });
      
      // Ensure openRouterApiKey and roamjetMode are always included in the request
      const configWithoutMongo = config;

      // Force production mode and enabled auth
      const configToSend = { 
        ...configWithoutMongo,
        roamjetMode: 'production', // Always production
        robokassaMode: 'production', // Always production
        googleAuthEnabled: true, // Always enabled
        yandexAuthEnabled: true // Always enabled
      };
      
      console.log('📤 Sending config:', {
        hasOpenRouterApiKey: 'openRouterApiKey' in configToSend,
        openRouterApiKeyValue: configToSend.openRouterApiKey ? `${configToSend.openRouterApiKey.substring(0, 10)}...` : 'empty',
        openRouterApiKeyLength: configToSend.openRouterApiKey?.length || 0,
        openRouterApiKeyType: typeof configToSend.openRouterApiKey,
        hasRoamjetMode: 'roamjetMode' in configToSend,
        roamjetModeValue: configToSend.roamjetMode,
        roamjetModeType: typeof configToSend.roamjetMode,
        allKeys: Object.keys(configToSend)
      });
      
      // Verify the fields are in the JSON string
      const jsonString = JSON.stringify(configToSend);
      console.log('📤 JSON string includes openRouterApiKey:', jsonString.includes('openRouterApiKey'));
      console.log('📤 JSON string includes roamjetMode:', jsonString.includes('roamjetMode'));
      
      // Extract roamjetMode from JSON to verify it's correct
      try {
        const parsed = JSON.parse(jsonString);
        console.log('📤 Parsed JSON roamjetMode:', parsed.roamjetMode, 'type:', typeof parsed.roamjetMode);
      } catch (e) {
        console.error('❌ Error parsing JSON:', e);
      }
      
      const response = await fetch('/api/config/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonString
      });
      
      if (!response.ok) {
        console.error('❌ Save request failed:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        throw new Error(`Save failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📥 Save response received:', {
        success: data.success,
        hasConfig: !!data.config,
        roamjetMode: data.config?.roamjetMode,
        error: data.error
      });
      
      if (data.success) {
        console.log('✅ Config saved:', data.config);
        console.log('📋 Saved config roamjetMode:', data.config?.roamjetMode);
        console.log('📋 Saved config openRouterApiKey:', data.config?.openRouterApiKey ? `${data.config.openRouterApiKey.substring(0, 10)}...` : 'empty');
        
        // Update local state with the saved config from response
        if (data.config) {
          // Use the saved config from response, ensuring defaults for required fields
          const updatedConfig = {
            ...data.config,
            // Explicitly ensure these fields are set correctly
            openRouterApiKey: data.config.openRouterApiKey !== undefined ? data.config.openRouterApiKey : '',
            roamjetMode: data.config.roamjetMode !== undefined ? data.config.roamjetMode : 'production',
            mongoUri: data.config.mongoUri !== undefined ? data.config.mongoUri : ''
          };
          console.log('📋 Updating local state with saved config:', {
            roamjetMode: updatedConfig.roamjetMode,
            roamjetModeFromResponse: data.config.roamjetMode,
            openRouterApiKey: updatedConfig.openRouterApiKey ? `${updatedConfig.openRouterApiKey.substring(0, 10)}...` : 'empty',
            allKeys: Object.keys(updatedConfig)
          });
          
          // Update state directly with the saved config
          setConfig(updatedConfig);
        }
        
        toast.success('Configuration saved successfully');
      } else {
        console.error('❌ Save failed:', data.error);
        toast.error(data.error || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    const oldPassword = prompt('Enter current password:');
    if (!oldPassword) return;
    
    const newPassword = prompt('Enter new password:');
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    const confirmPassword = prompt('Confirm new password:');
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast.error('Not signed in');
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword,
      });
      if (signInError) {
        toast.error('Current password is incorrect');
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        toast.error(updateError.message || 'Failed to update password');
        return;
      }
      toast.success('Password updated successfully');
    } catch (error) {
      console.error('Password update error:', error);
      toast.error('Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const getSecretInputType = (field) => {
    // Always show as text on localhost (no masking)
    return 'text';
  };

  // User management functions
  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });
      if (searchQuery) params.append('search', searchQuery);
      if (roleFilter !== 'all') params.append('role', roleFilter);
      
      const response = await fetch(`/api/users/list?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.users);
        setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  }, [currentPage, searchQuery, roleFilter]);

  const loadUserStats = useCallback(async () => {
    try {
      const response = await fetch('/api/users/stats');
      const data = await response.json();
      
      if (data.success) {
        setUserStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  }, []);

  const handleUpdateUser = async (user) => {
    setUsersLoading(true);
    try {
      const response = await fetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('User updated successfully');
        setEditingUser(null);
        loadUsers();
      } else {
        toast.error(data.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleToggleUserStatus = async (user) => {
    await handleUpdateUser({ userId: user._id, isActive: !user.isActive });
  };


  const formatDate = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewUserOrders = (user) => {
    // Navigate to the user orders page instead of opening modal
    if (user._id) {
      window.location.href = `/config/users/${user._id}/orders`;
    } else if (user.email) {
      // If no _id, try to find user by email or use email as identifier
      window.location.href = `/config/users/${encodeURIComponent(user.email)}/orders`;
    }
  };

  const handleDeleteUser = async (user) => {
    if (!confirm(`Are you sure you want to delete user "${user.displayName || user.email}"? This will delete all their orders and eSIMs.`)) {
      return;
    }

    setUsersLoading(true);
    try {
      const response = await fetch('/api/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('User deleted successfully');
        loadUsers();
        loadUserStats();
      } else {
        toast.error(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleViewOrderJson = async (order) => {
    setSelectedOrderForJson(order);
    setLoadingJson(true);
    setOrderJsonData(null);
    
    try {
      const orderId = order.orderId || order._id;
      
      // Fetch full order data from MongoDB by orderId
      let fullOrderData = null;
      try {
        // Try to fetch from Order collection by orderId
        const orderResponse = await fetch(`/api/users/orders?userId=${order.userId || order.customerEmail}`);
        const orderResult = await orderResponse.json();
        if (orderResult.success && orderResult.orders) {
      fullOrderData = orderResult.orders.find(o => o.orderId === orderId || o._id === orderId || o._id.toString() === orderId);
        }
      } catch (orderError) {
        console.log('Error fetching order data:', orderError);
      }
      
      // Fetch eSIM data using the debug endpoint
      let esimData = null;
      let debugData = null;
      try {
        const debugResponse = await fetch(`/api/debug/esims?orderId=${orderId}`);
        const debugResult = await debugResponse.json();
        if (debugResult.success) {
      debugData = debugResult;
      esimData = debugResult.esim;
      // Use the order from debug data if available
      if (debugResult.order && !fullOrderData) {
        fullOrderData = debugResult.order;
      }
        }
      } catch (esimError) {
        console.log('Error fetching eSIM debug data:', esimError);
      }
      
      // Combine order and eSIM data
      const combinedData = {
        order: fullOrderData || order, // Use fetched order or fallback to original
        esim: esimData,
        debug: debugData,
        rawOrder: order, // Original order data from the list
        orderId: orderId
      };
      
      setOrderJsonData(combinedData);
    } catch (error) {
      console.error('Error loading order JSON:', error);
      toast.error('Failed to load order data');
      setOrderJsonData({ 
        order: order, 
        error: error.message,
        orderId: order.orderId || order._id
      });
    } finally {
      setLoadingJson(false);
    }
  };

  const handleDownloadPrices = () => {
    const url = 'https://bucket.roamjet.net/uploads/report.csv';
    const link = document.createElement('a');
    link.href = url;
    link.download = 'prices-report.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Prices report downloaded');
  };

  // Load countries
  const loadCountries = useCallback(async () => {
    setCountriesLoading(true);
    try {
      const response = await fetch('/api/config/list-countries');
      const data = await response.json();
      
      if (data.success) {
        setAllCountries(data.data.countries);
        setCountries(data.data.countries);
      }
    } catch (error) {
      console.error('Error loading countries:', error);
      toast.error('Failed to load countries');
    } finally {
      setCountriesLoading(false);
    }
  }, []);

  // Filter countries based on search
  useEffect(() => {
    if (!countriesSearchQuery.trim()) {
      setCountries(allCountries);
      return;
    }
    
    const query = countriesSearchQuery.toLowerCase();
    const filtered = allCountries.filter(country => 
      country.name?.toLowerCase().includes(query) ||
      country.code?.toLowerCase().includes(query) ||
      country.region?.toLowerCase().includes(query) ||
      country.continent?.toLowerCase().includes(query)
    );
    setCountries(filtered);
  }, [countriesSearchQuery, allCountries]);

  // Load plans
  const loadPlans = useCallback(async () => {
    setPlansLoading(true);
    try {
      // Fetch all plans without pagination by using a very high limit
      const response = await fetch(`/api/config/list-plans?page=1&limit=10000`);
      const data = await response.json();
      
      if (data.success) {
        setAllPlans(data.data.plans);
        setPlans(data.data.plans);
        setPlansTotalPages(data.data.pages);
        console.log(`✅ Loaded ${data.data.plans.length} plans from ${data.data.total} total`);
      }
    } catch (error) {
      console.error('Error loading plans:', error);
      toast.error('Failed to load plans');
    } finally {
      setPlansLoading(false);
    }
  }, []);

  // Filter plans based on search
  useEffect(() => {
    if (!plansSearchQuery.trim()) {
      setPlans(allPlans);
      return;
    }
    
    const query = plansSearchQuery.toLowerCase();
    const filtered = allPlans.filter(plan => 
      plan.name?.toLowerCase().includes(query) ||
      plan.country?.toLowerCase().includes(query) ||
      plan.country_codes?.some(code => code?.toLowerCase().includes(query)) ||
      plan.description?.toLowerCase().includes(query) ||
      plan.dataAmount?.toLowerCase().includes(query) ||
      plan.validity?.toLowerCase().includes(query)
    );
    setPlans(filtered);
  }, [plansSearchQuery, allPlans]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  return (
    <div className="space-y-6">
      {/* Authentication Section */}
      <div className="bg-gray-800/90 backdrop-blur-md border border-gray-700 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <Globe className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">Authentication</h2>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Google Client ID</label>
              <input
                type="text"
                value={config.googleId}
                onChange={(e) => setConfig({...config, googleId: e.target.value})}
                className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Google OAuth Client ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Google Client Secret</label>
              <div className="relative">
                <input
                  type={getSecretInputType('googleSecret')}
                  value={config.googleSecret}
                  onChange={(e) => setConfig({...config, googleSecret: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Google OAuth Client Secret"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('googleSecret')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPasswords.googleSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Yandex App ID</label>
              <input
                type="text"
                value={config.yandexAppId}
                onChange={(e) => setConfig({...config, yandexAppId: e.target.value})}
                className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Yandex OAuth App ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Yandex App Secret</label>
              <div className="relative">
                <input
                  type={getSecretInputType('yandexAppSecret')}
                  value={config.yandexAppSecret}
                  onChange={(e) => setConfig({...config, yandexAppSecret: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Yandex OAuth App Secret"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('yandexAppSecret')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPasswords.yandexAppSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>
          
          {/* Auth Status - Always Enabled */}
          <div className="pt-4 border-t border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg border border-gray-600">
                <div>
                  <div className="text-sm font-medium text-white">Google Auth</div>
                  <div className="text-xs text-gray-400">
                    Always enabled (Production)
                  </div>
                </div>
                <span className="text-sm font-medium text-green-400">
                  Enabled
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg border border-gray-600">
                <div>
                  <div className="text-sm font-medium text-white">Yandex Auth</div>
                  <div className="text-xs text-gray-400">
                    Always enabled (Production)
                  </div>
                </div>
                <span className="text-sm font-medium text-green-400">
                  Enabled
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* API Keys Section */}
      <div className="bg-gray-800/90 backdrop-blur-md border border-gray-700 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <Key className="w-5 h-5 text-green-400" />
          <h2 className="text-xl font-semibold text-white">API Keys</h2>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Roamjet API Key</label>
              <div className="relative">
                <input
                  type={getSecretInputType('roamjetApiKey')}
                  value={config.roamjetApiKey}
                  onChange={(e) => setConfig({...config, roamjetApiKey: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Roamjet API Key"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('roamjetApiKey')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPasswords.roamjetApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>
          
          {/* Roamjet Mode - Always Production */}
          <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg border border-gray-600">
            <div>
              <div className="text-sm font-medium text-white">Roamjet Mode</div>
              <div className="text-xs text-gray-400">
                Always Production Mode
              </div>
            </div>
            <span className="text-sm font-medium text-blue-300">
              Production
            </span>
          </div>
          
          <div className="bg-gray-700/30 rounded-lg p-3 border border-gray-600">
            <p className="text-xs text-gray-400">
              <span className="font-semibold text-gray-300">API Base URL:</span><br />
              <code className="text-blue-300">https://api.roamjet.net</code>
            </p>
          </div>
        </div>
      </div>

      {/* Payment Section */}
      <div className="bg-gray-800/90 backdrop-blur-md border border-gray-700 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <DollarSign className="w-5 h-5 text-yellow-400" />
          <h2 className="text-xl font-semibold text-white">Robokassa</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Robokassa Merchant Login</label>
            <input
              type="text"
              value={config.robokassaMerchantLogin}
              onChange={(e) => setConfig({...config, robokassaMerchantLogin: e.target.value})}
              className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Robokassa Merchant ID"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Robokassa Pass One</label>
              <div className="relative">
                <input
                  type={getSecretInputType('robokassaPassOne')}
                  value={config.robokassaPassOne}
                  onChange={(e) => setConfig({...config, robokassaPassOne: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Robokassa Password 1"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('robokassaPassOne')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPasswords.robokassaPassOne ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Robokassa Pass Two</label>
              <div className="relative">
                <input
                  type={getSecretInputType('robokassaPassTwo')}
                  value={config.robokassaPassTwo}
                  onChange={(e) => setConfig({...config, robokassaPassTwo: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Robokassa Password 2"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('robokassaPassTwo')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPasswords.robokassaPassTwo ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>
          
          {/* Unified Robokassa Mode Display - Shows toggle on Vercel, static on localhost */}
          <div className={`flex items-center justify-between p-4 rounded-lg border ${
            isVercel 
              ? useTestCredentials 
                ? 'bg-yellow-900/20 border-yellow-600/50' 
                : 'bg-blue-900/20 border-blue-600/50'
              : 'bg-gray-700/30 border-gray-600'
          }`}>
            <div className="flex-1">
              <div className="text-sm font-medium text-white">Robokassa Mode</div>
              <div className="text-xs text-gray-400 mt-1">
                {isVercel 
                  ? useTestCredentials 
                    ? 'Using test credentials from environment variables' 
                    : 'Using production credentials from MongoDB'
                  : 'Always Production Mode'
                }
              </div>
              {/* Show test credentials when test mode is enabled */}
              {isVercel && useTestCredentials && (
                <div className="mt-3 space-y-1">
                  {testCredentials.hasPassOne && (
                    <div className="text-xs text-yellow-300">
                      <span className="font-medium">Test Pass One:</span> {testCredentials.passOne}
            </div>
                  )}
                  {testCredentials.hasPassTwo && (
                    <div className="text-xs text-yellow-300">
                      <span className="font-medium">Test Pass Two:</span> {testCredentials.passTwo}
                    </div>
                  )}
                  {!testCredentials.hasPassOne && !testCredentials.hasPassTwo && (
                    <div className="text-xs text-yellow-500">
                      ⚠️ Test credentials not found in environment variables
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${
                useTestCredentials ? 'text-yellow-300' : 'text-blue-300'
              }`}>
                {useTestCredentials ? 'Test' : 'Production'}
            </span>
              {isVercel && (
                <button
                  onClick={async () => {
                    const newValue = !useTestCredentials;
                    try {
                      const response = await fetch('/api/config/robokassa-test-mode', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ useTestCredentials: newValue })
                      });
                      const data = await response.json();
                      if (data.success) {
                        setUseTestCredentials(newValue);
                        if (data.testCredentials) {
                          setTestCredentials(data.testCredentials);
                        }
                        toast.success(data.message || (newValue ? 'Switched to test credentials' : 'Switched to production credentials'));
                      } else {
                        toast.error(data.error || 'Failed to update test mode');
                      }
                    } catch (error) {
                      console.error('Error updating test mode:', error);
                      toast.error('Failed to update test mode');
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    useTestCredentials 
                      ? 'bg-yellow-500 focus:ring-yellow-500' 
                      : 'bg-gray-600 focus:ring-blue-500'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      useTestCredentials ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="bg-gray-800/90 backdrop-blur-md border border-gray-700 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <DollarSign className="w-5 h-5 text-green-400" />
          <h2 className="text-xl font-semibold text-white">Pricing Settings</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Discount Percentage</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={config.discountPercentage}
              onChange={(e) => setConfig({...config, discountPercentage: parseFloat(e.target.value) || 0})}
              className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">Global discount percentage for all plans (0-100)</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">USD to RUB Exchange Rate</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={config.usdToRubRate}
              onChange={(e) => setConfig({...config, usdToRubRate: parseFloat(e.target.value) || 0})}
              className="px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1.00"
            />
            <p className="text-xs text-gray-500 mt-1">Manual exchange rate for USD to Russian Ruble (set your fixed rate)</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Save size={20} />
          {loading ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      {/* Info */}
      <p className="text-xs text-gray-500 text-center mt-8">
        Configuration is read from environment variables. No Firebase or Supabase required.
      </p>
    </div>
  );
}
