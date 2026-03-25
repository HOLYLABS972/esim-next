'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TestPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Loading Israel plans...');

  useEffect(() => {
    // Set test mode in sessionStorage so checkout picks it up
    sessionStorage.setItem('globalbanka_test_mode', '1');

    (async () => {
      try {
        const res = await fetch('/api/public/plans?country=IL');
        if (!res.ok) throw new Error('Failed to fetch plans');
        const data = await res.json();
        const plans = data?.success ? (data.data?.plans || []) : [];

        // Find cheapest 1GB plan
        const oneGB = plans.filter((p) => {
          const raw = p.data || p.amount || '';
          const str = String(raw).toLowerCase().replace(/\s/g, '');
          let mb = 0;
          if (str.includes('gb')) mb = parseFloat(str) * 1024;
          else if (str.includes('mb')) mb = parseFloat(str);
          else mb = parseFloat(str);
          if (mb >= 500 && mb <= 1024) mb = 1024; // treat ~1GB
          return mb >= 1024 && mb < 2048;
        });
        oneGB.sort((a, b) => (parseFloat(a.price) || 999) - (parseFloat(b.price) || 999));

        const plan = oneGB[0] || plans[0];
        if (!plan) {
          setStatus('No plans found for Israel');
          return;
        }

        const slug = plan.slug || plan.package_id || plan.id;
        const params = new URLSearchParams({
          country: 'IL',
          flag: '🇮🇱',
          test: '1',
        });

        setStatus(`Redirecting to ${slug}...`);
        router.replace(`/share-package/${encodeURIComponent(slug)}?${params.toString()}`);
      } catch (e) {
        console.error('Test page error:', e);
        setStatus('Error: ' + e.message);
      }
    })();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-400">{status}</p>
        <p className="text-xs text-yellow-500 mt-2">Test Mode</p>
      </div>
    </div>
  );
}
