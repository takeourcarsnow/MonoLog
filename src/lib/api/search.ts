import { getSupabaseClient } from "./client";

export async function search(query: string) {
  const sb = getSupabaseClient();

  // Search posts
  const { data: postsData, error: postsError } = await sb
    .from('posts')
    .select(`
      *,
      users!left(id, username, display_name, avatar_url),
      public_profiles!left(id, username, display_name, avatar_url)
    `)
    .eq('public', true)
    .or(`caption.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(20);

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
    // The posts table may store the text in `caption` or `content` depending
    // on migration/history. Prefer `caption` (used in queries) and fall back
    // to `content` for older rows to ensure we surface the real text.
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
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%,bio.ilike.%${query}%`)
    .limit(20);

  if (usersError) throw usersError;

  const users = (usersData || []).map((row: any) => ({
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    // joined_at is stored on the `users` table in some setups — avoid
    // selecting it from `public_profiles` because that column may not exist
    // in all schemas. If you need `joinedAt`, fetch it separately from
    // `users` by joining on the appropriate key.
    joinedAt: row.joined_at || null,
  }));

  // Search communities
  const { data: communitiesData, error: communitiesError } = await sb
    .from('communities')
    .select(`
      *,
      users!communities_creator_id_fkey(id, username, display_name, avatar_url)
    `)
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .limit(20);

  if (communitiesError) throw communitiesError;

  const communities = (communitiesData || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    creatorId: row.creator_id,
    createdAt: row.created_at,
    imageUrl: row.image_url,
    creator: row.users || { id: '', username: '', displayName: '', avatarUrl: '' },
    memberCount: 0, // TODO: fetch member count if needed
  }));

  return { posts, users, communities };
}