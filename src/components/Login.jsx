"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const Login = () => {
  const router = useRouter();

  useEffect(() => {
    const returnUrl = new URLSearchParams(window.location.search).get('returnUrl') || '/';
    router.replace(`/telegram-auth?returnUrl=${encodeURIComponent(returnUrl)}`);
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ color: '#666', fontSize: 14 }}>Перенаправление...</div>
    </div>
  );
};

export default Login;
