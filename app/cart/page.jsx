'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle } from 'lucide-react';

const CartErrorPage = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#1a202c] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-800/90 backdrop-blur-md rounded-lg shadow-lg border border-gray-700/50 p-8 text-center">
        <div className="w-16 h-16 bg-red-400/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-4">
          Платёж отменён
        </h1>
        
        <p className="text-gray-300 mb-6">
          Ваш платёж был отменён, и вы были перенаправлены сюда. Если вы хотели совершить покупку, 
          пожалуйста, попробуйте снова со страницы наших тарифов eSIM.
        </p>
        
        <div className="space-y-3">
          <button
            onClick={() => router.push('/')}
            className="w-full bg-blue-400 hover:bg-blue-500 text-white py-3 px-6 rounded-lg transition-colors font-medium flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Вернуться к тарифам eSIM</span>
          </button>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-700/50">
          <p className="text-sm text-gray-400">
            Нужна помощь? Свяжитесь с нашей службой поддержки.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CartErrorPage;
