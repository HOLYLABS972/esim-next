'use client';

import dynamic from 'next/dynamic';

const EsimPaymentSuccess = dynamic(() => import('../../../src/components/EsimPaymentSuccess'), {
  ssr: false,
  loading: () => null // No loading placeholder - let component handle its own loading state
});

export default function EsimPaymentSuccessPage() {
  console.log('🎯 EsimPaymentSuccessPage rendered');
  // Component handles its own Suspense for useSearchParams
  return <EsimPaymentSuccess />;
}

