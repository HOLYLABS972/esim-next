'use client';

import React, { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';

const DeviceCompatibility = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useI18n();

  const brands = {
    all: { name: t('deviceCompatibility.allBrands', 'All brands'), emoji: '🌐' },
    apple: { name: 'Apple iPhone', emoji: '🍎' },
    samsung: { name: 'Samsung Galaxy', emoji: '📱' },
    google: { name: 'Google Pixel', emoji: '🔵' },
    motorola: { name: 'Motorola', emoji: '📲' },
    xiaomi: { name: 'Xiaomi', emoji: '⚡' },
    oppo: { name: 'Oppo', emoji: '🟢' },
    oneplus: { name: 'OnePlus', emoji: '🔴' },
    huawei: { name: 'Huawei', emoji: '🟠' },
    sony: { name: 'Sony', emoji: '🎮' },
    honor: { name: 'Honor', emoji: '💫' },
    fairphone: { name: 'Fairphone', emoji: '♻️' },
    nothing: { name: 'Nothing', emoji: '⚪' }
  };

  const devices = {
    apple: [
      'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15',
      'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14',
      'iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13', 'iPhone 13 mini',
      'iPhone 12 Pro Max', 'iPhone 12 Pro', 'iPhone 12', 'iPhone 12 mini',
      'iPhone SE (2020)', 'iPhone SE (2022)',
      'iPhone 11 Pro Max', 'iPhone 11 Pro', 'iPhone 11',
      'iPhone XS Max', 'iPhone XS', 'iPhone XR'
    ],
    samsung: [
      'Galaxy S24 Ultra', 'Galaxy S24+', 'Galaxy S24',
      'Galaxy S23 Ultra', 'Galaxy S23+', 'Galaxy S23', 'Galaxy S23 FE',
      'Galaxy S22 Ultra', 'Galaxy S22+', 'Galaxy S22',
      'Galaxy S21 Ultra 5G', 'Galaxy S21+ 5G', 'Galaxy S21 5G', 'Galaxy S21 FE 5G',
      'Galaxy S20 Ultra', 'Galaxy S20+', 'Galaxy S20', 'Galaxy S20 FE',
      'Galaxy Z Fold 5', 'Galaxy Z Fold 4', 'Galaxy Z Fold 3', 'Galaxy Z Fold 2',
      'Galaxy Z Flip 5', 'Galaxy Z Flip 4', 'Galaxy Z Flip 3', 'Galaxy Z Flip',
      'Galaxy Note 20 Ultra', 'Galaxy Note 20'
    ],
    google: [
      'Pixel 8 Pro', 'Pixel 8',
      'Pixel 7 Pro', 'Pixel 7', 'Pixel 7a',
      'Pixel 6 Pro', 'Pixel 6', 'Pixel 6a',
      'Pixel 5', 'Pixel 5a',
      'Pixel 4 XL', 'Pixel 4', 'Pixel 4a',
      'Pixel 3 XL', 'Pixel 3', 'Pixel 3a XL', 'Pixel 3a'
    ],
    motorola: [
      'Razr 5G', 'Razr 40 Ultra', 'Razr 40',
      'Edge 40 Pro', 'Edge 40',
      'Edge 30 Ultra', 'Edge 30 Pro', 'Edge 30',
      'Edge+', 'Edge',
      'G52J 5G', 'G53J 5G'
    ],
    xiaomi: [
      'Xiaomi 14 Ultra', 'Xiaomi 14 Pro', 'Xiaomi 14',
      'Xiaomi 13 Ultra', 'Xiaomi 13 Pro', 'Xiaomi 13', 'Xiaomi 13 Lite',
      'Xiaomi 12T Pro', 'Xiaomi 12T',
      'Xiaomi 12 Pro', 'Xiaomi 12', 'Xiaomi 12 Lite',
      '13T Pro', '13T',
      '12 Lite',
      '11T Pro', '11T'
    ],
    oppo: [
      'Find X5 Pro', 'Find X5',
      'Find X3 Pro', 'Find X3',
      'Find N2 Flip',
      'Reno 9A',
      'Reno 10 Pro+', 'Reno 10 Pro', 'Reno 10',
      'Reno 9 Pro+', 'Reno 9 Pro',
      'Reno 8 Pro',
      'Reno 6 Pro 5G',
      'Reno 5A',
      'A55s 5G'
    ],
    oneplus: [
      'OnePlus 12', 'OnePlus 11',
      'OnePlus 10 Pro', 'OnePlus 10T',
      'OnePlus 9 Pro', 'OnePlus 9',
      'OnePlus 8T', 'OnePlus 8 Pro', 'OnePlus 8'
    ],
    huawei: [
      'P40 Pro', 'P40',
      'Mate 40 Pro',
      'P50 Pro',
      'Pura 70 Ultra', 'Pura 70 Pro', 'Pura 70'
    ],
    sony: [
      'Xperia 1 V', 'Xperia 1 IV',
      'Xperia 5 V', 'Xperia 5 IV',
      'Xperia 10 V', 'Xperia 10 IV', 'Xperia 10 III Lite',
      'Xperia 1 III', 'Xperia 5 III'
    ],
    honor: [
      'Magic 6 Pro', 'Magic 5 Pro', 'Magic 4 Pro',
      '90 5G',
      'X9b', 'X8b'
    ],
    fairphone: [
      'Fairphone 5', 'Fairphone 4'
    ],
    nothing: [
      'Nothing Phone (2a)', 'Nothing Phone (2)', 'Nothing Phone (1)'
    ]
  };

  const allDevices = Object.values(devices).flat();

  const filteredDevices = allDevices.filter(device =>
    device.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          {t('deviceCompatibility.title', 'eSIM-compatible phones')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          {t('deviceCompatibility.description', 'Find your phone model and check if it supports eSIM technology')}
        </p>
      </div>

      <div className="max-w-2xl mx-auto mb-8">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('deviceCompatibility.searchPlaceholder', 'Find phone model')}
            className="w-full pl-4 pr-14 py-4 bg-gray-100 dark:bg-gray-800/90 backdrop-blur-md border-2 border-gray-200 dark:border-gray-700 rounded-full focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-100 dark:bg-blue-400/20 backdrop-blur-md hover:bg-blue-200 dark:hover:bg-blue-400/30 border-2 border-blue-200 dark:border-blue-400/50 hover:border-blue-500 dark:hover:border-blue-400 p-3 rounded-full transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-400/50"
            aria-label="Search"
          >
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {searchQuery && (
        <div className="max-w-4xl mx-auto mb-12">
          {filteredDevices.length > 0 ? (
            <div className="bg-gray-100 dark:bg-gray-800/90 backdrop-blur-md rounded-lg border border-gray-200 dark:border-gray-700/50 p-6">
              <h3 className="text-gray-900 dark:text-white font-semibold mb-4">
                {t('deviceCompatibility.devicesFound', 'Devices found: {{count}}', { count: filteredDevices.length })}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredDevices.map((device, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 bg-white dark:bg-gray-700/30 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border border-gray-200 dark:border-transparent"
                  >
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <span className="text-gray-900 dark:text-white text-sm">{device}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-gray-100 dark:bg-gray-800/90 backdrop-blur-md rounded-lg border border-gray-200 dark:border-gray-700/50 p-6 text-center">
              <p className="text-gray-600 dark:text-gray-400">{t('deviceCompatibility.noDeviceFound', 'Device not found. Try a different search.')}</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 grid md:grid-cols-2 gap-6">
        <div className="bg-gray-100 dark:bg-gray-800/90 backdrop-blur-md rounded-lg border border-gray-200 dark:border-gray-700/50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🍎</span>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('deviceCompatibility.forIphone', 'For iPhone')}</h3>
          </div>
          <ol className="space-y-2 text-gray-600 dark:text-gray-300 text-sm">
            <li>1. {t('deviceCompatibility.iphoneStep1', 'Open Settings')}</li>
            <li>2. {t('deviceCompatibility.iphoneStep2', 'Tap Cellular or Mobile Data')}</li>
            <li>3. {t('deviceCompatibility.iphoneStep3', 'If you see "Add cellular plan" or "Add eSIM", your device supports eSIM')}</li>
            <li>4. {t('deviceCompatibility.iphoneStep4', 'You can also dial *#06# – if you see an EID number, eSIM is supported')}</li>
          </ol>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800/90 backdrop-blur-md rounded-lg border border-gray-200 dark:border-gray-700/50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🤖</span>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('deviceCompatibility.forAndroid', 'For Android')}</h3>
          </div>
          <ol className="space-y-2 text-gray-600 dark:text-gray-300 text-sm">
            <li>1. {t('deviceCompatibility.androidStep1', 'Open Settings')}</li>
            <li>2. {t('deviceCompatibility.androidStep2', 'Go to Network & Internet or Connections')}</li>
            <li>3. {t('deviceCompatibility.androidStep3', 'Tap Mobile network or SIM manager')}</li>
            <li>4. {t('deviceCompatibility.androidStep4', 'If you see "Add operator" or "Add mobile plan", your device supports eSIM')}</li>
            <li>5. {t('deviceCompatibility.androidStep5', 'You can also dial *#06# to check for EID number')}</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default DeviceCompatibility;
