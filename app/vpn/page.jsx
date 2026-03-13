'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

const PLANS = {
  monthly: { amount: 399, label: 'Месяц', price: '₽399', sub: '/мес' },
};

export default function VpnPaywall() {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref') || '';
  const emailParam = searchParams.get('email') || '';
  const rcAppUserId = searchParams.get('rc_app_user_id') || '';
  const rcPackage = searchParams.get('rc_package') || '';
  const rcSource = searchParams.get('rc_source') || '';
  const rcEnv = searchParams.get('rc_env') || '';

  const autoplan = 'monthly';
  const fromApp = !!rcAppUserId;

  const [selectedPlan, setSelectedPlan] = useState(autoplan || 'monthly');
  const [email, setEmail] = useState(emailParam);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const plan = PLANS[selectedPlan];

  async function handlePay() {
    if (!email || !email.includes('@')) {
      setError('Введите email');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/vpn/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          plan: selectedPlan, 
          ref, 
          rc_app_user_id: rcAppUserId,
          rc_package: rcPackage,
          rc_source: rcSource,
          rc_env: rcEnv,
        }),
      });

      const data = await res.json();
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        setError(data.error || 'Ошибка создания платежа');
        setLoading(false);
      }
    } catch (e) {
      setError('Ошибка сети');
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '40px 20px 20px', maxWidth: 480 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🦊</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>FoxyWall VPN</h1>
        <p style={{ color: '#999', fontSize: 15, lineHeight: 1.5, marginBottom: 32 }}>
          Безлимитный VPN без ограничений.<br />
          Обходи блокировки. Защити свои данные.
        </p>
      </div>

      {/* Partner badge */}
      {ref && (
        <div style={{ textAlign: 'center', padding: 8, fontSize: 13, color: '#ff6b35' }}>
          🤝 Партнёр: {ref}
        </div>
      )}

      {/* Plans — hidden when auto-selected from app */}
      {fromApp && autoplan ? (
        <div style={{ padding: '0 20px', maxWidth: 400, width: '100%' }}>
          <div style={{
            border: '2px solid #ff6b35', borderRadius: 16, padding: 24,
            background: '#1a1008',
          }}>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{plan.label}</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#ff6b35' }}>
              {plan.price} <span style={{ fontSize: 14, color: '#666', fontWeight: 400 }}>{plan.sub}</span>
            </div>
            {plan.note && <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{plan.note}</div>}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 400, padding: '0 20px' }}>
          {Object.entries(PLANS).map(([key, p]) => (
            <div
              key={key}
              onClick={() => setSelectedPlan(key)}
              style={{
                border: `2px solid ${selectedPlan === key ? '#ff6b35' : '#222'}`,
                borderRadius: 16,
                padding: 24,
                cursor: 'pointer',
                position: 'relative',
                background: selectedPlan === key ? '#1a1008' : 'transparent',
                transition: 'all 0.2s',
              }}
            >
              {p.badge && (
                <div style={{
                  position: 'absolute', top: -10, right: 16,
                  background: '#ff6b35', color: '#fff',
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 8,
                }}>{p.badge}</div>
              )}
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{p.label}</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#ff6b35' }}>
                {p.price} <span style={{ fontSize: 14, color: '#666', fontWeight: 400 }}>{p.sub}</span>
              </div>
              {p.note && <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{p.note}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Features */}
      <div style={{ maxWidth: 400, width: '100%', padding: '32px 20px' }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {[
            'Все серверы: Россия, Европа, Азия',
            'Неограниченный трафик',
            'Протокол VLESS+Reality — не блокируется',
            'iOS + Android + Chrome',
            'Без логов, без рекламы',
          ].map((f, i) => (
            <li key={i} style={{ padding: '8px 0', fontSize: 14, color: '#ccc' }}>
              <span style={{ color: '#ff6b35', fontWeight: 700 }}>✓ </span>{f}
            </li>
          ))}
        </ul>
      </div>

      {/* Email */}
      <div style={{ maxWidth: 400, width: '100%', padding: '0 20px 16px' }}>
        <label style={{ fontSize: 13, color: '#999', display: 'block', marginBottom: 6 }}>
          Email (для восстановления подписки в приложении)
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          style={{
            width: '100%', padding: '14px 16px', borderRadius: 12,
            border: '2px solid #222', background: '#111', color: '#fff',
            fontSize: 16, outline: 'none',
          }}
          onFocus={(e) => e.target.style.borderColor = '#ff6b35'}
          onBlur={(e) => e.target.style.borderColor = '#222'}
        />
      </div>

      {/* Error */}
      {error && (
        <div style={{ color: '#ff4444', fontSize: 14, padding: '0 20px 8px', maxWidth: 400, width: '100%' }}>
          {error}
        </div>
      )}

      {/* Pay button */}
      <button
        onClick={handlePay}
        disabled={loading}
        style={{
          display: 'block', width: 'calc(100% - 40px)', maxWidth: 400,
          margin: '8px 20px 40px', padding: 16,
          background: loading ? '#333' : '#ff6b35', color: '#fff',
          border: 'none', borderRadius: 14, fontSize: 17, fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Загрузка...' : `Оплатить ${plan.price}`}
      </button>

      {/* Footer */}
      <div style={{ color: '#444', fontSize: 12, padding: '0 20px 24px', textAlign: 'center' }}>
        Оплата через Робокассу. Подписка активируется мгновенно.<br />
        Нажимая «Оплатить», вы соглашаетесь с условиями использования.
      </div>
    </div>
  );
}
