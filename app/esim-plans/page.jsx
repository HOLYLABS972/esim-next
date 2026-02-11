'use client';

import React, { Suspense } from 'react';
import EsimPlans from '../../src/components/EsimPlans';
import { useI18n } from '../../src/contexts/I18nContext';
import Loading from '../../src/components/Loading';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

function EsimPlansContent() {
  const { t } = useI18n();

  return (
    <div className="bg-white dark:bg-gray-900 min-h-screen transition-colors">
      <div className="container mx-auto px-4 py-6">
        <Suspense fallback={
          <div className="flex justify-center items-center min-h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400"></div>
            <p className="ml-4 text-gray-300">{t('plans.loadingPlans', 'Загрузка планов...')}</p>
          </div>
        }>
          {/* The mobile-style layout is rendered by `EsimPlans` on the dedicated plans page */}
          <EsimPlans filterType="countries" />
        </Suspense>
      </div>
    </div>
  );
}

export default function EsimPlansPage() {
  return (
    <Suspense fallback={<Loading />}>
      <EsimPlansContent />
    </Suspense>
  );
}
