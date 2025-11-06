import { getClient, getCachedAuthUser } from "../client";
import { apiCache } from "../cache";
import { extractUserProfile, ensureProfileForAuthUser } from "../userProfile";
import { SELECT_POST_WITH_PROFILES } from "../sql";

// Helper function to get cached following IDs for a user
export async function getCachedFollowingIds(sb: any, userId: string): Promise<string[]> {
  const followingKey = `following:${userId}`;
  let followingIds: string[] = apiCache.get(followingKey) || [];
  if (followingIds.length === 0) {
    const { data: profile, error: profErr } = await sb.from("users").select("following").eq("id", userId).limit(1).single();
    if (!profErr && profile) {
      followingIds = profile.following || [];
      apiCache.set(followingKey, followingIds, 5 * 60 * 1000); // Cache for 5 minutes
    }
  }
  return followingIds;
}

// Helper function to dedupe posts by ID
export function dedupePostsById<T extends { id: string; created_at: string }>(posts: T[], limit?: number): T[] {
  const seen = new Set<string>();
  const deduped = posts
    .filter(r => r && !seen.has(r.id) && seen.add(r.id))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return limit ? deduped.slice(0, limit) : deduped;
}

// Helper function to resolve post ID from slug or direct ID
export function resolvePostId(id: string | undefined | null): { raw: string; candidateId: string } {
  const raw = id ?? '';
  let candidateId = raw;
  if (raw && typeof raw === 'string') {
    const dashIdx = raw.lastIndexOf('-');
    if (dashIdx > 0) {
      const trailing = raw.slice(dashIdx + 1);
      if (/^[0-9a-fA-F]{6,}$/.test(trailing)) candidateId = trailing;
    }
  }
  return { raw, candidateId };
}

// Helper function to fetch post with fallbacks
export async function fetchPostWithFallbacks(sb: any, raw: string, candidateId: string) {
  const selectQuery = SELECT_POST_WITH_PROFILES;

  // Try exact match first
  let res: any = await sb.from("posts").select(selectQuery).eq("id", candidateId).limit(1).maybeSingle();
  if (!res.error && res.data) {
    return res.data;
  }

  // If candidateId is a short prefix (<= 12 chars), try prefix match
  if (!res.data && candidateId.length <= 12) {
    try {
      const prefRes: any = await sb.from("posts").select(selectQuery).ilike("id", `${candidateId}%`).limit(1).maybeSingle();
      if (!prefRes.error && prefRes.data) return prefRes.data;
    } catch (e) {
      // ignore
    }
  }

  // Lastly, try exact match on the original raw value
  try {
    const rawRes: any = await sb.from("posts").select(selectQuery).eq("id", raw).limit(1).maybeSingle();
    if (!rawRes.error && rawRes.data) return rawRes.data;
  } catch (e) {
    // ignore
  }
  return null;
}

// Helper function to get current user - needed for posts
export async function getCurrentUser() {
  const sb = getClient();
  const user = await getCachedAuthUser(sb);
  if (!user) return null;
  return await ensureProfileForAuthUser(sb, user);
}