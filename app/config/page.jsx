'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ConfigPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/config/dashboard');
  }, [router]);

  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}
