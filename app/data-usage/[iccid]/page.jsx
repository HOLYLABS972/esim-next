'use client';

import React from 'react';
import Link from 'next/link';

const APP_LINKS = {
  ios: 'https://apps.apple.com/us/app/globalbanka/id6754914283',
  android: 'https://play.google.com/store/apps/details?id=com.theholylabs.bank',
};

export default function UsageRedirectPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-6xl">📱</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Проверка расхода доступна в приложении
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Скачайте приложение Globalbanka для проверки расхода трафика, пополнения eSIM и управления тарифами.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={APP_LINKS.ios}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
            App Store
          </a>
          <a
            href={APP_LINKS.android}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3 20.5v-17c0-.83.52-1.28 1-1.5l10 10-10 10c-.48-.22-1-.67-1-1.5zm15.5-8.5l-2.8-1.5L13 13.2l2.7 2.7 2.8-1.5c.83-.44.83-1.56 0-2.4zm-13.7-9.3L15.5 8.5l-2.3 2.3L4.8 2.7zm0 17.6l8.4-8.1 2.3 2.3-10.7 5.8z"/></svg>
            Google Play
          </a>
        </div>
        <Link
          href="/"
          className="inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline mt-4"
        >
          ← На главную
        </Link>
      </div>
    </div>
  );
}
