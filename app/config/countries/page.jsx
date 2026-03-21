'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Globe, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

function getFlagUrl(country) {
  if (country.flag && (country.flag.startsWith('http') || country.flag.startsWith('//'))) {
    return country.flag;
  }
  const code = (country.code || '').toLowerCase();
  if (code && code.length === 2 && !code.includes('-')) {
    return `https://flagcdn.com/w40/${code}.png`;
  }
  return null;
}

export default function ConfigCountriesPage() {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadCountries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/public/countries?_=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to fetch');
      const list = data?.data?.countries ?? data?.countries ?? [];
      setCountries(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('Error loading countries:', e);
      toast.error(e?.message || 'Failed to load countries');
      setCountries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCountries();
  }, [loadCountries]);

  const searchLower = searchQuery.trim().toLowerCase();
  const filtered = searchLower
    ? countries.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(searchLower) ||
          (c.code || '').toLowerCase().includes(searchLower)
      )
    : countries;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Countries</h2>
        <p className="text-gray-600 mt-1">View countries and plan counts from the catalog</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <span className="text-sm text-gray-500">
              {filtered.length} of {countries.length} countries
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Flag
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Min price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plans
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Loading countries...
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Globe className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-600">No countries found</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {searchQuery ? 'Try a different search.' : 'Sync or load countries from the admin panel.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((country) => {
                  const flagUrl = getFlagUrl(country);
                  const minPrice = country.minPrice ?? country.min_price;
                  const plansCount = country.plansCount ?? country.plans_count ?? 0;
                  const isRealPrice = typeof minPrice === 'number' && minPrice > 0 && minPrice < 999;
                  return (
                    <tr
                      key={country.id ?? country._id ?? country.code}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center justify-center w-8 h-6 rounded overflow-hidden bg-gray-100 border border-gray-200">
                          {flagUrl ? (
                            <img
                              src={flagUrl}
                              alt=""
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                const fallback = e.target.nextElementSibling;
                                if (fallback) fallback.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <span className={flagUrl ? 'hidden text-lg' : 'text-lg'} aria-hidden>
                            🌍
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {country.code ?? '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {country.name ?? '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {isRealPrice ? `$${Number(minPrice).toFixed(2)}` : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {plansCount}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
