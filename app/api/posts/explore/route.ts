import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import { getUserFromAuthHeader } from '@/src/lib/api/serverVerifyAuth';
import { mapRowToHydratedPost } from '@/src/lib/api/utils';
import { getServerCache, setServerCache, clearServerCachePrefix } from '@/src/lib/serverCache';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get('limit') || '10') || 10;
    const before = url.searchParams.get('before') || undefined;

    const sb = getServiceSupabase();

    // Identify user if provided so we can exclude their posts and follows
    const authUser = await getUserFromAuthHeader(req);
    const cacheKey = `explore:limit=${limit}:before=${before || 'none'}:uid=${authUser?.id || 'anon'}`;
  const cached = getServerCache(cacheKey);
    if (cached) {
      // Return cached response quickly
      return NextResponse.json({ ok: true, posts: cached });
    }
    let q: any = sb.from('posts').select('*, users!left(id, username, display_name, avatar_url), public_profiles!left(id, username, display_name, avatar_url)').eq('public', true).order('created_at', { ascending: false }).limit(limit);

    if (authUser && authUser.id) {
      // fetch following ids
      const { data: profile } = await sb.from('users').select('following').eq('id', authUser.id).limit(1).maybeSingle();
      const followingIds: string[] = (profile && profile.following) || [];
      const excludeIds = [authUser.id, ...followingIds];
      if (excludeIds.length) q = q.not('user_id', 'in', `(${excludeIds.join(',')})`);
    }

    if (before) q = q.lt('created_at', before);

    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message || error }, { status: 500 });
    }

  const rows = (data || []).map((r: any) => mapRowToHydratedPost(r));
  // Cache the result for a short time to reduce repeated DB/egress hits
  try { setServerCache(cacheKey, rows, 10000); } catch (_) {}
  return NextResponse.json({ ok: true, posts: rows });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
