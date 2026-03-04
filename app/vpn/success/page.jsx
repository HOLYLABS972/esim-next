'use client';

import { useSearchParams } from 'next/navigation';

export default function VpnSuccess() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') || '';

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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {(!plan || plan === 'monthly') && (
            <a
              href="https://apps.apple.com/redeem?ctx=offercodes&id=6757646633&code=FOXY30"
              style={{
                display: 'block', background: '#1a1008', border: '2px solid #ff6b35',
                borderRadius: 12, padding: '16px 24px', color: '#ff6b35',
                textDecoration: 'none', fontSize: 18, fontWeight: 700, textAlign: 'center',
              }}
            >
              🦊 Активировать — Месяц
            </a>
          )}
          {(!plan || plan === 'yearly') && (
            <a
              href="https://apps.apple.com/redeem?ctx=offercodes&id=6757646633&code=FOXYFREE"
              style={{
                display: 'block', background: '#1a1008', border: '2px solid #ff6b35',
                borderRadius: 12, padding: '16px 24px', color: '#ff6b35',
                textDecoration: 'none', fontSize: 18, fontWeight: 700, textAlign: 'center',
              }}
            >
              🦊 Активировать — Год
            </a>
          )}
        </div>

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
