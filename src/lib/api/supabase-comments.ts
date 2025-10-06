import { getClient, logSupabaseError } from "./supabase-client";
import { DEFAULT_AVATAR } from "./supabase-utils";

export async function getComments(postId: string) {
  const sb = getClient();
  // Some DB schemas may use `post_id` or `postid` or `postId` as the column.
  // Try common variants and fall back gracefully.
  let data: any = null;
  let error: any = null;
  try {
    const res = await sb.from("comments").select("*, users!left(*)").eq("post_id", postId).order("created_at", { ascending: true });
    data = res.data; error = res.error;
  } catch (e) { error = e; }
  if (error) {
    try {
      const res2 = await sb.from("comments").select("*, users!left(*)").eq("postid", postId).order("createdat", { ascending: true });
      data = res2.data; error = res2.error;
    } catch (e) { error = e; }
  }
  if (error) throw error;
  const comments = (data || []) as any[];

  // If the related `users` join returned null (common when the DB doesn't have a foreign key
  // relationship), fetch the user rows by id and attach them client-side. This keeps the UI
  // working even when the DB schema lacks FK constraints.
  const missingUsers = comments.filter(c => !c.users).map(c => c.user_id || c.userId).filter(Boolean);
  let userMap: Record<string, any> = {};
  if (missingUsers.length) {
    try {
      const uniq = Array.from(new Set(missingUsers));
      const { data: usersData, error: usersErr } = await sb.from('users').select('*').in('id', uniq);
      if (!usersErr && usersData) {
        for (const u of usersData) userMap[u.id] = u;
      }
    } catch (e) {
      // ignore; we'll just render whatever we have
    }
  }

  return comments.map((c: any) => {
    const urow = c.users || userMap[c.user_id || c.userId] || null;
    return {
      id: c.id,
      postId: c.post_id || c.postId,
      userId: c.user_id || c.userId,
      text: c.text,
      createdAt: c.created_at || c.createdAt,
      user: {
        id: urow?.id || c.user_id,
        username: urow?.username || urow?.user_name || "",
        displayName: urow?.displayName || urow?.display_name || "",
          avatarUrl: urow?.avatarUrl || urow?.avatar_url || DEFAULT_AVATAR,
      }
    };
  });
}

export async function addComment(postId: string, text: string) {
  const cur = await getCurrentUser();
  if (!cur) throw new Error('Not logged in');
  if (!text?.trim()) throw new Error('Empty');
  const res = await fetch('/api/comments/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actorId: cur.id, postId, text }) });
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
  return { id: json.id, postId, userId: cur.id, text: text.trim(), createdAt: json.created_at, user: { id: profile.id, username: profile.username || '', displayName: profile.displayName || '', avatarUrl: profile.avatarUrl || '' } } as any;
}

// Helper function to get current user - needed for comments
async function getCurrentUser() {
  const sb = getClient();
  const user = await (await import("./supabase-client")).getCachedAuthUser(sb);
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
