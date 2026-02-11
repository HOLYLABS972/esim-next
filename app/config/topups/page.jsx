'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function TopupsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const store = searchParams.get('store');
  const qs = store ? `?store=${encodeURIComponent(store)}` : '';

  useEffect(() => {
    router.replace(`/config/plans${qs}`);
  }, [router, qs]);

  return null;
}
