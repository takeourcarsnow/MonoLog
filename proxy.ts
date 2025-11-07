import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { RESERVED_ROUTES } from '@/lib/types';

const userCache = new Map<string, { user: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
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
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Check cache first
  const cacheKey = request.cookies.get('sb-access-token')?.value || 'no-token';
  const now = Date.now();
  const cached = userCache.get(cacheKey);
  let user = null;
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    user = cached.user;
  } else {
    // Refresh session if expired - required for Server Components
    const { data: { user: freshUser } } = await supabase.auth.getUser();
    user = freshUser;
    userCache.set(cacheKey, { user, timestamp: now });
  }

  const pathname = request.nextUrl.pathname;
  const segments = pathname.split('/').filter(Boolean);
  
  // Only process single-segment paths (potential usernames)
  if (segments.length !== 1) {
    return response;
  }
  
  const segment = segments[0];
  
  // If it's a reserved route, let Next.js handle it normally
  if (RESERVED_ROUTES.includes(segment.toLowerCase())) {
    return response;
  }
  
  // If it looks like a static file, let it through
  if (segment.includes('.')) {
    return response;
  }
  
  // If user is not authenticated, redirect to profile (auth page)
  if (!user) {
    return NextResponse.redirect(new URL('/profile', request.url));
  }
  
  // Otherwise, it might be a username - let the [username] route handle it
  return response;
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
