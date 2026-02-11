import React from 'react';
import { Globe } from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';
import { getLanguageDirection, detectLanguageFromPath } from '../../utils/languageUtils';
import { usePathname } from 'next/navigation';

const DashboardHeader = () => {
  const { t, locale } = useI18n();
  const pathname = usePathname();

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
    <div className="mb-8 flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={`flex items-center space-x-3 ${isRTL ? 'space-x-reverse' : ''}`}>
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <Globe className="w-6 h-6 text-white" />
        </div>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('dashboard.title', 'Dashboard')}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('dashboard.manageOrders', 'Управляйте заказами eSIM и настройками аккаунта')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
