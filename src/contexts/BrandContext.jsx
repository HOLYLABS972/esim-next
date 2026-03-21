'use client';

import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

const BrandContext = createContext(null);

// Hardcoded brand configuration for GlobalBanka - no multidomain support
const defaultBrand = {
  brandId: null,
  slug: 'globalbanka',
  name: 'GlobalBanka',
  logoUrl: null,
  theme: { mode: 'dark', primaryColor: '#2563eb', fontHeading: 'Inter', fontBody: 'Inter' },
  defaultLanguage: 'en',
  supportedLanguages: ['en', 'ru', 'es', 'fr', 'de', 'ar', 'he'],
  paymentMethods: ['robokassa'],
  loginMethods: null,
  defaultCurrency: 'RUB',
  discountPercentage: 0,
};

const SUPPORTED_CURRENCIES = ['USD', 'RUB', 'ILS', 'EUR', 'AUD'];


function applyThemeToDocument(theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.add('dark');
  root.setAttribute('data-theme', 'dark');
  if (theme?.primaryColor) {
    root.style.setProperty('--color-primary', theme.primaryColor);
  } else {
    root.style.removeProperty('--color-primary');
  }
}

function mergeUrlOverrides(brand, urlOverrides) {
  if (!urlOverrides || (!urlOverrides.language && !urlOverrides.currency)) {
    return brand;
  }
  const next = { ...brand };
  if (urlOverrides.language) next.defaultLanguage = urlOverrides.language;
  if (urlOverrides.currency && SUPPORTED_CURRENCIES.includes(urlOverrides.currency.toUpperCase())) {
    next.defaultCurrency = urlOverrides.currency.toUpperCase();
  }
  return next;
}

export function BrandProvider({ children }) {
  const searchParams = useSearchParams();
  const [brand, setBrand] = useState(defaultBrand);
  const [loaded, setLoaded] = useState(false);

  // Derive URL overrides from current search params so currency/language always apply when in URL
  const urlOverrides = useMemo(() => {
    const language = searchParams.get('language') || null;
    const currency = searchParams.get('currency') || null;
    if (!language && !currency) return null;
    return { language: language || undefined, currency: currency || undefined };
  }, [searchParams]);

  const effectiveBrand = mergeUrlOverrides(brand, urlOverrides);

  useEffect(() => {
    applyThemeToDocument(effectiveBrand.theme);
  }, [effectiveBrand.theme?.mode, effectiveBrand.theme?.primaryColor]);

  useEffect(() => {
    let cancelled = false;
    const fetchBrand = () => {
      fetch('/api/public/brand-config', { cache: 'no-store', credentials: 'same-origin' })
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return;
          const config = {
            brandId: data.brandId ?? null,
            slug: data.slug ?? defaultBrand.slug,
            name: data.name ?? defaultBrand.name,
            logoUrl: data.logoUrl ?? null,
            theme: data.theme ?? defaultBrand.theme,
            defaultLanguage: data.defaultLanguage ?? defaultBrand.defaultLanguage,
            supportedLanguages: data.supportedLanguages ?? defaultBrand.supportedLanguages,
            paymentMethods: data.paymentMethods ?? defaultBrand.paymentMethods,
            loginMethods: Array.isArray(data.loginMethods) ? data.loginMethods : null,
            defaultCurrency: data.defaultCurrency ?? defaultBrand.defaultCurrency,
            discountPercentage: Number(data.discountPercentage) || 0,
          };
          setBrand(config);
          setLoaded(true);
        })
        .catch(() => {
          if (!cancelled) {
            setLoaded(true);
            applyThemeToDocument(defaultBrand.theme);
          }
        });
    };
    fetchBrand();
    return () => { cancelled = true; };
  }, []);

  // Refetch when tab becomes visible or when config is saved (discount, theme, etc.)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const refetch = () => {
      fetch('/api/public/brand-config', { cache: 'no-store', credentials: 'same-origin' })
        .then((res) => res.json())
        .then((data) => {
          const config = {
            brandId: data.brandId ?? null,
            slug: data.slug ?? defaultBrand.slug,
            name: data.name ?? defaultBrand.name,
            logoUrl: data.logoUrl ?? null,
            theme: data.theme ?? defaultBrand.theme,
            defaultLanguage: data.defaultLanguage ?? defaultBrand.defaultLanguage,
            supportedLanguages: data.supportedLanguages ?? defaultBrand.supportedLanguages,
            paymentMethods: data.paymentMethods ?? defaultBrand.paymentMethods,
            loginMethods: Array.isArray(data.loginMethods) ? data.loginMethods : null,
            defaultCurrency: data.defaultCurrency ?? defaultBrand.defaultCurrency,
            discountPercentage: Number(data.discountPercentage) || 0,
          };
          setBrand(config);
        })
        .catch(() => {});
    };
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      refetch();
    };
    const onConfigSaved = () => refetch();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('site-config-saved', onConfigSaved);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('site-config-saved', onConfigSaved);
    };
  }, []);

  return (
    <BrandContext.Provider value={{ brand: effectiveBrand, loaded }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const ctx = useContext(BrandContext);
  return ctx?.brand ?? defaultBrand;
}

export function useBrandLoaded() {
  const ctx = useContext(BrandContext);
  return ctx?.loaded ?? false;
}
