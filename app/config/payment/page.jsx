'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Save, Loader2, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PaymentPage() {
  const storeId = 'globalbanka'; // Single brand mode - hardcoded
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [storeName, setStoreName] = useState('');
  const [connections, setConnections] = useState({});
  /** Single payment method per store/domain (radio) */
  const [selectedMethod, setSelectedMethod] = useState('robokassa');
  const [form, setForm] = useState({
    robokassa: { merchantLogin: '', passOne: '', passTwo: '', mode: 'production' },
    stripe: { secretKey: '', publishableKey: '', mode: 'test' },
    coinbase: { apiKey: '' },
  });

  useEffect(() => {
    loadPayment();
  }, []);

  // Sync form fields from loaded connections when form is still empty (ensures inputs show values after load)
  useEffect(() => {
    if (loadError || loading) return;
    const r = connections?.robokassa;
    const s = connections?.stripe;
    if (!r && !s) return;
    const merchantLogin = String(r?.merchantLogin ?? r?.merchant_login ?? '').trim();
    const passOne = String(r?.passOne ?? r?.pass_one ?? '').trim();
    const passTwo = String(r?.passTwo ?? r?.pass_two ?? '').trim();
    const pubKey = String(s?.publishableKey ?? '').trim();
    setForm((prev) => {
      const needRobokassa = (merchantLogin && !(prev.robokassa?.merchantLogin ?? '').trim()) || (passOne && !(prev.robokassa?.passOne ?? '').trim()) || (passTwo && !(prev.robokassa?.passTwo ?? '').trim());
      const needStripe = pubKey && !(prev.stripe?.publishableKey ?? '').trim();
      if (!needRobokassa && !needStripe) return prev;
      return {
        ...prev,
        robokassa: {
          ...prev.robokassa,
          merchantLogin: merchantLogin || (prev.robokassa?.merchantLogin ?? ''),
          passOne: passOne || (prev.robokassa?.passOne ?? ''),
          passTwo: passTwo || (prev.robokassa?.passTwo ?? ''),
          mode: r?.mode || prev.robokassa?.mode || 'production',
        },
        stripe: {
          ...prev.stripe,
          publishableKey: needStripe ? pubKey : (prev.stripe?.publishableKey ?? ''),
          mode: s?.mode || prev.stripe?.mode || 'test',
        },
      };
    });
  }, [connections, loadError, loading]);

  const loadPayment = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/config/payment-connections?store=${encodeURIComponent(storeId)}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        const conn = data.connections || {};
        setStoreName(data.storeName || storeId);
        setConnections(conn);
        const methods = Array.isArray(data.paymentMethods) && data.paymentMethods.length > 0 ? data.paymentMethods : ['robokassa'];
        setSelectedMethod(['robokassa', 'stripe', 'coinbase'].includes(methods[0]) ? methods[0] : 'robokassa');
        const robokassa = conn.robokassa || {};
        const stripe = conn.stripe || {};
        const merchantLogin = String(robokassa.merchantLogin ?? robokassa.merchant_login ?? '').trim();
        const passOne = String(robokassa.passOne ?? robokassa.pass_one ?? '').trim();
        const passTwo = String(robokassa.passTwo ?? robokassa.pass_two ?? '').trim();
        const publishableKey = String(stripe.publishableKey ?? '').trim();
        setForm({
          robokassa: {
            merchantLogin,
            passOne,
            passTwo,
            mode: robokassa.mode || 'production',
          },
          stripe: {
            secretKey: '', // never prefill secret; admin enters or uses env
            publishableKey,
            mode: stripe.mode || 'test',
          },
          coinbase: { apiKey: '' },
        });
      } else {
        const msg = data.error || `Failed to load payment (${res.status})`;
        setLoadError(msg);
        toast.error(msg);
        console.error('Payment load error:', msg);
      }
    } catch (err) {
      const msg = err?.message || 'Failed to load payment';
      setLoadError(msg);
      toast.error(msg);
      console.error('Payment load error:', err);
    } finally {
      setLoading(false);
    }
  };


  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        store: storeId,
        enabledMethods: [selectedMethod],
      };
      if (storeId === 'globalbanka') payload.robokassa = form.robokassa;
      payload.stripe = form.stripe;
      payload.coinbase = form.coinbase;
      const res = await fetch('/api/config/payment-connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Payment saved');
        loadPayment();
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {loadError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-medium text-amber-800">Could not load payment config</p>
              <p className="text-sm text-amber-700 mt-0.5">{loadError}</p>
              <p className="text-xs text-amber-600 mt-1">
                If values are set in Supabase, ensure <strong>SUPABASE_SERVICE_ROLE_KEY</strong> and <strong>SUPABASE_URL</strong> are set in your server environment (e.g. Vercel / hosting).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadPayment()}
            className="shrink-0 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium"
          >
            Retry
          </button>
        </div>
      )}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Payment</h2>
              <p className="text-sm text-gray-500">
                Configuring payments for store: <strong>{storeName || storeId}</strong>
              </p>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4">Choose one payment method for this store. Each store/domain has its own setting.</p>

        <fieldset className="mb-6">
          <legend className="sr-only">Payment method for this store</legend>
          <div className="flex flex-wrap gap-4">
            {[
              { id: 'robokassa', label: 'Robokassa', icon: DollarSign },
              { id: 'stripe', label: 'Stripe', icon: CreditCard },
              { id: 'coinbase', label: 'Coinbase Commerce', icon: CreditCard },
            ].map(({ id, label, icon: Icon }) => (
              <label key={id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="paymentMethod"
                  value={id}
                  checked={selectedMethod === id}
                  onChange={() => setSelectedMethod(id)}
                  className="border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Icon className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-800">{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Robokassa — shown only when selected */}
        {selectedMethod === 'robokassa' && (
        <div className="border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-yellow-600" />
            <h3 className="font-semibold text-gray-900">Robokassa</h3>
            {connections?.robokassa?.configured && (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" /> Connected
              </span>
            )}
          </div>
          {storeId === 'globalbanka' && (
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Merchant Login</label>
                <input
                  type="text"
                  value={form.robokassa?.merchantLogin ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, robokassa: { ...f.robokassa, merchantLogin: e.target.value } }))}
                  className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500"
                  placeholder="Merchant ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Password 1</label>
                <input
                  type="text"
                  value={form.robokassa?.passOne ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, robokassa: { ...f.robokassa, passOne: e.target.value } }))}
                  className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500"
                  placeholder="Password 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Password 2</label>
                <input
                  type="text"
                  value={form.robokassa?.passTwo ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, robokassa: { ...f.robokassa, passTwo: e.target.value } }))}
                  className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500"
                  placeholder="Password 2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Mode</label>
                <select
                  value={form.robokassa?.mode ?? 'production'}
                  onChange={(e) => setForm((f) => ({ ...f, robokassa: { ...f.robokassa, mode: e.target.value } }))}
                  className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 [&_option]:bg-white [&_option]:text-gray-900"
                >
                  <option value="test">Test</option>
                  <option value="production">Production</option>
                </select>
              </div>
            </div>
          )}
          {storeId !== 'globalbanka' && (
            <p className="text-sm text-gray-500">Robokassa is configured globally for store globalbanka.</p>
          )}
        </div>
        )}

        {/* Stripe — secret + publishable key only (no Connect / split payments) */}
        {selectedMethod === 'stripe' && (
        <div className="border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-900">Stripe</h3>
            {connections?.stripe?.configured && (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" /> Configured
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-4">Use your Stripe secret and publishable keys. Payments go to your Stripe account (no split/Connect).</p>
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Secret key</label>
              {connections?.stripe?.secretKeyMasked && (
                <p className="text-sm text-gray-700 mb-2 font-mono bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                  Saved: <span className="text-green-700">{connections.stripe.secretKeyMasked}</span> (hidden for security)
                </p>
              )}
              <input
                type="password"
                value={form.stripe?.secretKey ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, stripe: { ...f.stripe, secretKey: e.target.value } }))}
                className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500"
                placeholder={connections?.stripe?.configured ? 'Leave blank to keep current' : 'sk_test_... or sk_live_...'}
              />
              <p className="text-xs text-gray-500 mt-1">From Stripe Dashboard → Developers → API keys. Or set STRIPE_SECRET_KEY / STRIPE_SECRET_KEY_TEST in env.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Publishable key</label>
              <input
                type="text"
                value={form.stripe?.publishableKey ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, stripe: { ...f.stripe, publishableKey: e.target.value } }))}
                className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500"
                placeholder="pk_test_... or pk_live_..."
              />
              <p className="text-xs text-gray-500 mt-1">Or set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST / NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in env.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Mode</label>
              <select
                value={form.stripe?.mode ?? 'test'}
                onChange={(e) => setForm((f) => ({ ...f, stripe: { ...f.stripe, mode: e.target.value } }))}
                className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 [&_option]:bg-white [&_option]:text-gray-900"
              >
                <option value="test">Test</option>
                <option value="live">Live</option>
              </select>
            </div>
          </div>
        </div>
        )}

        {/* Coinbase Commerce — shown only when selected */}
        {selectedMethod === 'coinbase' && (
        <div className="border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-gray-900">Coinbase Commerce</h3>
            {connections?.coinbase?.configured && (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" /> Connected
              </span>
            )}
          </div>
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">API Key</label>
              <input
                type="text"
                value={form.coinbase?.apiKey ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, coinbase: { apiKey: e.target.value } }))}
                className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500"
                placeholder={connections?.coinbase?.configured ? 'Leave blank to keep current' : 'Coinbase Commerce API key'}
              />
              <p className="text-xs text-gray-500 mt-1">From Coinbase Commerce: Settings → API keys</p>
            </div>
          </div>
        </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </button>
      </div>
    </div>
  );
}
