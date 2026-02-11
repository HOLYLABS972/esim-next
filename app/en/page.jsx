'use client';

import React, { Suspense, useState, useEffect } from 'react';
import EsimPlans from '../../src/components/EsimPlans';
import CountrySearchBar from '../../src/components/CountrySearchBar';
import FAQ from '../../src/components/FAQ';
import DeviceCompatibility from '../../src/components/DeviceCompatibility';
import { useI18n } from '../../src/contexts/I18nContext';

const DynamicTitle = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  if (isMobile) {
    // Mobile: 3 rows
    return (
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">
          Stay Connected no matter
        </h1>
        <h1 className="text-2xl font-bold text-white mb-2">
          where you are
        </h1>
        <h1 className="text-2xl font-bold text-white">
          with <span className="text-blue-400">GlobalEsim</span>
        </h1>
      </div>
    );
  }

  // Desktop: 2 rows
  return (
    <div className="text-center mb-8">
      <h1 className="text-4xl font-bold text-white mb-2">
        Stay Connected no matter
      </h1>
      <h1 className="text-4xl font-bold text-white">
        where you are with <span className="text-blue-400">GlobalEsim</span>
      </h1>
    </div>
  );
};

export default function HomePage() {
  const { t } = useI18n();
  
  return (
    <div>
      <div className="container mx-auto px-4 py-8">
        <DynamicTitle />

        {/* Search Bar */}
        <div className="text-center mb-8">
          <Suspense fallback={<div className="h-20"></div>}>
            <CountrySearchBar showCountryCount={true} />
          </Suspense>
        </div>
        
        <Suspense fallback={
          <div className="flex justify-center items-center min-h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400"></div>
            <p className="ml-4 text-gray-300">{t('plans.loading', 'Loading plans...')}</p>
          </div>
        }>
          <EsimPlans />
        </Suspense>

        {/* Device Compatibility Section */}
        <DeviceCompatibility />

        {/* FAQ Section */}
        <FAQ />
      </div>
    </div>
  );
}

