'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TestPage() {
  const router = useRouter();
  useEffect(() => {
    sessionStorage.setItem('globalbanka_test_mode', '1');
    router.push('/?currency=RUB&theme=dark&test=1');
  }, [router]);
  return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Activating test mode...</div>;
}
