import { getSupabaseClient, getAccessToken } from "./client";
import { mapProfileToUser } from "./utils";
import { slugify } from "../utils";
import type { HydratedCommunity, HydratedThread, HydratedThreadReply } from "../types";

export async function getCommunities(): Promise<HydratedCommunity[]> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('communities')
    .select(`
      *,
      creator:users!communities_creator_id_fkey(id, username, display_name, avatar_url)
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  // Get member and thread counts for each community
  const communitiesWithCounts = await Promise.all(
    (data || []).map(async (community) => {
      const [memberCountResult, threadCountResult] = await Promise.all([
        sb.from('community_members').select('id', { count: 'exact', head: true }).eq('community_id', community.id),
        sb.from('threads').select('id', { count: 'exact', head: true }).eq('community_id', community.id)
      ]);

      // Normalize nested creator profile (DB returns snake_case like avatar_url)
      const rawCreator = (community as any).creator;
      const mappedCreator = mapProfileToUser(rawCreator) || rawCreator;

      return {
        ...community,
        imageUrl: community.image_url,
        creator: {
          id: mappedCreator.id,
          username: mappedCreator.username,
          displayName: mappedCreator.displayName,
          avatarUrl: mappedCreator.avatarUrl,
        },
        memberCount: memberCountResult.count || 0,
        threadCount: threadCountResult.count || 0
      };
    })
  );

  return communitiesWithCounts;
}

export async function getCommunity(slug: string): Promise<HydratedCommunity | null> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('communities')
    .select(`
      *,
      creator:users!communities_creator_id_fkey(id, username, display_name, avatar_url)
    `)
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(error.message);
  }

  // Get member and thread counts
  const [memberCountResult, threadCountResult] = await Promise.all([
    sb.from('community_members').select('id', { count: 'exact', head: true }).eq('community_id', data.id),
    sb.from('threads').select('id', { count: 'exact', head: true }).eq('community_id', data.id)
  ]);

  // Check if current user is a member
  const authUser = await sb.auth.getUser();
  let isMember = false;
  if (authUser.data.user) {
    const { data: membership } = await sb
      .from('community_members')
      .select('id')
      .eq('community_id', data.id)
      .eq('user_id', authUser.data.user.id)
      .single();
    isMember = !!membership;
  }

  // Normalize creator profile
  const rawCreator = (data as any).creator;
  const mappedCreator = mapProfileToUser(rawCreator) || rawCreator;

  return { 
    ...data,
    imageUrl: data.image_url,
    creator: {
      id: mappedCreator.id,
      username: mappedCreator.username,
      displayName: mappedCreator.displayName,
      avatarUrl: mappedCreator.avatarUrl,
    },
    memberCount: memberCountResult.count || 0,
    threadCount: threadCountResult.count || 0,
    isMember 
  };
}

export async function createCommunity(input: { name: string; description: string; imageUrl?: string }): Promise<HydratedCommunity> {
  const sb = getSupabaseClient();
  const authUser = await sb.auth.getUser();
  if (!authUser.data.user) throw new Error('Not authenticated');

  const slug = slugify(input.name);

  const { data, error } = await sb
    .from('communities')
    .insert({
      id: crypto.randomUUID(),
      name: input.name,
      slug,
      description: input.description,
      image_url: input.imageUrl || null,
      creator_id: authUser.data.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select(`
      *,
      creator:users!communities_creator_id_fkey(id, username, display_name, avatar_url)
    `)
    .single();

  if (error) throw new Error(error.message);

  // Auto-join the creator
  await sb
    .from('community_members')
    .insert({
      id: crypto.randomUUID(),
      community_id: data.id,
      user_id: authUser.data.user.id,
      joined_at: new Date().toISOString()
    });

  return { 
    ...data, 
    imageUrl: data.image_url,
    memberCount: 1, 
    threadCount: 0, 
    isMember: true 
  };
}

export async function updateCommunity(slug: string, input: { name?: string; description?: string; imageUrl?: string }): Promise<HydratedCommunity> {
  const sb = getSupabaseClient();
  const authUser = await sb.auth.getUser();
  if (!authUser.data.user) throw new Error('Not authenticated');

  // First get the community to check ownership
  const { data: existingCommunity, error: fetchError } = await sb
    .from('communities')
    .select('*')
    .eq('slug', slug)
    .single();

  if (fetchError || !existingCommunity) throw new Error('Community not found');
  if (existingCommunity.creator_id !== authUser.data.user.id) throw new Error('You can only edit communities you created');

  // Prepare update data
  const updateData: any = {};
  if (input.name !== undefined) {
    updateData.name = input.name;
    updateData.slug = slugify(input.name);
  }
  if (input.description !== undefined) updateData.description = input.description;
  if (input.imageUrl !== undefined) updateData.image_url = input.imageUrl;
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await sb
    .from('communities')
    .update(updateData)
    .eq('id', existingCommunity.id)
    .eq('creator_id', authUser.data.user.id)
    .select(`
      *,
      creator:users!communities_creator_id_fkey(id, username, display_name, avatar_url)
    `)
    .single();

  if (error) throw new Error(error.message);

  // Get member and thread counts
  const [memberCountResult, threadCountResult] = await Promise.all([
    sb.from('community_members').select('id', { count: 'exact', head: true }).eq('community_id', data.id),
    sb.from('threads').select('id', { count: 'exact', head: true }).eq('community_id', data.id)
  ]);

  // Check if current user is a member
  let isMember = false;
  if (authUser.data.user) {
    const { data: membership } = await sb
      .from('community_members')
      .select('id')
      .eq('community_id', data.id)
      .eq('user_id', authUser.data.user.id)
      .single();
    isMember = !!membership;
  }

  // Normalize creator profile
  const rawCreator = (data as any).creator;
  const mappedCreator = mapProfileToUser(rawCreator) || rawCreator;

  return { 
    ...data,
    imageUrl: data.image_url,
    creator: {
      id: mappedCreator.id,
      username: mappedCreator.username,
      displayName: mappedCreator.displayName,
      avatarUrl: mappedCreator.avatarUrl,
    },
    memberCount: memberCountResult.count || 0,
    threadCount: threadCountResult.count || 0,
    isMember 
  };
}

export async function joinCommunity(communityId: string): Promise<void> {
  const sb = getSupabaseClient();
  const authUser = await sb.auth.getUser();
  if (!authUser.data.user) throw new Error('Not authenticated');

  const { error } = await sb
    .from('community_members')
    .insert({
      id: crypto.randomUUID(),
      community_id: communityId,
      user_id: authUser.data.user.id,
      joined_at: new Date().toISOString()
    });

  if (error) throw new Error(error.message);
}

export async function leaveCommunity(communityId: string): Promise<void> {
  const sb = getSupabaseClient();
  const authUser = await sb.auth.getUser();
  if (!authUser.data.user) throw new Error('Not authenticated');

  // Check if user is the creator
  const { data: community } = await sb
    .from('communities')
    .select('creator_id')
    .eq('id', communityId)
    .single();

  if (community?.creator_id === authUser.data.user.id) {
    throw new Error('Community creators cannot leave their communities');
  }

  const { error } = await sb
    .from('community_members')
    .delete()
    .eq('community_id', communityId)
    .eq('user_id', authUser.data.user.id);

  if (error) throw new Error(error.message);
}

export async function deleteCommunity(slug: string): Promise<boolean> {
  const sb = getSupabaseClient();
  const token = await getAccessToken(sb);
  const response = await fetch(`/api/communities?slug=${encodeURIComponent(slug)}`, {
    method: 'DELETE',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: 'include',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete community');
  }
  return true;
}

export async function isCommunityMember(communityId: string): Promise<boolean> {
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

export async function getCommunityThreads(communityId: string): Promise<HydratedThread[]> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('threads')
    .select(`
      *,
      user:users!threads_user_id_fkey(id, username, display_name, avatar_url),
      community:communities!threads_community_id_fkey(id, name)
    `)
    .eq('community_id', communityId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  // Get reply counts for each thread
  const threadsWithReplyCounts = await Promise.all(
    (data || []).map(async (thread) => {
      const { count } = await sb
        .from('thread_replies')
        .select('id', { count: 'exact', head: true })
        .eq('thread_id', thread.id);

      // Normalize nested user profile
      const rawUser = (thread as any).user;
      const mappedUser = mapProfileToUser(rawUser) || rawUser;

      return {
        ...thread,
        createdAt: thread.created_at,
        user: {
          id: mappedUser.id,
          username: mappedUser.username,
          displayName: mappedUser.displayName,
          avatarUrl: mappedUser.avatarUrl,
        },
        replyCount: count || 0
      };
    })
  );

  return threadsWithReplyCounts;
}

export async function getThread(id: string): Promise<HydratedThread | null> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('threads')
    .select(`
      *,
      user:users!threads_user_id_fkey(id, username, display_name, avatar_url),
      community:communities!threads_community_id_fkey(id, name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(error.message);
  }

  // Get reply count
  const { count } = await sb
    .from('thread_replies')
    .select('id', { count: 'exact', head: true })
    .eq('thread_id', id);

  // Normalize nested user profile
  const rawUser = (data as any).user;
  const mappedUser = mapProfileToUser(rawUser) || rawUser;

  return { 
    ...data,
    createdAt: data.created_at,
    user: {
      id: mappedUser.id,
      username: mappedUser.username,
      displayName: mappedUser.displayName,
      avatarUrl: mappedUser.avatarUrl,
    },
    replyCount: count || 0
  };
}

