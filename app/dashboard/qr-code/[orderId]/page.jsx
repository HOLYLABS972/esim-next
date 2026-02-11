'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function QRCodeRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-white">Перенаправление…</p>
    </div>
  );
}
