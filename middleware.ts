import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Reserved route names that should not be treated as usernames
const RESERVED_ROUTES = [
  'about', 'api', 'calendar', 'explore', 'favorites',
  'feed', 'post', 'profile', 'upload', 'admin',
  'settings', 'help', 'terms', 'privacy', 'login',
  'register', 'signup', 'signin', 'logout', 'auth',
  '_next', '_vercel', 'favicon.ico', 'robots.txt', 'sitemap.xml'
];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const segments = pathname.split('/').filter(Boolean);
  
  // Only process single-segment paths (potential usernames)
  if (segments.length !== 1) {
    return NextResponse.next();
  }
  
  const segment = segments[0];
  
  // If it's a reserved route, let Next.js handle it normally
  if (RESERVED_ROUTES.includes(segment.toLowerCase())) {
    return NextResponse.next();
  }
  
  // If it looks like a static file, let it through
  if (segment.includes('.')) {
    return NextResponse.next();
  }
  
  // Otherwise, it might be a username - let the [username] route handle it
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};