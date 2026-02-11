'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Simple placeholder page - processing handled by email callback
const EsimPaymentSuccessContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const waitForEmail = searchParams.get('wait_for_email') === 'true';

  // Always show success message - processing is handled by email callback
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-24 h-24 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-14 h-14 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold !text-black mb-3">
          Успешно
        </h2>
        <p className="!text-black text-lg mb-2">
          Всё готово!
        </p>
        <p className="!text-black">
          Вы получите письмо с инструкциями по установке в ближайшее время.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-6 w-full px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          Назад в Dashboard
        </button>
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

