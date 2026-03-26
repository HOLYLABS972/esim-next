'use client';

import React from 'react';

const APP_LINKS = {
  ios: 'https://apps.apple.com/us/app/global-travel-data/id6751737433',
  android: 'https://play.google.com/store/apps/details?id=com.theholylabs.bank',
};

export default function AppPromoCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2744] via-[#252d6a] to-[#3b2d6a] p-6 sm:p-8 border border-blue-500/20">
      <div className="flex items-center gap-4 mb-4">
        <span className="text-4xl">📱</span>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Приложение Глобалбанка</h2>
          <p className="text-gray-300 text-sm mt-1">Пополнение и управление eSIM</p>
        </div>
      </div>
      <div className="flex gap-3">
        <a
          href={APP_LINKS.ios}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 px-6 py-3 bg-black text-white font-semibold rounded-xl text-center hover:bg-gray-900 transition-colors"
        >
          App Store
        </a>
        <a
          href={APP_LINKS.android}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 px-6 py-3 bg-green-500 text-white font-semibold rounded-xl text-center hover:bg-green-600 transition-colors"
        >
          Google Play
        </a>
      </div>
    </div>
  );
}
