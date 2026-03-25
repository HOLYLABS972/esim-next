'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const I18nContext = createContext();

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    return {
      locale: 'ru',
      t: (key, fallback) => fallback || key,
      translations: {},
      isLoading: false,
      changeLanguage: async () => {},
    };
  }
  return context;
};

export const I18nProvider = ({ children }) => {
  const [locale] = useState('ru');
  const [translations, setTranslations] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Load Russian translations
  useEffect(() => {
    let cancelled = false;
    fetch('/locales/ru/common.json', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => {
        if (!cancelled && data && typeof data === 'object') {
          setTranslations(data);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const t = (key, fallback = '', variables = {}) => {
    const keys = key.split('.');
    let value = translations;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return fallback || key;
      }
    }
    let result = typeof value === 'string' ? value : fallback || key;
    if (typeof result === 'string' && variables && typeof variables === 'object') {
      Object.keys(variables).forEach(varKey => {
        const placeholder = `{{${varKey}}}`;
        result = result.replace(new RegExp(placeholder, 'g'), variables[varKey]);
      });
    }
    return result;
  };

  const changeLanguage = async () => {};

  return (
    <I18nContext.Provider value={{ locale, t, translations, isLoading, changeLanguage }}>
      {children}
    </I18nContext.Provider>
  );
};
