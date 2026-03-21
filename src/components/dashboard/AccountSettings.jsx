import React from 'react';
import { Settings, Mail, Shield } from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';
import { useAuth } from '../../contexts/AuthContext';
import { getLanguageDirection, detectLanguageFromPath } from '../../utils/languageUtils';
import { usePathname, useRouter } from 'next/navigation';

const AccountSettings = ({ currentUser }) => {
  const { t, locale } = useI18n();
  const { userProfile } = useAuth();
  const router = useRouter();
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
    <section className="py-8 transition-colors" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'}`}>
            <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0" />
            <h2 className={`text-xl font-semibold text-gray-900 dark:text-white ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('dashboard.accountSettings', 'Настройки аккаунта')}
            </h2>
          </div>
        </div>
        <div className="p-6 space-y-8">
          {/* Personal Information */}
          <div>
            <h3 className={`text-sm font-medium text-gray-600 dark:text-gray-400 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('dashboard.personalInformation', 'Личная информация')}
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className={`block text-sm font-medium text-gray-600 dark:text-gray-300 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <Mail className={`w-4 h-4 inline ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {t('dashboard.emailAddress', 'Адрес электронной почты')}
                </label>
                <div className={`flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-gray-900 dark:text-white text-sm">{currentUser.email}</span>
                  <span className="text-xs text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
                    {t('dashboard.verified', 'Подтверждено')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Panel - only for admins */}
          {userProfile?.role === 'admin' && (
            <div>
              <h3 className={`text-sm font-medium text-gray-600 dark:text-gray-400 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                Администрирование
              </h3>
              <button
                onClick={() => router.push('/config/affiliates')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors text-sm font-medium"
              >
                <Shield className="w-4 h-4" />
                Панель администратора
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default AccountSettings;
