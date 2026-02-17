'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function UsageRedirectPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/data-usage/${params.iccid}`);
  }, [params.iccid, router]);

  return (
    <div className="min-h-screen bg-[#0f1724] flex items-center justify-center">
      <p className="text-gray-400">Перенаправление...</p>
    </div>
  );
}
