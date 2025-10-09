import { getClient, ensureAuthListener, getCachedAuthUser, getAccessToken } from "./client";

export async function follow(userId: string) {
  // Call server endpoint to perform the follow operation with service role privileges
  const sb = getClient();
  ensureAuthListener(sb);
  const token = await getAccessToken(sb);
  const res = await fetch('/api/users/follow', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ targetId: userId }) });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to follow');
}

export async function unfollow(userId: string) {
  const sb = getClient();
  ensureAuthListener(sb);
  const token = await getAccessToken(sb);
  const res = await fetch('/api/users/unfollow', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ targetId: userId }) });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to unfollow');
}

export async function isFollowing(userId: string) {
  const sb = getClient();
  ensureAuthListener(sb);
  const me = await getCachedAuthUser(sb);
  if (!me) return false;
  const { data: profile, error } = await sb.from("users").select("following").eq("id", me.id).limit(1).single();
  if (error || !profile) return false;
  const current: string[] = profile.following || [];
  return !!current.includes(userId);
}

export async function getFollowingUsers(userId?: string) {
  const sb = getClient();
  ensureAuthListener(sb);
  const me = await getCachedAuthUser(sb);
  if (!me) return [];
  const targetUserId = userId || me.id;
  // Only allow viewing own following for privacy
  if (targetUserId !== me.id) return [];
  const { data: profile, error } = await sb.from("users").select("following").eq("id", targetUserId).limit(1).single();
  if (error || !profile) return [];
  const followingIds: string[] = profile.following || [];
  if (followingIds.length === 0) return [];
  const { data: users, error: usersError } = await sb.from("users").select("id, username, display_name, avatar_url, joined_at").in("id", followingIds);
  if (usersError || !users) return [];
  return users.map(u => ({
    id: u.id,
    username: u.username || "",
    displayName: u.display_name || "",
    avatarUrl: u.avatar_url || "/logo.svg",
    joinedAt: u.joined_at || "",
  }));
}

// Helper function to get current user - needed for follow/unfollow
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
    const synthDisplay = user.user_metadata?.name || synthUsername;
    const synthAvatar = user.user_metadata?.avatar_url || "/logo.svg";
    const joinedAt = new Date().toISOString();
    return { id: user.id, username: synthUsername, displayName: synthDisplay, avatarUrl: synthAvatar, joinedAt } as any;
  }

  if (!profile) {
    // Row truly missing. Insert a minimal profile.
    const synthUsername = user.user_metadata?.username || user.email?.split("@")[0] || user.id;
    const synthDisplay = user.user_metadata?.name || synthUsername;
    const synthAvatar = user.user_metadata?.avatar_url || "/logo.svg";
    const joinedAt = new Date().toISOString();
    const insertObj: any = { id: user.id, username: synthUsername, display_name: synthDisplay, joined_at: joinedAt };
    if (synthAvatar) insertObj.avatar_url = synthAvatar;
    try {
      await sb.from("users").insert(insertObj);
    } catch (e) {
      // ignore duplicate or RLS failures; we still return synthesized profile
    }
    return { id: user.id, username: synthUsername, displayName: synthDisplay, avatarUrl: synthAvatar, joinedAt } as any;
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
