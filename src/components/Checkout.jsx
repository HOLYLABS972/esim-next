'use client';

import React, { useEffect, useState, useRef } from 'react';
import { getDisplayAmountFromItem } from '../services/currencyService';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle } from 'lucide-react';

const Checkout = ({ plan, emailFromUrl, paymentMethod: paymentMethodProp }) => {
  const { currentUser } = useAuth();
  const [error, setError] = useState(null);
  const isProcessingRef = useRef(false);

  const getEmailForOrder = () => {
    if (emailFromUrl) return emailFromUrl;
    if (plan?.email) return plan.email;
    if (plan?.couponEmail) return plan.couponEmail;
    if (currentUser?.email) return currentUser.email;
    return null;
  };

  useEffect(() => {
    if (!plan || isProcessingRef.current) return;
    isProcessingRef.current = true;

    const redirectToPayment = async () => {
      try {
        // Get RUB price from server
        const { amount: amountRUB, currency: rubCurrency } = getDisplayAmountFromItem(plan, 'RUB');
        if (rubCurrency !== 'RUB' || !amountRUB || amountRUB <= 0) {
          setError('Price not available – please try again later');
          isProcessingRef.current = false;
          return;
        }

        const finalAmountRUB = Math.max(10, Math.round(amountRUB));

        // Resolve plan slug
        let planSlug = plan.slug || plan.id;
        if (plan.id && /^[0-9a-fA-F]{24}$/.test(plan.id) && plan.slug) {
          planSlug = plan.slug;
        }

        // Resolve country
        let countryCode = null;
        let countryName = null;
        if (plan.country_codes && plan.country_codes.length > 0) {
          countryCode = plan.country_codes[0];
          countryName = plan.countryName || countryCode;
        } else if (plan.country_code) {
          countryCode = plan.country_code;
          countryName = plan.countryName || countryCode;
        }

        const email = getEmailForOrder();
        if (!email) {
          setError('Email is required');
          isProcessingRef.current = false;
          return;
        }

        // GET redirect — creates order + redirects to Robokassa server-side
        // Works in Telegram WebApp where fetch() may be blocked
        const params = new URLSearchParams({
          pkg: planSlug,
          email: email,
          amount: finalAmountRUB.toString(),
          plan: plan.name || planSlug,
        });
        if (countryCode) params.set('cc', countryCode);
        if (countryName) params.set('cn', countryName);
        const uid = currentUser?.uid || currentUser?.id || currentUser?._id || null;
        if (uid) params.set('uid', uid);

        console.log('🚀 Redirecting to checkout:', `/api/checkout/redirect?${params.toString()}`);
        window.location.href = `/api/checkout/redirect?${params.toString()}`;

      } catch (err) {
        console.error('❌ Checkout error:', err);
        setError('Failed to redirect to payment');
        isProcessingRef.current = false;
      }
    };

    redirectToPayment();
  }, [plan, currentUser]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a202c]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-400 text-white rounded-lg hover:bg-blue-500 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a202c]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
        <p className="text-gray-300">Перенаправление на оплату...</p>
      </div>
    </div>
  );
};

export default Checkout;
