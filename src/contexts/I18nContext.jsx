'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const I18nContext = createContext();

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    // Return a fallback context instead of throwing an error
    return {
      locale: 'en',
      t: (key, fallback, variables) => {
        let result = fallback || key;
        // Handle interpolation even in fallback
        if (typeof result === 'string' && variables && typeof variables === 'object') {
          Object.keys(variables).forEach(varKey => {
            const placeholder = `{{${varKey}}}`;
            result = result.replace(new RegExp(placeholder, 'g'), variables[varKey]);
          });
        }
        return result;
      },
      translations: {},
      isLoading: false,
      changeLanguage: async () => {}, // Add fallback changeLanguage function
    };
  }
  return context;
};

const SUPPORTED_LANGUAGE_CODES = ['en', 'ru', 'he', 'es', 'fr', 'de', 'ar'];

function getLocaleFromUrl() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const l = params.get('language');
  return l && SUPPORTED_LANGUAGE_CODES.includes(l) ? l : null;
}

function getLocaleFromPathname(pathname) {
  if (!pathname || typeof pathname !== 'string') return null;
  for (const code of SUPPORTED_LANGUAGE_CODES) {
    if (pathname === `/${code}` || pathname.startsWith(`/${code}/`)) return code;
  }
  return null;
}

export const I18nProvider = ({ children }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlLang = searchParams.get('language');
  const pathLang = pathname ? getLocaleFromPathname(pathname) : null;
  const [locale, setLocale] = useState(() =>
    (urlLang && SUPPORTED_LANGUAGE_CODES.includes(urlLang) ? urlLang : null) ||
    pathLang ||
    getLocaleFromUrl() ||
    'en'
  );
  const [translations, setTranslations] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Sync locale from URL ?language= whenever search params change (e.g. footer language switcher)
  const urlLanguage = searchParams.get('language');
  useEffect(() => {
    if (urlLanguage && SUPPORTED_LANGUAGE_CODES.includes(urlLanguage) && urlLanguage !== locale) {
      setLocale(urlLanguage);
      if (typeof window !== 'undefined') {
        localStorage.setItem('roamjet-language', urlLanguage);
      }
    }
  }, [urlLanguage]);

  // Initialize locale on mount (URL param wins, then localStorage, domain, pathname, fallback)
  useEffect(() => {
    const initializeLocale = async () => {
      const supportedLanguageCodes = SUPPORTED_LANGUAGE_CODES;

      // 0) URL param ?language= – wins over everything
      const urlLanguage = typeof window !== 'undefined' ? getLocaleFromUrl() : (searchParams.get('language') && SUPPORTED_LANGUAGE_CODES.includes(searchParams.get('language')) ? searchParams.get('language') : null);
      if (urlLanguage) {
        setLocale(urlLanguage);
        if (typeof window !== 'undefined') localStorage.setItem('roamjet-language', urlLanguage);
        setIsLoading(false);
        setIsInitialized(true);
        return;
      }

      // 1) Saved language (localStorage, then cookie)
      let savedLanguage = typeof window !== 'undefined' ? localStorage.getItem('roamjet-language') : null;
      if (!savedLanguage && typeof window !== 'undefined' && window.getLanguageFromCookie) {
        savedLanguage = window.getLanguageFromCookie();
        if (savedLanguage) localStorage.setItem('roamjet-language', savedLanguage);
      }
      if (savedLanguage && supportedLanguageCodes.includes(savedLanguage)) {
        setLocale(savedLanguage);
        setIsLoading(false);
        setIsInitialized(true);
        return;
      }

      // 2) Per-domain default language from admin
      let domainLanguage = null;
      try {
        const res = await fetch('/api/public/domain-language', { cache: 'no-store', credentials: 'same-origin' });
        const data = await res.json();
        if (data?.defaultLanguage && supportedLanguageCodes.includes(data.defaultLanguage)) {
          domainLanguage = data.defaultLanguage;
        }
      } catch (_) {}
      if (domainLanguage) {
        setLocale(domainLanguage);
        setIsLoading(false);
        setIsInitialized(true);
        return;
      }

      // 3) Pathname language prefix
      if (pathname.startsWith('/he/') || pathname === '/he') { setLocale('he'); setIsLoading(false); setIsInitialized(true); return; }
      if (pathname.startsWith('/ar/') || pathname === '/ar') { setLocale('ar'); setIsLoading(false); setIsInitialized(true); return; }
      if (pathname.startsWith('/ru/') || pathname === '/ru') { setLocale('ru'); setIsLoading(false); setIsInitialized(true); return; }
      if (pathname.startsWith('/de/') || pathname === '/de') { setLocale('de'); setIsLoading(false); setIsInitialized(true); return; }
      if (pathname.startsWith('/fr/') || pathname === '/fr') { setLocale('fr'); setIsLoading(false); setIsInitialized(true); return; }
      if (pathname.startsWith('/es/') || pathname === '/es') { setLocale('es'); setIsLoading(false); setIsInitialized(true); return; }
      if (pathname.startsWith('/en/') || pathname === '/en') { setLocale('en'); setIsLoading(false); setIsInitialized(true); return; }

      // 4) Fallback
      setLocale('en');
      setIsLoading(false);
      setIsInitialized(true);
    };

    if (!isInitialized) {
      initializeLocale();
    }
  }, [pathname, isInitialized, searchParams]);

  // Load translation JSON for current locale from /locales/{locale}/common.json
  useEffect(() => {
    if (!locale) return;
    let cancelled = false;
    fetch(`/locales/${locale}/common.json`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => {
        if (!cancelled && data && typeof data === 'object') setTranslations(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [locale]);

  // Sync locale from pathname only when URL has no ?language= param (URL param wins)
  useEffect(() => {
    if (!isInitialized) return;
    const urlLang = searchParams.get('language');
    if (urlLang && SUPPORTED_LANGUAGE_CODES.includes(urlLang)) return; // URL language wins, skip path
    const supportedLanguageCodes = ['en', 'ru', 'he', 'es', 'fr', 'de', 'ar'];
    const langFromPath = supportedLanguageCodes.find((code) => pathname === `/${code}` || pathname.startsWith(`/${code}/`));
    if (langFromPath && locale !== langFromPath) {
      setLocale(langFromPath);
    }
  }, [pathname, isInitialized, locale, searchParams]);

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
    
    // Handle interpolation with variables like {{name}}, {{number}}, etc.
    if (typeof result === 'string' && variables && typeof variables === 'object') {
      Object.keys(variables).forEach(varKey => {
        const placeholder = `{{${varKey}}}`;
        result = result.replace(new RegExp(placeholder, 'g'), variables[varKey]);
      });
    }
    
    return result;
  };

  const changeLanguage = async (newLocale) => {
    console.log('I18nContext: changeLanguage called with', newLocale);
    
    // Save to localStorage for persistence
    localStorage.setItem('roamjet-language', newLocale);
    console.log('I18nContext: Saved language to localStorage:', newLocale);
    
    // Also save to cookies as backup
    if (typeof window !== 'undefined' && window.saveLanguageToCookie) {
      window.saveLanguageToCookie(newLocale);
    }
    
    // Update locale state
    setLocale(newLocale);
    
    // Translations are stored in database with _ru suffix columns
    // No need to load JSON - components use database fields directly
    setTranslations({});
    console.log('I18nContext: Using database translations for locale', newLocale);
  };

  const value = {
    locale,
    t,
    translations,
    isLoading,
    changeLanguage,
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};

