'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function PayRedirect() {
  const params = useParams();
  const orderId = params?.orderId;
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orderId) return;

    async function doRedirect() {
      try {
        const res = await fetch(`/api/pay/${orderId}`);
        const data = await res.json();
        if (data.paymentUrl) {
          // Client-side redirect — browser is on globalbanka.roamjet.net
          // so Referer header will be correct for Robokassa
          window.location.replace(data.paymentUrl);
        } else {
          setError(data.error || 'Ошибка оплаты');
        }
      } catch (e) {
        setError('Не удалось загрузить платёж');
      }
    }
    doRedirect();
  }, [orderId]);

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111827', color: 'white' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1.25rem' }}>❌ {error}</p>
          <p style={{ marginTop: '0.5rem', color: '#9CA3AF' }}>Попробуйте снова через бот</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111827', color: 'white' }}>
      <div style={{ textAlign: 'center' }}>
        <p>⏳ Перенаправление на оплату...</p>
      </div>
    </div>
  );
}
