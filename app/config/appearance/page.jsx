'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AppearanceRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/config/site');
  }, [router]);
  return (
    <div className="min-h-[40vh] flex items-center justify-center py-12 bg-white dark:bg-gray-900 transition-colors">
      <p className="text-gray-600 dark:text-gray-400">Redirecting to Site…</p>
    </div>
  );
}
