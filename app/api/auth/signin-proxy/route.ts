import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/api/serverSupabase';
import { authRateLimiter } from '@/lib/rateLimiter';
import { withHandler } from '@/lib/api/withHandler';
import { signinSchema } from '@/lib/api/schemas';
import { apiError, apiSuccess } from '@/lib/apiResponse';

export const POST = withHandler({ method: 'POST', bodySchema: signinSchema })(async (req, ctx) => {
  const { identifier, password } = ctx?.body as any;

    // identify client IP (best-effort). If behind a proxy, ensure X-Forwarded-For
    const forwarded = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
    const ip = forwarded.split(',')[0].trim() || 'unknown';

    // Check per-IP and per-identifier blocking
    const ipLimit = authRateLimiter.checkLimit(ip);
    if (!ipLimit.allowed) return apiError('Too many attempts from this IP. Try later.', 429);
    const idLimit = authRateLimiter.checkLimit(identifier);
    if (!idLimit.allowed) return apiError('Too many attempts for this identifier. Try later.', 429);

    const sb = getServiceSupabase();

    // Resolve identifier to email. If identifier contains '@', treat as email.
    let email: string | null = null;
    if (identifier.includes('@')) {
      email = identifier;
    } else {
      // try to find profile id then fetch auth user email
      const tryFindProfile = async () => {
        // Try exact match first, then case-insensitive
        const queries = [
          sb.from('users').select('id').eq('username', identifier).limit(1).maybeSingle(),
          sb.from('users').select('id').eq('user_name', identifier).limit(1).maybeSingle(),
          sb.from('users').select('id').ilike('username', identifier).limit(1).maybeSingle()
        ];
        
        for (const query of queries) {
          const res: any = await query;
          if (res?.data?.id) return res.data.id;
        }
        return null;
      };

      const profileId = await tryFindProfile();
      if (profileId) {
        try {
          // @ts-ignore
          const adminRes: any = await sb.auth.admin.getUserById(profileId);
          const authUser = adminRes?.data?.user ?? adminRes?.user ?? null;
          if (authUser && authUser.email) email = authUser.email;
        } catch (e) {
          // ignore and continue to fallback
        }
      }

      if (!email) {
        // fallback: older schemas may have stored email on the profile row
        try {
          const { data: profileWithEmail } = await sb.from('users').select('email').or(`username.eq.${identifier},user_name.eq.${identifier}`).limit(1).maybeSingle();
          if (profileWithEmail && profileWithEmail.email) email = profileWithEmail.email;
        } catch (e) {
          // ignore
        }
      }
    }

    if (!email) {
      // Register failure and return not found
      authRateLimiter.recordFailure(ip);
      authRateLimiter.recordFailure(identifier);
      return apiError('User not found', 404);
    }

    // Perform sign-in using the service-role client. This will return a session
    // object containing access_token and refresh_token which we will return to
    // the client. The client will set the session locally.
    const res = await sb.auth.signInWithPassword({ email, password });
    const { data, error } = res as any;
    if (error) {
      // register failures for rate limiting
      authRateLimiter.recordFailure(ip);
      authRateLimiter.recordFailure(identifier);
      return apiError(error.message || error, 401);
    }

    // Success: clear any failure records for this ip/identifier
    authRateLimiter.recordSuccess(ip);
    authRateLimiter.recordSuccess(identifier);

    return apiSuccess({ data });
  });
