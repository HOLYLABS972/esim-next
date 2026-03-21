'use client';

import React, { useState, useEffect } from 'react';

const APP_LINKS = {
  ios: 'https://apps.apple.com/us/app/globalbanka/id6754914283',
  android: 'https://play.google.com/store/apps/details?id=com.theholylabs.bank',
};

export default function AppBanner() {
  const [dismissed, setDismissed] = useState(true); // hidden until checked
  const [platform, setPlatform] = useState(null);

  useEffect(() => {
    // Don't show if already dismissed
    if (typeof window !== 'undefined' && sessionStorage.getItem('app-banner-dismissed')) return;

    // Detect platform
    const ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(ua)) {
      setPlatform('ios');
    } else if (/Android/i.test(ua)) {
      setPlatform('android');
    } else {
      // Desktop — don't show banner
      return;
    }
    setDismissed(false);
  }, []);

  if (dismissed || !platform) return null;

  const link = APP_LINKS[platform];
  const storeName = platform === 'ios' ? 'App Store' : 'Google Play';

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('app-banner-dismissed', '1');
    }
  };

  return (
    <div className="sticky top-0 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 flex items-center justify-between gap-3 shadow-md">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xl shrink-0">📱</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">Globalbanka</p>
          <p className="text-xs opacity-90 truncate">Удобнее в приложении</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-1.5 bg-white text-blue-600 text-sm font-semibold rounded-full hover:bg-gray-100 transition-colors"
        >
          Скачать
        </a>
        <button
          onClick={handleDismiss}
          className="p-1 opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
