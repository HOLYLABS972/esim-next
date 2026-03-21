import React, { useState } from 'react';
import { Globe, QrCode, Trash2 } from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';
import { getLanguageDirection, detectLanguageFromPath } from '../../utils/languageUtils';
import { usePathname } from 'next/navigation';
import { formatPrice } from '../../services/currencyService';
import toast from 'react-hot-toast';

// Helper function to render flag (use Airalo URL if available, fallback to emoji)
const renderFlag = (flagUrl, countryCode) => {
  // Use Airalo's flag URL if available
  if (flagUrl && flagUrl.startsWith('http')) {
    return (
      <img 
        src={flagUrl} 
        alt={countryCode || 'Country flag'} 
        className="w-6 h-6 rounded object-cover"
        onError={(e) => {
          // Fallback to emoji if image fails
          e.target.style.display = 'none';
          e.target.parentElement.innerHTML = getFlagEmoji(countryCode);
        }}
      />
    );
  }
  
  // Fallback to emoji generation
  return <span className="text-2xl">{getFlagEmoji(countryCode)}</span>;
};

// Fallback emoji function (only used if flag URL not available)
const getFlagEmoji = (countryCode) => {
  if (!countryCode) return '🌍';
  
  if (countryCode === 'GLOBAL') return '🌍';
  if (countryCode === 'REGIONAL') return '🌐';
  if (countryCode === 'EUROPE') return '🇪🇺';
  if (countryCode === 'ASIA') return '🌏';
  if (countryCode === 'AMERICAS') return '🌎';
  if (countryCode === 'AFRICA') return '🌍';
  
  if (countryCode.includes('-') || countryCode.length > 2 || countryCode.length !== 2) {
    return '🌍';
  }
  
  try {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
  } catch (error) {
    return '🌍';
  }
};

// Helper function to translate plan names to Russian
const translatePlanName = (planName) => {
  if (!planName) return planName;
  
  // Convert GB to ГБ and days to дней
  let translated = planName
    .replace(/GB/gi, 'ГБ')
    .replace(/gb/gi, 'ГБ')
    .replace(/gib/gi, 'ГБ')
    .replace(/SMS/gi, 'СМС')
    .replace(/Mins?/gi, 'Мин')
    .replace(/Min/gi, 'Мин')
    .replace(/Minutes?/gi, 'минут')
    .replace(/minute/gi, 'минута')
    .replace(/days?/gi, 'дней')
    .replace(/day/gi, 'день')
    .replace(/Unlimited/gi, 'Безлимитный')
    .replace(/unlimited/gi, 'Безлимитный');
  
  return translated;
};

// Helper function to format plan display name from plan ID or name
const formatPlanDisplay = (order) => {
  // First try to get planName from orderResult (most reliable)
  let planName = order.orderResult?.planName || order.planName;
  
  // If we have a valid planName (not a MongoDB ObjectId), use it
  if (planName && planName.trim() !== '' && !planName.includes('6924')) {
    return translatePlanName(planName);
  }
  
  // If planName is just an ID or missing, try to extract from planId
  if (order.planId && order.planId.trim() !== '' && !order.planId.includes('6924')) {
    // Try to extract data and days from plan ID like "hehe-plus-7days-1gb"
    const planId = order.planId.toLowerCase();
    
    // Extract GB/MB data
    let dataMatch = planId.match(/(\d+(?:\.\d+)?)(gb|mb)/i);
    let dataStr = '';
    if (dataMatch) {
      const amount = parseFloat(dataMatch[1]);
      const unit = dataMatch[2].toUpperCase();
      dataStr = unit === 'GB' ? `${amount} ГБ` : `${amount} МБ`;
    }
    
    // Extract days
    let daysMatch = planId.match(/(\d+)days?/i);
    let daysStr = '';
    if (daysMatch) {
      const days = parseInt(daysMatch[1]);
      daysStr = `${days} дней`;
    }
    
    // Extract SMS if present
    let smsMatch = planId.match(/(\d+)sms/i);
    let smsStr = '';
    if (smsMatch) {
      const sms = parseInt(smsMatch[1]);
      smsStr = `${sms} СМС`;
    }
    
    // Extract minutes if present
    let minsMatch = planId.match(/(\d+)(mins?|minutes?)/i);
    let minsStr = '';
    if (minsMatch) {
      const mins = parseInt(minsMatch[1]);
      minsStr = `${mins} Мин`;
    }
    
    // Combine the parts
    const parts = [dataStr, smsStr, minsStr, daysStr].filter(part => part !== '');
    if (parts.length > 0) {
      return parts.join(' - ');
    }
  }
  
  // Fallback to planName or unknown
  return translatePlanName(planName || 'Неизвестный план');
};

