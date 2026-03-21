'use client';

import { createContext, useContext } from 'react';

// Hardcoded Russian — no i18n, no translation files, no network calls
const staticContext = {
  locale: 'ru',
  t: (_key, fallback) => fallback || _key,
  translations: {},
  isLoading: false,
  changeLanguage: async () => {},
};

const I18nContext = createContext(staticContext);

export const useI18n = () => useContext(I18nContext);

export const I18nProvider = ({ children }) => (
  <I18nContext.Provider value={staticContext}>
    {children}
  </I18nContext.Provider>
);

export default I18nContext;
