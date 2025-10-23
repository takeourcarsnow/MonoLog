import { getClient, ensureAuthListener, getCachedAuthUser, getAccessToken, logSupabaseError } from "./client";
import { mapRowToHydratedPost, selectUserFields } from "./utils";

export async function favoritePost(postId: string) {
  const sb = getClient();
  ensureAuthListener(sb);
  const token = await getAccessToken(sb);
  const res = await fetch('/api/posts/favorite', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ postId }) });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to favorite');
}

export async function unfavoritePost(postId: string) {
  const sb = getClient();
  ensureAuthListener(sb);
  const token = await getAccessToken(sb);
  const res = await fetch('/api/posts/unfavorite', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ postId }) });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to unfavorite');
}

export async function isFavorite(postId: string) {
  const cur = await getCurrentUser();
  if (!cur) return false;
  const posts = await getFavoritePosts();
  return posts.some(p => p.id === postId);
}

export async function getFavoritePosts() {
  console.log('getFavoritePosts called');
  // Keep this read operation client-side (reads are safe with anon key)
  const sb = getClient();
  ensureAuthListener(sb);
  const me = await getCachedAuthUser(sb);
  if (!me) return [];
  const { data: profile, error: profErr } = await selectUserFields(sb, me.id, "favorites");
  if (profErr || !profile) return [];
  console.log('Profile favorites:', profile.favorites);
  const favIds: string[] = profile.favorites || [];
  console.log('Favorite IDs:', favIds);
  if (!favIds.length) return [];
  const { data, error } = await sb.from("posts").select("*, users!left(id, username, display_name, avatar_url), public_profiles!left(id, username, display_name, avatar_url)").in("id", favIds).or(`public.eq.true,user_id.eq.${me.id}`);
  logSupabaseError("getFavoritePosts", { data, error });
  if (error) throw error;
  console.log('Fetched favorite posts:', data?.length || 0);
  try {
    const ids = (data || []).map((r: any) => r.id);
    console.log('Fetched favorite post IDs:', ids);
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
