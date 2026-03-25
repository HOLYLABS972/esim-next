'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../src/contexts/AuthContext';

export default function TestPage() {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState('Загрузка...');

  useEffect(() => {
    // Not logged in → auth first, come back here
    if (currentUser === null) {
      window.location.href = '/telegram-auth?returnUrl=/test';
      return;
    }
    if (currentUser === undefined) return; // still loading

    // Logged in → go straight to test checkout
    setStatus('Создаём тестовый заказ...');
    const params = new URLSearchParams({
      pkg: 'ahava-7days-1gb',
      email: currentUser.email,
      amount: '308',
      plan: '1GB - 7 days',
      cc: 'IL',
      cn: 'Israel',
      uid: currentUser.id || '',
    });
    window.location.href = `/api/checkout/test?${params.toString()}`;
  }, [currentUser]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-400">{status}</p>
        <p className="text-xs text-yellow-500 mt-2">🧪 Тестовый режим</p>
      </div>
    </div>
  );
}
