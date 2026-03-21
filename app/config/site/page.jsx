'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Palette, Loader2, Save, Image, Languages, DollarSign, Percent } from 'lucide-react';
import toast from 'react-hot-toast';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ru', name: 'Russian' },
  { code: 'he', name: 'Hebrew' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ar', name: 'Arabic' },
];

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar ($)' },
  { code: 'RUB', name: 'Russian Ruble (₽)' },
  { code: 'ILS', name: 'Israeli Shekel (₪)' },
  { code: 'AUD', name: 'Australian Dollar (A$)' },
];

export default function SitePage() {
  const queryClient = useQueryClient();
  const storeSlug = 'globalbanka'; // Single brand mode

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [defaultLanguage, setDefaultLanguage] = useState('en');
  const [defaultCurrency, setDefaultCurrency] = useState('RUB');
  const [discountPercentage, setDiscountPercentage] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const siteRes = await fetch(`/api/config/site?store=${encodeURIComponent(storeSlug)}`, { cache: 'no-store' });
        const siteData = await siteRes.json();
        if (siteData.success && siteData.site) {
          setLogoUrl(siteData.site.logo_url || '');
          setDefaultLanguage(siteData.site.default_language || 'en');
          setDefaultCurrency(siteData.site.default_currency || 'RUB');
          setDiscountPercentage(Number(siteData.site.discount_percentage) || 0);
        }
      } catch (_) {}
      setLoading(false);
    };
    load();
  }, [storeSlug]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/config/site', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store: storeSlug,
          logo_url: logoUrl.trim() || null,
          default_language: defaultLanguage,
          default_currency: defaultCurrency,
          discount_percentage: discountPercentage,
          theme: { mode: 'dark', primaryColor: null, fontHeading: 'Inter', fontBody: 'Inter' },
        }),
      });
      const data = await res.json();
        if (data.success) {
        toast.success('Site settings saved');
        if (typeof document !== 'undefined') {
          document.documentElement.classList.add('dark');
          document.documentElement.setAttribute('data-theme', 'dark');
        }
        queryClient.invalidateQueries({ queryKey: ['countries-with-pricing'] });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('site-config-saved'));
        }
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
              <Palette className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Site</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Logo, default language, currency, and login options per store.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-4 text-gray-500 dark:text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading…</span>
          </div>
        ) : (
          <div className="space-y-6 max-w-lg">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Image className="w-4 h-4" />
                Logo URL
              </label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Languages className="w-4 h-4" />
                Default language
              </label>
              <select
                value={defaultLanguage}
                onChange={(e) => setDefaultLanguage(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Used when the visitor has not chosen a language.</p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <DollarSign className="w-4 h-4" />
                Default currency
              </label>
              <select
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Prices are shown in this currency on the public site (read from DB on launch).</p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Percent className="w-4 h-4" />
                Global site discount
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                placeholder="0"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Discount % applied to all plans site-wide (0–100).</p>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
