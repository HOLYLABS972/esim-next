'use client';

import React, { Suspense } from 'react';
import EsimPlans from '../../../src/components/EsimPlans';
import CountrySearchBar from '../../../src/components/CountrySearchBar';
import { useI18n } from '../../../src/contexts/I18nContext';

export default function EsimPlansPage() {
  const { t } = useI18n();
  
  return (
    <>
      <div className="min-h-screen " dir="ltr">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {t('plans.title', 'Choose Your eSIM Plan')}
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
              {t('plans.description', 'Browse our complete selection of eSIM data plans for 200+ countries. Real-time pricing with instant activation.')}
            </p>
            
            {/* Search Bar */}
            <Suspense fallback={<div className="h-20"></div>}>
              <CountrySearchBar showCountryCount={true} />
            </Suspense>
          </div>
          
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
      
    </>
  );
}
