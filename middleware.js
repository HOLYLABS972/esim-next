import { NextResponse } from 'next/server';

export async function middleware(request) {
  const { pathname, searchParams } = request.nextUrl;

  // Skip middleware for API, static, config, auth routes
  const skipPaths = ['/config', '/api', '/auth', '/my-esims', '/data-usage', '/usage', '/login', '/dashboard'];
  const shouldSkip = skipPaths.some(p => pathname.startsWith(p)) || pathname.includes('/telegram-auth');

  // Strip /ru and /en prefixes — root serves everything
  const langMatch = pathname.match(/^\/(ru|en|he|ar|de|fr|es)(\/.*)?$/);
  if (langMatch) {
    const url = request.nextUrl.clone();
    url.pathname = langMatch[2] || '/';
    // Preserve all query params
    return NextResponse.redirect(url);
  }

  // Hardcode RUB + dark for Globalbanka — no API call needed
  if (!shouldSkip) {
    const hasCurrency = searchParams.has('currency');
    const hasTheme = searchParams.has('theme');
    if (!hasCurrency || !hasTheme) {
      const url = request.nextUrl.clone();
      if (!hasCurrency) url.searchParams.set('currency', 'RUB');
      if (!hasTheme) url.searchParams.set('theme', 'dark');
      return NextResponse.redirect(url);
    }
  }

  const response = NextResponse.next();
  response.headers.set('x-pathname', pathname);
  response.headers.set('x-language', 'ru');
  return response;
}

export const config = {
  matcher: [
    '/((?!_next|api|favicon.ico|manifest.json|robots.txt|sitemap.xml|.*\\.).*)',
  ],
};
