import { getClient, ensureAuthListener, getCachedAuthUser, getAccessToken } from "./client";
import { extractUserProfile, ensureProfileForAuthUser } from "./userProfile";

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
  return await ensureProfileForAuthUser(sb, user);
}
