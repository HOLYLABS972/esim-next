'use client';

import dynamic from 'next/dynamic';

const PaymentSuccess = dynamic(() => import('../../src/components/PaymentSuccess'), {
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

export default function PaymentSuccessPage() {
  console.log('🎯 PaymentSuccessPage rendered');
  return <PaymentSuccess />;
}
