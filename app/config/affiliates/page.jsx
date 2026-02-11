'use client';

import { useState, useEffect, useCallback } from 'react';
import { Share2, Copy, Plus, Loader2, Link2, BarChart2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

export default function ConfigAffiliatesPage() {
  const searchParams = useSearchParams();
  const storeParam = searchParams?.get('store') || 'globalbanka';
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLinks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/config/affiliates?store=${encodeURIComponent(storeParam)}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to fetch');
      setLinks(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      console.error(e);
      toast.error(e?.message || 'Failed to load affiliate links');
      setLinks([]);
    } finally {
      setLoading(false);
    }
  }, [storeParam]);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const getFullLink = (code) => `${baseUrl}?ref=${encodeURIComponent(code)}`;

  const copyLink = (code) => {
    const url = getFullLink(code);
    navigator.clipboard?.writeText(url).then(() => {
      toast.success('Link copied to clipboard');
    }).catch(() => toast.error('Failed to copy'));
  };

  const createCustomLink = async () => {
    const commission = window.prompt('Commission % for this link:', '25');
    if (commission == null) return;
    const pct = parseFloat(commission);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      toast.error('Enter a valid number between 0 and 100');
      return;
    }
    try {
      const res = await fetch('/api/config/affiliates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeParam,
          commission_percent: pct,
          label: `Custom (${pct}%)`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to create');
      toast.success('Affiliate link created');
      loadLinks();
    } catch (e) {
      toast.error(e?.message || 'Failed to create link');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Affiliates</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Global 25% link and custom affiliate links. Use Share on packages to generate links with custom commission.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-500" />
            <span className="font-medium text-gray-900 dark:text-white">Affiliate Links</span>
          </div>
          <button
            type="button"
            onClick={createCustomLink}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create custom link
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Link</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Commission</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Clicks</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sales</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Revenue (RUB)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {links.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No affiliate links yet. The global 25% link will appear after first load.
                  </td>
                </tr>
              ) : (
                links.map((link) => (
                  <tr key={link.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link2 className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        <code className="text-sm font-mono text-blue-600 dark:text-blue-400">{link.code}</code>
                        {link.label && link.label !== link.code && (
                          <span className="text-sm text-gray-500 dark:text-gray-400">({link.label})</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate max-w-md">{getFullLink(link.code)}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-200">{link.commission_percent}%</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">{link.clicks ?? 0}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">{link.sales_count ?? 0}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">{Number(link.sales_amount_rub ?? 0).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => copyLink(link.code)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <BarChart2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-100">How it works</h3>
            <ul className="mt-2 text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
              <li><strong>GLOBAL25</strong> – default affiliate link with 25% commission</li>
              <li>Add <strong>?ref=CODE</strong> to any URL to attribute traffic</li>
              <li>Use Share on each package to create links with custom commission %</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
