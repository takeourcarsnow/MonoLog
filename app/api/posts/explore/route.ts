import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import { getUserFromAuthHeader } from '@/src/lib/api/serverVerifyAuth';
import { mapRowToHydratedPost, makeWeakETag } from '@/src/lib/api/utils';
import { getServerCache, setServerCache, clearServerCachePrefix } from '@/src/lib/serverCache';
import { apiError, apiSuccess } from '@/lib/apiResponse';
import { withHandler } from '@/src/lib/api/withHandler';
import { z } from 'zod';

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  before: z.string().optional(),
});

export const GET = withHandler({ method: 'GET', querySchema })(async (req, ctx) => {
  const { limit, before } = ctx?.query as any;
  const sb = getServiceSupabase();

  // Identify user if provided so we can exclude their posts and follows
  const authUser = await getUserFromAuthHeader(req);
  const cacheKey = `explore:limit=${limit}:before=${before || 'none'}:uid=${authUser?.id || 'anon'}`;
  const cached = getServerCache(cacheKey);
  if (cached) {
    // With cached rows, still support ETag for client revalidation
    const etag = makeWeakETag(cached);
    const inm = req.headers.get('if-none-match');
    const headers: HeadersInit = { ETag: etag };
    const cacheSeconds = 30;
    if (inm && inm === etag) {
      const h = new Headers(headers);
      h.set('Cache-Control', `public, max-age=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 2}`);
      return new NextResponse(null as any, { status: 304, headers: h });
    }
    return apiSuccess({ ok: true, posts: cached }, 200, { headers, cacheSeconds });
  }

  let q: any = sb.from('posts').select('*, users!left(id, username, display_name, avatar_url), public_profiles!left(id, username, display_name, avatar_url)').eq('public', true).order('created_at', { ascending: false }).limit(limit);

  if (authUser && authUser.id) {
    const { data: profile } = await sb.from('users').select('following').eq('id', authUser.id).limit(1).maybeSingle();
    const followingIds: string[] = (profile && profile.following) || [];
    const excludeIds = [authUser.id, ...followingIds];
    if (excludeIds.length) q = q.not('user_id', 'in', `(${excludeIds.join(',')})`);
  }

  if (before) q = q.lt('created_at', before);

  const { data, error } = await q;
  if (error) {
    return apiError(error.message || String(error), 500);
  }

  const rows = (data || []).map((r: any) => mapRowToHydratedPost(r));
  // Cache the result for a longer time to reduce repeated DB/egress hits
  try { setServerCache(cacheKey, rows, 30000); } catch (_) {}

  const etag = makeWeakETag(rows);
  const headers: HeadersInit = { ETag: etag };
  const cacheSeconds = 30;
  return apiSuccess({ ok: true, posts: rows }, 200, { headers, cacheSeconds });
});
