import React from 'react';
import { useI18n } from '../../contexts/I18nContext';

const EsimUsageModal = ({ esimUsage, onClose }) => {
  const { t } = useI18n();
  if (!esimUsage) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="relative max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="absolute inset-px rounded-xl bg-white"></div>
        <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
          <div className="px-8 pt-8 pb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-medium text-eerie-black">{t('dashboard.esimUsageStatus', 'Использование и статус eSIM')}</h3>
              <button
                onClick={onClose}
                className="text-cool-black hover:text-eerie-black transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
        
            <div className="space-y-6">
              {/* Status Overview */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">{t('dashboard.statusOverview', 'Обзор статуса')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">{t('dashboard.status', 'Статус')}:</span>
                    <p className={`text-gray-900 font-semibold ${
                      esimUsage.status === 'ACTIVE' ? 'text-green-600' :
                      esimUsage.status === 'EXPIRED' ? 'text-red-600' :
                      esimUsage.status === 'FINISHED' ? 'text-orange-600' :
                      'text-gray-600'
                    }`}>
                      {esimUsage.status}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">{t('dashboard.unlimited', 'Безлимитный')}:</span>
                    <p className="text-gray-900">{esimUsage.is_unlimited ? t('dashboard.yes', 'Да') : t('dashboard.no', 'Нет')}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">{t('dashboard.expiresAt', 'Истекает')}:</span>
                    <p className="text-gray-900">{esimUsage.expired_at}</p>
                  </div>
                </div>
              </div>

              {/* Data Usage */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">{t('dashboard.dataUsage', 'Использование данных')}</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">{t('dashboard.totalData', 'Всего данных')}:</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {esimUsage.is_unlimited ? t('dashboard.unlimitedData', 'Безлимитные данные') : `${esimUsage.total} МБ`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">{t('dashboard.remainingData', 'Осталось данных')}:</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {esimUsage.is_unlimited ? t('dashboard.unlimitedData', 'Безлимитные данные') : `${esimUsage.remaining} МБ`}
                    </span>
                  </div>
                  {!esimUsage.is_unlimited && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${((esimUsage.total - esimUsage.remaining) / esimUsage.total) * 100}%` 
                        }}
                      ></div>
                    </div>
                  )}
                  {!esimUsage.is_unlimited && (
                    <div className="text-xs text-gray-500 text-center">
                      {Math.round(((esimUsage.total - esimUsage.remaining) / esimUsage.total) * 100)}% {t('dashboard.usedPercent', 'использовано')}
                    </div>
                  )}
                </div>
              </div>

              {/* Voice Usage */}
              {esimUsage.total_voice > 0 && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">{t('dashboard.voiceUsage', 'Использование голоса')}</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">{t('dashboard.totalMinutes', 'Всего минут')}:</span>
                      <span className="text-sm font-semibold text-gray-900">{esimUsage.total_voice} минут</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">{t('dashboard.remainingMinutes', 'Осталось минут')}:</span>
                      <span className="text-sm font-semibold text-gray-900">{esimUsage.remaining_voice} минут</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${((esimUsage.total_voice - esimUsage.remaining_voice) / esimUsage.total_voice) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 text-center">
                      {Math.round(((esimUsage.total_voice - esimUsage.remaining_voice) / esimUsage.total_voice) * 100)}% {t('dashboard.usedPercent', 'использовано')}
                    </div>
                  </div>
                </div>
              )}

              {/* Text Usage */}
              {esimUsage.total_text > 0 && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">{t('dashboard.textUsage', 'Использование текста')}</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">{t('dashboard.totalText', 'Всего СМС')}:</span>
                      <span className="text-sm font-semibold text-gray-900">{esimUsage.total_text} СМС</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">{t('dashboard.remainingText', 'Осталось СМС')}:</span>
                      <span className="text-sm font-semibold text-gray-900">{esimUsage.remaining_text} СМС</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${((esimUsage.total_text - esimUsage.remaining_text) / esimUsage.total_text) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 text-center">
                      {Math.round(((esimUsage.total_text - esimUsage.remaining_text) / esimUsage.total_text) * 100)}% {t('dashboard.usedPercent', 'использовано')}
                    </div>
                  </div>
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

export default EsimUsageModal;
