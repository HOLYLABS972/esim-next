'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function PayRedirect() {
  const params = useParams();
  const orderId = params?.orderId;
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orderId) return;

    // Fetch order from API and generate Robokassa URL
    async function redirect() {
      try {
        const res = await fetch(`/api/pay/${orderId}`);
        const data = await res.json();
        if (data.paymentUrl) {
          window.location.href = data.paymentUrl;
        } else {
          setError(data.error || 'Payment URL not found');
        }
      } catch (e) {
        setError('Failed to load payment');
      }
    }
    redirect();
  }, [orderId]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <p className="text-xl">❌ {error}</p>
          <p className="mt-2 text-gray-400">Попробуйте снова через бот</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
        <p>Перенаправление на оплату...</p>
      </div>
    </div>
  );
}
