import { getClient, ensureAuthListener, getCachedAuthUser, getAccessToken, logSupabaseError } from "./client";
import { mapRowToHydratedPost, selectUserFields } from "./utils";
import { SELECT_POST_WITH_PROFILES } from "./sql";
import { extractUserProfile, ensureProfileForAuthUser } from "./userProfile";

export async function favoritePost(postId: string) {
  const sb = getClient();
  ensureAuthListener(sb);
  const token = await getAccessToken(sb);
  const res = await fetch('/api/posts/favorite', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ postId }) });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to favorite');
  // Update lightweight cache so UI checks don't trigger another fetch
  try { addToCachedFavoriteIds(postId); } catch (e) {}
}

export async function unfavoritePost(postId: string) {
  const sb = getClient();
  ensureAuthListener(sb);
  const token = await getAccessToken(sb);
  const res = await fetch('/api/posts/unfavorite', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ postId }) });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to unfavorite');
  // Update lightweight cache so UI checks don't trigger another fetch
  try { removeFromCachedFavoriteIds(postId); } catch (e) {}
}

export async function isFavorite(postId: string) {
  // Use a lightweight cached lookup of favorite IDs to avoid fetching full
  // favorite posts repeatedly (many PostCard instances may call isFavorite on
  // mount). This preserves existing logs but reduces expensive duplicate
  // requests.
  const ids = await getFavoriteIds();
  if (!ids || !ids.length) return false;
  return ids.includes(postId);
}

export async function getFavoritePosts() {
  // Keep this read operation client-side (reads are safe with anon key)
  const sb = getClient();
  ensureAuthListener(sb);
  const me = await getCachedAuthUser(sb);
  if (!me) return [];
  const { data: profile, error: profErr } = await selectUserFields(sb, me.id, "favorites");
  if (profErr || !profile) return [];
  const favIds: string[] = profile.favorites || [];
  // Cache favorite ids for lightweight lookups
  try {
    setCachedFavoriteIds(favIds);
  } catch (e) {}
  if (!favIds.length) return [];
  const { data, error } = await sb.from("posts").select(SELECT_POST_WITH_PROFILES).in("id", favIds).or(`public.eq.true,user_id.eq.${me.id}`);
  logSupabaseError("getFavoritePosts", { data, error });
  if (error) throw error;
  try {
    const ids = (data || []).map((r: any) => r.id);
  } catch (e) {}

  // Map rows to hydrated posts
  const posts = (data || []).map((row: any) => mapRowToHydratedPost(row));

  // profile.favorites is an array where new favorites are pushed to the end.
  // To show newest favorites first, sort posts according to the index in favIds
  // (higher index == more recently favorited).
  const indexMap = new Map<string, number>();
  for (let i = 0; i < favIds.length; i++) indexMap.set(favIds[i], i);
  posts.sort((a: any, b: any) => (indexMap.get(b.id) ?? -1) - (indexMap.get(a.id) ?? -1));

  return posts;
}

// ---- Lightweight caching utilities to avoid duplicate favorite lookups ----
let cachedFavoriteIds: string[] | null = null;
let inflightFavoriteIdsPromise: Promise<string[] | null> | null = null;

function setCachedFavoriteIds(ids: string[] | null) {
  cachedFavoriteIds = ids ? ids.slice() : null;
}

export async function getFavoriteIds(): Promise<string[] | null> {
  // Return cached immediately when possible
  if (cachedFavoriteIds !== null) return cachedFavoriteIds;
  if (inflightFavoriteIdsPromise) return await inflightFavoriteIdsPromise;

  const sb = getClient();
  ensureAuthListener(sb);
  inflightFavoriteIdsPromise = (async () => {
    try {
      const me = await getCachedAuthUser(sb);
      if (!me) return null;
      const { data: profile, error: profErr } = await selectUserFields(sb, me.id, "favorites");
      if (profErr || !profile) return null;
      const favIds: string[] = profile.favorites || [];
      setCachedFavoriteIds(favIds);
      return favIds;
    } catch (e) {
      return null;
    } finally {
      inflightFavoriteIdsPromise = null;
    }
  })();

  return await inflightFavoriteIdsPromise;
}

// Update cached ids when toggling favorites so callers see immediate results
function addToCachedFavoriteIds(id: string) {
  try {
    if (!cachedFavoriteIds) cachedFavoriteIds = [id];
    else if (!cachedFavoriteIds.includes(id)) cachedFavoriteIds = [id, ...cachedFavoriteIds];
  } catch (e) {}
}
function removeFromCachedFavoriteIds(id: string) {
  try {
    if (!cachedFavoriteIds) return;
    cachedFavoriteIds = cachedFavoriteIds.filter(x => x !== id);
  } catch (e) {}
}


// Helper function to get current user - needed for favorites
async function getCurrentUser() {
  const sb = getClient();
  ensureAuthListener(sb);
  const user = await getCachedAuthUser(sb);
  if (!user) return null;
  return await ensureProfileForAuthUser(sb, user);
}
