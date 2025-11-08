import { getServiceSupabase } from './serverSupabase';
import { getUserFromAuthHeader } from './serverVerifyAuth';
import { mapRowToHydratedPost, mapProfileToUser } from './utils';
import { SELECT_POST_WITH_PROFILES } from './sql';

/**
 * Get following IDs for a user
 */
export async function getFollowingIds(userId: string): Promise<string[]> {
  const sb = getServiceSupabase();
  const { data, error } = await sb.from('users').select('following').eq('id', userId).limit(1).maybeSingle();
  if (error || !data) return [];
  return data.following || [];
}

/**
 * Get user by ID
 */
export async function getUserById(id: string) {
  const sb = getServiceSupabase();
  const { data, error } = await sb.from('users').select('*').eq('id', id).limit(1).maybeSingle();
  if (error || !data) return null;
  return mapProfileToUser(data);
}

/**
 * Get user by username (tries exact, legacy, and case-insensitive)
 */
export async function getUserByUsername(username: string) {
  const sb = getServiceSupabase();

  // Try exact match on username
  let { data, error } = await sb.from('users').select('*').eq('username', username).limit(1).maybeSingle();
  if (data) return mapProfileToUser(data);

  // Fallback to legacy user_name column
  ({ data, error } = await sb.from('users').select('*').eq('user_name', username).limit(1).maybeSingle());
  if (data) return mapProfileToUser(data);

  // Final attempt: case-insensitive match
  ({ data, error } = await sb.from('users').select('*').ilike('username', username).limit(1).maybeSingle());
  if (data) return mapProfileToUser(data);

  return null;
}

/**
 * Get posts by user ID with pagination
 */
export async function getPostsByUser(userId: string, options: { limit?: number; before?: string } = {}) {
  const { limit = 10, before } = options;
  const sb = getServiceSupabase();

  let query = sb.from('posts').select(SELECT_POST_WITH_PROFILES).eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);

  if (before) query = query.lt('created_at', before);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(mapRowToHydratedPost);
}

/**
 * Get explore posts (public posts not from user or following)
 */
export async function getExplorePosts(userId?: string, followingIds: string[] = [], options: { limit?: number; before?: string } = {}) {
  const { limit = 10, before } = options;
  const sb = getServiceSupabase();

  let query = sb.from('posts').select(SELECT_POST_WITH_PROFILES).eq('public', true).order('created_at', { ascending: false }).limit(limit);

  const excludeIds = [userId, ...followingIds].filter(Boolean);
  if (excludeIds.length) query = query.not('user_id', 'in', `(${excludeIds.join(',')})`);

  if (before) query = query.lt('created_at', before);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(mapRowToHydratedPost);
}

/**
 * Get following posts (own posts + public posts from following)
 */
export async function getFollowingPosts(userId: string, followingIds: string[], options: { limit?: number; before?: string } = {}) {
  const { limit = 10, before } = options;
  const sb = getServiceSupabase();

  const allUserIds = [...followingIds, userId];
  let query = sb.from('posts').select(SELECT_POST_WITH_PROFILES).in('user_id', allUserIds).order('created_at', { ascending: false }).limit(limit * 2);

  if (before) query = query.lt('created_at', before);

  const { data, error } = await query;
  if (error) throw error;

  // Filter and dedupe: include all own posts, public from followed
  const filtered = (data || []).filter((row: any) => {
    if (row.user_id === userId) return true;
    return row.public === true;
  });

  // Simple dedupe and limit preserving order
  const seen = new Set<string>();
  const deduped: any[] = [];
  for (const r of filtered) {
    if (!seen.has(r.id)) {
      seen.add(r.id);
      deduped.push(r);
    }
    if (deduped.length >= limit) break;
  }

  return deduped.map(mapRowToHydratedPost);
}

/**
 * Get posts by hashtag
 */
export async function getPostsByHashtag(tag: string, options: { limit?: number; before?: string } = {}) {
  const { limit = 10, before } = options;
  const sb = getServiceSupabase();

  let query = sb.from('posts').select(SELECT_POST_WITH_PROFILES).eq('public', true).contains('hashtags', [tag]).order('created_at', { ascending: false }).limit(limit);

  if (before) query = query.lt('created_at', before);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(mapRowToHydratedPost);
}

/**
 * Get comments for a post
 */
export async function getCommentsForPost(postId: string) {
  const sb = getServiceSupabase();

  const { data, error } = await sb.from('comments').select('*, users!left(*)').eq('post_id', postId).order('created_at', { ascending: true });
  if (error) throw error;

  const comments = data || [];

  // If the related users join returned null, fetch user rows by id
  const missingUsers = comments.filter(c => !c.users).map(c => c.user_id).filter(Boolean);
  let userMap: Record<string, any> = {};
  if (missingUsers.length) {
    const uniq = Array.from(new Set(missingUsers));
    const { data: usersData, error: usersErr } = await sb.from('users').select('*').in('id', uniq);
    if (!usersErr && usersData) {
      for (const u of usersData) userMap[u.id] = u;
    }
  }

  return comments.map((c: any) => {
    const urow = c.users || userMap[c.user_id] || null;
    return {
      id: c.id,
      postId: c.post_id,
      userId: c.user_id,
      text: c.text,
      createdAt: c.created_at,
      parentId: c.parent_id || undefined,
      user: {
        id: urow?.id || c.user_id,
        username: urow?.username || urow?.user_name || '',
        displayName: urow?.display_name || urow?.displayName || urow?.username || urow?.user_name || '',
        avatarUrl: urow?.avatar_url || urow?.avatarUrl || '/logo.svg',
      }
    };
  });
}