import { getSupabaseClient } from "./client";

interface SearchOptions {
  minLength?: number; // minimum query length to execute a DB search
  limit?: number; // per-entity limit
}

function sanitizeQuery(q: string) {
  // Basic sanitization: trim and remove wildcard characters that could
  // lead to unexpected matches. We avoid complex escaping here because
  // Supabase client builds queries for us; keep this light-weight.
  return q.replace(/[%_]/g, ' ').trim();
}

export async function search(query: string, options: SearchOptions = {}) {
  const sb = getSupabaseClient();
  const minLength = options.minLength ?? 2;
  const limit = options.limit ?? 20;

  const q = (query || '').toString().trim();
  if (!q || q.length < minLength) {
    return { posts: [], users: [], communities: [] };
  }

  const safeQuery = sanitizeQuery(q);

  // Search posts
  const { data: postsData, error: postsError } = await sb
    .from('posts')
    .select(`
      *,
      users!left(id, username, display_name, avatar_url),
      public_profiles!left(id, username, display_name, avatar_url)
    `)
    .eq('public', true)
    .or(`caption.ilike.%${safeQuery}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (postsError) throw postsError;

  // Map posts to hydrated format
  const posts = (postsData || []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    imageUrls: row.image_urls,
    imageUrl: row.image_url,
    thumbnailUrls: row.thumbnail_urls,
    thumbnailUrl: row.thumbnail_url,
    alt: row.alt,
    caption: row.caption || row.content || "",
    hashtags: row.hashtags,
    spotifyLink: row.spotify_link,
    createdAt: row.created_at,
    public: row.public,
    camera: row.camera,
    lens: row.lens,
    filmType: row.film_type,
    user: row.users || row.public_profiles || { id: '', username: '', displayName: '', avatarUrl: '' },
    commentsCount: 0, // TODO: fetch comments count if needed
  }));

  // Search users
  const { data: usersData, error: usersError } = await sb
    .from('public_profiles')
    .select('id, username, display_name, avatar_url, bio')
    .or(`username.ilike.%${safeQuery}%,display_name.ilike.%${safeQuery}%,bio.ilike.%${safeQuery}%`)
    .limit(limit);

  if (usersError) throw usersError;

  const users = (usersData || []).map((row: any) => ({
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    joinedAt: row.joined_at || null,
  }));

  // Search communities
  const { data: communitiesData, error: communitiesError } = await sb
    .from('communities')
    .select(`
      *,
      users!communities_creator_id_fkey(id, username, display_name, avatar_url)
    `)
    .or(`name.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%`)
    .limit(limit);

  if (communitiesError) throw communitiesError;

  // Fetch member counts
  const communityIds = (communitiesData || []).map(c => c.id);
  let memberCounts: Record<string, number> = {};
  if (communityIds.length > 0) {
    const { data: membersData, error: membersError } = await sb
      .from('community_members')
      .select('community_id')
      .in('community_id', communityIds);
    if (!membersError && membersData) {
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

  return { posts, users, communities };
}