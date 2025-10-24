import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import { getUserFromAuthHeader } from '@/src/lib/api/serverVerifyAuth';
import { mapRowToHydratedPost } from '@/src/lib/api/utils';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get('q')?.trim();
    const limit = Number(url.searchParams.get('limit') || '20') || 20;

    if (!q || q.length < 2) {
      return NextResponse.json({ ok: true, posts: [], users: [], communities: [] });
    }

    const sb = getServiceSupabase();
    const authUser = await getUserFromAuthHeader(req);

    // Search posts
    let postsQuery = sb
      .from('posts')
      .select('*, users!left(id, username, display_name, avatar_url), public_profiles!left(id, username, display_name, avatar_url)')
      .eq('public', true)
      .or(`caption.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    const { data: postsData, error: postsError } = await postsQuery;
    if (postsError) {
      return NextResponse.json({ error: postsError.message }, { status: 500 });
    }

    const posts = (postsData || []).map(mapRowToHydratedPost);

    // Search users
    const { data: usersData, error: usersError } = await sb
      .from('public_profiles')
      .select('id, username, display_name, avatar_url, bio')
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%,bio.ilike.%${q}%`)
      .limit(limit);

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    const users = (usersData || []).map((row: any) => ({
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      bio: row.bio,
    }));

    // Search communities
    const { data: communitiesData, error: communitiesError } = await sb
      .from('communities')
      .select(`
        *,
        users!communities_creator_id_fkey(id, username, display_name, avatar_url)
      `)
      .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
      .limit(limit);

    if (communitiesError) {
      return NextResponse.json({ error: communitiesError.message }, { status: 500 });
    }

    const communities = (communitiesData || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      creatorId: row.creator_id,
      createdAt: row.created_at,
      imageUrl: row.image_url,
      creator: row.users || { id: '', username: '', displayName: '', avatarUrl: '' },
      memberCount: 0, // TODO: fetch member count
    }));

    return NextResponse.json({
      ok: true,
      posts,
      users,
      communities
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}