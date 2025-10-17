import { getSupabaseClient, getAccessToken } from "../client";
import { mapProfileToUser, DEFAULT_AVATAR } from "../utils";
import { slugify } from "../../utils";
import type { HydratedCommunity } from "../../types";

export async function getCommunities(): Promise<HydratedCommunity[]> {
  const sb = getSupabaseClient();
  const token = await getAccessToken(sb);
  const response = await fetch('/api/communities', {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: 'include',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch communities');
  }
  const data = await response.json();

  // Map the communities to include normalized creator profiles
  const mapped = data.map((community: any) => {
    // Normalize nested creator profile
    const rawCreator = community.creator;
    const mappedCreator = mapProfileToUser(rawCreator) || {
      id: rawCreator?.id || 'unknown',
      username: rawCreator?.username || 'unknown',
      displayName: rawCreator?.display_name || rawCreator?.displayName || null,
      avatarUrl: rawCreator?.avatar_url || rawCreator?.avatarUrl || DEFAULT_AVATAR,
    };

    return {
      ...community,
      imageUrl: community.image_url,
      creator: {
        id: mappedCreator.id,
        username: mappedCreator.username,
        displayName: mappedCreator.displayName,
        avatarUrl: mappedCreator.avatarUrl,
      },
    };
  });

  // If the server returned a `last_activity` timestamp, ensure clients show
  // the most recently active communities first as a safety-net in case the
  // RPC is not deployed or the fallback ordering was used server-side.
  try {
    mapped.sort((a: any, b: any) => {
      const ta = a.last_activity || a.lastActivity || a.updated_at || a.updatedAt || null;
      const tb = b.last_activity || b.lastActivity || b.updated_at || b.updatedAt || null;
      if (!ta && !tb) return 0;
      if (!ta) return 1;
      if (!tb) return -1;
      return new Date(tb).getTime() - new Date(ta).getTime();
    });
  } catch (e) {
    // noop
  }

  return mapped;
}

export async function getCommunity(slug: string): Promise<HydratedCommunity | null> {
  const sb = getSupabaseClient();
  const token = await getAccessToken(sb);
  const response = await fetch(`/api/communities?slug=${encodeURIComponent(slug)}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 404) return null;
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch community');
  }
  const data = await response.json();

  // Normalize creator profile
  const rawCreator = data.creator;
  const mappedCreator = mapProfileToUser(rawCreator) || {
    id: rawCreator?.id || 'unknown',
    username: rawCreator?.username || 'unknown',
    displayName: rawCreator?.display_name || rawCreator?.displayName || null,
    avatarUrl: rawCreator?.avatar_url || rawCreator?.avatarUrl || DEFAULT_AVATAR,
  };

  return {
    ...data,
    imageUrl: data.image_url,
    creator: {
      id: mappedCreator.id,
      username: mappedCreator.username,
      displayName: mappedCreator.displayName,
      avatarUrl: mappedCreator.avatarUrl,
    },
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