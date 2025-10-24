import { getClient, ensureAuthListener, getCachedAuthUser, getAccessToken, logSupabaseError } from "./client";
import { mapRowToHydratedPost, selectUserFields } from "./utils";

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
  const { data, error } = await sb.from("posts").select("*, users!left(id, username, display_name, avatar_url), public_profiles!left(id, username, display_name, avatar_url)").in("id", favIds).or(`public.eq.true,user_id.eq.${me.id}`);
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
  // try to find a matching profile in users table
  const { data: profile, error: profErr } = await sb.from("users").select("*").eq("id", user.id).limit(1).maybeSingle();
  if (profErr) {
    // Real query error (e.g. permissions); fall back to synthesized profile (no DB write)
    const synthUsername = user.user_metadata?.username || user.email?.split("@")[0] || user.id;
    const synthAvatar = user.user_metadata?.avatar_url || "/logo.svg";
    const joinedAt = new Date().toISOString();
    return { id: user.id, username: synthUsername, displayName: null, avatarUrl: synthAvatar, joinedAt } as any;
  }

  if (!profile) {
    // Row truly missing. Insert a minimal profile.
    const synthUsername = user.user_metadata?.username || user.email?.split("@")[0] || user.id;
    const synthAvatar = user.user_metadata?.avatar_url || "/logo.svg";
    const joinedAt = new Date().toISOString();
    const insertObj: any = { id: user.id, username: synthUsername, display_name: null, joined_at: joinedAt };
    if (synthAvatar) insertObj.avatar_url = synthAvatar;
    try {
      await sb.from("users").insert(insertObj);
    } catch (e) {
      // ignore duplicate or RLS failures; we still return synthesized profile
    }
    return { id: user.id, username: synthUsername, displayName: null, avatarUrl: synthAvatar, joinedAt } as any;
  }
  return {
    id: profile.id,
    username: profile.username || profile.user_name || "",
    displayName: profile.displayName || profile.display_name || "",
    avatarUrl: profile.avatarUrl || profile.avatar_url || "/logo.svg",
    bio: profile.bio,
    joinedAt: profile.joinedAt || profile.joined_at,
    following: profile.following,
    favorites: profile.favorites,
    usernameChangedAt: profile.username_changed_at || profile.usernameChangedAt,
  } as any;
}
