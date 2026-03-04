'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function VpnSuccess() {
  const searchParams = useSearchParams();
  const inv = searchParams.get('inv') || '';
  const [promoCode, setPromoCode] = useState(null);
  const [plan, setPlan] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (inv) {
      fetch(`/api/vpn/promo?inv=${inv}`)
        .then(r => r.json())
        .then(data => {
          setPromoCode(data.promo_code);
          setPlan(data.plan);
        })
        .catch(() => {});
    }
  }, [inv]);

  function copyCode() {
    if (promoCode) {
      navigator.clipboard.writeText(promoCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: 400, padding: 40 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🦊✅</div>
        <h1 style={{ fontSize: 24, marginBottom: 12 }}>Оплата прошла!</h1>

        {promoCode ? (
          <>
            <p style={{ color: '#999', lineHeight: 1.5, marginBottom: 20 }}>
              Ваш промокод на {plan === 'yearly' ? 'год' : 'месяц'} FoxyWall VPN:
            </p>
            <div
              onClick={copyCode}
              style={{
                background: '#1a1008',
                border: '2px solid #ff6b35',
                borderRadius: 12,
                padding: '16px 24px',
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: 2,
                color: '#ff6b35',
                cursor: 'pointer',
                marginBottom: 8,
                userSelect: 'all',
              }}
            >
              {promoCode}
            </div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 24 }}>
              {copied ? '✅ Скопировано!' : 'Нажмите чтобы скопировать'}
            </div>

            <div style={{
              textAlign: 'left', color: '#ccc',
              fontSize: 14, lineHeight: 2, background: '#111',
              padding: 20, borderRadius: 12, marginBottom: 24,
            }}>
              1. Скачайте приложение FoxyWall<br />
              2. Откройте настройки → «Промокод»<br />
              3. Введите код выше<br />
              4. Готово! Подключайтесь 🚀
            </div>
          </>
        ) : (
          <>
            <p style={{ color: '#999', lineHeight: 1.5, marginBottom: 24 }}>
              Ваш VPN доступ активирован автоматически.
            </p>
            <div style={{
              textAlign: 'left', color: '#ccc',
              fontSize: 14, lineHeight: 2, background: '#111',
              padding: 20, borderRadius: 12, marginBottom: 24,
            }}>
              1. Откройте приложение FoxyWall<br />
              2. Подписка уже активна ✅<br />
              3. Подключайтесь 🚀
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="https://apps.apple.com/app/id6757646633"
            style={{
              background: '#222', color: '#fff', padding: '12px 20px',
              borderRadius: 10, textDecoration: 'none', fontSize: 14,
            }}
          >📱 App Store</a>
          <a
            href="https://play.google.com/store/apps/details?id=com.theholylabs.rock"
            style={{
              background: '#222', color: '#fff', padding: '12px 20px',
              borderRadius: 10, textDecoration: 'none', fontSize: 14,
            }}
          >🤖 Google Play</a>
        </div>
      </div>
    </div>
  );
}
