'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Battery,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Share2,
  RefreshCw,
  Globe,
} from 'lucide-react';
import toast from 'react-hot-toast';

function formatDataDuration(plan) {
  const mb = plan.data_amount_mb || parseInt(plan.data_amount) || 0;
  const gb = mb / 1024;
  const dataStr = gb >= 1 ? `${gb}GB` : mb > 0 ? `${mb}MB` : null;
  const period = plan.validity_days ?? plan.period;
  if (dataStr && period) return `${dataStr} – ${period} days`;
  if (period) return `${period} days`;
  return '—';
}

function formatPrice(plan) {
  const p = plan.price_usd ?? plan.price;
  if (p == null || p === '' || Number(p) <= 0) return '—';
  return `$${Number(p).toFixed(2)}`;
}

function getTypeLabel(plan) {
  const pt = (plan.package_type || '').toLowerCase();
  if (pt === 'global') return 'Global';
  if (pt === 'regional') return 'Regional';
  return 'Country';
}

function categorizePlan(plan) {
  const pt = (plan.package_type || '').toLowerCase();
  if (pt === 'global') return 'global';
  if (pt === 'regional') return 'regional';
  return 'country';
}

export default function ConfigTopupsPage() {
  const [allPlans, setAllPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sharingId, setSharingId] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('countries');
  const plansPerPage = 50;

  const handleShare = async (plan) => {
    const slug = plan.package_id || plan.id;
    if (!slug) { toast.error('Plan has no slug'); return; }
    const storeParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('store') || 'globalbanka' : 'globalbanka';
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const commissionInput = window.prompt('Custom commission % for this link (or leave empty to use global 25%):', '25');
    let refCode = 'GLOBAL25';
    if (commissionInput !== null && commissionInput.trim() !== '') {
      const pct = parseFloat(commissionInput);
      if (isNaN(pct) || pct < 0 || pct > 100) { toast.error('Enter 0–100'); return; }
      setSharingId(plan.id);
      try {
        const res = await fetch('/api/config/affiliates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            store_id: storeParam, commission_percent: pct,
            package_slug: String(slug), label: `${String(slug).slice(0, 20)}… (${pct}%)`,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to create link');
        refCode = data.data?.code || refCode;
      } catch (e) {
        toast.error(e?.message || 'Failed to create link');
        setSharingId(null); return;
      } finally { setSharingId(null); }
    }
    const shareUrl = `${baseUrl}/share-package/${encodeURIComponent(String(slug))}?ref=${encodeURIComponent(refCode)}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard');
    } catch { toast.error('Could not copy – copy manually: ' + shareUrl); }
  };

  const syncTopups = async () => {
    setSyncing(true);
    try {
      const syncRes = await fetch('/api/config/sync-packages?wipe=true', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
      });
      const syncData = await syncRes.json();
      if (!syncRes.ok || !syncData.success) throw new Error(syncData?.error || 'Sync failed');

      const topupRes = await fetch('/api/config/sync-topup-packages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
      });
      const topupData = await topupRes.json();
      if (!topupRes.ok || !topupData.success) throw new Error(topupData?.error || 'Topup sync failed');

      toast.success(`Synced ${syncData.total_synced} packages, ${topupData.topup_count} topup-eligible`);
      await loadTopups();
    } catch (e) {
      console.error('Sync error:', e);
      toast.error(e?.message || 'Sync failed');
    } finally { setSyncing(false); }
  };

  const loadTopups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/plans?_=${Date.now()}`, {
        cache: 'no-store', headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to fetch plans');
      const plans = Array.isArray(data.plans) ? data.plans : [];
      // Filter to topup-eligible only
      const topups = plans.filter((p) => p.support_topup === true || p.plan_type === 'topup');
      setAllPlans(topups);
    } catch (e) {
      console.error('[Topups] Error:', e);
      toast.error(e?.message || 'Failed to load topups');
      setAllPlans([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTopups(); }, [loadTopups]);

  // Filter by tab
  const tabFiltered = allPlans.filter((p) => {
    const cat = categorizePlan(p);
    if (activeTab === 'countries') return cat === 'country';
    if (activeTab === 'global') return cat === 'global' || cat === 'regional';
    return true;
  });

  const countryCount = allPlans.filter((p) => categorizePlan(p) === 'country').length;
  const globalRegionalCount = allPlans.filter((p) => {
    const cat = categorizePlan(p);
    return cat === 'global' || cat === 'regional';
  }).length;

  const searchLower = searchQuery.trim().toLowerCase();
  const filtered = searchLower
    ? tabFiltered.filter(
        (p) =>
          (p.title || '').toLowerCase().includes(searchLower) ||
          (p.package_id || '').toLowerCase().includes(searchLower) ||
          (p.operator || '').toLowerCase().includes(searchLower) ||
          (p.package_type || '').toLowerCase().includes(searchLower) ||
          (p.country_code || '').toLowerCase().includes(searchLower)
      )
    : tabFiltered;

  const totalPages = Math.max(1, Math.ceil(filtered.length / plansPerPage));
  const start = (currentPage - 1) * plansPerPage;
  const plans = filtered.slice(start, start + plansPerPage);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, activeTab]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Topups</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Topup-eligible eSIM packages from <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">esim_packages</code>. Total: <strong>{allPlans.length}</strong>
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
        {/* Category Tabs */}
        <div className="px-4 sm:px-6 pt-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <button type="button" onClick={() => setActiveTab('countries')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'countries' ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'
              }`}>
              Countries ({countryCount})
            </button>
            <button type="button" onClick={() => setActiveTab('global')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === 'global' ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'
              }`}>
              <Globe className="w-4 h-4" />
              Global & Regional ({globalRegionalCount})
            </button>
          </div>
        </div>

        {/* Search + Actions */}
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" placeholder="Search topups by title, slug, operator..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {filtered.length} topup{filtered.length !== 1 ? 's' : ''}
              </span>
              <button type="button" onClick={syncTopups} disabled={syncing}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Topups'}
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Slug</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data & duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Country</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
                      <Loader2 className="w-5 h-5 animate-spin" /> Loading topups...
                    </div>
                  </td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Battery className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-600 dark:text-gray-400">No topup packages found</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {searchQuery ? 'Try a different search.' : 'Click "Sync Topups" to import and detect topup-eligible packages.'}
                    </p>
                  </td>
                </tr>
              ) : (
                plans.map((plan) => {
                  const typeLabel = getTypeLabel(plan);
                  const countryCode = (plan.country_code || '').trim();
                  return (
                    <tr key={plan.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{plan.title || '—'}</div>
                          {plan.operator && <div className="text-xs text-gray-500 dark:text-gray-400">{plan.operator}</div>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                          {(plan.package_id || plan.id || '—').toString().slice(0, 24)}
                          {(plan.package_id || plan.id || '').toString().length > 24 ? '…' : ''}
                        </code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{formatDataDuration(plan)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          typeLabel === 'Global' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                          typeLabel === 'Regional' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' :
                          'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                        }`}>{typeLabel}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {countryCode ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">{countryCode}</span>
                        ) : <span className="text-xs text-gray-500 dark:text-gray-400">—</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{formatPrice(plan)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button type="button" onClick={() => handleShare(plan)} disabled={sharingId === plan.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Create share link with affiliate tracking">
                          {sharingId === plan.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
                          Share
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > plansPerPage && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between sm:px-6">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Showing {start + 1}–{Math.min(start + plansPerPage, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}
                className="p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Previous page">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-2 text-sm text-gray-600 dark:text-gray-400">Page {currentPage} of {totalPages}</span>
              <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
                className="p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Next page">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
