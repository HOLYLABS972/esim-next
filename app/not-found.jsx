'use client';

import Link from 'next/link';
import { Home, ArrowLeft, Search, RefreshCw } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useI18n } from '../src/contexts/I18nContext';
import { detectLanguageFromPath } from '../src/utils/languageUtils';

export default function NotFound() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  
  // Get current language for localized URLs
  const getCurrentLanguage = () => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('roamjet-language');
      if (savedLanguage) return savedLanguage;
    }
    return detectLanguageFromPath(pathname);
  };

  const currentLanguage = getCurrentLanguage();

  // Generate localized URLs
  const getLocalizedUrl = (path) => {
    if (currentLanguage === 'en') {
      return path;
    }
    return `/${currentLanguage}${path}`;
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-4xl mx-auto text-center">
        {/* SVG Illustration */}
        <div className="mb-4 flex justify-center">
          <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl">
            <img 
              src="/images/logo_icon/404 Error-rafiki.svg" 
              alt="404 Error Illustration" 
              className="w-full h-auto"
            />
          </div>
        </div>

        {/* Error Content */}
        <div className="space-y-6">
          {/* Main Heading */}
          <div className="space-y-3">
            
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-gray-900 dark:text-white">
              {t('notFound.title', 'Oops! Page Not Found')}
            </h1>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            

            {/* Secondary Actions */}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                onClick={handleGoBack}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-400/20 text-blue-400 border-2 border-blue-400 rounded-full font-semibold hover:bg-blue-400/30 transition-all duration-200 shadow-md hover:shadow-lg w-full sm:w-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t('notFound.goBack', 'Go Back')}</span>
              </button>

             
            </div>
          </div>

          
          {/* Footer Message */}
          <div className="pt-8">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {t('notFound.needHelp', 'Need help?')} <Link href={getLocalizedUrl('/contact')} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">{t('notFound.contactSupport', 'Contact our support team')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
