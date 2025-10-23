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
    const authUser = await getUserFromAuthHeader(req);
    if (!authUser || !authUser.id) return NextResponse.json({ ok: true, posts: [] });

    const cacheKey = `following:uid=${authUser.id}:limit=${limit}:before=${before || 'none'}`;
    const cached = getServerCache(cacheKey);
    if (cached) {
      return NextResponse.json({ ok: true, posts: cached });
    }

    // Get following ids
    const { data: profile, error: profErr } = await sb.from('users').select('following').eq('id', authUser.id).limit(1).maybeSingle();
    const followingIds: string[] = (profile && profile.following) || [];

    const allUserIds = [...followingIds, authUser.id];
    let query = sb.from('posts').select(`
      *,
      users!left(id, username, display_name, avatar_url),
      public_profiles!left(id, username, display_name, avatar_url)
    `).in('user_id', allUserIds).order('created_at', { ascending: false }).limit(limit * 2);

    if (before) query = query.lt('created_at', before);

    const { data: rows, error } = await query;
    if (error) return NextResponse.json({ error: error.message || error }, { status: 500 });

    // Filter and dedupe similar to server logic: include all own posts, public from followed
    const filtered = (rows || []).filter((row: any) => {
      if (row.user_id === authUser.id) return true;
      return row.public === true;
    });

    // Simple dedupe and limit preserving order
    const seen = new Set<string>();
    const deduped: any[] = [];
    for (const r of filtered) {
      if (!seen.has(r.id)) { seen.add(r.id); deduped.push(r); }
      if (deduped.length >= limit) break;
    }

  const postRows = deduped.map((r: any) => mapRowToHydratedPost(r));
  try { setServerCache(cacheKey, postRows, 10000); } catch (_) {}
  return NextResponse.json({ ok: true, posts: postRows });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
