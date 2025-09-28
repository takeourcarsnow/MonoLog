import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Api, User, HydratedPost, Comment, CalendarStats } from "../types";
import { SUPABASE } from "../config";

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
      if (profErr) return null;
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
    const { data, error } = await sb.from("posts").select("*, users:users(id,username,displayName,avatarUrl)").eq("public", true).order("createdAt", { ascending: false });
    if (error) throw error;
    const posts: HydratedPost[] = (data || []).map((row: any) => ({
      id: row.id,
      userId: row.userId,
      imageUrl: row.imageUrl,
      alt: row.alt || "",
      caption: row.caption || "",
      createdAt: row.createdAt,
      public: !!row.public,
      user: {
        id: row.users?.id || row.userId,
        username: row.users?.username || "",
        displayName: row.users?.displayName || "",
        avatarUrl: row.users?.avatarUrl || "",
      },
      commentsCount: row.comments_count || 0,
    }));
    return posts;
  },

  async getFollowingFeed() { return []; },

  async getUserPosts(userId: string) {
    const sb = getClient();
    const { data, error } = await sb.from("posts").select("*, users:users(id,username,displayName,avatarUrl)").eq("userId", userId).order("createdAt", { ascending: false });
    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      userId: row.userId,
      imageUrl: row.imageUrl,
      alt: row.alt || "",
      caption: row.caption || "",
      createdAt: row.createdAt,
      public: !!row.public,
      user: {
        id: row.users?.id || row.userId,
        username: row.users?.username || "",
        displayName: row.users?.displayName || "",
        avatarUrl: row.users?.avatarUrl || "",
      },
      commentsCount: row.comments_count || 0,
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

  async canPostToday() { return { allowed: false }; },
  async createOrReplaceToday() { throw new Error("NI"); },
  async updatePost() { throw new Error("NI"); },
  async deletePost() { return false; },

  async getComments(postId: string) {
    const sb = getClient();
    const { data, error } = await sb.from("comments").select("*, users:users(id,username,displayName,avatarUrl)").eq("postId", postId).order("createdAt", { ascending: true });
    if (error) throw error;
    return (data || []).map((c: any) => ({ ...c, user: c.users || {} }));
  },

  async addComment() { throw new Error("NI"); },

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