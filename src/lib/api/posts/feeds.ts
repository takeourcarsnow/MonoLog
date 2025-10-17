import { getClient, ensureAuthListener, getCachedAuthUser, logSupabaseError } from "../client";
import { mapRowToHydratedPost } from "../utils";
import { logger } from "../../logger";
import { getCachedFollowingIds, dedupePostsById } from "./helpers";

export async function getExploreFeed() {
  logger.debug("supabaseApi.getExploreFeed called");
  const sb = getClient();
  // Exclude posts created by the current authenticated user and followed users so the Explore
  // view only shows other people's public posts that you aren't following.
  ensureAuthListener(sb);
  const me = await getCachedAuthUser(sb);
  let q: any = sb.from("posts").select("*, users!left(id, username, display_name, avatar_url), public_profiles!left(id, username, display_name, avatar_url)").eq("public", true).order("created_at", { ascending: false });
  if (me) {
    const followingIds = await getCachedFollowingIds(sb, me.id);
    const excludeIds = [me.id, ...followingIds];
    q = q.not("user_id", "in", `(${excludeIds.join(',')})`);
  }
  const { data, error } = await q;
  logSupabaseError("getExploreFeed", { data, error });
  if (error) throw error;
  return (data || []).map((row: any) => mapRowToHydratedPost(row));
}

export async function getExploreFeedPage({ limit, before }: { limit: number; before?: string }) {
  const sb = getClient();
  // Exclude current user's posts and posts from followed users from explore results.
  ensureAuthListener(sb);
  const me = await getCachedAuthUser(sb);
  let q: any = sb.from("posts").select("*, users!left(id, username, display_name, avatar_url), public_profiles!left(id, username, display_name, avatar_url)").eq("public", true).order("created_at", { ascending: false }).limit(limit);
  if (me) {
    const followingIds = await getCachedFollowingIds(sb, me.id);
    const excludeIds = [me.id, ...followingIds];
    q = q.not("user_id", "in", `(${excludeIds.join(',')})`);
  }
  if (before) q = q.lt("created_at", before);
  const { data, error } = await q;
  logSupabaseError("getExploreFeedPage", { data, error });
  if (error) throw error;
  return (data || []).map((row: any) => mapRowToHydratedPost(row));
}

export async function getFollowingFeed() {
  // Use client-side reads for feed; follow list comes from users table
  const sb = getClient();
  ensureAuthListener(sb);
  const me = await getCachedAuthUser(sb);
  if (!me) return [];

  const followingIds = await getCachedFollowingIds(sb, me.id);

  // Single query to get posts from followed users + own posts
  const allUserIds = [...followingIds, me.id];
  const { data: rows, error } = await sb.from("posts").select(`
    *,
    users!left(id, username, display_name, avatar_url),
    public_profiles!left(id, username, display_name, avatar_url)
  `).in("user_id", allUserIds).eq("public", true).order("created_at", { ascending: false });

  logSupabaseError("getFollowingFeed", { data: rows, error });
  if (error) throw error;

  // For followed users, only include public posts; for own posts, include all
  // Since we filtered by public=true above, we need to add back own posts
  const publicRows = rows || [];
  let ownPosts: any[] = [];
  if (me) {
    const { data: myRows, error: myErr } = await sb.from("posts").select(`
      *,
      users!left(id, username, display_name, avatar_url),
      public_profiles!left(id, username, display_name, avatar_url)
    `).eq("user_id", me.id).order("created_at", { ascending: false });
    if (!myErr && myRows) {
      ownPosts = myRows;
    }
  }

  const allRows = [...publicRows, ...ownPosts];

  // Dedupe by id and sort
  const deduped = dedupePostsById(allRows);

  return deduped.map((row: any) => mapRowToHydratedPost(row));
}

export async function getFollowingFeedPage({ limit, before }: { limit: number; before?: string }) {
  const sb = getClient();
  ensureAuthListener(sb);
  const me = await getCachedAuthUser(sb);
  if (!me) return [];

  const followingIds = await getCachedFollowingIds(sb, me.id);

  // Single query to get posts from followed users + own posts
  // Use a more efficient query that avoids unnecessary joins for comments
  const allUserIds = [...followingIds, me.id];
  let query = sb.from("posts").select(`
    *,
    users!left(id, username, display_name, avatar_url),
    public_profiles!left(id, username, display_name, avatar_url)
  `).in("user_id", allUserIds).order("created_at", { ascending: false }).limit(limit * 2); // Fetch more to account for deduping

  if (before) query = query.lt("created_at", before);

  const { data: rows, error } = await query;
  logSupabaseError("getFollowingFeedPage", { data: rows, error });
  if (error) throw error;

  // For followed users, only include public posts; for own posts, include all
  const filteredRows = (rows || []).filter((row: any) => {
    if (row.user_id === me.id) return true; // Include all own posts
    return row.public === true; // Only public posts from followed users
  });

  // Dedupe and sort (in case of overlaps)
  const deduped = dedupePostsById(filteredRows, limit);

  // Get comment counts separately for better performance
  const postIds = deduped.map(r => r.id);
  let commentCounts: Record<string, number> = {};
  if (postIds.length > 0) {
    const { data: comments } = await sb.from("comments").select("post_id").in("post_id", postIds);
    if (comments) {
      commentCounts = comments.reduce((acc, comment) => {
        acc[comment.post_id] = (acc[comment.post_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    }
  }

  // Map to hydrated posts with comment counts
  return deduped.map((row: any) => ({
    ...mapRowToHydratedPost(row),
    commentsCount: commentCounts[row.id] || 0
  }));
}