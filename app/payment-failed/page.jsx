'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft } from 'lucide-react';

function PaymentFailedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [reason, setReason] = useState('');

  useEffect(() => {
    const reasonParam = searchParams.get('reason');
    if (reasonParam) {
      setReason(reasonParam);
    }
  }, [searchParams]);

  const getErrorMessage = (reason) => {
    switch (reason) {
      case 'invalid_signature':
        return 'Не удалось проверить платёж. Если с вас списали деньги, пожалуйста, свяжитесь со службой поддержки.';
      case 'processing_error':
        return 'Произошла ошибка при обработке вашего платежа. Пожалуйста, попробуйте снова.';
      case 'cancelled':
        return 'Платёж был отменён. Вы можете попробовать снова в любое время.';
      case 'insufficient_funds':
        return 'Платёж не прошёл из-за недостатка средств. Пожалуйста, проверьте баланс вашего счета.';
      default:
        return 'Платёж не был завершен. Пожалуйста, попробуйте снова или свяжитесь со службой поддержки.';
    }
  };

  const handleRetryPayment = () => {
    // Go back to checkout or plans page
    router.back();
  };

  const handleContactSupport = () => {
    // You can implement contact support functionality here
    window.open('mailto:support@globalbanka.com?subject=Payment Issue', '_blank');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a202c]">
      <div className="max-w-md mx-auto bg-gray-800/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-700/50 p-8 text-center">
        <div className="text-red-400 text-6xl mb-6">
          <AlertCircle className="w-16 h-16 mx-auto" />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-4">
          Платёж не прошёл
        </h1>
        
        <p className="text-gray-300 mb-6">
          {getErrorMessage(reason)}
        </p>

        <div className="space-y-4">
          <button
            onClick={handleRetryPayment}
            className="w-full px-6 py-3 bg-blue-400 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Попробовать снова
          </button>
          
          <button
            onClick={handleContactSupport}
            className="w-full px-6 py-3 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
          >
            Связаться с поддержкой
          </button>
        </div>

        <div className="mt-8 p-4 bg-yellow-400/20 backdrop-blur-sm border border-yellow-400/30 rounded-lg">
          <p className="text-sm text-yellow-300">
            <strong>Важно:</strong> Если с вас списали деньги, но вы видите эту ошибку, немедленно свяжитесь с нашей службой поддержки и предоставьте данные о заказе.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PaymentFailed() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#1a202c]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400"></div>
      </div>
    }>
      <PaymentFailedContent />
    </Suspense>
  );
}
