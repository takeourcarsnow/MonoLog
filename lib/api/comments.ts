import { getClient, logSupabaseError, getAccessToken } from "./client";
import { DEFAULT_AVATAR } from "./utils";
import { extractUserProfile, ensureProfileForAuthUser } from "./userProfile";

export async function getComments(postId: string) {
  // Use the public API route to allow access for non-logged-in users
  const res = await fetch(`/api/comments?postId=${encodeURIComponent(postId)}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load comments');
  return json;
}

export async function getStoryComments(storyId: string) {
  // Use the public API route to allow access for non-logged-in users
  const res = await fetch(`/api/comments?storyId=${encodeURIComponent(storyId)}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load comments');
  return json;
}

export async function addComment(postId: string, text: string, parentId?: string) {
  const cur = await getCurrentUser();
  if (!cur) throw new Error('Not logged in');
  if (!text?.trim()) throw new Error('Empty');
  const sb = getClient();
  const token = await getAccessToken(sb);
  const res = await fetch('/api/comments/add', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ postId, text, parentId }) });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to add comment');
  // refresh current user's profile from users table so we return the up-to-date displayName / avatarUrl
  let profile = await getCurrentUser();
  if (!profile) profile = cur; // fallback
  // notify other UI components that a comment was added so they can update counts optimistically
  try {
    if (typeof window !== 'undefined' && typeof CustomEvent === 'function') {
      const ev = new CustomEvent('monolog:comment_added', { detail: { postId, commentId: json.id } });
      window.dispatchEvent(ev);
    }
  } catch (e) {
    // ignore event dispatch failures
  }
  return { id: json.id, postId, userId: cur.id, text: text.trim(), createdAt: json.created_at, parentId, user: { id: profile.id, username: profile.username || '', displayName: profile.displayName || '', avatarUrl: profile.avatarUrl || '' } } as any;
}

export async function addStoryComment(storyId: string, text: string, parentId?: string) {
  const cur = await getCurrentUser();
  if (!cur) throw new Error('Not logged in');
  if (!text?.trim()) throw new Error('Empty');
  const sb = getClient();
  const token = await getAccessToken(sb);
  const res = await fetch('/api/comments/add', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ storyId, text, parentId }) });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to add comment');
  // refresh current user's profile from users table so we return the up-to-date displayName / avatarUrl
  let profile = await getCurrentUser();
  if (!profile) profile = cur; // fallback
  // notify other UI components that a comment was added so they can update counts optimistically
  try {
    if (typeof window !== 'undefined' && typeof CustomEvent === 'function') {
      const ev = new CustomEvent('monolog:story_comment_added', { detail: { storyId, commentId: json.id } });
      window.dispatchEvent(ev);
    }
  } catch (e) {
    // ignore event dispatch failures
  }
  return { id: json.id, storyId, userId: cur.id, text: text.trim(), createdAt: json.created_at, parentId, user: { id: profile.id, username: profile.username || '', displayName: profile.displayName || '', avatarUrl: profile.avatarUrl || '' } } as any;
}

// Helper function to get current user - needed for comments
async function getCurrentUser() {
  const sb = getClient();
  const user = await (await import("./client")).getCachedAuthUser(sb);
  if (!user) return null;
  return await ensureProfileForAuthUser(sb, user);
}
