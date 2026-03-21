import React from 'react';
import { Smartphone } from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';
import { formatPrice } from '../../services/currencyService';

// Helper function to format plan display name from plan ID or name
const formatPlanDisplay = (order) => {
  // First try to get planName from orderResult (most reliable)
  let planName = order.orderResult?.planName || order.planName;
  
  // If we have a valid planName (not a MongoDB ObjectId), use it
  if (planName && planName.trim() !== '' && !planName.includes('6924')) {
    return planName
      .replace(/GB/gi, 'ГБ')
      .replace(/gb/gi, 'ГБ')
      .replace(/SMS/gi, 'СМС')
      .replace(/Mins?/gi, 'Мин')
      .replace(/days?/gi, 'дней')
      .replace(/Unlimited/gi, 'Безлимитный');
  }
  
  // If planName is just an ID or missing, try to extract from planId
  if (order.planId && order.planId.trim() !== '' && !order.planId.includes('6924')) {
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
  return planName || 'Неизвестный план';
};

const QRCodeModal = ({ 
  show, 
  selectedOrder, 
  onClose 
}) => {
  const { t } = useI18n();
  // Force Russian locale for QR modal
  const locale = 'ru';

  if (!show || !selectedOrder) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="relative max-w-md w-full mx-4">
        <div className="absolute inset-px rounded-xl bg-gray-800/90 backdrop-blur-md"></div>
        <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
          <div className="px-8 pt-8 pb-8">
            <div className="text-center">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-medium text-gray-900 dark:text-white">{t('dashboard.qrCode', 'QR код eSIM')}</h3>
                <button
                  onClick={onClose}
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
          
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  {formatPlanDisplay(selectedOrder)}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">{t('dashboard.order', 'Заказ')} #{selectedOrder.orderId || selectedOrder.id || t('dashboard.unknown', 'Неизвестно')}</p>
                {/* CRITICAL: selectedOrder.amount is already in RUB, don't convert again */}
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {formatPrice(selectedOrder.amount || 0, 'RUB')}
                </p>
              </div>

              {/* Always Apple URL only — no QR or other options */}
              {selectedOrder.qrCode?.directAppleInstallationUrl ? (
                <div className="mb-6">
                  <a
                    href={selectedOrder.qrCode.directAppleInstallationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full px-6 py-4 bg-[#0071e3] text-white rounded-xl hover:bg-[#0077ed] transition-colors font-semibold flex items-center justify-center gap-3 text-lg shadow-lg"
                  >
                    <Smartphone className="w-6 h-6" />
                    {t('dashboard.openAppleInstallation', 'Открыть установку eSIM (Apple)')}
                  </a>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                    {t('dashboard.openAppleInstallationHint', 'Откроется в настройках сотовой связи')}
                  </p>
                </div>
              ) : (
                <div className="bg-gray-700/30 p-6 rounded-lg mb-6 text-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    {t('dashboard.noQrCodeAvailable', 'QR код недоступен')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
      </div>
    </div>
  );
};

export default QRCodeModal;
