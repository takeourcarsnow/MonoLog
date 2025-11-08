import { getServerCache, setServerCache } from '@/lib/serverCache';
import { withHandler } from '@/lib/api/withHandler';
import { tagParamsSchema, postsQuerySchema } from '@/lib/api/schemas';
import { apiSuccess } from '@/lib/apiResponse';
import { getPostsByHashtag } from '@/lib/api/queries';
import { makeWeakETag } from '@/lib/api/utils';

export const GET = withHandler({ method: 'GET', paramsSchema: tagParamsSchema, querySchema: postsQuerySchema })(async (req, ctx) => {
  const { tag } = ctx?.params as any;
  const { limit, before } = ctx?.query as any;

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
      return new Response(null, { status: 304, headers: h });
    }
    return apiSuccess({ ok: true, posts: cached }, 200, { headers, cacheSeconds });
  }

  const rows = await getPostsByHashtag(tag, { limit, before });
  // Cache the result
  try { setServerCache(cacheKey, rows, 10000); } catch (_) {}
  const etag = makeWeakETag(rows);
  const headers: HeadersInit = { ETag: etag };
  const cacheSeconds = 20;
  return apiSuccess({ ok: true, posts: rows }, 200, { headers, cacheSeconds });
});