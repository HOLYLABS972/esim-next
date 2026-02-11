'use client';

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function EsimPlansPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect /ru/esim-plans to main page (/)
    router.replace('/');
  }, [router]);
  
  return null;
}
