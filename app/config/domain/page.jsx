'use client';

import { useState, useEffect } from 'react';
import { Globe, Plus, Loader2, CheckCircle, XCircle, RefreshCw, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ConnectDomainPage() {
  const [currentHostname, setCurrentHostname] = useState('');
  const [loading, setLoading] = useState(true);
  const [domains, setDomains] = useState([]);
  const [configError, setConfigError] = useState(null);
  const [newDomain, setNewDomain] = useState('');
  const [adding, setAdding] = useState(false);
  const [verifying, setVerifying] = useState(null);
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentHostname(window.location.hostname.replace(/^www\./, ''));
    }
  }, []);

  const loadDomains = async () => {
    setLoading(true);
    setConfigError(null);
    try {
      const res = await fetch('/api/config/vercel-domains', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setDomains(Array.isArray(data.domains) ? data.domains : []);
      } else {
        setConfigError(data.error || 'Failed to load domains');
        if (res.status === 503) {
          toast.error(data.error);
        }
      }
    } catch (err) {
      setConfigError(err?.message || 'Failed to load domains');
      toast.error(err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDomains();
  }, []);

  const addDomainByName = async (name) => {
    const n = name.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
    if (!n) return;
    setAdding(true);
    try {
      const res = await fetch('/api/config/vercel-domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: n }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Domain ${n} added`);
        loadDomains();
      } else {
        toast.error(data.error || 'Failed to add domain');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to add domain');
    } finally {
      setAdding(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const name = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
    if (!name) {
      toast.error('Enter a domain (e.g. example.com or hopjob.roamjet.net)');
      return;
    }
    await addDomainByName(name);
    setNewDomain('');
  };

  const handleAddCurrentDomain = async () => {
    if (!currentHostname) return;
    await addDomainByName(currentHostname);
  };

  const handleVerify = async (domain) => {
    setVerifying(domain);
    try {
      const res = await fetch('/api/config/vercel-domains/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Verification checked for ${domain}`);
        loadDomains();
      } else {
        toast.error(data.error || `Verification failed for ${domain}`);
      }
    } catch (err) {
      toast.error(err?.message || 'Verify failed');
    } finally {
      setVerifying(null);
    }
  };

  const handleRemove = async (domain) => {
    if (!confirm(`Remove domain "${domain}" from this project?`)) return;
    setRemoving(domain);
    try {
      const res = await fetch(`/api/config/vercel-domains?domain=${encodeURIComponent(domain)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Domain ${domain} removed`);
        loadDomains();
      } else {
        toast.error(data.error || 'Failed to remove domain');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to remove');
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Globe className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Connect domain</h2>
            <p className="text-sm text-gray-600">
              Manage the domain for this business: <strong>{currentHostname || 'this domain'}</strong>. Set default language in the Language tab.
            </p>
          </div>
        </div>

        {/* Add domain – main feature */}
        <form onSubmit={handleAdd} className="mb-6 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-800 mb-1">Add domain</label>
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="example.com or hopjob.roamjet.net"
              className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500"
              disabled={!!configError}
            />
          </div>
          <button
            type="submit"
            disabled={adding || !!configError}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add domain
          </button>
        </form>

        {configError && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800 font-medium">Vercel API not configured</p>
            <p className="text-sm text-amber-700 mt-1">{configError}</p>
            <p className="text-xs text-amber-600 mt-2">
              This page uses the real Vercel API to add and verify domains. Set <strong>VERCEL_TOKEN</strong> (Vercel → Settings → Access Tokens) and{' '}
              <strong>VERCEL_PROJECT_ID</strong> (or VERCEL_PROJECT_NAME) in your Vercel project environment variables or .env, then retry.
            </p>
            <button
              type="button"
              onClick={loadDomains}
              className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-3">This domain</h3>
          {loading ? (
            <div className="flex items-center gap-2 py-4 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading…</span>
            </div>
          ) : !currentHostname ? (
            <p className="text-sm text-gray-500 py-4">Unable to detect current domain.</p>
          ) : (() => {
            const match = domains.find((d) => {
              const n = (typeof d === 'string' ? d : (d.name || d.domain || '')).replace(/^www\./, '');
              return n === currentHostname || n === `www.${currentHostname}`;
            });
            const name = typeof match === 'string' ? match : (match?.name || match?.domain || currentHostname);
            const verified = match && typeof match === 'object' && match.verified === true;
            return (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-gray-900">{currentHostname}</span>
                    {match ? (
                      verified ? (
                        <span className="flex items-center gap-1 text-sm text-green-600 shrink-0">
                          <CheckCircle className="w-4 h-4" /> Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-sm text-amber-600 shrink-0">
                          <XCircle className="w-4 h-4" /> Not verified
                        </span>
                      )
                    ) : (
                      <span className="text-sm text-gray-500 shrink-0">Not in project yet</span>
                    )}
                  </div>
                  {match ? (
                    <div className="flex items-center gap-2 shrink-0">
                      {!verified && (
                        <button
                          type="button"
                          onClick={() => handleVerify(name)}
                          disabled={verifying === name}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
                        >
                          {verifying === name ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                          Verify
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemove(name)}
                        disabled={removing === name}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg disabled:opacity-50"
                      >
                        {removing === name ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleAddCurrentDomain}
                      disabled={adding || !!configError}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
                    >
                      {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Add this domain
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
