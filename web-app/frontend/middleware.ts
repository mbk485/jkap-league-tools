import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Production historically only had /draft (live board). Nested /draft/order and /draft/results
 * 404 if an older build is cached or nested static output is missing. Rewrites map those URLs
 * onto /draft?published=* so the same page handles published views (see app/draft/page.tsx).
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname === '/draft/order') {
    const url = request.nextUrl.clone();
    url.pathname = '/draft';
    url.searchParams.set('published', 'order');
    return NextResponse.rewrite(url);
  }

  if (pathname === '/draft/results') {
    const url = request.nextUrl.clone();
    url.pathname = '/draft';
    url.searchParams.set('published', 'results');
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/draft/order', '/draft/results'],
};
