import { NextResponse } from 'next/server';

const supportedLanguageCodes = ['en', 'es', 'fr', 'de', 'ar', 'he', 'ru'];

function normalizeTheme(theme) {
  if (!theme) return 'light';
  const t = String(theme).toLowerCase().trim();
  if (t === 'white' || t === 'light') return 'light';
  if (t === 'dark') return 'dark';
  return 'light';
}

export async function middleware(request) {
  const { pathname, searchParams } = request.nextUrl;
  const fullHost = request.headers.get('host') || '';
  const hostname = fullHost.split(':')[0].trim().toLowerCase().replace(/^www\./, '');

  const skipParams = pathname.startsWith('/config') || pathname.startsWith('/api') || pathname.startsWith('/auth') || pathname.startsWith('/my-esims') || pathname.startsWith('/data-usage') || pathname.startsWith('/usage');

  // Path language: /ru, /he, etc. – used to skip adding ?language= when path already indicates it
  const pathLanguage = pathname.startsWith('/he') ? 'he' :
                       pathname.startsWith('/ar') ? 'ar' :
                       pathname.startsWith('/ru') ? 'ru' :
                       pathname.startsWith('/de') ? 'de' :
                       pathname.startsWith('/fr') ? 'fr' :
                       pathname.startsWith('/es') ? 'es' : null;

  // Strip redundant ?language= when path already indicates it (e.g. /ru?language=ru -> /ru)
  if (pathLanguage && searchParams.has('language')) {
    const url = request.nextUrl.clone();
    url.searchParams.delete('language');
    return NextResponse.redirect(url);
  }

  // Domain-based params from DB: add ?currency=&theme= when missing (?language= omitted when path has /ru, /he, etc.)
  if (!skipParams) {
    const hasLanguage = searchParams.has('language') || !!pathLanguage;
    const hasCurrency = searchParams.has('currency');
    const hasTheme = searchParams.has('theme');
    if (!hasLanguage || !hasCurrency || !hasTheme) {
      try {
        const origin = request.nextUrl.origin;
        const res = await fetch(`${origin}/api/public/domain-params`, {
          headers: { 'x-forwarded-host': fullHost, host: fullHost },
          cache: 'no-store',
        });
        const data = res.ok ? await res.json() : {};
        const language = data.language || 'en';
        const currency = (data.currency || 'USD').toUpperCase();
        const theme = normalizeTheme(data.theme);

        const url = request.nextUrl.clone();
        if (!hasLanguage) url.searchParams.set('language', language);
        if (!hasCurrency) url.searchParams.set('currency', currency);
        if (!hasTheme) url.searchParams.set('theme', theme);
        return NextResponse.redirect(url);
      } catch (_) {
        // On fetch error, continue without redirect
      }
    }
  }

  // Redirect /en/* to /* (English is default, no prefix)
  if (pathname.startsWith('/en')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/en/, '') || '/';
    return NextResponse.redirect(url);
  }

  // Redirect root to language path when domain default is not English (from DB)
  if (!pathLanguage && (pathname === '/' || pathname === '')) {
    try {
      const origin = request.nextUrl.origin;
      const res = await fetch(`${origin}/api/public/domain-params`, {
        headers: { 'x-forwarded-host': fullHost, host: fullHost },
        cache: 'no-store',
      });
      const data = res.ok ? await res.json() : {};
      const domainLanguage = data.language || 'en';
      if (domainLanguage !== 'en' && supportedLanguageCodes.includes(domainLanguage)) {
        const url = request.nextUrl.clone();
        url.pathname = pathname === '/' || pathname === '' ? `/${domainLanguage}` : `/${domainLanguage}${pathname}`;
        return NextResponse.redirect(url);
      }
    } catch (_) {}
  }

  const response = NextResponse.next();
  response.headers.set('x-pathname', pathname);
  const language = pathLanguage || 'en';
  response.headers.set('x-language', language);
  response.headers.set('x-domain', hostname);
  return response;
}

export const config = {
  matcher: [
    '/((?!_next|api|favicon.ico|manifest.json|robots.txt|sitemap.xml|.*\\.).*)',
  ],
};
