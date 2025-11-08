import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/api/serverSupabase';
import { apiError, apiSuccess } from '@/lib/apiResponse';
import { withHandler } from '@/lib/api/withHandler';
import { commentsQuerySchema } from '@/lib/api/schemas';
import { getClientIp, makeWeakETag } from '@/lib/api/utils';
import { getCommentsForPost } from '@/lib/api/queries';

export const GET = withHandler({ method: 'GET', querySchema: commentsQuerySchema })(async (req, ctx) => {
  const { postId } = ctx?.query as any;
  // light per-IP caching header only; comments are public
  const ip = getClientIp(req);

  const result = await getCommentsForPost(postId);

  // Prepare caching headers and ETag to help clients avoid re-downloading unchanged lists briefly
  const etag = makeWeakETag(result);
  const clientEtag = req.headers.get('if-none-match');
  const headers: HeadersInit = { ETag: etag };
  const cacheSeconds = 30; // allow short-lived caching
  if (clientEtag && clientEtag === etag) {
    const h = new Headers(headers);
    h.set('Cache-Control', `public, max-age=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 2}`);
    return new Response(null, { status: 304, headers: h });
  }
  return apiSuccess(result, 200, { headers, cacheSeconds });
});