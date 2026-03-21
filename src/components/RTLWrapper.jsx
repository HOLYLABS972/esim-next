'use client';

import { useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { getLanguageDirection } from '../utils/languageUtils';

const RTLWrapper = ({ children }) => {
  const { locale } = useI18n();
  const direction = getLanguageDirection(locale);
  const isRTL = direction === 'rtl';

  // Set document-level dir and lang for Hebrew and Arabic RTL support
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dir = direction;
    document.documentElement.lang = locale || 'en';
  }, [direction, locale]);

  return (
    <div dir={direction} lang={locale || 'en'} className={isRTL ? 'rtl' : ''} suppressHydrationWarning>
      {children}
    </div>
  );
};

export default RTLWrapper;
