import { NextResponse } from 'next/server';
import { getUserFromAuthHeader } from '@/lib/api/serverVerifyAuth';
import { makeWeakETag } from '@/lib/api/utils';
import { getServerCache, setServerCache } from '@/lib/serverCache';
import { apiSuccess } from '@/lib/apiResponse';
import { withHandler } from '@/lib/api/withHandler';
import { z } from 'zod';
import { getExplorePosts, getFollowingIds } from '@/lib/api/queries';

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  before: z.string().optional(),
});

export const GET = withHandler({ method: 'GET', querySchema })(async (req, ctx) => {
  const { limit, before } = ctx?.query as any;

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

  const followingIds = authUser ? await getFollowingIds(authUser.id) : [];
  const posts = await getExplorePosts(authUser?.id, followingIds, { limit, before });

  // Cache the result for a longer time to reduce repeated DB/egress hits
  try { setServerCache(cacheKey, posts, 30000); } catch (_) {}

  const etag = makeWeakETag(posts);
  const headers: HeadersInit = { ETag: etag };
  const cacheSeconds = 30;
  return apiSuccess({ ok: true, posts }, 200, { headers, cacheSeconds });
});
