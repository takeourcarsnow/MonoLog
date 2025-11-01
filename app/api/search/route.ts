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

    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Search posts
    let postsQuery = sb
      .from('posts')
      .select('*, users!left(id, username, display_name, avatar_url), public_profiles!left(id, username, display_name, avatar_url)')
      .eq('public', true)
      .or(`caption.ilike.%${q}%,weather_location.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    let { data: postsData, error: postsError } = await postsQuery;
    if (postsError && postsError.message?.includes('column') && postsError.message?.includes('weather_location')) {
      // Retry without weather_location if column doesn't exist
      postsQuery = sb
        .from('posts')
        .select('*, users!left(id, username, display_name, avatar_url), public_profiles!left(id, username, display_name, avatar_url)')
        .eq('public', true)
        .or(`caption.ilike.%${q}%`)
        .order('created_at', { ascending: false })
        .limit(limit);
      const retry = await postsQuery;
      postsData = retry.data;
      postsError = retry.error;
    }
    if (postsError) {
      return NextResponse.json({ error: postsError.message }, { status: 500 });
    }

    const posts = (postsData || []).map(mapRowToHydratedPost);

    // Count locations (posts with weather_location matching query)
    const locationsCount = (postsData || []).filter((post: any) => post.weather_location && post.weather_location.toLowerCase().includes(q.toLowerCase())).length;

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

    // Fetch member counts in a single batched query
    const communityIds = (communitiesData || []).map(c => c.id);
    let memberCounts: Record<string, number> = {};
    if (communityIds.length > 0) {
      const { data: membersData, error: membersError } = await sb
        .from('community_members')
        .select('community_id')
        .in('community_id', communityIds);
      if (!membersError && membersData) {
        // Count members per community
        for (const m of membersData) {
          memberCounts[m.community_id] = (memberCounts[m.community_id] || 0) + 1;
        }
      }
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
      memberCount: memberCounts[row.id] || 0,
    }));

    return NextResponse.json({
      ok: true,
      posts,
      users,
      communities,
      locations: locationsCount
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}