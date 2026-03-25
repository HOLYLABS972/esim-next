'use client';

import React, { Suspense } from 'react';
import EsimPlans from '../src/components/EsimPlans';
import WhatIsEsim from '../src/components/WhatIsEsim';
import EsimTutorial from '../src/components/EsimTutorial';
import TravelArticles from '../src/components/TravelArticles';
import DeviceCompatibility from '../src/components/DeviceCompatibility';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <Suspense fallback={
          <div className="flex justify-center items-center min-h-64 bg-gray-50 dark:bg-gray-900">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-blue-500"></div>
            <p className="ml-3 text-sm text-gray-500 dark:text-gray-400">Загрузка тарифов...</p>
          </div>
        }>
          <EsimPlans />
        </Suspense>
      </div>

      <WhatIsEsim />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <DeviceCompatibility />
      </div>

      <EsimTutorial />

      <TravelArticles />
    </div>
  );
}
