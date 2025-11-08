import { getServiceSupabase } from '@/lib/api/serverSupabase';
import { getUserFromAuthHeader } from '@/lib/api/serverVerifyAuth';
import { getServerCache, setServerCache } from '@/lib/serverCache';
import { withHandler } from '@/lib/api/withHandler';
import { postsQuerySchema } from '@/lib/api/schemas';
import { apiSuccess } from '@/lib/apiResponse';
import { getFollowingPosts } from '@/lib/api/queries';

export const GET = withHandler({ method: 'GET', querySchema: postsQuerySchema })(async (req, ctx) => {
  const { limit, before } = ctx?.query as any;

  const sb = getServiceSupabase();
  const authUser = await getUserFromAuthHeader(req);
  if (!authUser || !authUser.id) return apiSuccess({ ok: true, posts: [] });

  const cacheKey = `following:uid=${authUser.id}:limit=${limit}:before=${before || 'none'}`;
  const cached = getServerCache(cacheKey);
  if (cached) {
    return apiSuccess({ ok: true, posts: cached });
  }

  // Get following ids
  const { data: profile, error: profErr } = await sb.from('users').select('following').eq('id', authUser.id).limit(1).maybeSingle();
  const followingIds: string[] = (profile && profile.following) || [];

  const postRows = await getFollowingPosts(authUser.id, followingIds, { limit, before });
  try { setServerCache(cacheKey, postRows, 30000); } catch (_) {}
  return apiSuccess(
    { ok: true, posts: postRows },
    200,
    {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      },
    }
  );
});
