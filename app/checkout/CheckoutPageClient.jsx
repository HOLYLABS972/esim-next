'use client';

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Checkout from '../../src/components/Checkout'
import Loading from '../../src/components/Loading'

export default function CheckoutPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const emailFromUrl = searchParams.get('email');
  const paymentFromUrl = searchParams.get('payment');

  useEffect(() => {
    const loadPlan = async () => {
      try {
        const planId = searchParams.get('plan');
        const planType = searchParams.get('type');
        
        // Fallback: check if we have package data in localStorage (for regular purchases)
        const selectedPackage = localStorage.getItem('selectedPackage');
        if (selectedPackage) {
          try {
            const packageData = JSON.parse(selectedPackage);
            console.log('📦 Package data from localStorage:', packageData);
            
            const paymentMethod = paymentFromUrl || packageData.paymentMethod || null;
            const planData = {
              id: packageData.packageId,
              slug: packageData.packageSlug || packageData.packageId, // Use slug if available, fallback to ID
              name: packageData.packageName,
              paymentMethod: ['robokassa', 'stripe', 'crypto', 'coinbase'].includes(paymentMethod) ? paymentMethod : null,
              description: packageData.packageDescription,
              price: packageData.priceUSD || packageData.price, // Use discounted USD price (from share-package)
              // Snake_case versions (used by currencyService.js)
              price_usd: packageData.price_usd || packageData.priceUSD || packageData.price,
              price_rub: packageData.price_rub || packageData.priceRUB,
              price_ils: packageData.price_ils || packageData.priceILS,
              // CamelCase versions (for backwards compatibility)
              priceUSD: packageData.priceUSD, // Explicitly pass discounted price in USD
              priceRUB: packageData.priceRUB, // Pass already-converted RUB price (if available)
              priceILS: packageData.priceILS,
              originalPrice: packageData.originalPrice, // Original price before discount
              currency: packageData.currency,
              data: packageData.data,
              dataUnit: packageData.dataUnit,
              period: packageData.period,
              duration: packageData.period,
              country_code: packageData.country_code, // Direct country code
              country_codes: packageData.country_codes || (packageData.country_code ? [packageData.country_code] : []), // Array format
              countryName: packageData.countryName, // Country name if available
              benefits: packageData.benefits,
              speed: packageData.speed,
              type: 'package'
            };
            
            console.log('💰 Plan pricing data:', {
              price: planData.price,
              price_usd: planData.price_usd,
              price_rub: planData.price_rub,
              price_ils: planData.price_ils,
              priceUSD: planData.priceUSD,
              priceRUB: planData.priceRUB,
              priceILS: planData.priceILS,
              originalPrice: planData.originalPrice,
              fromPackage: {
                price_rub: packageData.price_rub,
                priceRUB: packageData.priceRUB
              }
            });
            
            console.log('🌍 Plan country data:', {
              country_code: planData.country_code,
              country_codes: planData.country_codes,
              countryName: planData.countryName,
              fromPackage: {
                country_code: packageData.country_code,
                country_codes: packageData.country_codes,
                countryName: packageData.countryName
              }
            });
            
            console.log('🎯 Plan data for checkout:', planData);
            setPlan(planData);
            setLoading(false);
            return;
          } catch (parseError) {
            console.error('Error parsing selected package:', parseError);
            // Data removal removed - keeping selectedPackage in localStorage
          }
        }
        
        // If no localStorage data, check URL parameters
        if (!planId) {
          setError('No plan selected');
          setLoading(false);
          return;
        }

        // Load plan data from MongoDB via local API
        try {
          // Try to find plan in all plans from MongoDB
          const response = await fetch('/api/public/plans');
          
          if (!response.ok) {
            throw new Error(`Failed to fetch plans: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (data.success && data.data.plans) {
            // Find the plan by ID
            const planData = data.data.plans.find(p => 
              (p._id && p._id.toString() === planId) || 
              (p.id && p.id.toString() === planId) ||
              p._id === planId ||
              p.id === planId
            );
            
            if (planData) {
              setPlan({
                id: planData._id || planData.id,
                ...planData,
                type: planType || 'country'
              });
            } else {
              setError('Plan not found');
            }
          } else {
            setError('Plan not found');
          }
        } catch (apiError) {
          console.error('Error loading plan from MongoDB:', apiError);
          setError('Failed to load plan');
        }
      } catch (err) {
        console.error('Error loading plan:', err);
        setError('Failed to load plan');
      } finally {
        setLoading(false);
      }
    };

    loadPlan();
  }, [searchParams]);

  if (loading) {
    return <Loading />;
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a202c]">
        <div className="max-w-md mx-auto bg-gray-800/90 backdrop-blur-md border border-gray-700 rounded-xl shadow-lg p-6 text-center">
          <div className="text-gray-400 text-6xl mb-4">📱</div>
          <h2 className="text-xl font-semibold text-white mb-2">
            План не выбран
          </h2>
          <p className="text-gray-300 mb-4">
            Пожалуйста, выберите план со страницы тарифов, чтобы продолжить оформление заказа.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-400 text-white rounded-lg hover:bg-blue-500 transition-colors"
          >
            Посмотреть планы
          </button>
        </div>
      </div>
    );
  }

  return (
    <Checkout plan={plan} emailFromUrl={emailFromUrl} paymentMethod={plan?.paymentMethod || paymentFromUrl} />
  );
}
