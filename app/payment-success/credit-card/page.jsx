'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const CreditCardPaymentSuccess = dynamic(() => import('../../../src/components/CreditCardPaymentSuccess'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-[#1a202c]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
        <p className="text-gray-300">Загрузка...</p>
      </div>
    </div>
  )
});

export default function CreditCardPaymentSuccessPage() {
  console.log('🎯 CreditCardPaymentSuccessPage rendered');
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#1a202c]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Загрузка...</p>
        </div>
      </div>
    }>
      <CreditCardPaymentSuccess />
    </Suspense>
  );
}

