'use client';

import React, { Suspense } from 'react';
import EsimPlans from '../../src/components/EsimPlans';
import FAQ from '../../src/components/FAQ';
import DeviceCompatibility from '../../src/components/DeviceCompatibility';
import { useI18n } from '../../src/contexts/I18nContext';

export const dynamic = 'force-dynamic';

export default function RussianHomePage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <Suspense fallback={
          <div className="flex justify-center items-center min-h-64 bg-gray-50 dark:bg-gray-900">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-blue-500"></div>
            <p className="ml-3 text-sm text-gray-500 dark:text-gray-400">{t('plans.loadingPlans', 'Загрузка планов...')}</p>
          </div>
        }>
          <EsimPlans />
        </Suspense>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <div className="mb-8">
          <DeviceCompatibility />
        </div>
        <div>
          <FAQ />
        </div>
      </div>
    </div>
  );
}


