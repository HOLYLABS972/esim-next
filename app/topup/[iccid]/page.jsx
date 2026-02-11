'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Battery,
  CreditCard,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../../src/contexts/AuthContext';
import TopupPackageCard from '../../../src/components/TopupPackageCard';
import {
  fetchTopupPackages,
  getOrderInfo,
  createPendingTopupOrder,
  createTopupPayment,
} from '../../../src/services/topupService';
import toast from 'react-hot-toast';

// Helper function to get flag emoji from country code
const getFlagEmoji = (countryCode) => {
  if (!countryCode) return '🌍';
  
  // Handle global and regional plans
  if (countryCode === 'GLOBAL') return '🌍';
  if (countryCode === 'REGIONAL') return '🌐';
  if (countryCode === 'EUROPE') return '🇪🇺';
  if (countryCode === 'ASIA') return '🌏';
  if (countryCode === 'AMERICAS') return '🌎';
  if (countryCode === 'AFRICA') return '🌍';
  
  // Handle special cases like PT-MA, multi-region codes, etc.
  if (countryCode.includes('-') || countryCode.length > 2) {
    return '🌍';
  }
  
  // Handle regular country codes
  if (countryCode.length !== 2) return '🌍';
  
  try {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt());
    
    return String.fromCodePoint(...codePoints);
  } catch (error) {
    console.warn('Invalid country code: ' + countryCode, error);
    return '🌍';
  }
};

