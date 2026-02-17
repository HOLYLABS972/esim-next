'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Simple placeholder page - processing handled by email callback
const EsimPaymentSuccessContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const waitForEmail = searchParams.get('wait_for_email') === 'true';

  // Auto-redirect to dashboard after 4 seconds
  React.useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/ru/dashboard?currency=RUB&theme=dark');
    }, 4000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-24 h-24 mx-auto mb-6 bg-green-800/50 rounded-full flex items-center justify-center">
          <svg className="w-14 h-14 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-white mb-3">
          Оплата прошла успешно
        </h2>
        <p className="text-gray-300 text-lg mb-2">
          Ваш eSIM активируется автоматически.
        </p>
        <p className="text-gray-400">
          Вы получите письмо с инструкциями по установке в ближайшее время.
        </p>
        <p className="text-gray-500 text-sm mt-4">
          Перенаправление в личный кабинет...
        </p>
      </div>
    </div>
  );
};

// Main component - page already has Suspense, so we just export the content wrapped in Suspense
const EsimPaymentSuccess = () => {
  // Since page already has Suspense, we can directly use the content component
  // But we need Suspense here because EsimPaymentSuccessContent uses useSearchParams
  // Use a simple empty fallback instead of loading spinner
  return (
    <Suspense fallback={null}>
      <EsimPaymentSuccessContent />
    </Suspense>
  );
};

export default EsimPaymentSuccess;

