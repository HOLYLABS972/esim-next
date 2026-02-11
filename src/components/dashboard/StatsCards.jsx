import React from 'react';
import { Globe, ShoppingBag, ArrowRight } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useI18n } from '../../contexts/I18nContext';
import { getLanguageDirection, detectLanguageFromPath } from '../../utils/languageUtils';

const StatsCards = ({ orders }) => {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Go to Plans Call-to-Action Card */}
        <div
          className="cursor-pointer group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow p-6"
          onClick={() => router.push('/')}
        >
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div>
              <p className={`text-lg font-medium text-gray-600 dark:text-gray-300 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('dashboard.browseEsimPlans', 'Просмотреть планы eSIM')}
              </p>
              <p className={`text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2 flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                {isRTL ? (
                  <>
                    {t('dashboard.viewPlans', 'Посмотреть планы')}
                    <ArrowRight className="w-6 h-6 text-blue-600 dark:text-blue-400 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-2 group-hover:translate-x-1 transition-transform" />
                    {t('dashboard.viewPlans', 'Посмотреть планы')}
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Total Orders Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6">
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div>
              <p className={`text-lg font-medium text-gray-600 dark:text-gray-300 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('dashboard.totalOrders', 'Всего заказов')}
              </p>
              <p className={`text-2xl font-bold text-gray-900 dark:text-white mt-2 flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                {isRTL ? (
                  <>
                    {orders.length}
                    <Globe className="w-6 h-6 text-blue-600 dark:text-blue-400 ml-2" />
                  </>
                ) : (
                  <>
                    <Globe className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-2" />
                    {orders.length}
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatsCards;
