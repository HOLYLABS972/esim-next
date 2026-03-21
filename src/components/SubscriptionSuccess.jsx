'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { CheckCircle, Download, QrCode, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const SubscriptionSuccess = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentUser, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [order, setOrder] = useState(null);
  const [qrCode, setQrCode] = useState(null);

  useEffect(() => {
    const handlePaymentSuccess = async () => {
      try {
        setLoading(true);
        
        // Get session_id and plan from URL params
        const sessionId = searchParams.get('session_id');
        let planId = searchParams.get('plan');
        
        // Fix malformed plan parameter that might contain equals signs
        if (planId && planId.includes('=')) {
          // Extract just the plan ID part before the first equals sign
          planId = planId.split('=')[0];
          console.log('🔧 Fixed malformed plan parameter:', planId);
        }
        
        if (!sessionId || !planId) {
          throw new Error('Missing payment session information');
        }

        console.log('🎉 Payment success detected:', { sessionId, planId });
        console.log('👤 User:', currentUser?.email);

        // Call the MongoDB API to create eSIM order
        console.log('📞 Calling MongoDB API create_order with:', { planId, sessionId });
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.roamjet.net';
        
        const createOrderResponse = await fetch(`${API_BASE_URL}/api/orders`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentUser.accessToken || 'dummy-token'}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            planId: planId,
            sessionId: sessionId
          }),
        });
        
        if (!createOrderResponse.ok) {
          throw new Error(`Create order failed: ${createOrderResponse.status}`);
        }
        
        const orderResult = await createOrderResponse.json();
        
        if (!orderResult.success) {
          throw new Error(orderResult.error || 'Failed to create order');
        }

        console.log('✅ eSIM order created:', orderResult.data);
        setOrder(orderResult.data);

        // Call the MongoDB API to get QR code
        console.log('📞 Calling MongoDB API get_esim_qr_code with orderId:', orderResult.data.orderId);
        
        const qrCodeResponse = await fetch(`${API_BASE_URL}/api/orders/${orderResult.data.orderId}/qr-code`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${currentUser.accessToken || 'dummy-token'}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!qrCodeResponse.ok) {
          throw new Error(`Get QR code failed: ${qrCodeResponse.status}`);
        }
        
        const qrResult = await qrCodeResponse.json();
        
        if (!qrResult.success) {
          throw new Error(qrResult.error || 'Failed to get QR code');
        }

        console.log('✅ QR code generated:', qrResult.data);
        setQrCode(qrResult.data);

        toast.success('Payment successful! Your eSIM is ready.');
        
      } catch (err) {
        console.error('❌ Error processing payment success:', err);
        setError('Error processing payment. Please contact support.');
        toast.error('Error processing payment. Please contact support.');
      } finally {
        setLoading(false);
      }
    };

    // Check if user is authenticated
    if (!currentUser) {
      console.log('❌ User not authenticated, redirecting to login');
      toast.error('Please log in to view your eSIM');
      router.push('/login');
      return;
    }

    // Check if this is a payment success redirect
    const sessionId = searchParams.get('session_id');
    const planParam = searchParams.get('plan');
    
    if (sessionId && planParam) {
      console.log('🎉 Payment success detected:', { sessionId, planParam });
      handlePaymentSuccess();
    } else {
      // Not a payment success page, redirect to plans
      router.push('/plans');
    }
  }, [searchParams, router, currentUser]);

  // Show loading spinner while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  if (!authLoading && !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600 mb-4">
            You must be logged in to view your eSIM.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Processing Your Payment
          </h2>
          <p className="text-gray-600">
            Please wait while we activate your eSIM...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Payment Processing Error
          </h2>
          <p className="text-gray-600 mb-4">
            {error}
          </p>
          <button
            onClick={() => router.push('/plans')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Plans
          </button>
        </div>
      </div>
    );
  }

  if (!order || !qrCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Order Not Found
          </h2>
          <p className="text-gray-600 mb-4">
            We couldn&apos;t find your order details. Please contact support.
          </p>
          <button
            onClick={() => router.push('/plans')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Plans
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4"
    >
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
          </motion.div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Payment Successful! 🎉
          </h1>
          <p className="text-xl text-gray-600">
            Your eSIM is now active and ready to use
          </p>
        </div>

        {/* Order Details */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-xl p-8 mb-8"
        >
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Order Details
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Plan</h3>
              <p className="text-gray-900">{order.planName || 'eSIM Plan'}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Order ID</h3>
              <p className="text-gray-900 font-mono">{order.orderId}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Amount</h3>
              <p className="text-gray-900">${order.amount}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Status</h3>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                Active
              </span>
            </div>
          </div>
        </motion.div>

        {/* QR Code Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-xl p-8 mb-8"
        >
          <div className="text-center">
            <QrCode className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Your eSIM QR Code
            </h2>
            <p className="text-gray-600 mb-6">
              Scan this QR code with your device to activate your eSIM
            </p>
            
            {qrCode && qrCode.qrCodeUrl && (
              <div className="flex justify-center mb-6">
                <Image 
                  src={qrCode.qrCodeUrl} 
                  alt="eSIM QR Code" 
                  width={256}
                  height={256}
                  className="w-64 h-64 border-4 border-gray-200 rounded-lg"
                />
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => {
                  if (qrCode && qrCode.qrCodeUrl) {
                    const link = document.createElement('a');
                    link.href = qrCode.qrCodeUrl;
                    link.download = `esim-qr-${order.orderId}.png`;
                    link.click();
                  }
                }}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-5 h-5 mr-2" />
                Download QR Code
              </button>
              
              <button
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </motion.div>

        {/* Instructions */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-blue-50 rounded-2xl p-8"
        >
          <h3 className="text-xl font-semibold text-blue-900 mb-4">
            How to Activate Your eSIM
          </h3>
          <div className="grid md:grid-cols-3 gap-6 text-blue-800">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold text-lg">1</span>
              </div>
              <p>Scan the QR code with your device&apos;s camera</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold text-lg">2</span>
              </div>
              <p>Follow the prompts to add the eSIM to your device</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold text-lg">3</span>
              </div>
              <p>Enable the eSIM in your device settings</p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default SubscriptionSuccess;
