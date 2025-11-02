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

    const escapedQ = q.replace(/%/g, '\\%').replace(/_/g, '\\_');

    // Search posts
    let postsQuery = sb
      .from('posts')
      .select('*, users!left(id, username, display_name, avatar_url), public_profiles!left(id, username, display_name, avatar_url)')
      .eq('public', true)
      .or(`caption.ilike.%${escapedQ}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    let weatherPosts: any[] = [];
    try {
      const { data: weatherData } = await sb
        .from('posts')
        .select('*, users!left(id, username, display_name, avatar_url), public_profiles!left(id, username, display_name, avatar_url)')
        .eq('public', true)
        .filter('weather_location', 'ilike', `%${escapedQ}%`)
        .order('created_at', { ascending: false })
        .limit(limit);
      weatherPosts = weatherData || [];
    } catch (e) {
      // ignore if column doesn't exist
    }

    const { data: postsData, error: postsError } = await postsQuery;
    if (postsError) {
      return NextResponse.json({ error: postsError.message }, { status: 500 });
    }

    const allPosts = [...(postsData || []), ...weatherPosts];
    allPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const uniquePosts = allPosts.filter((post, index, arr) => arr.findIndex(p => p.id === post.id) === index);
    const posts = uniquePosts.slice(0, limit).map(mapRowToHydratedPost);

    // Count locations (posts with weather_location matching query)
    const locationsCount = uniquePosts.filter((post: any) => post.weather_location && post.weather_location.toLowerCase().includes(q.toLowerCase())).length;

    // Search users
    const { data: usernameUsers, error: usernameError } = await sb
      .from('public_profiles')
      .select('id, username, display_name, avatar_url, bio')
      .filter('username', 'ilike', `%${escapedQ}%`)
      .limit(limit);

    const { data: displayNameUsers, error: displayNameError } = await sb
      .from('public_profiles')
      .select('id, username, display_name, avatar_url, bio')
      .filter('display_name', 'ilike', `%${escapedQ}%`)
      .limit(limit);

    const { data: bioUsers, error: bioError } = await sb
      .from('public_profiles')
      .select('id, username, display_name, avatar_url, bio')
      .filter('bio', 'ilike', `%${escapedQ}%`)
      .limit(limit);

    if (usernameError || displayNameError || bioError) {
      return NextResponse.json({ error: usernameError?.message || displayNameError?.message || bioError?.message }, { status: 500 });
    }

    const allUsers = [...(usernameUsers || []), ...(displayNameUsers || []), ...(bioUsers || [])];
    const uniqueUsers = allUsers.filter((user, index, arr) => arr.findIndex(u => u.id === user.id) === index);
    const users = uniqueUsers.slice(0, limit).map((row: any) => ({
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      bio: row.bio,
    }));

    // Search communities
    const { data: nameCommunities, error: nameError } = await sb
      .from('communities')
      .select(`
        *,
        users!communities_creator_id_fkey(id, username, display_name, avatar_url)
      `)
      .filter('name', 'ilike', `%${escapedQ}%`)
      .limit(limit);

    const { data: descCommunities, error: descError } = await sb
      .from('communities')
      .select(`
        *,
        users!communities_creator_id_fkey(id, username, display_name, avatar_url)
      `)
      .filter('description', 'ilike', `%${escapedQ}%`)
      .limit(limit);

    if (nameError || descError) {
      return NextResponse.json({ error: nameError?.message || descError?.message }, { status: 500 });
    }

    const allCommunities = [...(nameCommunities || []), ...(descCommunities || [])];
    const uniqueCommunities = allCommunities.filter((community, index, arr) => arr.findIndex(c => c.id === c.id) === index);

    // Fetch member counts in a single batched query
    const communityIds = uniqueCommunities.map(c => c.id);
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

    const communities = uniqueCommunities.slice(0, limit).map((row: any) => ({
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