export async function getThreadBySlug(slug: string): Promise<HydratedThread | null> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('threads')
    .select(`
      *,
      user:users!threads_user_id_fkey(id, username, display_name, avatar_url),
      community:communities!threads_community_id_fkey(id, name)
    `)
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(error.message);
  }

  // Get reply count
  const { count } = await sb
    .from('thread_replies')
    .select('id', { count: 'exact', head: true })
    .eq('thread_id', data.id);

  // Normalize nested user profile
  const rawUser = (data as any).user;
  const mappedUser = mapProfileToUser(rawUser) || rawUser;

  return { 
    ...data,
    createdAt: data.created_at,
    user: {
      id: mappedUser.id,
      username: mappedUser.username,
      displayName: mappedUser.displayName,
      avatarUrl: mappedUser.avatarUrl,
    },
    replyCount: count || 0
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

export async function getThreadReplies(threadId: string): Promise<HydratedThreadReply[]> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('thread_replies')
    .select(`
      *,
      user:users!thread_replies_user_id_fkey(id, username, display_name, avatar_url)
    `)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  // Map user profiles
  return (data || []).map(reply => {
    const rawUser = (reply as any).user;
    const mappedUser = mapProfileToUser(rawUser) || rawUser;
    return {
      ...reply,
      createdAt: reply.created_at,
      user: {
        id: mappedUser.id,
        username: mappedUser.username,
        displayName: mappedUser.displayName,
        avatarUrl: mappedUser.avatarUrl,
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

  return {
    ...data,
    createdAt: data.created_at,
    user: {
      id: mappedUser.id,
      username: mappedUser.username,
      displayName: mappedUser.displayName,
      avatarUrl: mappedUser.avatarUrl,
    }
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