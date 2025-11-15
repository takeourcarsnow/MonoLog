import type { Story, User } from '../types';
import { getClient, ensureAuthListener, getCachedAuthUser, getAccessToken } from './client';
import { dedupe } from '../requestDeduplication';
import { getCurrentUser } from './users';

// Cache for stories per user: userId -> { stories, timestamp }
const storiesCache = new Map<string, { stories: Story[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function mapRowToStory(row: any): Story {
  return {
    id: row.id,
    userId: row.user_id,
    mediaUrl: row.media_url,
    thumbnailUrl: row.thumbnail_url || undefined,
    mediaType: (row.media_type === 'video' ? 'video' : 'image'),
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    viewCount: row.view_count || 0,
    viewers: row.viewers || row.viewers_json || undefined,
    durationSeconds: row.duration_seconds || undefined,
  };
}

export async function createStory(input: { mediaUrl?: string; thumbnailUrl?: string; dataUrl?: string; mediaType: 'image' | 'video'; durationSeconds?: number }) {
  console.log('[createStory] called with input:', { hasDataUrl: !!input.dataUrl, mediaType: input.mediaType });
  const sb = getClient();
  ensureAuthListener(sb);
  const token = await getAccessToken(sb);
  if (!token) throw new Error('Not logged in');

  let finalMediaUrl = input.mediaUrl;
  let finalThumbUrl = input.thumbnailUrl;

  // Allow passing a dataUrl directly; upload via storage endpoints first.
  if (input.dataUrl) {
    console.log('[createStory] uploading dataUrl, length:', input.dataUrl.length);
    if (input.mediaType === 'image') {
      const res = await fetch('/api/storage/upload', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ dataUrl: input.dataUrl }) });
      const json = await res.json();
      console.log('[createStory] upload response:', res.status, json);
      if (!res.ok) throw new Error(json?.error || 'Image upload failed');
      finalMediaUrl = json.publicUrl;
      finalThumbUrl = json.thumbnailUrl;
    } else if (input.mediaType === 'video') {
      const res = await fetch('/api/storage/upload-video', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ dataUrl: input.dataUrl }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Video upload failed');
      finalMediaUrl = json.publicUrl;
      finalThumbUrl = json.thumbnailUrl; // may be same as media when thumbnail extraction not implemented
    }
  }

  if (!finalMediaUrl) throw new Error('Missing mediaUrl for story');

  const body = {
    mediaUrl: finalMediaUrl,
    thumbnailUrl: finalThumbUrl,
    mediaType: input.mediaType,
    durationSeconds: input.durationSeconds,
  };
  console.log('[createStory] creating story with body:', body);

  const resp = await fetch('/api/stories/create', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  const json = await resp.json();
  console.log('[createStory] create response:', resp.status, json);
  if (!resp.ok) throw new Error(json?.error || 'Failed to create story');
  // Invalidate cache for the current user
  const user = await getCachedAuthUser(sb);
  if (user?.id) {
    storiesCache.delete(user.id);
    // Notify any client-side listeners that this user's stories have changed
    try {
      if (typeof window !== 'undefined' && (window as any).dispatchEvent) {
        (window as any).dispatchEvent(new CustomEvent('stories:updated', { detail: { userId: user.id } }));
      }
    } catch (_) {}
  }
  return mapRowToStory(json.story);
}

export async function getActiveStoriesForUser(userId: string) {
  const now = Date.now();
  const cached = storiesCache.get(userId);
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.stories;
  }

  return dedupe(`getActiveStoriesForUser:${userId}`, async () => {
    const resp = await fetch(`/api/stories/list?userId=${encodeURIComponent(userId)}`);
    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.error || 'Failed to fetch stories');
    const stories = (json.stories || []).map(mapRowToStory);
    storiesCache.set(userId, { stories, timestamp: now });
    return stories;
  });
}

export async function getFollowingStories() {
  const sb = getClient();
  ensureAuthListener(sb);
  const token = await getAccessToken(sb);
  const resp = await fetch('/api/stories/feed', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json?.error || 'Failed to fetch following stories');
  return (json.items || []).map((item: any) => ({
    user: item.user as Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl'>,
    stories: (item.stories || []).map(mapRowToStory),
  }));
}

export async function getExploreStories() {
  const sb = getClient();
  ensureAuthListener(sb);
  const token = await getAccessToken(sb);
  const resp = await fetch('/api/stories/explore', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json?.error || 'Failed to fetch explore stories');
  return (json.items || []).map((item: any) => ({
    user: item.user as Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl'>,
    stories: (item.stories || []).map(mapRowToStory),
  }));
}

export async function markStoryViewed(storyId: string) {
  const sb = getClient();
  ensureAuthListener(sb);
  const token = await getAccessToken(sb);
  if (!token) return; // silently ignore if not logged in
  const resp = await fetch(`/api/stories/view/${encodeURIComponent(storyId)}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  // Non-critical; ignore errors
  try { await resp.json(); } catch (_) {}
}

export async function deleteStory(storyId: string) {
  const sb = getClient();
  ensureAuthListener(sb);
  const token = await getAccessToken(sb);
  if (!token) throw new Error('Not logged in');
  const resp = await fetch(`/api/stories/delete/${encodeURIComponent(storyId)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json?.error || 'Failed to delete story');
  // Invalidate cache for the current user
  const user = await getCachedAuthUser(sb);
  if (user?.id) {
    storiesCache.delete(user.id);
    // Notify any client-side listeners that this user's stories have changed
    try {
      if (typeof window !== 'undefined' && (window as any).dispatchEvent) {
        (window as any).dispatchEvent(new CustomEvent('stories:updated', { detail: { userId: user.id } }));
      }
    } catch (_) {}
  }
}

export async function likeStory(storyId: string) {
  console.log('likeStory: calling for storyId', storyId);
  const sb = getClient();
  ensureAuthListener(sb);
  const token = await getAccessToken(sb);
  if (!token) throw new Error('Not logged in');
  const resp = await fetch('/api/stories/like', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ storyId }) });
  const json = await resp.json();
  console.log('likeStory: response status', resp.status, 'json', json);
  if (!resp.ok) throw new Error(json?.error || 'Failed to like story');
  console.log('likeStory: success');
}

export async function unlikeStory(storyId: string) {
  const sb = getClient();
  ensureAuthListener(sb);
  const token = await getAccessToken(sb);
  if (!token) throw new Error('Not logged in');
  const resp = await fetch('/api/stories/unlike', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ storyId }) });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json?.error || 'Failed to unlike story');
}

export async function isLikedStory(storyId: string) {
  try {
    const sb = getClient();
    ensureAuthListener(sb);
    const token = await getAccessToken(sb);
    if (!token) return false;
    const resp = await fetch(`/api/stories/is-liked?storyId=${encodeURIComponent(storyId)}`, { headers: { Authorization: `Bearer ${token}` } });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.error || 'Failed to check like status');
    return json.isLiked || false;
  } catch {
    return false;
  }
}
