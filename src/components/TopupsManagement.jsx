'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Globe, 
  MapPin, 
  RefreshCw,
  Loader2,
  Battery,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

// Helper function to categorize plan as global, regional, or local/other
const categorizePlan = (plan) => {
  const packageType = (plan.package_type || plan.type || '').toLowerCase();

  if (packageType === 'global') return 'global';
  if (packageType === 'regional') return 'regional';

  // Everything else is a local/country plan
  return 'other';
};

const TopupsManagement = () => {
  // State Management
  const [loading, setLoading] = useState(false);
  const [allPlans, setAllPlans] = useState([]);
  const [filteredPlans, setFilteredPlans] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [plansLoading, setPlansLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [syncStatus, setSyncStatus] = useState('Ready to sync topup packages from API');
  
  // Package type tab state (category)
  const [packageTypeTab, setPackageTypeTab] = useState('countries'); // 'countries', 'global', 'regional'
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [plansPerPage] = useState(15);

  // Load topup plans from MongoDB
  const loadAllTopupPlans = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/config/list-topup-plans?page=1&limit=10000');
      const data = await response.json();
      
      if (data.success && data.data) {
        const allPlansData = data.data.plans || [];
        // Filter for topup packages only
        const topupPlansData = allPlansData.filter(plan => {
          return plan.is_topup_package === true || 
                 plan.available_for_topup === true ||
                 (plan.slug && plan.slug.toLowerCase().includes('-topup')) ||
                 (plan.type && plan.type.toLowerCase() === 'topup');
        });
        setAllPlans(topupPlansData);
        console.log('✅ Loaded', topupPlansData.length, 'topup plans from MongoDB');
      } else {
        console.error('❌ Failed to load topup plans:', data.error);
        toast.error('Failed to load topup plans');
      }
    } catch (error) {
      console.error('❌ Error loading topup plans:', error);
      toast.error('Error loading topup plans: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load plans on component mount
  useEffect(() => {
    loadAllTopupPlans();
  }, [loadAllTopupPlans]);

  // Filter plans based on search, category, and package type tab
  useEffect(() => {
    let filtered = [...allPlans];

    // Filter out parent containers
    filtered = filtered.filter(plan => !plan.is_parent);

    // Filter by package type tab (category)
    if (packageTypeTab === 'countries') {
      // 'countries' tab shows ALL country topup plans (exclude global and regional, similar to mobile app)
      filtered = filtered.filter(plan => {
        const category = categorizePlan(plan);
        return category !== 'global' && category !== 'regional';
      });
    } else if (packageTypeTab === 'global') {
      // Show all global topup plans including sub-plans
      filtered = filtered.filter(plan => {
        const category = categorizePlan(plan);
        return category === 'global' || plan.parent_category === 'global';
      });
    } else if (packageTypeTab === 'regional') {
      // Show all regional topup plans including sub-plans
      filtered = filtered.filter(plan => {
        const category = categorizePlan(plan);
        return category === 'regional' || plan.parent_category === 'regional';
      });
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(plan => 
        plan.name?.toLowerCase().includes(searchLower) ||
        plan.slug?.toLowerCase().includes(searchLower) ||
        plan.operator?.toLowerCase().includes(searchLower) ||
        plan.country?.toLowerCase().includes(searchLower) ||
        (plan.country_codes || []).some(code => 
          code?.toLowerCase().includes(searchLower)
        )
      );
    }

    setFilteredPlans(filtered);
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [allPlans, searchTerm, packageTypeTab]);

  // Sync topup packages from API server
  const syncTopupPackagesFromApi = async () => {
    try {
      setPlansLoading(true);
      setSyncStatus('Syncing topup packages from API...');

      const response = await fetch('/api/config/sync-topup-packages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        const { total_synced, topup_count } = result;
        console.log(`✅ Successfully synced ${total_synced} topup packages from API`);
        setSyncStatus(`Synced ${total_synced} topup packages`);
        toast.success(`Synced ${total_synced} topup packages`);
        
        // Reload plans from MongoDB
        await loadAllTopupPlans();
      } else {
        throw new Error(result.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('❌ Error syncing topup packages:', error);
      setSyncStatus(`Error: ${error.message}`);
      toast.error(`Error syncing topup packages: ${error.message}`);
    } finally {
      setPlansLoading(false);
    }
  };

  const deleteAllPlans = async () => {
    if (!window.confirm('Are you sure you want to delete ALL plans? This cannot be undone.')) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/config/delete-all-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.error || 'Failed to delete');
      toast.success('All plans deleted');
      setAllPlans([]);
    } catch (e) {
      console.error('Delete error:', e);
      toast.error(e?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  // Count plans by type
  const actualPlans = allPlans.filter(plan => !plan.is_parent);
  
  // Count country plans (exclude global and regional, matching mobile app behavior)
  const countryPlansCount = actualPlans.filter(plan => {
    const category = categorizePlan(plan);
    return category !== 'global' && category !== 'regional';
  }).length;
  const globalPlansCount = actualPlans.filter(plan => {
    const category = categorizePlan(plan);
    return category === 'global' || plan.parent_category === 'global';
  }).length;
  const regionalPlansCount = actualPlans.filter(plan => {
    const category = categorizePlan(plan);
    return category === 'regional' || plan.parent_category === 'regional';
  }).length;

  // Pagination
  const indexOfLastPlan = currentPage * plansPerPage;
  const indexOfFirstPlan = indexOfLastPlan - plansPerPage;
  const currentPlans = filteredPlans.slice(indexOfFirstPlan, indexOfLastPlan);
  const totalPages = Math.ceil(filteredPlans.length / plansPerPage);

  return (
    <div className="space-y-6">
      {/* Category Tabs */}
      <div className="bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex gap-2 border-b border-gray-600 mb-4">
          <button
            onClick={() => setPackageTypeTab('countries')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              packageTypeTab === 'countries'
                ? 'border-blue-400 text-blue-400'
                : 'border-transparent text-gray-300 hover:text-white'
            }`}
          >
            Countries ({countryPlansCount})
          </button>
          <button
            onClick={() => setPackageTypeTab('global')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
              packageTypeTab === 'global'
                ? 'border-blue-400 text-blue-400'
                : 'border-transparent text-gray-300 hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4" />
            Global ({globalPlansCount})
          </button>
          <button
            onClick={() => setPackageTypeTab('regional')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
              packageTypeTab === 'regional'
                ? 'border-blue-400 text-blue-400'
                : 'border-transparent text-gray-300 hover:text-white'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Regional ({regionalPlansCount})
          </button>
        </div>

        {/* Search Bar and Sync Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search topup plans by name, slug, operator..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={syncTopupPackagesFromApi}
              disabled={plansLoading}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {plansLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Battery className="w-4 h-4" />
              )}
              {plansLoading ? 'Syncing...' : 'Sync Topups'}
            </button>
            <button
              onClick={deleteAllPlans}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {deleting ? 'Deleting...' : 'Delete All'}
            </button>
          </div>
        </div>
        
        {/* Sync Status */}
        <div className="mt-3 text-sm text-gray-300">
          {syncStatus}
        </div>
      </div>

      {/* Plans Table */}
      <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Data & Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Countries
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-600">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-300">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    <p className="mt-2">Loading topup plans...</p>
                  </td>
                </tr>
              ) : currentPlans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-300">
                    {allPlans.length === 0 
                      ? 'No topup plans found. Click "Sync Topups" to load topup plans from API.'
                      : 'No topup plans match your search criteria.'}
                  </td>
                </tr>
              ) : (
                currentPlans.map((plan) => {
                  const countryCodes = plan.country_codes || plan.country_ids || [];
                  const countryCode = plan.country || countryCodes[0] || '';
                  
                  return (
                    <tr key={plan._id || plan.id} className="hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">
                          {plan.name || 'Unnamed Plan'}
                        </div>
                        {plan.operator && (
                          <div className="text-sm text-gray-300">{plan.operator}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-mono text-gray-300 bg-gray-700 px-2 py-1 rounded">
                          {plan.slug || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">
                          {plan.dataAmount || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-300">
                          {plan.validity || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {countryCodes.slice(0, 3).map((code, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                            >
                              {code}
                            </span>
                          ))}
                          {countryCodes.length > 3 && (
                            <span className="text-xs text-gray-300">
                              +{countryCodes.length - 3} more
                            </span>
                          )}
                          {countryCodes.length === 0 && (
                            <span className="text-xs text-gray-400">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-white">
                          ${plan.price?.toFixed(2) || '0.00'}
                        </span>
                        {plan.currency && plan.currency !== 'USD' && (
                          <span className="text-xs text-gray-300 ml-1">
                            {plan.currency}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          plan.enabled !== false 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {plan.enabled !== false ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2 p-6 border-t border-gray-600">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1 || loading}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-gray-300 px-4">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || loading}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopupsManagement;

