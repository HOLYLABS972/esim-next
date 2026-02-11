'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { I18nProvider } from '../contexts/I18nContext';
import RTLWrapper from './RTLWrapper';

const LanguageWrapper = ({ children }) => {
  const pathname = usePathname();
  
  // Pages that should have I18n context
  const translatedPages = [
    '/', 
    // New language-code routes
    '/he', '/ar', '/ru', '/de', '/fr', '/es',
    // Old language routes (for backward compatibility)
    '/hebrew', '/arabic', '/russian', '/german', '/french', '/spanish', 
    // Other translated pages
    '/contact', '/login', '/dashboard', '/esim-plans', '/privacy-policy', '/terms-of-service', '/cookie-policy',
    '/forgot-password', '/reset-password', '/faq', '/device-compatibility', '/verify-email'
  ];

  // Check for special pages that should always have i18n context
  const isSpecialPage = pathname === '/not-found' || pathname === '/404';
  
  // Check for dynamic routes that need I18n context
  const isDynamicPage = pathname.startsWith('/share-package/') || 
                       pathname.startsWith('/checkout') ||
                       pathname.startsWith('/payment-success') ||
                       pathname.startsWith('/payment-failed');
  
  // Check for blog pages (both old and new language routes)
  const isBlogPage = pathname.startsWith('/blog') || 
                    // New language-code blog routes
                    pathname.startsWith('/he/blog') || 
                    pathname.startsWith('/ar/blog') || 
                    pathname.startsWith('/ru/blog') || 
                    pathname.startsWith('/de/blog') || 
                    pathname.startsWith('/fr/blog') || 
                    pathname.startsWith('/es/blog') ||
                    // Old language blog routes (for backward compatibility)
                    pathname.startsWith('/hebrew/blog') || 
                    pathname.startsWith('/arabic/blog') || 
                    pathname.startsWith('/russian/blog') || 
                    pathname.startsWith('/german/blog') || 
                    pathname.startsWith('/french/blog') || 
                    pathname.startsWith('/spanish/blog');

  // Check for language-specific routes (e.g., /he/contact, /ru/login, etc.)
  const isLanguageSpecificPage = pathname.startsWith('/he/') || 
                                pathname.startsWith('/ar/') || 
                                pathname.startsWith('/ru/') || 
                                pathname.startsWith('/de/') || 
                                pathname.startsWith('/fr/') || 
                                pathname.startsWith('/es/') ||
                                // Old language routes (for backward compatibility)
                                pathname.startsWith('/hebrew/') || 
                                pathname.startsWith('/arabic/') || 
                                pathname.startsWith('/russian/') || 
                                pathname.startsWith('/german/') || 
                                pathname.startsWith('/french/') || 
                                pathname.startsWith('/spanish/');
  
  if (!translatedPages.includes(pathname) && !isBlogPage && !isLanguageSpecificPage && !isSpecialPage && !isDynamicPage) {
    return children;
  }

  return (
    <Suspense fallback={children}>
      <I18nProvider>
        <RTLWrapper>
          {children}
        </RTLWrapper>
      </I18nProvider>
    </Suspense>
  );
};

export default LanguageWrapper;