export default function TopupPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser } = useAuth();
  
  const iccid = params?.iccid;
  const country = searchParams?.get('country');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orderInfo, setOrderInfo] = useState(null);
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  // Load order info and packages
  const loadData = useCallback(async () => {
    try {
      setError(null);

      if (!iccid) {
        setError('ICCID не найден');
        return;
      }

      // Get order info
      console.log('📱 Loading order info for ICCID:', iccid);
      const info = await getOrderInfo(iccid);
      console.log('📋 Order info:', info);
      setOrderInfo(info);

      // Get country code from URL param or order info
      const effectiveCountry = country || info.countryCode || '';
      console.log('🌍 Effective country code:', effectiveCountry);

      if (!effectiveCountry && !info.originalPlanSlug) {
        setError('Код страны не найден. Невозможно загрузить пакеты пополнения.');
        return;
      }

      // Fetch packages using original plan slug (operator prefix) + country code
      console.log('📦 Fetching topup packages...');
      const pkgs = await fetchTopupPackages(effectiveCountry, info.originalPlanSlug);
      console.log('📦 Found packages:', pkgs.length);
      setPackages(pkgs);

      if (pkgs.length === 0) {
        setError('Для этой страны нет доступных пакетов пополнения.');
      }
    } catch (err) {
      console.error('❌ Error loading topup data:', err);
      setError('Не удалось загрузить пакеты пополнения. Пожалуйста, попробуйте ещё раз.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [iccid, country]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handlePurchase = async () => {
    if (!currentUser) {
      toast.error('Пожалуйста, войдите в систему для покупки');
      router.push('/auth');
      return;
    }

    if (!selectedPackage) {
      toast.error('Пожалуйста, выберите пакет пополнения');
      return;
    }

    if (!orderInfo?.iccid) {
      toast.error('ICCID не найден. Невозможно создать пополнение.');
      return;
    }

    setIsProcessing(true);

    try {
      // New topup invoice/order id for Robokassa + n8n
      const topupOrderId = String(Date.now());

      // Use original RUB price from DB when available (must match what user sees).
      const amountRUB =
        selectedPackage.price_rub && selectedPackage.price_rub > 0
          ? Math.round(selectedPackage.price_rub)
          : Math.round(selectedPackage.price * 95); // fallback conversion

      // Get country info
      const countryCode = orderInfo.countryCode || country || null;
      const countryName = orderInfo.countryName || null;
      const countryFlag = countryCode ? getFlagEmoji(countryCode) : '🌍';

      const selectedPackageId = selectedPackage.airaloSlug || selectedPackage.id;

      const orderData = {
        orderId: topupOrderId,
        iccid: orderInfo.iccid,
        packageId: selectedPackageId,
        packageName: selectedPackage.name,
        customerEmail: orderInfo.customerEmail || currentUser.email,
        amount: amountRUB,
        currency: 'RUB',
        countryCode: countryCode || undefined,
        countryName: countryName || undefined,
        countryFlag: countryFlag || undefined,
      };

      console.log('🔄 Creating pending topup order:', orderData);

      // Create a separate topup order record that already contains:
      // - ICCID (so n8n goes topup route)
      // - topup package slug (so Airalo accepts package_id)
      await createPendingTopupOrder(orderData);

      console.log('💳 Creating payment URL...');
      // Create payment URL
      const paymentUrl = await createTopupPayment(orderData);
      
      console.log('✅ Redirecting to payment...');
      
      // Store topup info for success page
      localStorage.setItem('pendingTopupOrder', JSON.stringify({
        orderId: topupOrderId,
        iccid: orderInfo.iccid,
        packageId: selectedPackageId,
        packageName: selectedPackage.name,
        amount: amountRUB,
        currency: 'RUB',
        customerEmail: orderData.customerEmail,
        countryCode: countryCode,
        countryName: countryName,
      }));

      // Redirect to payment URL
      window.location.href = paymentUrl;
    } catch (err) {
      console.error('❌ Payment error:', err);
      toast.error(err instanceof Error ? err.message : 'Не удалось запустить процесс оплаты');
      setIsProcessing(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 dark:text-blue-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Загрузка пакетов...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900/90 backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-gray-700/50 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <div className="flex items-center gap-3">
              <Battery className="w-6 h-6 text-green-500 dark:text-green-400" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Пополнение</h1>
                {orderInfo?.iccid && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                    {orderInfo.iccid.substring(0, 10)}...
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 dark:text-red-200">{error}</p>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center gap-2 mt-3 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 text-sm font-medium transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Попробовать снова
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Packages Grid */}
        {!error && packages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedPackage ? 'Выбранный пакет' : 'Доступные пакеты'}
              </h2>
              {selectedPackage && (
                <button
                  onClick={() => setSelectedPackage(null)}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium text-sm transition-colors"
                >
                  Изменить
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {packages
                .filter((pkg) => !selectedPackage || pkg.id === selectedPackage.id)
                .map((pkg) => (
                  <TopupPackageCard
                    key={pkg.id}
                    package={pkg}
                    isSelected={selectedPackage?.id === pkg.id}
                    showSlug={selectedPackage?.id === pkg.id} // Only show slug when selected for debugging
                    onSelect={() => setSelectedPackage(pkg)}
                  />
                ))}
            </div>
          </motion.div>
        )}

        {/* Purchase Section */}
        {selectedPackage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6"
          >
            <div className="max-w-md mx-auto">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 text-center">
                Завершить покупку
              </h3>
              
              {/* Summary */}
              <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">{selectedPackage.name}</h4>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <div>Данные: <span className="font-medium">{selectedPackage.data}</span></div>
                  <div>Срок действия: <span className="font-medium">{selectedPackage.validity}</span></div>
                  <div>ICCID: <span className="font-mono">{orderInfo?.iccid?.substring(0, 10)}...</span></div>
                </div>
              </div>

              {/* Purchase Button */}
              <button
                onClick={handlePurchase}
                disabled={isProcessing || !currentUser}
                className={`
                  w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200
                  ${
                    isProcessing || !currentUser
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                  }
                `}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Обработка...
                  </>
                ) : !currentUser ? (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Войти для покупки
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Купить - {selectedPackage.price_rub || Math.round(selectedPackage.price * 95)} ₽
                  </>
                )}
              </button>
              
              {!currentUser && (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-3">
                  Необходимо войти в систему для совершения покупки
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {!error && packages.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <Battery className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Пакеты не найдены
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto">
              Для данной eSIM нет доступных пакетов пополнения. Попробуйте позже или обратитесь в поддержку.
            </p>
            <div className="text-sm text-gray-500 dark:text-gray-500 space-y-1">
              {orderInfo?.countryCode && <div>Страна: {orderInfo.countryCode}</div>}
              {orderInfo?.iccid && <div className="font-mono">ICCID: {orderInfo.iccid.substring(0, 15)}...</div>}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}