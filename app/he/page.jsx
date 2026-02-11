'use client';

import React, { Suspense } from 'react';
import EsimPlans from '../../src/components/EsimPlans';
import { useI18n } from '../../src/contexts/I18nContext';

export default function HebrewPage() {
  const { t } = useI18n();
  
  return (
    <div className="min-h-screen" dir="rtl" lang="he">
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={
          <div className="flex justify-center items-center min-h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-tufts-blue"></div>
            <p className="ml-4 text-gray-600">{t('plans.loading', 'Loading plans...')}</p>
          </div>
        }>
          <EsimPlans />
        </Suspense>
      </div>
    </div>
  );
}