const RecentOrders = ({ orders, loading, onViewQRCode, onDeleteOrder }) => {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const [deletingOrderId, setDeletingOrderId] = useState(null);
  
  const handleDeleteOrder = async (order) => {
    if (!confirm(t('dashboard.confirmDeleteOrder', 'Вы уверены, что хотите удалить этот заказ? Это действие нельзя отменить.'))) {
      return;
    }
    
    try {
      setDeletingOrderId(order.orderId || order.id);
      
      const orderId = order.orderId || order.id;
      const response = await fetch('/api/orders/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId })
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete order');
      }
      
      toast.success(t('dashboard.orderDeleted', 'Заказ удален успешно'));
      
      // Call parent's delete handler to refresh the list
      if (onDeleteOrder) {
        onDeleteOrder(order);
      } else {
        // Fallback: reload the page
        window.location.reload();
      }
    } catch (error) {
      console.error('❌ Error deleting order:', error);
      toast.error(t('dashboard.failedToDeleteOrder', 'Не удалось удалить заказ: {{error}}', { error: error.message }));
    } finally {
      setDeletingOrderId(null);
    }
  };
  
  // Get current language for RTL detection
  const getCurrentLanguage = () => {
    if (locale) return locale;
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('roamjet-language');
      if (savedLanguage) return savedLanguage;
    }
    return detectLanguageFromPath(pathname);
  };

  const currentLanguage = getCurrentLanguage();
  const isRTL = getLanguageDirection(currentLanguage) === 'rtl';
  return (
    <section className="py-8 transition-colors" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className={`text-lg font-semibold text-gray-900 dark:text-white ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('dashboard.recentOrders', 'Недавние заказы')}
          </h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">{t('dashboard.noOrders', 'Заказов пока нет')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                order && (
                  <div
                    key={order.id || order.orderId || Math.random()}
                    className={`flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200 ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                        <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'}`}>
                          <div className="md:block hidden flex items-center justify-center w-6 h-6">
                            {renderFlag(order.flagUrl, order.countryCode)}
                          </div>
                          <div className="flex-1">
                            <p className={`font-medium text-gray-900 dark:text-white ${isRTL ? 'text-right' : 'text-left'}`}>
                              {formatPlanDisplay(order)}
                            </p>
                            <p className={`hidden md:block text-sm text-gray-600 dark:text-gray-300 ${isRTL ? 'text-right' : 'text-left'}`}>
                              {order.iccid || order.orderResult?.iccid || `#${order.orderId || order.id || t('dashboard.unknown', 'Неизвестно')}`}
                            </p>
                            {/* Mobile: Price after name */}
                            {/* CRITICAL: order.amount is already in RUB, don't convert again */}
                            <p className={`md:hidden text-sm text-green-400 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                              {formatPrice(order.amount || 0, 'RUB')}
                            </p>
                            {/* Mobile: Country after price */}
                            <p className={`md:hidden text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 ${isRTL ? 'text-right flex-row-reverse' : 'text-left'}`}>
                              {renderFlag(order.flagUrl, order.countryCode)}
                              <span>{order.countryName || order.countryCode || t('dashboard.unknownCountry', 'Неизвестная страна')}</span>
                            </p>
                            {/* Desktop: Country */}
                            <p className={`hidden md:block text-xs text-gray-500 dark:text-gray-400 ${isRTL ? 'text-right' : 'text-left'}`}>
                              {order.countryName || order.countryCode || t('dashboard.unknownCountry', 'Неизвестная страна')}
                            </p>
                          </div>
                        </div>
                        <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-4' : 'space-x-4'}`}>
                          <div className={`hidden md:block ${isRTL ? 'text-left' : 'text-right'}`}>
                            {/* CRITICAL: order.amount is already in RUB, don't convert again */}
                            <p className="font-medium text-gray-900 dark:text-white">
                              {formatPrice(order.amount || 0, 'RUB')}
                            </p>
                            <div className={`flex items-center ${isRTL ? 'justify-start space-x-reverse space-x-2' : 'justify-end space-x-2'}`}>
                              <div className={`w-2 h-2 rounded-full ${
                                order.status === 'active' ? 'bg-green-500' :
                                order.status === 'completed' ? 'bg-blue-500' :
                                order.status === 'paid' ? 'bg-green-500' :
                                order.status === 'pending' ? 'bg-yellow-500' :
                                order.status === 'processing' ? 'bg-orange-500' :
                                'bg-gray-500'
                              }`}></div>
                              <p className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                                {t(`dashboard.status.${order.status}`, order.status || t('dashboard.unknown', 'unknown'))}
                              </p>
                            </div>
                          </div>
                          {/* Show delete button for pending/processing orders, usage/QR buttons for active orders */}
                          {order.status === 'pending' || order.status === 'processing' || order.paymentStatus === 'pending' ? (
                            <button
                              onClick={() => handleDeleteOrder(order)}
                              disabled={deletingOrderId === (order.orderId || order.id)}
                              className={`flex items-center px-3 py-2 bg-red-400/20 text-red-400 rounded-lg hover:bg-red-400/30 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}
                            >
                              <Trash2 className="w-4 h-4" />
                              <span className="text-sm hidden md:inline">
                                {deletingOrderId === (order.orderId || order.id) 
                                  ? t('dashboard.deleting', 'Удаление...') 
                                  : t('dashboard.delete', 'Удалить')}
                              </span>
                            </button>
                          ) : (
                            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              {/* Usage button for orders with ICCID */}
                              {order.iccid && (
                                <a
                                  href={(() => {
                                    const baseUrl = `/usage/${order.iccid}`;
                                    const params = new URLSearchParams();
                                    
                                    // Extract plan data from metadata or order
                                    const metadata = order.metadata;
                                    if (metadata?.data_amount_mb) params.set('planDataMB', metadata.data_amount_mb);
                                    if (metadata?.validity_days) params.set('planValidityDays', metadata.validity_days);
                                    if (metadata?.is_unlimited) params.set('planUnlimited', metadata.is_unlimited ? '1' : '0');
                                    if (order.countryCode) params.set('country', order.countryCode);
                                    
                                    return baseUrl + (params.toString() ? `?${params.toString()}` : '');
                                  })()}
                                  className={`flex items-center px-3 py-2 bg-green-400/20 text-green-400 rounded-lg hover:bg-green-400/30 transition-colors duration-200 ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                                  </svg>
                                  <span className="text-sm hidden md:inline">{t('dashboard.viewUsage', 'Данные')}</span>
                                </a>
                              )}
                              
                              {/* QR Code button — hidden, use data-usage page instead */}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default RecentOrders;
