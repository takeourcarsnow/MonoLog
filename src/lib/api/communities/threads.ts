import { getSupabaseClient, getAccessToken } from "../client";
import { mapProfileToUser } from "../utils";
import { slugify } from "../../utils";
import type { HydratedThread } from "../../types";

export async function getCommunityThreads(communityId: string): Promise<HydratedThread[]> {
  const sb = getSupabaseClient();
  const token = await getAccessToken(sb);
  const response = await fetch(`/api/threads?communityId=${encodeURIComponent(communityId)}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: 'include',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch threads');
  }
  const data = await response.json();

  // Map the threads to include normalized user profiles
  const mapped = data.map((thread: any) => {
    // Normalize nested user profile
    const rawUser = thread.user;
    const mappedUser = mapProfileToUser(rawUser) || rawUser;

    return {
      ...thread,
      createdAt: thread.created_at,
      user: mappedUser ? {
        id: mappedUser.id,
        username: mappedUser.username,
        displayName: mappedUser.displayName,
        avatarUrl: mappedUser.avatarUrl,
      } : {
        id: 'deleted',
        username: 'deleted-user',
        displayName: null,
        avatarUrl: '/logo.svg',
      },
      // Map RPC/fallback reply counts and activity timestamps to app fields
      replyCount: (thread.reply_count ?? thread.replyCount) || 0,
      lastActivity: thread.last_activity || thread.lastActivity || thread.updated_at || thread.updatedAt || thread.created_at || thread.createdAt,
    };
  });

  // Client-side safety sort by last_activity (or updated_at) if present
  try {
    mapped.sort((a: any, b: any) => {
      const ta = a.last_activity || a.lastActivity || a.updated_at || a.updatedAt || a.createdAt || null;
      const tb = b.last_activity || b.lastActivity || b.updated_at || b.updatedAt || b.createdAt || null;
      if (!ta && !tb) return 0;
      if (!ta) return 1;
      if (!tb) return -1;
      return new Date(tb).getTime() - new Date(ta).getTime();
    });
  } catch (e) {
    // ignore
  }

  return mapped;
}

export async function getThread(id: string): Promise<HydratedThread | null> {
  // Use the server API route so responses include the joined user profile
  // even for unauthenticated clients (server uses service role).
  const sb = getSupabaseClient();
  const token = await getAccessToken(sb);
  const resp = await fetch(`/api/threads?id=${encodeURIComponent(id)}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: 'include',
  });

  if (!resp.ok) {
    if (resp.status === 404) return null;
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch thread');
  }

  const data = await resp.json();

  // Normalize nested user profile
  const rawUser = (data as any).user;
  const mappedUser = mapProfileToUser(rawUser) || rawUser;

  // If community is missing, return null
  const rawCommunity = (data as any).community;
  if (!rawCommunity) return null;

  return {
    ...data,
    createdAt: data.created_at,
    user: mappedUser ? {
      id: mappedUser.id,
      username: mappedUser.username,
      displayName: mappedUser.displayName,
      avatarUrl: mappedUser.avatarUrl,
    } : {
      id: 'deleted',
      username: 'deleted-user',
      displayName: null,
      avatarUrl: '/logo.svg',
    },
    community: {
      id: rawCommunity.id,
      name: rawCommunity.name,
    },
    replyCount: data.replyCount || 0
  };
}

export async function getThreadBySlug(slug: string): Promise<HydratedThread | null> {
  // Use server API route for consistent public shape
  const sb = getSupabaseClient();
  const token = await getAccessToken(sb);
  const resp = await fetch(`/api/threads?slug=${encodeURIComponent(slug)}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: 'include',
  });

  if (!resp.ok) {
    if (resp.status === 404) return null;
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch thread');
  }

  const data = await resp.json();

  // Get replyCount if server didn't include it
  const replyCount = data.replyCount ?? data.reply_count ?? 0;

  // Normalize nested user profile
  const rawUser = (data as any).user;
  const mappedUser = mapProfileToUser(rawUser) || rawUser;

  // If community is missing, return null
  const rawCommunity = (data as any).community;
  if (!rawCommunity) return null;

  return {
    ...data,
    createdAt: data.created_at,
    user: mappedUser ? {
      id: mappedUser.id,
      username: mappedUser.username,
      displayName: mappedUser.displayName,
      avatarUrl: mappedUser.avatarUrl,
    } : {
      id: 'deleted',
      username: 'deleted-user',
      displayName: null,
      avatarUrl: '/logo.svg',
    },
    community: {
      id: rawCommunity.id,
      name: rawCommunity.name,
    },
    replyCount: replyCount
  };
}

export async function createThread(input: { communityId: string; title: string; content: string }): Promise<HydratedThread> {
  const sb = getSupabaseClient();
  const authUser = await sb.auth.getUser();
  if (!authUser.data.user) throw new Error('Not authenticated');

  // Check if user is a member
  const isMember = await isCommunityMember(input.communityId);
  if (!isMember) {
    throw new Error('You must be a member of this community to create threads');
  }

  const slug = slugify(input.title);

  const { data, error } = await sb
    .from('threads')
    .insert({
      id: crypto.randomUUID(),
      community_id: input.communityId,
      user_id: authUser.data.user.id,
      title: input.title,
      slug,
      content: input.content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select(`
      *,
      user:users!threads_user_id_fkey(id, username, display_name, avatar_url),
      community:communities!threads_community_id_fkey(id, name)
    `)
    .single();

  if (error) throw new Error(error.message);
  return { ...data, replyCount: 0 };
}

export async function updateThread(id: string, patch: { title?: string; content?: string }): Promise<HydratedThread> {
  const sb = getSupabaseClient();
  const authUser = await sb.auth.getUser();
  if (!authUser.data.user) throw new Error('Not authenticated');

  const { data, error } = await sb
    .from('threads')
    .update({
      ...patch,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('user_id', authUser.data.user.id)
    .select(`
      *,
      user:users!threads_user_id_fkey(id, username, display_name, avatar_url),
      community:communities!threads_community_id_fkey(id, name)
    `)
    .single();

  if (error) throw new Error(error.message);

  // Get reply count
  const { count } = await sb
    .from('thread_replies')
    .select('id', { count: 'exact', head: true })
    .eq('thread_id', id);

  return {
    ...data,
    replyCount: count || 0
  };
}

export async function deleteThread(id: string): Promise<boolean> {
  const sb = getSupabaseClient();
  const authUser = await sb.auth.getUser();
  if (!authUser.data.user) throw new Error('Not authenticated');

  const { error } = await sb
    .from('threads')
    .delete()
    .eq('id', id)
    .eq('user_id', authUser.data.user.id);

  if (error) throw new Error(error.message);
  return true;
}

// Import isCommunityMember from communities module to avoid circular dependency
async function isCommunityMember(communityId: string): Promise<boolean> {
  const sb = getSupabaseClient();
  const authUser = await sb.auth.getUser();
  if (!authUser.data.user) return false;

  const { data } = await sb
    .from('community_members')
    .select('id')
    .eq('community_id', communityId)
    .eq('user_id', authUser.data.user.id)
    .single();

  return !!data;
}

export async function hasNewThreads(since: string): Promise<boolean> {
  const sb = getSupabaseClient();
  const token = await getAccessToken(sb);
  const response = await fetch(`/api/threads/new?since=${encodeURIComponent(since)}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: 'include',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to check for new threads');
  }
  const data = await response.json();
  return data.hasNewThreads;
}