import { NextResponse } from 'next/server';

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Strip /ru and /en prefixes — root serves everything
  const langMatch = pathname.match(/^\/(ru|en|he|ar|de|fr|es)(\/.*)?$/);
  if (langMatch) {
    const url = request.nextUrl.clone();
    url.pathname = langMatch[2] || '/';
    // Preserve all query params
    return NextResponse.redirect(url);
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
