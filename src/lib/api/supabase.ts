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
        const synthDisplay = user.user_metadata?.name || user.email?.split("@")[0] || user.id;
        const synthAvatar = user.user_metadata?.avatar_url || "";
        const joinedAt = new Date().toISOString();
        const upsertObj: any = {
          id: user.id,
          username: synthUsername,
          display_name: synthDisplay,
          avatar_url: synthAvatar,
          joined_at: joinedAt,
        };
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
      // map snake_case DB columns to the app's User shape if necessary
      const mapped = {
        id: profile.id,
        username: (profile.username || profile.user_name || "") as string,
        displayName: (profile.displayName || profile.display_name || profile.displayname || "") as string,
        avatarUrl: (profile.avatarUrl || profile.avatar_url || "") as string,
        bio: profile.bio,
        joinedAt: profile.joinedAt || profile.joined_at,
        following: profile.following,
      } as any;
      return mapped;
    } catch (e) {
      return null;
    }
  },

  async loginAs() { return null; },

  async follow() { /* implement application logic with follow table if desired */ },
  async unfollow() { /* implement application logic with follow table if desired */ },
  async isFollowing() { return false; },

  async getExploreFeed() {
    const sb = getClient();
  const { data, error } = await sb.from("posts").select("*, users:users(*)").eq("public", true).order("created_at", { ascending: false });
  logSupabaseError("getExploreFeed", { data, error });
    if (error) throw error;
    const posts: HydratedPost[] = (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id || row.userId,
      imageUrl: row.image_url || row.imageUrl,
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
    }));
    return posts;
  },

  async getFollowingFeed() { return []; },

  async getUserPosts(userId: string) {
    const sb = getClient();
  const { data, error } = await sb.from("posts").select("*, users:users(*)").eq("user_id", userId).order("created_at", { ascending: false });
  logSupabaseError("getUserPosts", { data, error });
    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id || row.userId,
      imageUrl: row.image_url || row.imageUrl,
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
    }));
  },

  async getUser(id: string) {
    const sb = getClient();
    const { data, error } = await sb.from("users").select("*").eq("id", id).limit(1).single();
    if (error) return null;
    return data || null;
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
    const { error, data } = await sb.from("users").upsert(upsertObj).select("*").limit(1).single();
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

  async getPostsByDate(dateKey: string) {
    const sb = getClient();
    const start = new Date(dateKey + "T00:00:00.000Z");
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
  const { data, error } = await sb.from("posts").select("*, users:users(*)").gte("created_at", start.toISOString()).lt("created_at", end.toISOString()).order("created_at", { ascending: false });
  logSupabaseError("getPostsByDate", { data, error });
  if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id || row.userId,
      imageUrl: row.image_url || row.imageUrl,
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
    }));
  },

  async getPost(id: string) {
    const sb = getClient();
  const { data, error } = await sb.from("posts").select("*, users:users(*)").eq("id", id).limit(1).single();
  logSupabaseError("getPost", { data, error });
  if (error) return null;
    const row = data as any;
    return {
      id: row.id,
      userId: row.user_id || row.userId,
      imageUrl: row.image_url || row.imageUrl,
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
    } as any;
  },

  async updatePost(id: string, patch: { caption?: string; alt?: string; public?: boolean }) {
    const sb = getClient();
    const updates: any = {};
    if (patch.caption !== undefined) updates.caption = patch.caption;
    if (patch.alt !== undefined) updates.alt = patch.alt;
    if (patch.public !== undefined) updates.public = patch.public;
    const { error } = await sb.from("posts").update(updates).eq("id", id);
    if (error) throw error;
    return await (this as any).getPost(id) as any;
  },

  async deletePost(id: string) {
    const sb = getClient();
    const { data: post, error: postErr } = await sb.from("posts").select("*").eq("id", id).limit(1).single();
    logSupabaseError("deletePost.fetchPost", { data: post, error: postErr });
    const imageUrl = (post as any)?.image_url || (post as any)?.imageUrl;
    if (imageUrl) {
      try {
        const base = SUPABASE.url.replace(/\/$/, '') + "/storage/v1/object/public/posts/";
        if (typeof imageUrl === "string" && imageUrl.startsWith(base)) {
          const path = decodeURIComponent(imageUrl.slice(base.length));
          await sb.storage.from("posts").remove([path]);
        }
      } catch (e) {
        console.warn("Failed to remove storage object for deleted post", e);
      }
    }
    const { data: delCommentsData, error: delCommentsErr } = await sb.from("comments").delete().eq("post_id", id);
    logSupabaseError("deletePost.deleteComments", { data: delCommentsData, error: delCommentsErr });
    const { data: delPostData, error: delPostErr } = await sb.from("posts").delete().eq("id", id);
    logSupabaseError("deletePost.deletePostRow", { data: delPostData, error: delPostErr });
    if (delPostErr) throw delPostErr;
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
    const sb = getClient();
    const { data: userData } = await sb.auth.getUser();
    const user = (userData as any)?.user;
    if (!user) throw new Error("Not logged in");
    if (!text?.trim()) throw new Error("Empty");
    const id = uid();
    const created_at = new Date().toISOString();
    const { error } = await sb.from("comments").insert({ id, post_id: postId, user_id: user.id, text: text.trim(), created_at });
    if (error) throw error;
    return { id, postId, userId: user.id, text: text.trim(), createdAt: created_at, user: { id: user.id, username: user.user_metadata?.username || user.email?.split("@")[0] || user.id, displayName: user.user_metadata?.name || user.email?.split("@")[0] || user.id, avatarUrl: user.user_metadata?.avatar_url || "" } } as any;
  },

  async canPostToday() {
    const sb = getClient();
    const { data: userData } = await sb.auth.getUser();
    const user = (userData as any)?.user;
    if (!user) return { allowed: false, reason: "Not logged in" };
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    const { data, error } = await sb
      .from("posts")
      .select("id")
      .eq("user_id", user.id)
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString())
      .limit(1);
    if (error) throw error;
    const exists = (data || []).length > 0;
    if (exists) return { allowed: false, reason: "You already posted today" };
    return { allowed: true };
  },

  async createOrReplaceToday({ imageUrl, caption, alt, replace = false, public: isPublic = true }) {
    const sb = getClient();
    const { data: userData } = await sb.auth.getUser();
    const user = (userData as any)?.user;
    if (!user) throw new Error("Not logged in");

    // ensure profile exists in users table (use snake_case column names)
    const { data: upsertProfileData, error: upsertProfileErr } = await sb.from("users").upsert({ id: user.id, username: user.user_metadata?.username || user.email?.split("@")[0] || user.id, display_name: user.user_metadata?.name || user.email?.split("@")[0] || user.id, avatar_url: user.user_metadata?.avatar_url || "", joined_at: new Date().toISOString() });
    logSupabaseError("createOrReplaceToday.upsertUser", { data: upsertProfileData, error: upsertProfileErr });

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    const { data: todays, error: todaysErr } = await sb
      .from("posts")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString());
    if ((todays || []).length && !replace) {
      const err: any = new Error("Already posted today");
      err.code = "LIMIT";
      throw err;
    }

    if ((todays || []).length && replace) {
      // delete existing posts for today (and their comments) and cleanup storage objects
      const ids = (todays || []).map((p: any) => p.id);
      const imageUrls = (todays || []).map((p: any) => p.image_url || p.imageUrl);
  // delete comments
  const { data: delCommentsData, error: delCommentsErr } = await sb.from("comments").delete().in("post_id", ids).or(`post_id.in.(${ids.map((i:any)=>`'${i}'`).join(',')})`);
  logSupabaseError("createOrReplaceToday.deleteComments", { data: delCommentsData, error: delCommentsErr });
      // attempt to remove storage objects for each image_url that points to our posts bucket
      try {
        const base = SUPABASE.url.replace(/\/$/, '') + "/storage/v1/object/public/posts/";
        const toRemove: string[] = [];
        for (const u of imageUrls) {
          if (!u) continue;
          if (typeof u === "string" && u.startsWith(base)) {
            const path = decodeURIComponent(u.slice(base.length));
            toRemove.push(path);
          }
        }
        if (toRemove.length) {
          const { data: remData, error: remErr } = await sb.storage.from("posts").remove(toRemove);
          logSupabaseError("createOrReplaceToday.storage.remove", { data: remData, error: remErr });
        }
      } catch (e) {
        console.warn("Failed to remove storage objects for replaced posts", e);
      }
      // finally delete post rows
      const { data: delPostsData, error: delPostsErr } = await sb.from("posts").delete().in("id", ids);
      logSupabaseError("createOrReplaceToday.deletePosts", { data: delPostsData, error: delPostsErr });
    }

    // Convert data URL to Blob/File if necessary and upload to storage
    let finalUrl = imageUrl;
    try {
      // Only attempt upload if imageUrl looks like a data URL
      if (typeof imageUrl === "string" && imageUrl.startsWith("data:")) {
        const parts = imageUrl.split(",");
        const meta = parts[0];
        const mime = meta.split(":")[1].split(";")[0];
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) u8arr[n] = bstr.charCodeAt(n);
        const file = new File([u8arr], `${uid()}.jpg`, { type: mime });

        const path = `${user.id}/${file.name}`;
        const { data: uploadData, error: uploadErr } = await sb.storage.from("posts").upload(path, file, { upsert: true });
        logSupabaseError("createOrReplaceToday.storage.upload", { data: uploadData, error: uploadErr });
        if (uploadErr) throw uploadErr;
        const { data: urlData } = sb.storage.from("posts").getPublicUrl(path);
        finalUrl = urlData.publicUrl;
      }
    } catch (e) {
      console.warn("Storage upload failed, falling back to storing imageUrl directly", e);
    }

    const id = uid();
  const { data: insertData, error: insertErr } = await sb.from("posts").insert({ id, user_id: user.id, image_url: finalUrl, alt: alt || "", caption: caption || "", created_at: new Date().toISOString(), public: !!isPublic });
    logSupabaseError("createOrReplaceToday.insertPost", { data: insertData, error: insertErr });
    if (insertErr) throw insertErr;

  // fetch profile for hydration (map snake_case)
  const { data: profile, error: profErr } = await sb.from("users").select("id,username,display_name,avatar_url").eq("id", user.id).limit(1).single();
    logSupabaseError("createOrReplaceToday.fetchProfile", { data: profile, error: profErr });

    const post: HydratedPost = {
      id,
      userId: user.id,
      imageUrl: finalUrl,
      alt: alt || "",
      caption: caption || "",
      createdAt: new Date().toISOString(),
      public: !!isPublic,
      user: {
        id: profile?.id || user.id,
        username: profile?.username || "",
        displayName: profile?.display_name || "",
        avatarUrl: profile?.avatar_url || "",
      },
      commentsCount: 0,
    };

    return post;
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
};