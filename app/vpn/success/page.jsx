'use client';

export default function VpnSuccess() {
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
        <h1 style={{ fontSize: 24, marginBottom: 12 }}>Подписка активирована!</h1>
        <p style={{ color: '#999', lineHeight: 1.5, marginBottom: 24 }}>
          Ваш VPN доступ готов.
        </p>
        <div style={{
          textAlign: 'left', margin: '24px 0', color: '#ccc',
          fontSize: 14, lineHeight: 2, background: '#111',
          padding: 20, borderRadius: 12,
        }}>
          1. Скачайте приложение FoxyWall<br />
          2. Войдите с email, указанным при оплате<br />
          3. Нажмите «Восстановить покупки»<br />
          4. Готово! Подключайтесь 🚀
        </div>
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
