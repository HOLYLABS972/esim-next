'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function VpnSuccess() {
  const searchParams = useSearchParams();
  const inv = searchParams.get('inv') || '';
  const [promo, setPromo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!inv) { setLoading(false); return; }
    // Poll for promo code (callback may take a moment)
    let attempts = 0;
    const poll = async () => {
      try {
        const res = await fetch(`/api/vpn/promo?inv=${inv}`);
        const data = await res.json();
        if (data.redeem_url) {
          setPromo(data);
          setLoading(false);
          return;
        }
      } catch {}
      attempts++;
      if (attempts < 10) setTimeout(poll, 2000);
      else setLoading(false);
    };
    poll();
  }, [inv]);

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
        <p style={{ color: '#999', lineHeight: 1.5, marginBottom: 24 }}>
          Активируйте подписку в App Store:
        </p>

        {loading ? (
          <div style={{ color: '#ff6b35', fontSize: 16, padding: 24 }}>
            ⏳ Получаем ваш код...
          </div>
        ) : promo?.redeem_url ? (
          <a
            href={promo.redeem_url}
            style={{
              display: 'block', background: '#1a1008', border: '2px solid #ff6b35',
              borderRadius: 12, padding: '16px 24px', color: '#ff6b35',
              textDecoration: 'none', fontSize: 18, fontWeight: 700, textAlign: 'center',
              marginBottom: 16,
            }}
          >
            🦊 Активировать подписку
          </a>
        ) : (
          <div style={{ color: '#999', padding: 16, fontSize: 14 }}>
            Код будет отправлен на вашу почту. Если не получили — напишите в поддержку.
          </div>
        )}

        {promo?.promo_code && (
          <div style={{ color: '#666', fontSize: 13, marginBottom: 24 }}>
            Код: <span style={{ color: '#fff', fontFamily: 'monospace' }}>{promo.promo_code}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="https://apps.apple.com/app/id6757646633"
            style={{ background: '#222', color: '#fff', padding: '12px 20px', borderRadius: 10, textDecoration: 'none', fontSize: 14 }}
          >📱 App Store</a>
          <a href="https://play.google.com/store/apps/details?id=com.theholylabs.rock"
            style={{ background: '#222', color: '#fff', padding: '12px 20px', borderRadius: 10, textDecoration: 'none', fontSize: 14 }}
          >🤖 Google Play</a>
        </div>
      </div>
    </div>
  );
}
