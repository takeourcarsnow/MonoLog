import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import { mapProfileToUser } from '@/src/lib/api/utils';
import { apiError, apiSuccess } from '@/lib/apiResponse';

function looksLikeUuid(s: string) {
  return /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(s);
}

export async function GET(req: Request, { params }: { params: { username: string } }) {
  try {
    const identifier = params.username;
    if (!identifier) {
      return apiError('Identifier required', 400);
    }

    const sb = getServiceSupabase();

    if (looksLikeUuid(identifier)) {
      // Treat as user ID
      const res = await sb.from('users').select('*').eq('id', identifier).limit(1).maybeSingle();
      if (res.error || !res.data) {
        return apiSuccess({ user: null });
      }
      const response = apiSuccess({ user: mapProfileToUser(res.data) });
      response.headers.set('Cache-Control', 'public, max-age=300'); // 5 minutes
      return response;
    } else {
      // Treat as username
      // Try exact match on username
      let res = await sb.from('users').select('*').eq('username', identifier).limit(1).maybeSingle();
      if (res.data) {
        const response = apiSuccess({ user: mapProfileToUser(res.data) });
        response.headers.set('Cache-Control', 'public, max-age=300');
        return response;
      }

      // Fallback to legacy user_name column
      res = await sb.from('users').select('*').eq('user_name', identifier).limit(1).maybeSingle();
      if (res.data) {
        const response = apiSuccess({ user: mapProfileToUser(res.data) });
        response.headers.set('Cache-Control', 'public, max-age=300');
        return response;
      }

      // Final attempt: case-insensitive match
      res = await sb.from('users').select('*').ilike('username', identifier).limit(1).maybeSingle();
      if (res.data) {
        const response = apiSuccess({ user: mapProfileToUser(res.data) });
        response.headers.set('Cache-Control', 'public, max-age=300');
        return response;
      }

      return apiSuccess({ user: null });
    }
  } catch (e: any) {
    console.error('GET /api/users/[username]: error', e);
    return apiError(e?.message || String(e), 500);
  }
}