import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { RESERVED_ROUTES } from './src/lib/types';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value, options)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired - required for Server Components
  await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const segments = pathname.split('/').filter(Boolean);
  
  // Only process single-segment paths (potential usernames)
  if (segments.length !== 1) {
    return supabaseResponse;
  }
  
  const segment = segments[0];
  
  // If it's a reserved route, let Next.js handle it normally
  if (RESERVED_ROUTES.includes(segment.toLowerCase())) {
    return supabaseResponse;
  }
  
  // If it looks like a static file, let it through
  if (segment.includes('.')) {
    return supabaseResponse;
  }
  
  // Otherwise, it might be a username - let the [username] route handle it
  return supabaseResponse;
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
