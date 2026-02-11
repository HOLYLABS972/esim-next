'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Globe, Plus, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DomainsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawStore = searchParams.get('store') || process.env.NEXT_PUBLIC_STORE_ID || 'globalbanka';
  const storeSlug = rawStore === 'roamjet' ? 'easycall' : rawStore;

  const [domains, setDomains] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [newDomain, setNewDomain] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [showAllDomains, setShowAllDomains] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const domainsUrl = showAllDomains ? '/api/config/domains?all=1' : `/api/config/domains?store=${encodeURIComponent(storeSlug)}`;
      const [domRes, brandRes] = await Promise.all([
        fetch(domainsUrl, { cache: 'no-store' }),
        fetch('/api/config/brands', { cache: 'no-store' }),
      ]);
      const domData = await domRes.json();
      const brandData = await brandRes.json();
      if (domData.success && Array.isArray(domData.domains)) setDomains(domData.domains);
      else toast.error(domData.error || 'Failed to load domains');
      if (brandData.success && Array.isArray(brandData.brands)) {
        setBrands(brandData.brands);
        const brandForStore = brandData.brands.find((b) => (b.slug || '') === storeSlug);
        const idToSelect = brandForStore?.id || brandData.brands[0]?.id;
        if (idToSelect) setSelectedBrandId(idToSelect);
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [storeSlug, showAllDomains]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const domain = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '');
    if (!domain) {
      toast.error('Enter a domain (e.g. example.com)');
      return;
    }
    if (!selectedBrandId) {
      toast.error('Select a brand');
      return;
    }
    setAdding(true);
    try {
      const res = await fetch(`/api/config/brands/${selectedBrandId}/domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Domain ${domain} added`);
        setNewDomain('');
        load();
      } else {
        toast.error(data.error || 'Failed to add domain');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to add domain');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (d) => {
    if (!confirm(`Remove domain "${d.domain}" from ${d.brand_name || 'brand'}?`)) return;
    setRemoving(d.id);
    try {
      const res = await fetch(
        `/api/config/brands/${d.brand_id}/domains?domain=${encodeURIComponent(d.domain)}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (data.success) {
        toast.success(`Domain ${d.domain} removed`);
        load();
      } else {
        toast.error(data.error || 'Failed to remove domain');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to remove domain');
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Domains</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Add any domain (e.g. mysite.com, shop.example.com, de.example.com) and assign it to a brand. When a user visits that domain, language, currency, and theme are taken from the assigned brand.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {brands.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Store filter</label>
              <select
                value={storeSlug}
                onChange={(e) => {
                  const slug = e.target.value;
                  router.replace(`/config/domains?store=${encodeURIComponent(slug)}`);
                }}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm"
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.slug || b.id}>{b.name || b.slug}</option>
                ))}
              </select>
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showAllDomains}
              onChange={(e) => setShowAllDomains(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Show all domains</span>
          </label>
        </div>
      </div>

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3 mb-8 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign to brand</label>
          <select
            value={selectedBrandId}
            onChange={(e) => setSelectedBrandId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
          >
            <option value="">Select brand</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.slug})
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[260px] flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Domain</label>
          <input
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="e.g. mysite.com, shop.example.com, de.mystore.com"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={adding || !selectedBrandId || !newDomain.trim()}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium h-[38px]"
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          Add domain
        </button>
      </form>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : domains.length === 0 ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-8 text-center text-gray-600 dark:text-gray-400">
          No domains yet. Add a domain above and assign it to a brand.
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Domain
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Brand
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {domains.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-mono">{d.domain}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {d.brand_name || d.brand_slug || d.brand_id}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemove(d)}
                      disabled={removing === d.id}
                      className="inline-flex items-center text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                    >
                      {removing === d.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remove
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
