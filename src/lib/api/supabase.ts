import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Api, User, HydratedPost, Comment, CalendarStats } from "../types";
import { SUPABASE } from "../config";
import { uid } from "../id";

let supabase: SupabaseClient | null = null;
// cached auth user to avoid repeated auth.getUser() calls during a client session.
// undefined = not yet fetched, null = fetched and no active session, object = auth user
let cachedAuthUser: any | null | undefined = undefined;
let authStateSub: any = null;

function getClient() {
  if (supabase) return supabase;
  // Prefer build-time NEXT_PUBLIC_* values, but if those are not present (for
  // example when the client bundle was built before .env.local existed), allow
  // a runtime injection via window.__MONOLOG_RUNTIME_SUPABASE__ which is set
  // by the runtime override helper. This is safe because the anon key and URL
  // are public values intended for client-side use.
  let url = SUPABASE.url;
  let anonKey = SUPABASE.anonKey;
  try {
    if ((!url || !anonKey) && typeof window !== 'undefined' && (window as any).__MONOLOG_RUNTIME_SUPABASE__) {
      const r = (window as any).__MONOLOG_RUNTIME_SUPABASE__;
      url = url || r.url || '';
      anonKey = anonKey || r.anonKey || '';
    }
  } catch (e) {
    // ignore
  }
  if (!url || !anonKey) {
    throw new Error("Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  supabase = createClient(url, anonKey);
  return supabase;
}

// Fetch auth user once and cache the result. If an auth error indicates no session,
// cache null. Also log unexpected errors via logSupabaseError for visibility.
async function fetchAndCacheAuthUser(sb: SupabaseClient) {
  try {
    const { data, error } = await sb.auth.getUser();
    logSupabaseError("auth.getUser", { data, error });
    if (error) {
      // benign missing-session errors are filtered by logSupabaseError; still cache null
      cachedAuthUser = null;
      return null;
    }
    const user = (data as any)?.user ?? null;
    cachedAuthUser = user;
    return user;
  } catch (e) {
    cachedAuthUser = null;
    return null;
  }
}

// Return cached auth user when available, otherwise fetch and cache it.
async function getCachedAuthUser(sb: SupabaseClient) {
  if (cachedAuthUser !== undefined) return cachedAuthUser;
  return await fetchAndCacheAuthUser(sb);
}

// Set up a client-side auth state change listener to keep the cache in sync.
function ensureAuthListener(sb: SupabaseClient) {
  if (typeof window === "undefined") return;
  if (authStateSub) return;
  try {
    // supabase-js v2 returns a { data: { subscription } } shape from onAuthStateChange
    const sub = sb.auth.onAuthStateChange((event: string, session: any) => {
      // session may be null on sign-out
      cachedAuthUser = session?.user ?? null;
    });
    authStateSub = sub;
  } catch (e) {
    // non-fatal; listener is only an optimization
  }
}

// helper to log Supabase errors in the browser console with context
function logSupabaseError(context: string, res: { data?: any; error?: any }) {
  try {
    if (typeof window === "undefined") return;
    if (!res) return;
    const { error, data } = res as any;
    if (error) {
      // Certain auth errors are expected when there's no active session
      // (for example calling auth.getUser() before sign-in). Those are
      // noisy but benign; ignore them to avoid spamming the console.
      const msg = error?.message || "";
      if (typeof msg === "string") {
        const lower = msg.toLowerCase();
        if (lower.includes("auth session missing") || lower.includes("no active session")) {
          return;
        }
      }
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
    // If the server query included a `comments` array, use its length. Otherwise
    // fall back to common count columns or 0.
    commentsCount: (row.comments && Array.isArray(row.comments) ? row.comments.length : (row.comments_count || row.commentsCount || 0)),
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
    const sb = getClient();
    ensureAuthListener(sb);
    // prefetch cached user
    fetchAndCacheAuthUser(sb).catch(() => {});
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
      ensureAuthListener(sb);
      const user = await getCachedAuthUser(sb);
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
    ensureAuthListener(sb);
    const me = await getCachedAuthUser(sb);
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
    ensureAuthListener(sb);
    const me = await getCachedAuthUser(sb);
    if (!me) return [];
    const { data: profile, error: profErr } = await selectUserFields(sb, me.id, "favorites");
    if (profErr || !profile) return [];
    const ids: string[] = profile.favorites || [];
    if (!ids.length) return [];
  const { data, error } = await sb.from("posts").select("*, users:users(*), comments:comments(id)").in("id", ids);
    if (error) throw error;
    return (data || []).map((row: any) => mapRowToHydratedPost(row));
  },

  async getExploreFeed() {
    console.debug("supabaseApi.getExploreFeed called");
    const sb = getClient();
  const { data, error } = await sb.from("posts").select("*, users:users(*), comments:comments(id)").eq("public", true).order("created_at", { ascending: false });
  logSupabaseError("getExploreFeed", { data, error });
    if (error) throw error;
    return (data || []).map((row: any) => mapRowToHydratedPost(row));
  },

  async getExploreFeedPage({ limit, before }: { limit: number; before?: string }) {
    const sb = getClient();
  let q: any = sb.from("posts").select("*, users:users(*), comments:comments(id)").eq("public", true).order("created_at", { ascending: false }).limit(limit);
    if (before) q = q.lt("created_at", before);
  const { data, error } = await q;
    logSupabaseError("getExploreFeedPage", { data, error });
    if (error) throw error;
    return (data || []).map((row: any) => mapRowToHydratedPost(row));
  },

  async getFollowingFeed() {
    // Use client-side reads for feed; follow list comes from users table
    const sb = getClient();
    ensureAuthListener(sb);
    const me = await getCachedAuthUser(sb);
    if (!me) return [];
    const { data: profile, error: profErr } = await sb.from("users").select("following").eq("id", me.id).limit(1).single();
    if (profErr || !profile) return [];
    const ids: string[] = profile.following || [];
    if (!ids.length) return [];
  const { data, error } = await sb.from("posts").select("*, users:users(*), comments:comments(id)").in("user_id", ids).eq("public", true).order("created_at", { ascending: false });
    logSupabaseError("getFollowingFeed", { data, error });
    if (error) throw error;
    return (data || []).map((row: any) => mapRowToHydratedPost(row));
  },

  async getFollowingFeedPage({ limit, before }: { limit: number; before?: string }) {
    const sb = getClient();
    ensureAuthListener(sb);
    const me = await getCachedAuthUser(sb);
    if (!me) return [];
    const { data: profile, error: profErr } = await sb.from("users").select("following").eq("id", me.id).limit(1).single();
    if (profErr || !profile) return [];
    const ids: string[] = profile.following || [];
    if (!ids.length) return [];
  let q: any = sb.from("posts").select("*, users:users(*), comments:comments(id)").in("user_id", ids).eq("public", true).order("created_at", { ascending: false }).limit(limit);
    if (before) q = q.lt("created_at", before);
    const { data, error } = await q;
    logSupabaseError("getFollowingFeedPage", { data, error });
    if (error) throw error;
    return (data || []).map((row: any) => mapRowToHydratedPost(row));
  },

  async getUserPosts(userId: string) {
    const sb = getClient();
  const { data, error } = await sb.from("posts").select("*, users:users(*), comments:comments(id)").eq("user_id", userId).order("created_at", { ascending: false });
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

  // Resolve a username (or legacy user_name) to a profile. Returns null when not found.
  async getUserByUsername(username: string) {
    // getClient() may throw synchronously if build-time NEXT_PUBLIC_* vars
    // are missing and the runtime override hasn't yet injected window.__MONOLOG_RUNTIME_SUPABASE__.
    // To avoid a hard failure during hydration/refresh, poll briefly for the
    // runtime keys and retry getClient() before giving up.
    let sb: SupabaseClient | null = null;
    try {
      sb = getClient();
    } catch (err) {
      // If we're in a browser environment, wait up to 1s for the runtime
      // override to populate keys and then try again. This handles the
      // race where the bundle was built without NEXT_PUBLIC_ vars but the
      // server provides them at runtime via /api/debug/env.
      if (typeof window !== 'undefined') {
        const waitForRuntime = async (timeout = 1000, interval = 100) => {
          const start = Date.now();
          while (Date.now() - start < timeout) {
            if ((window as any).__MONOLOG_RUNTIME_SUPABASE__) {
              try {
                return getClient();
              } catch (e) {
                // continue waiting
              }
            }
            // small delay
            // eslint-disable-next-line no-await-in-loop
            await new Promise((r) => setTimeout(r, interval));
          }
          // final attempt
          return getClient();
        };
        try {
          sb = await waitForRuntime();
        } catch (e) {
          // give up and return null so caller shows 'not found' instead of crashing
          return null;
        }
      } else {
        return null;
      }
    }

    try {
      // try common column name 'username'
      let res: any = await sb.from("users").select("*").eq("username", username).limit(1).maybeSingle();
      if (!res.error && res.data) return mapProfileToUser(res.data) as any;
    } catch (e) {
      // ignore and try fallback
    }
    try {
      // fallback to legacy 'user_name' column
      let res2: any = await sb.from("users").select("*").eq("user_name", username).limit(1).maybeSingle();
      if (!res2.error && res2.data) return mapProfileToUser(res2.data) as any;
    } catch (e) {
      // ignore
    }
    // final attempt: case-insensitive match on username
    try {
      const res3: any = await sb.from("users").select("*").ilike("username", username).limit(1).maybeSingle();
      if (!res3.error && res3.data) return mapProfileToUser(res3.data) as any;
    } catch (e) {
      // ignore
    }
    return null;
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
    ensureAuthListener(sb);
    const user = await getCachedAuthUser(sb);
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
  const { data, error } = await sb.from("posts").select("*, users:users(*), comments:comments(id)").gte("created_at", start.toISOString()).lt("created_at", end.toISOString()).order("created_at", { ascending: false });
  logSupabaseError("getPostsByDate", { data, error });
  if (error) throw error;
    return (data || []).map((row: any) => mapRowToHydratedPost(row));
  },

  async getPost(id: string) {
    const sb = getClient();
  const { data, error } = await sb.from("posts").select("*, users:users(*), comments:comments(id)").eq("id", id).limit(1).single();
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
    // Some DB schemas may use `post_id` or `postid` or `postId` as the column.
    // Try common variants and fall back gracefully.
    let data: any = null;
    let error: any = null;
    try {
      const res = await sb.from("comments").select("*, users:users(*)").eq("post_id", postId).order("created_at", { ascending: true });
      data = res.data; error = res.error;
    } catch (e) { error = e; }
    if (error) {
      try {
        const res2 = await sb.from("comments").select("*, users:users(*)").eq("postid", postId).order("createdat", { ascending: true });
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
          avatarUrl: urow?.avatarUrl || urow?.avatar_url || "",
        }
      };
    });
  },

  async addComment(postId: string, text: string) {
    const cur = await this.getCurrentUser();
    if (!cur) throw new Error('Not logged in');
    if (!text?.trim()) throw new Error('Empty');
    const res = await fetch('/api/comments/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actorId: cur.id, postId, text }) });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'Failed to add comment');
    // refresh current user's profile from users table so we return the up-to-date displayName / avatarUrl
    let profile = await this.getCurrentUser();
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
  },

  async canPostToday() {
    const sb = getClient();
    ensureAuthListener(sb);
    const user = await getCachedAuthUser(sb);
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