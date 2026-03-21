'use client';

import { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Loader2,
  Edit2,
  Trash2,
  Globe,
  ChevronDown,
  ChevronRight,
  Save,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

const LANGUAGES = ['en', 'ru', 'es', 'fr', 'de', 'ar', 'he'];

export default function BusinessPage() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [brandWithDomains, setBrandWithDomains] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [addingDomain, setAddingDomain] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    logo_url: '',
    default_language: 'en',
    supported_languages: ['en', 'ru', 'es', 'fr', 'de', 'ar', 'he'],
    theme: { mode: 'light', primaryColor: '#2563eb', fontHeading: 'Inter', fontBody: 'Inter' },
    is_active: true,
  });

  const loadBrands = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/config/brands', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.brands)) {
        setBrands(data.brands);
      } else {
        toast.error(data.error || 'Failed to load brands');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to load brands');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrandWithDomains = async (id) => {
    try {
      const res = await fetch(`/api/config/brands/${id}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.brand) {
        setBrandWithDomains(data.brand);
        setExpandedId(id);
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to load brand');
    }
  };

  const handleCreate = () => {
    setEditingId(null);
    setForm({
      name: '',
      slug: '',
      logo_url: '',
      default_language: 'en',
      supported_languages: ['en', 'ru', 'es', 'fr', 'de', 'ar', 'he'],
      theme: { mode: 'light', primaryColor: '#2563eb', fontHeading: 'Inter', fontBody: 'Inter' },
      is_active: true,
    });
    setShowForm(true);
  };

  const handleEdit = (b) => {
    setForm({
      name: b.name || '',
      slug: b.slug || '',
      logo_url: b.logo_url || '',
      default_language: b.default_language || 'en',
      supported_languages: Array.isArray(b.supported_languages) ? [...b.supported_languages] : ['en', 'ru', 'es', 'fr', 'de', 'ar', 'he'],
      theme: b.theme && typeof b.theme === 'object' ? { ...b.theme } : { mode: 'light', primaryColor: '#2563eb', fontHeading: 'Inter', fontBody: 'Inter' },
      is_active: b.is_active !== false,
    });
    setEditingId(b.id);
    setShowForm(true);
  };

  const handleSaveCreate = async () => {
    const slug = (form.slug || form.name || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    if (!slug || !form.name?.trim()) {
      toast.error('Name and slug are required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/config/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          slug,
          logo_url: form.logo_url || null,
          default_language: form.default_language,
          supported_languages: LANGUAGES,
          theme: form.theme,
          is_active: form.is_active,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Brand created');
        setShowForm(false);
        loadBrands();
      } else {
        toast.error(data.error || 'Failed to create brand');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to create brand');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/config/brands/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          logo_url: form.logo_url || null,
          default_language: form.default_language,
          supported_languages: LANGUAGES,
          theme: form.theme,
          is_active: form.is_active,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Brand updated');
        setShowForm(false);
        setEditingId(null);
        loadBrands();
        if (brandWithDomains?.id === editingId) {
          loadBrandWithDomains(editingId);
        }
      } else {
        toast.error(data.error || 'Failed to update brand');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to update brand');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete brand "${name}"? This will remove all its domains.`)) return;
    try {
      const res = await fetch(`/api/config/brands/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Brand deleted');
        if (expandedId === id) setExpandedId(null);
        setBrandWithDomains(null);
        loadBrands();
      } else {
        toast.error(data.error || 'Failed to delete brand');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to delete brand');
    }
  };

  const handleAddDomain = async () => {
    const domain = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '');
    if (!domain || !brandWithDomains?.id) return;
    setAddingDomain(true);
    try {
      const res = await fetch(`/api/config/brands/${brandWithDomains.id}/domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Domain ${domain} added`);
        setNewDomain('');
        loadBrandWithDomains(brandWithDomains.id);
      } else {
        toast.error(data.error || 'Failed to add domain');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to add domain');
    } finally {
      setAddingDomain(false);
    }
  };

  const handleRemoveDomain = async (domain) => {
    if (!confirm(`Remove domain "${domain}"?`)) return;
    try {
      const res = await fetch(
        `/api/config/brands/${brandWithDomains.id}/domains?domain=${encodeURIComponent(domain)}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (data.success) {
        toast.success('Domain removed');
        loadBrandWithDomains(brandWithDomains.id);
      } else {
        toast.error(data.error || 'Failed to remove domain');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to remove domain');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Business (Brands)</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage brands: name, logo, theme, domains. Each domain resolves to one brand.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add brand
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            {editingId ? 'Edit brand' : 'New brand'}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="GlobalBanka"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slug</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="globalbanka"
                disabled={!!editingId}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 disabled:opacity-50"
              />
              {editingId && <p className="text-xs text-gray-500 mt-1">Slug cannot be changed after create.</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Logo URL</label>
              <input
                type="url"
                value={form.logo_url}
                onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))}
                placeholder="https://..."
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default language</label>
              <select
                value={form.default_language}
                onChange={(e) => setForm((f) => ({ ...f, default_language: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">All languages are allowed by default.</p>
            </div>
            <div className="sm:col-span-2 flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
              </label>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={editingId ? handleSaveEdit : handleSaveCreate}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingId(null); }}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading brands…</span>
        </div>
      ) : (
        <div className="space-y-2">
          {brands.map((b) => (
            <div
              key={b.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm"
            >
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                onClick={() => (expandedId === b.id ? setExpandedId(null) : loadBrandWithDomains(b.id))}
              >
                <div className="flex items-center gap-3">
                  {expandedId === b.id ? (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  )}
                  {b.logo_url ? (
                    <img src={b.logo_url} alt="" className="w-10 h-10 rounded-lg object-contain" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-gray-500" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{b.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{b.slug}</p>
                  </div>
                  {!b.is_active && (
                    <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 rounded">Inactive</span>
                  )}
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => handleEdit(b)}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(b.id, b.name)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {expandedId === b.id && brandWithDomains?.id === b.id && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Globe className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Domains</span>
                  </div>
                  <ul className="space-y-1 mb-4">
                    {(brandWithDomains.domains || []).map((d) => (
                      <li key={d.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">{d.domain}</span>
                        <div className="flex items-center gap-2">
                          {d.is_primary && <span className="text-xs text-blue-600 dark:text-blue-400">Primary</span>}
                          <button
                            type="button"
                            onClick={() => handleRemoveDomain(d.domain)}
                            className="text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      placeholder="example.com or sub.example.com"
                      className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleAddDomain}
                      disabled={addingDomain || !newDomain.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      {addingDomain ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add domain'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
