'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RussianLoginPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to main login page
    router.replace('/login');
  }, [router]);
  
  return null;
}


