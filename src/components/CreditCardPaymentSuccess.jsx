'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

// This component is specifically for credit card application payment success
const CreditCardPaymentSuccess = () => {
  console.log('🚀 CreditCardPaymentSuccess component mounting...');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, loading: authLoading } = useAuth();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(true);
  const hasProcessed = useRef(false);

  // Process payment success
  const handlePaymentSuccess = useCallback(async () => {
    try {
      // Get order params
      const orderParam = searchParams.get('order_id') || searchParams.get('order');
      const email = searchParams.get('email');
      const total = searchParams.get('total') || searchParams.get('amount');
      const userId = searchParams.get('user_id');
      const metadataStr = searchParams.get('metadata');
      let metadata = {};
      if (metadataStr) {
        try {
          metadata = JSON.parse(metadataStr);
        } catch (e) {
          console.warn('⚠️ Could not parse metadata:', e);
        }
      }
      
      console.log('🎉 Processing credit card payment success:', {
        orderParam,
        email,
        total,
        userId,
        metadata,
        currentUserId: currentUser?.uid || currentUser?.id || currentUser?._id,
        hasCurrentUser: !!currentUser,
      });
      
      if (!orderParam || !email || !total) {
        console.log('❌ Missing payment information');
        setError('Missing payment information.');
        return;
      }

      // Update pending order status
      try {
        console.log('🔄 Updating pending order status to completed...');
        const updateResponse = await fetch(`/api/orders/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderParam,
            paymentStatus: 'paid',
            status: 'completed'
          })
        });
        
        if (updateResponse.ok) {
          console.log('✅ Order status updated successfully');
        }
      } catch (updateError) {
        console.warn('⚠️ Error updating order status:', updateError);
      }

      // Submit credit card application
      if (metadata && userId) {
        console.log('💳 Processing credit card application order...');
        
        try {
          const applicationData = {
            userId: userId,
            phone: metadata.phone || null,
            country: metadata.country || null,
            city: metadata.city || null,
            street: metadata.street || null,
            postalCode: metadata.postalCode || null,
            promocode: metadata.promocode || null,
            comment: metadata.comment || null,
            planId: metadata.planId || 'basic',
            planName: metadata.planName || 'Базовый'
          };

          console.log('💳 Submitting credit card application:', applicationData);

          const applicationResponse = await fetch('/api/users/credit-card-application', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(applicationData)
          });

          if (applicationResponse.ok) {
            const result = await applicationResponse.json();
            console.log('✅ Credit card application submitted successfully:', result);
          } else {
            const errorData = await applicationResponse.json().catch(() => ({}));
            console.error('❌ Failed to submit credit card application:', errorData);
            setError('Payment successful, but failed to submit application. Please contact support.');
            return;
          }
        } catch (appError) {
          console.error('❌ Error processing credit card application:', appError);
          setError('Payment successful, but failed to process application. Please contact support.');
          return;
        }
      }

      setProcessing(false);
    } catch (err) {
      console.error('❌ Payment processing failed:', err);
      setError(`Error processing payment. Please contact support.`);
      setProcessing(false);
    }
  }, [currentUser, searchParams]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!hasProcessed.current) {
      hasProcessed.current = true;
      handlePaymentSuccess();
    }
  }, [authLoading, handlePaymentSuccess]);

  if (authLoading || processing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processing payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="text-8xl text-red-500 mb-4">✕</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Payment Error</h2>
            <p className="text-gray-600 text-lg">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Show success message for credit card
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl p-8 text-center">
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            💳 Карта заказана успешно!
          </h2>
          <p className="text-gray-600 text-lg mb-4">
            Ваша заявка на кредитную карту принята. Мы свяжемся с вами в ближайшее время.
          </p>
          <p className="text-gray-500 text-sm mt-4 mb-6">
            Вы можете закрыть это окно и вернуться в приложение.
          </p>
        </div>
        <button
          onClick={() => window.open('https://globalbankaccounts.ru', '_blank')}
          className="w-full px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          Visit Website
        </button>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-3 w-full px-8 py-4 bg-white text-blue-700 text-lg font-semibold rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default CreditCardPaymentSuccess;

