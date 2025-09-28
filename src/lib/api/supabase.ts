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

// export the client accessor for UI components (auth flows) to call
export function getSupabaseClient() {
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
    if (error) throw error;
    return data || [];
  },

  async getCurrentUser() {
    try {
      const sb = getClient();
  const { data: userData, error: userErr } = await sb.auth.getUser();
  if (userErr) return null;
  const user = (userData as any)?.user;
      if (!user) return null;
      // try to find a matching profile in users table
  const { data: profile, error: profErr } = await sb.from("users").select("*").eq("id", user.id).limit(1).single();
      // If there's no profile row yet (or an error), synthesize a minimal profile from the auth user so UI reflects signed-in state
      if (profErr || !profile) {
        const synth: any = {
          id: user.id,
          username: user.user_metadata?.username || user.email?.split("@")[0] || user.id,
          displayName: user.user_metadata?.name || user.email?.split("@")[0] || user.id,
          avatarUrl: user.user_metadata?.avatar_url || "",
          joinedAt: new Date().toISOString(),
        };
        return synth as any;
      }
      return profile || null;
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
  const { data, error } = await sb.from("posts").select("*, users:users(*)").eq("userId", userId).order("created_at", { ascending: false });
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

  async updateUser() { throw new Error("NI"); },
  async updateCurrentUser() { throw new Error("NI"); },

  async getPostsByDate() { return []; },
  async getPost() { return null; },
  async updatePost() { throw new Error("NI"); },
  async deletePost() { return false; },

  async getComments(postId: string) {
    const sb = getClient();
    const { data, error } = await sb.from("comments").select("*, users:users(id,username,displayName,avatarUrl)").eq("postId", postId).order("createdAt", { ascending: true });
    if (error) throw error;
    return (data || []).map((c: any) => ({ ...c, user: c.users || {} }));
  },

  async addComment() { throw new Error("NI"); },

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
      .eq("userId", user.id)
      .gte("createdAt", start.toISOString())
      .lt("createdAt", end.toISOString())
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

    // ensure profile exists in users table
    await sb.from("users").upsert({ id: user.id, username: user.user_metadata?.username || user.email?.split("@")[0] || user.id, displayName: user.user_metadata?.name || user.email?.split("@")[0] || user.id, avatarUrl: user.user_metadata?.avatar_url || "", joinedAt: new Date().toISOString() });

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    const { data: todays, error: todaysErr } = await sb
      .from("posts")
      .select("id, imageUrl")
      .eq("userId", user.id)
      .gte("createdAt", start.toISOString())
      .lt("createdAt", end.toISOString());
    if (todaysErr) throw todaysErr;

    if ((todays || []).length && !replace) {
      const err: any = new Error("Already posted today");
      err.code = "LIMIT";
      throw err;
    }

    if ((todays || []).length && replace) {
      // delete existing posts for today (and their comments)
      const ids = (todays || []).map((p: any) => p.id);
      await sb.from("comments").delete().in("postId", ids);
      await sb.from("posts").delete().in("id", ids);
      // Note: we don't attempt to delete storage objects here (optional)
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
        const { error: uploadErr } = await sb.storage.from("posts").upload(path, file, { upsert: true });
        if (uploadErr) throw uploadErr;
        const { data: urlData } = sb.storage.from("posts").getPublicUrl(path);
        finalUrl = urlData.publicUrl;
      }
    } catch (e) {
      console.warn("Storage upload failed, falling back to storing imageUrl directly", e);
    }

    const id = uid();
  const { error: insertErr } = await sb.from("posts").insert({ id, user_id: user.id, image_url: finalUrl, alt: alt || "", caption: caption || "", created_at: new Date().toISOString(), public: !!isPublic });
    if (insertErr) throw insertErr;

    // fetch profile for hydration
    const { data: profile } = await sb.from("users").select("id,username,displayName,avatarUrl").eq("id", user.id).limit(1).single();

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
        displayName: profile?.displayName || "",
        avatarUrl: profile?.avatarUrl || "",
      },
      commentsCount: 0,
    };

    return post;
  },

  async calendarStats({ year, monthIdx }) {
    const sb = getClient();
    // This implementation assumes posts.createdAt is a timestamp
    const start = new Date(year, monthIdx, 1).toISOString();
    const end = new Date(year, monthIdx + 1, 1).toISOString();
    const { data, error } = await sb.from("posts").select("createdAt").gte("createdAt", start).lt("createdAt", end);
    if (error) throw error;
    const map: Record<string, number> = {};
    const mine = new Set<string>();
    for (const p of data || []) {
      const dk = new Date(p.createdAt).toISOString().slice(0, 10);
      map[dk] = (map[dk] || 0) + 1;
    }
    return { counts: map, mine } as CalendarStats;
  },
};