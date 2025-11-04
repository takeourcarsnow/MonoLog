import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import { mapRowToHydratedPost, makeWeakETag } from '@/src/lib/api/utils';
import { getServerCache, setServerCache } from '@/src/lib/serverCache';
import { apiError, apiSuccess } from '@/lib/apiResponse';

export async function GET(req: Request, context: any) {
  // Next's route handler context may provide `params` as a plain
  // object or as a Promise depending on Next version/runtime. Await
  // if necessary to be compatible with both.
  const params = context?.params && typeof context.params.then === 'function'
    ? await context.params
    : context?.params;
  try {
    const tag = params?.tag?.toLowerCase();
    if (!tag || tag.trim() === '') {
      return apiError('Valid tag required', 400);
    }

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get('limit') || '10') || 10, 50); // cap at 50
    const before = url.searchParams.get('before') || undefined;

    const sb = getServiceSupabase();

    const cacheKey = `hashtag:${tag}:limit=${limit}:before=${before || 'none'}`;
    const cached = getServerCache(cacheKey);
    if (cached) {
      const etag = makeWeakETag(cached);
      const inm = req.headers.get('if-none-match');
      const headers: HeadersInit = { ETag: etag };
      const cacheSeconds = 20;
      if (inm && inm === etag) {
        const h = new Headers(headers);
        h.set('Cache-Control', `public, max-age=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 2}`);
        return new NextResponse(null as any, { status: 304, headers: h });
      }
      return apiSuccess({ ok: true, posts: cached }, 200, { headers, cacheSeconds });
    }

    let q: any = sb.from('posts').select('*, users!left(id, username, display_name, avatar_url), public_profiles!left(id, username, display_name, avatar_url)').eq('public', true).contains('hashtags', [tag]).order('created_at', { ascending: false }).limit(limit);

    if (before) q = q.lt('created_at', before);

    const { data, error } = await q;
    if (error) {
      return apiError(error.message || String(error), 500);
    }

    const rows = (data || []).map((r: any) => mapRowToHydratedPost(r));
    // Cache the result
    try { setServerCache(cacheKey, rows, 10000); } catch (_) {}
    const etag = makeWeakETag(rows);
    const headers: HeadersInit = { ETag: etag };
    const cacheSeconds = 20;
    return apiSuccess({ ok: true, posts: rows }, 200, { headers, cacheSeconds });
  } catch (e: any) {
    return apiError(e?.message || String(e), 500);
  }
}