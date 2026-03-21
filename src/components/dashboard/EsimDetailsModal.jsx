import React from 'react';
import { useI18n } from '../../contexts/I18nContext';
import { formatPriceFromItem } from '../../services/currencyService';
import { useBrand } from '../../contexts/BrandContext';

const EsimDetailsModal = ({ esimDetails, onClose }) => {
  const { t, locale } = useI18n();
  const { brand } = useBrand();
  const displayCurrency = brand?.defaultCurrency || 'RUB';
  
  if (!esimDetails) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="relative max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="absolute inset-px rounded-xl bg-white"></div>
        <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
          <div className="px-8 pt-8 pb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-medium text-eerie-black">{t('dashboard.esimDetails', 'Детали eSIM')}</h3>
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
              {/* Basic eSIM Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">{t('dashboard.basicInformation', 'Основная информация')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="hidden md:block">
                    <span className="font-medium text-gray-600">{t('dashboard.iccid', 'ICCID')}:</span>
                    <p className="text-gray-900 font-mono">{esimDetails.iccid}</p>
                  </div>
                  <div className="hidden md:block">
                    <span className="font-medium text-gray-600">{t('dashboard.matchingId', 'Matching ID')}:</span>
                    <p className="text-gray-900">{esimDetails.matching_id}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">{t('dashboard.createdAt', 'Создано')}:</span>
                    <p className="text-gray-900">{esimDetails.created_at}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">{t('dashboard.recycled', 'Переработано')}:</span>
                    <p className="text-gray-900">{esimDetails.recycled ? t('dashboard.yes', 'Да') : t('dashboard.no', 'Нет')}</p>
                  </div>
                  {esimDetails.recycled_at && (
                    <div>
                      <span className="font-medium text-gray-600">{t('dashboard.recycledAt', 'Переработано в')}:</span>
                      <p className="text-gray-900">{esimDetails.recycled_at}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* QR Code Information */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">{t('dashboard.qrCodeInformation', 'Информация о QR коде')}</h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">{t('dashboard.qrCodeData', 'Данные QR кода')}:</span>
                    <p className="text-gray-900 font-mono break-all bg-white p-2 rounded border">
                      {esimDetails.qrcode}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">{t('dashboard.qrCodeUrl', 'URL QR кода')}:</span>
                    <p className="text-blue-600 break-all">
                      <a href={esimDetails.qrcode_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {esimDetails.qrcode_url}
                      </a>
                    </p>
                  </div>
                  {esimDetails.direct_apple_installation_url && (
                    <div>
                      <span className="font-medium text-gray-600">{t('dashboard.appleInstallationUrl', 'URL установки Apple')}:</span>
                      <p className="text-blue-600 break-all">
                        <a href={esimDetails.direct_apple_installation_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {esimDetails.direct_apple_installation_url}
                        </a>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Package Information */}
              {esimDetails.simable && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">{t('dashboard.packageInformation', 'Информация о пакете')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">{t('dashboard.package', 'Пакет')}:</span>
                      <p className="text-gray-900">{esimDetails.simable.package}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">{t('dashboard.data', 'Данные')}:</span>
                      <p className="text-gray-900">{esimDetails.simable.data}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">{t('dashboard.validity', 'Срок действия')}:</span>
                      <p className="text-gray-900">{esimDetails.simable.validity} дней</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">{t('dashboard.price', 'Цена')}:</span>
                      <p className="text-gray-900">
                        {formatPriceFromItem(esimDetails.simable, displayCurrency).formatted}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">{t('dashboard.status', 'Статус')}:</span>
                      <p className="text-gray-900">{esimDetails.simable.status?.name}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">{t('dashboard.esimType', 'Тип eSIM')}:</span>
                      <p className="text-gray-900">{esimDetails.simable.esim_type}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* User Information */}
              {esimDetails.simable?.user && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">{t('dashboard.userInformation', 'Информация о пользователе')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">{t('dashboard.name', 'Имя')}:</span>
                      <p className="text-gray-900">{esimDetails.simable.user.name}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">{t('dashboard.email', 'Email')}:</span>
                      <p className="text-gray-900">{esimDetails.simable.user.email}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">{t('dashboard.company', 'Компания')}:</span>
                      <p className="text-gray-900">{esimDetails.simable.user.company}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">{t('dashboard.createdAt', 'Создано')}:</span>
                      <p className="text-gray-900">{esimDetails.simable.user.created_at}</p>
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

export default EsimDetailsModal;
