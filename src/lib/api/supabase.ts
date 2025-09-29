import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Api, User, HydratedPost, Comment, CalendarStats } from "../types";
import { SUPABASE } from "../config";
import { uid } from "../id";

let supabase: SupabaseClient | null = null;

function getClient() {
  if (supabase) return supabase;
  if (!SUPABASE.url || !SUPABASE.anonKey) {
    throw new Error("Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  supabase = createClient(SUPABASE.url, SUPABASE.anonKey);
  return supabase;
}

// helper to log Supabase errors in the browser console with context
function logSupabaseError(context: string, res: { data?: any; error?: any }) {
  try {
    if (typeof window === "undefined") return;
    if (!res) return;
    const { error, data } = res as any;
    if (error) {
      // provide a concise, copyable object
      console.error(`Supabase error (${context})`, { message: error.message || error, code: error.code || error?.status || null, details: error.details || error, data });
    }
  } catch (e) {
    // swallow logging errors
    console.error("Failed to log supabase error", e);
  }
}

// small helpers to normalize DB rows to app types and to safely stringify debug objects
function safeStringify(v: any) {
  try {
    return JSON.stringify(v, null, 2);
  } catch (e) {
    try { return String(v); } catch { return "[unserializable]"; }
  }
}

function mapProfileToUser(profile: any) {
  if (!profile) return null;
  return {
    id: profile.id,
    username: profile.username || profile.user_name || "",
    displayName: profile.displayName || profile.display_name || "",
    avatarUrl: profile.avatarUrl || profile.avatar_url || "",
    bio: profile.bio,
    joinedAt: profile.joinedAt || profile.joined_at,
    following: profile.following,
    favorites: profile.favorites,
  } as any;
}

function mapRowToHydratedPost(row: any): HydratedPost {
  return {
    id: row.id,
    userId: row.user_id || row.userId,
    // prefer image_urls column (JSON/array) or legacy image_url
    imageUrls: row.image_urls || row.image_urls_json || row.image_urls_jsonb || (row.image_url ? [row.image_url] : undefined) || (row.imageUrl ? [row.imageUrl] : undefined),
    alt: row.alt || "",
    caption: row.caption || "",
    createdAt: row.created_at || row.createdAt,
    public: !!row.public,
    user: {
      id: row.users?.id || row.user_id,
      username: row.users?.username || row.users?.user_name || "",
      displayName: row.users?.displayName || row.users?.display_name || "",
      avatarUrl: row.users?.avatarUrl || row.users?.avatar_url || "",
    },
    commentsCount: row.comments_count || row.commentsCount || 0,
  } as HydratedPost;
}

// Safe helper to select specific fields from the users table.
// Some deployments / schema versions may not have columns like `favorites` or `following`.
// If the initial select fails with a 400 / schema-cache error, fall back to selecting '*' so
// callers can still get a profile row (without the requested field) and continue.
async function selectUserFields(sb: SupabaseClient, id: string, fields: string) {
  try {
    // To avoid triggering a 400 from the REST schema cache when requesting a column
    // that may not exist, fetch the entire profile first (select('*')). This is
    // safe and prevents the Supabase REST API from returning a Bad Request for
    // unknown columns. If callers specifically need only the requested fields,
    // they can still read them from the returned row.
    const res: any = await sb.from("users").select("*").eq("id", id).limit(1).single();
    if (res?.error) return res;
    return res;
  } catch (e) {
    // In case the client throws, return a shaped object similar to Supabase responses
    return { data: null, error: e } as any;
  }
}

// export the client accessor for UI components (auth flows) to call
export function getSupabaseClient() {
  return getClient();
}

// also export a named helper for other modules to access the raw supabase client
export function getSupabaseClientRaw() {
  return getClient();
}

export const supabaseApi: Api = {
  async init() {
    // client is lazy-initialized on first call
    if (typeof window === "undefined") return; // only initialize on client
    getClient();
  },

  async seed() { throw new Error("Not available in supabase mode"); },

  async getUsers() {
    const sb = getClient();
    const { data, error } = await sb.from("users").select("*");
    logSupabaseError("getUsers", { data, error });
    if (error) throw error;
    return data || [];
  },

  async getCurrentUser() {
    try {
      const sb = getClient();
  const { data: userData, error: userErr } = await sb.auth.getUser();
  logSupabaseError("auth.getUser", { data: userData, error: userErr });
  if (userErr) return null;
  const user = (userData as any)?.user;
      if (!user) return null;
      // try to find a matching profile in users table
  const { data: profile, error: profErr } = await sb.from("users").select("*").eq("id", user.id).limit(1).single();
      // If there's no profile row yet (or an error), synthesize a minimal profile from the auth user so UI reflects signed-in state
  if (profErr || !profile) {
        // synthesize and upsert a profile row so the DB and UI are in sync
  const synthUsername = user.user_metadata?.username || user.email?.split("@")[0] || user.id;
  // default display name to the username when no explicit name metadata exists
  const synthDisplay = user.user_metadata?.name || synthUsername;
        const synthAvatar = user.user_metadata?.avatar_url;
        const joinedAt = new Date().toISOString();
        const upsertObj: any = {
          id: user.id,
          username: synthUsername,
          display_name: synthDisplay,
          joined_at: joinedAt,
        };
        // only set avatar_url when the auth metadata has one; avoid overwriting an existing DB value with an empty string
        if (synthAvatar) upsertObj.avatar_url = synthAvatar;
        // perform upsert (creates a DB profile if missing)
        try {
          await sb.from("users").upsert(upsertObj);
        } catch (e) {
          // ignore upsert errors, still return synthesized profile
        }
        return {
          id: user.id,
          username: synthUsername,
          displayName: synthDisplay,
          avatarUrl: synthAvatar,
          joinedAt,
        } as any;
      }
      return mapProfileToUser(profile) as any;
    } catch (e) {
      return null;
    }
  },

  async loginAs() { return null; },

  async follow(userId: string) {
    // Call server endpoint to perform the follow operation with service role privileges
    const res = await fetch('/api/users/follow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actorId: (await this.getCurrentUser())?.id, targetId: userId }) });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'Failed to follow');
  },
  async unfollow(userId: string) {
    const res = await fetch('/api/users/unfollow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actorId: (await this.getCurrentUser())?.id, targetId: userId }) });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'Failed to unfollow');
  },
  async isFollowing(userId: string) {
    const sb = getClient();
    const { data: userData } = await sb.auth.getUser();
    const me = (userData as any)?.user;
    if (!me) return false;
    const { data: profile, error } = await sb.from("users").select("following").eq("id", me.id).limit(1).single();
    if (error || !profile) return false;
    const current: string[] = profile.following || [];
    return !!current.includes(userId);
  },

  async favoritePost(postId: string) {
    const res = await fetch('/api/posts/favorite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actorId: (await this.getCurrentUser())?.id, postId }) });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'Failed to favorite');
  },
  async unfavoritePost(postId: string) {
    const res = await fetch('/api/posts/unfavorite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actorId: (await this.getCurrentUser())?.id, postId }) });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'Failed to unfavorite');
  },
  async isFavorite(postId: string) {
    const cur = await this.getCurrentUser();
    if (!cur) return false;
    const posts = await this.getFavoritePosts();
    return posts.some(p => p.id === postId);
  },
  async getFavoritePosts() {
    // Keep this read operation client-side (reads are safe with anon key)
    const sb = getClient();
    const { data: userData } = await sb.auth.getUser();
    const me = (userData as any)?.user;
    if (!me) return [];
    const { data: profile, error: profErr } = await selectUserFields(sb, me.id, "favorites");
    if (profErr || !profile) return [];
    const ids: string[] = profile.favorites || [];
    if (!ids.length) return [];
    const { data, error } = await sb.from("posts").select("*, users:users(*)").in("id", ids);
    if (error) throw error;
    return (data || []).map((row: any) => mapRowToHydratedPost(row));
  },

  async getExploreFeed() {
    console.debug("supabaseApi.getExploreFeed called");
    const sb = getClient();
  const { data, error } = await sb.from("posts").select("*, users:users(*)").eq("public", true).order("created_at", { ascending: false });
  logSupabaseError("getExploreFeed", { data, error });
    if (error) throw error;
    return (data || []).map((row: any) => mapRowToHydratedPost(row));
  },

  async getExploreFeedPage({ limit, before }: { limit: number; before?: string }) {
    const sb = getClient();
    let q: any = sb.from("posts").select("*, users:users(*)").eq("public", true).order("created_at", { ascending: false }).limit(limit);
    if (before) q = q.lt("created_at", before);
    const { data, error } = await q;
    logSupabaseError("getExploreFeedPage", { data, error });
    if (error) throw error;
    return (data || []).map((row: any) => mapRowToHydratedPost(row));
  },

  async getFollowingFeed() {
    // Use client-side reads for feed; follow list comes from users table
    const sb = getClient();
    const { data: userData } = await sb.auth.getUser();
    const me = (userData as any)?.user;
    if (!me) return [];
    const { data: profile, error: profErr } = await sb.from("users").select("following").eq("id", me.id).limit(1).single();
    if (profErr || !profile) return [];
    const ids: string[] = profile.following || [];
    if (!ids.length) return [];
    const { data, error } = await sb.from("posts").select("*, users:users(*)").in("user_id", ids).eq("public", true).order("created_at", { ascending: false });
    logSupabaseError("getFollowingFeed", { data, error });
    if (error) throw error;
    return (data || []).map((row: any) => mapRowToHydratedPost(row));
  },

  async getFollowingFeedPage({ limit, before }: { limit: number; before?: string }) {
    const sb = getClient();
    const { data: userData } = await sb.auth.getUser();
    const me = (userData as any)?.user;
    if (!me) return [];
    const { data: profile, error: profErr } = await sb.from("users").select("following").eq("id", me.id).limit(1).single();
    if (profErr || !profile) return [];
    const ids: string[] = profile.following || [];
    if (!ids.length) return [];
    let q: any = sb.from("posts").select("*, users:users(*)").in("user_id", ids).eq("public", true).order("created_at", { ascending: false }).limit(limit);
    if (before) q = q.lt("created_at", before);
    const { data, error } = await q;
    logSupabaseError("getFollowingFeedPage", { data, error });
    if (error) throw error;
    return (data || []).map((row: any) => mapRowToHydratedPost(row));
  },

  async getUserPosts(userId: string) {
    const sb = getClient();
  const { data, error } = await sb.from("posts").select("*, users:users(*)").eq("user_id", userId).order("created_at", { ascending: false });
  logSupabaseError("getUserPosts", { data, error });
    if (error) throw error;
    return (data || []).map((row: any) => mapRowToHydratedPost(row));
  },

  async getUser(id: string) {
    const sb = getClient();
    const { data, error } = await sb.from("users").select("*").eq("id", id).limit(1).single();
    if (error) return null;
    const profile = data as any;
    return mapProfileToUser(profile) as any;
  },

  async updateUser(id: string, patch: Partial<User>) {
    const sb = getClient();
    const upd: any = {};
    if (patch.username !== undefined) upd.username = patch.username;
    if (patch.displayName !== undefined) upd.display_name = patch.displayName;
    if (patch.avatarUrl !== undefined) upd.avatar_url = patch.avatarUrl;
    if (patch.bio !== undefined) upd.bio = patch.bio;
    const { error, data } = await sb.from("users").update(upd).eq("id", id).select("*").limit(1).single();
    if (error) throw error;
    const profile = data as any;
    return {
      id: profile.id,
      username: profile.username || profile.user_name,
      displayName: profile.displayName || profile.display_name,
      avatarUrl: profile.avatarUrl || profile.avatar_url,
      bio: profile.bio,
      joinedAt: profile.joinedAt || profile.joined_at,
    } as any;
  },

  async updateCurrentUser(patch: Partial<User>) {
    const sb = getClient();
    const { data: userData } = await sb.auth.getUser();
    const user = (userData as any)?.user;
    if (!user) throw new Error("Not logged in");
    const upsertObj: any = { id: user.id };
    if (patch.username !== undefined) upsertObj.username = patch.username;
    if (patch.displayName !== undefined) upsertObj.display_name = patch.displayName;
    if (patch.avatarUrl !== undefined) upsertObj.avatar_url = patch.avatarUrl;
    if (patch.bio !== undefined) upsertObj.bio = patch.bio;
    const safe = (v: any) => { try { return JSON.stringify(v, null, 2); } catch (e) { try { return String(v); } catch { return "[unserializable]"; } } };
    console.debug("users.upsert payload", safe(upsertObj));
    const res = await sb.from("users").upsert(upsertObj).select("*").limit(1).single();
    console.debug("users.upsert result (stringified)", safe(res));
    const { error, data } = res as any;
    if (error) {
      console.error("users.upsert error", { message: error.message || error, code: error.code || error?.status || null, details: error.details || error?.error || null, full: error });
      throw error;
    }
    const profile = data as any;
    return {
      id: profile.id,
      username: profile.username || profile.user_name,
      displayName: profile.displayName || profile.display_name,
      avatarUrl: profile.avatarUrl || profile.avatar_url,
      bio: profile.bio,
      joinedAt: profile.joinedAt || profile.joined_at,
    } as any;
  },

  async getPostsByDate(dateKey: string) {
    const sb = getClient();
    const start = new Date(dateKey + "T00:00:00.000Z");
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
  const { data, error } = await sb.from("posts").select("*, users:users(*)").gte("created_at", start.toISOString()).lt("created_at", end.toISOString()).order("created_at", { ascending: false });
  logSupabaseError("getPostsByDate", { data, error });
  if (error) throw error;
    return (data || []).map((row: any) => mapRowToHydratedPost(row));
  },

  async getPost(id: string) {
    const sb = getClient();
  const { data, error } = await sb.from("posts").select("*, users:users(*)").eq("id", id).limit(1).single();
  logSupabaseError("getPost", { data, error });
  if (error) return null;
    const row = data as any;
    return mapRowToHydratedPost(row) as any;
  },

  async updatePost(id: string, patch: { caption?: string; alt?: string; public?: boolean }) {
    const res = await fetch('/api/posts/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, patch }) });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'Failed to update post');
    return await (this as any).getPost(id) as any;
  },

  async deletePost(id: string) {
    const res = await fetch('/api/posts/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'Failed to delete post');
    return true;
  },

  async getComments(postId: string) {
    const sb = getClient();
    const { data, error } = await sb.from("comments").select("*, users:users(*)").eq("post_id", postId).order("created_at", { ascending: true });
    if (error) throw error;
    return (data || []).map((c: any) => ({
      id: c.id,
      postId: c.post_id || c.postId,
      userId: c.user_id || c.userId,
      text: c.text,
      createdAt: c.created_at || c.createdAt,
      user: {
        id: c.users?.id || c.user_id,
        username: c.users?.username || c.users?.user_name || "",
        displayName: c.users?.displayName || c.users?.display_name || "",
        avatarUrl: c.users?.avatarUrl || c.users?.avatar_url || "",
      }
    }));
  },

  async addComment(postId: string, text: string) {
    const cur = await this.getCurrentUser();
    if (!cur) throw new Error('Not logged in');
    if (!text?.trim()) throw new Error('Empty');
    const res = await fetch('/api/comments/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actorId: cur.id, postId, text }) });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'Failed to add comment');
    return { id: json.id, postId, userId: cur.id, text: text.trim(), createdAt: json.created_at, user: { id: cur.id, username: cur.username || '', displayName: cur.displayName || '', avatarUrl: cur.avatarUrl || '' } } as any;
  },

  async canPostToday() {
    const sb = getClient();
    const { data: userData } = await sb.auth.getUser();
    const user = (userData as any)?.user;
    if (!user) return { allowed: false, reason: "Not logged in" };
    // Check for the most recent post by this user and return a 24h cooldown
    const { data: recent, error: recentErr } = await sb
      .from("posts")
      .select("created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recentErr) throw recentErr;
    if (recent && (recent as any).created_at) {
      const lastTs = new Date((recent as any).created_at).getTime();
      const next = lastTs + 24 * 60 * 60 * 1000;
      const allowed = Date.now() >= next;
      if (!allowed) return { allowed: false, reason: "You already posted in the last 24 hours", nextAllowedAt: next };
    }
    return { allowed: true };
  },

  async createOrReplaceToday({ imageUrl, imageUrls, caption, alt, replace = false, public: isPublic = true }) {
    const cur = await this.getCurrentUser();
    if (!cur) throw new Error('Not logged in');

    // For uploads, convert any data URLs via the server storage endpoint so the server can store via service role
    const inputs: string[] = imageUrls && imageUrls.length ? imageUrls.slice(0, 5) : imageUrl ? [imageUrl] : [];
    const finalUrls: string[] = [];
    for (const img of inputs) {
      if (!img) continue;
      if (typeof img === 'string' && img.startsWith('data:')) {
        const uploadRes = await fetch('/api/storage/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: cur.id, dataUrl: img }) });
        const up = await uploadRes.json();
        if (!uploadRes.ok) {
          console.warn('Server upload failed, falling back to data-url', up?.error);
          finalUrls.push(img as string);
        } else finalUrls.push(up.publicUrl);
      } else {
        finalUrls.push(img as string);
      }
    }

    // call server create endpoint
    const res = await fetch('/api/posts/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: cur.id, imageUrls: finalUrls, caption, alt, replace, public: isPublic }) });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'Failed to create post');
    return json.post as any;
    
  },

  async calendarStats({ year, monthIdx }) {
    const sb = getClient();
    // This implementation assumes posts.created_at is a timestamp
    const start = new Date(year, monthIdx, 1).toISOString();
    const end = new Date(year, monthIdx + 1, 1).toISOString();
    const { data, error } = await sb.from("posts").select("created_at").gte("created_at", start).lt("created_at", end);
    if (error) throw error;
    const map: Record<string, number> = {};
    const mine = new Set<string>();
    for (const p of data || []) {
      const dk = new Date(p.created_at).toISOString().slice(0, 10);
      map[dk] = (map[dk] || 0) + 1;
    }
    return { counts: map, mine } as CalendarStats;
  },
  async signOut() {
    try {
      const sb = getClient();
      await sb.auth.signOut();
    } catch (e) {
      console.warn("supabase.signOut failed", e);
    }
  },
};