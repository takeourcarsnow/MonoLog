import { getSupabaseClient, getAccessToken } from "../client";
import { mapProfileToUser } from "../utils";
import type { HydratedThreadReply } from "../../types";

export async function getThreadReplies(threadId: string): Promise<HydratedThreadReply[]> {
  // Use server API route so public requests return joined user profiles
  const sb = getSupabaseClient();
  const token = await getAccessToken(sb);
  const resp = await fetch(`/api/threads/replies?threadId=${encodeURIComponent(threadId)}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: 'include',
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch thread replies');
  }

  const data = await resp.json();

  // Map user profiles
  return (data || []).map((reply: any) => {
    const rawUser = reply.user;
    const mappedUser = mapProfileToUser(rawUser) || rawUser;
    return {
      ...reply,
      createdAt: reply.created_at,
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
      }
    };
  });
}

export async function addThreadReply(threadId: string, content: string): Promise<HydratedThreadReply> {
  const sb = getSupabaseClient();
  const authUser = await sb.auth.getUser();
  if (!authUser.data.user) throw new Error('Not authenticated');

  // Check if user is a member of the community
  const { data: thread } = await sb
    .from('threads')
    .select('community_id')
    .eq('id', threadId)
    .single();

  if (!thread) throw new Error('Thread not found');

  const isMember = await isCommunityMember(thread.community_id);
  if (!isMember) {
    throw new Error('You must be a member of this community to reply');
  }

  const { data, error } = await sb
    .from('thread_replies')
    .insert({
      id: crypto.randomUUID(),
      thread_id: threadId,
      user_id: authUser.data.user.id,
      content,
      created_at: new Date().toISOString()
    })
    .select(`
      *,
      user:users!thread_replies_user_id_fkey(id, username, display_name, avatar_url)
    `)
    .single();

  if (error) throw new Error(error.message);

  // Map user profile
  const rawUser = (data as any).user;
  const mappedUser = mapProfileToUser(rawUser) || rawUser;

  if (!mappedUser) throw new Error('User profile not found');

    return {
      ...data,
      createdAt: data.created_at,
      user: {
        id: mappedUser.id,
        username: mappedUser.username,
        displayName: mappedUser.displayName,
        avatarUrl: mappedUser.avatarUrl,
      },
      // Map possible RPC fields to the app-friendly names
      replyCount: (data.reply_count ?? data.replyCount) || 0,
      lastActivity: data.last_activity || data.lastActivity || data.updated_at || data.updatedAt || data.created_at || data.createdAt,
    };
}

export async function deleteThreadReply(id: string): Promise<boolean> {
  const sb = getSupabaseClient();
  const authUser = await sb.auth.getUser();
  if (!authUser.data.user) throw new Error('Not authenticated');

  const { error } = await sb
    .from('thread_replies')
    .delete()
    .eq('id', id)
    .eq('user_id', authUser.data.user.id);

  if (error) throw new Error(error.message);
  return true;
}

export async function editThreadReply(replyId: string, content: string): Promise<HydratedThreadReply> {
  const sb = getSupabaseClient();
  const token = await getAccessToken(sb);
  const resp = await fetch('/api/threads/replies', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ replyId, content }),
    credentials: 'include',
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to edit reply');
  }

  const data = await resp.json();

  // Map user profile
  const rawUser = data.user;
  const mappedUser = mapProfileToUser(rawUser) || rawUser;

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
    }
  };
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