import { getClient, ensureAuthListener, getCachedAuthUser, logSupabaseError } from "./supabase-client";
import { mapRowToHydratedPost, selectUserFields } from "./supabase-utils";
import { logger } from "../logger";

export async function getExploreFeed() {
logger.debug("supabaseApi.getExploreFeed called");
  const sb = getClient();
  // Exclude posts created by the current authenticated user so the Explore
  // view only shows other people's public posts.
  ensureAuthListener(sb);
  const me = await getCachedAuthUser(sb);
  let q: any = sb.from("posts").select("*, users:users(*), comments:comments(id)").eq("public", true).order("created_at", { ascending: false });
  if (me) q = q.neq("user_id", me.id);
  const { data, error } = await q;
  logSupabaseError("getExploreFeed", { data, error });
  if (error) throw error;
  return (data || []).map((row: any) => mapRowToHydratedPost(row));
}

export async function getExploreFeedPage({ limit, before }: { limit: number; before?: string }) {
  const sb = getClient();
  // Exclude current user's posts from paged explore results as well.
  ensureAuthListener(sb);
  const me = await getCachedAuthUser(sb);
  let q: any = sb.from("posts").select("*, users:users(*), comments:comments(id)").eq("public", true).order("created_at", { ascending: false }).limit(limit);
  if (me) q = q.neq("user_id", me.id);
  if (before) q = q.lt("created_at", before);
const { data, error } = await q;
  logSupabaseError("getExploreFeedPage", { data, error });
  if (error) throw error;
  return (data || []).map((row: any) => mapRowToHydratedPost(row));
}

export async function getFollowingFeed() {
  // Use client-side reads for feed; follow list comes from users table
  const sb = getClient();
  ensureAuthListener(sb);
  const me = await getCachedAuthUser(sb);
  if (!me) return [];
  const { data: profile, error: profErr } = await sb.from("users").select("following").eq("id", me.id).limit(1).single();
  if (profErr || !profile) return [];
const ids: string[] = profile.following || [];
  // Fetch public posts from followed users
const { data: followedRows, error: followedErr } = await sb.from("posts").select("*, users:users(*), comments:comments(id)").in("user_id", ids).eq("public", true).order("created_at", { ascending: false });
  logSupabaseError("getFollowingFeed.followed", { data: followedRows, error: followedErr });
  if (followedErr) throw followedErr;
  // Also fetch the current user's posts (include private posts owned by the user)
  const { data: myRows, error: myErr } = await sb.from("posts").select("*, users:users(*), comments:comments(id)").eq("user_id", me.id).order("created_at", { ascending: false });
  logSupabaseError("getFollowingFeed.mine", { data: myRows, error: myErr });
  if (myErr) throw myErr;
  const rows = ((followedRows || []) as any[]).concat((myRows || []) as any[]);
  // dedupe by id and sort
  const seen = new Set<string>();
  const merged = rows
    .filter(r => { if (!r) return false; if (seen.has(r.id)) return false; seen.add(r.id); return true; })
    .sort((a, b) => new Date(b.created_at || b.createdAt).getTime() - new Date(a.created_at || a.createdAt).getTime());
  return (merged || []).map((row: any) => mapRowToHydratedPost(row));
}

export async function getFollowingFeedPage({ limit, before }: { limit: number; before?: string }) {
  const sb = getClient();
  ensureAuthListener(sb);
  const me = await getCachedAuthUser(sb);
  if (!me) return [];
  const { data: profile, error: profErr } = await sb.from("users").select("following").eq("id", me.id).limit(1).single();
  if (profErr || !profile) return [];
const ids: string[] = profile.following || [];
  // Fetch followed users' public posts (paged)
let q1: any = sb.from("posts").select("*, users:users(*), comments:comments(id)").in("user_id", ids).eq("public", true).order("created_at", { ascending: false }).limit(limit);
  if (before) q1 = q1.lt("created_at", before);
  const { data: followedRows, error: followedErr } = await q1;
  logSupabaseError("getFollowingFeedPage.followed", { data: followedRows, error: followedErr });
  if (followedErr) throw followedErr;
  // Also fetch the current user's own posts (not limited by public flag). For pagination, fetch up to `limit` posts before `before` as well.
let q2: any = sb.from("posts").select("*, users:users(*), comments:comments(id)").eq("user_id", me.id).order("created_at", { ascending: false }).limit(limit);
  if (before) q2 = q2.lt("created_at", before);
  const { data: myRows, error: myErr } = await q2;
  logSupabaseError("getFollowingFeedPage.mine", { data: myRows, error: myErr });
  if (myErr) throw myErr;
  // Merge, dedupe, sort and then take the first `limit` items to emulate a unified paged feed.
  const rows = ((followedRows || []) as any[]).concat((myRows || []) as any[]);
  const mapById: Record<string, any> = {};
  for (const r of rows) mapById[r.id] = r;
  const merged = Object.values(mapById).sort((a, b) => new Date(b.created_at || b.createdAt).getTime() - new Date(a.created_at || a.createdAt).getTime()).slice(0, limit);
  return (merged || []).map((row: any) => mapRowToHydratedPost(row));
}

export async function getUserPosts(userId: string) {
  const sb = getClient();
const { data, error } = await sb.from("posts").select("*, users:users(*), comments:comments(id)").eq("user_id", userId).order("created_at", { ascending: false });
logSupabaseError("getUserPosts", { data, error });
  if (error) throw error;
  return (data || []).map((row: any) => mapRowToHydratedPost(row));
}

export async function getPostsByDate(dateKey: string) {
  const sb = getClient();
  const start = new Date(dateKey + "T00:00:00.000Z");
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
const { data, error } = await sb.from("posts").select("*, users:users(*), comments:comments(id)").gte("created_at", start.toISOString()).lt("created_at", end.toISOString()).order("created_at", { ascending: false });
logSupabaseError("getPostsByDate", { data, error });
if (error) throw error;
  return (data || []).map((row: any) => mapRowToHydratedPost(row));
}

export async function getPost(id: string) {
  // getClient() may throw synchronously if build-time NEXT_PUBLIC_* vars
  // are missing and the runtime override hasn't been applied yet. Wait
  // briefly for the runtime injection and retry to avoid returning
  // "Post not found" on hard refresh.
  let sb: any = null;
  try {
    sb = getClient();
  } catch (err) {
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
        return null;
      }
    } else {
      return null;
    }
  }

  // Accept either a full id or a slug like "username-abcdef12". If slug,
  // extract trailing token after last '-' and try exact id lookup first;
  // if that fails and token looks like a short id, try prefix match.
  let raw = id;
  let candidateId = id;
  const dashIdx = id.lastIndexOf('-');
  if (dashIdx > 0) {
    const trailing = id.slice(dashIdx + 1);
    if (/^[0-9a-fA-F]{6,}$/.test(trailing)) candidateId = trailing;
  }

  // Try exact match first
  try { console.log(`[supabase.getPost] trying exact id=${candidateId}`); } catch (e) {}
  let res: any = await sb.from("posts").select("*, users:users(*), comments:comments(id)").eq("id", candidateId).limit(1).maybeSingle();
  try { console.log('[supabase.getPost] exact result', { error: res?.error, data: !!res?.data }); } catch (e) {}
  if (!res.error && res.data) {
    logSupabaseError("getPost", res);
    return mapRowToHydratedPost(res.data) as any;
  }

  // If candidateId is a short prefix (<= 12 chars), try prefix match
  if (!res.data && candidateId.length <= 12) {
    try {
      try { console.log(`[supabase.getPost] trying prefix match id like ${candidateId}%`); } catch (e) {}
      const prefRes: any = await sb.from("posts").select("*, users:users(*), comments:comments(id)").ilike("id", `${candidateId}%`).limit(1).maybeSingle();
      try { console.log('[supabase.getPost] prefix result', { error: prefRes?.error, data: !!prefRes?.data }); } catch (e) {}
      logSupabaseError("getPost(prefix)", prefRes);
      if (!prefRes.error && prefRes.data) return mapRowToHydratedPost(prefRes.data) as any;
    } catch (e) {
      // ignore
    }
  }

  // lastly, try exact match on the original raw value
  try {
    try { console.log(`[supabase.getPost] trying raw exact id=${raw}`); } catch (e) {}
    const rawRes: any = await sb.from("posts").select("*, users:users(*), comments:comments(id)").eq("id", raw).limit(1).maybeSingle();
    try { console.log('[supabase.getPost] raw result', { error: rawRes?.error, data: !!rawRes?.data }); } catch (e) {}
    logSupabaseError("getPost(raw)", rawRes);
    if (!rawRes.error && rawRes.data) return mapRowToHydratedPost(rawRes.data) as any;
  } catch (e) {
    // ignore
  }
  return null;
}

export async function updatePost(id: string, patch: { caption?: string; alt?: string; public?: boolean }) {
  const res = await fetch('/api/posts/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, patch }) });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to update post');
  return await getPost(id) as any;
}

export async function deletePost(id: string) {
  const res = await fetch('/api/posts/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to delete post');
  return true;
}

export async function canPostToday() {
  const sb = getClient();
  ensureAuthListener(sb);
  const user = await getCachedAuthUser(sb);
  if (!user) return { allowed: false, reason: "Not logged in" };
  // Calendar-day rule: users may post once per calendar day (local date).
  // Fetch the most recent post and compare its local date key to today.
  try {
    const { data: recent, error: recentErr } = await sb
      .from("posts")
      .select("created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recentErr) throw recentErr;
    if (recent && (recent as any).created_at) {
      const lastCreated = new Date((recent as any).created_at);
      // toDateKey uses local timezone and lives in src/lib/date.ts
      // Avoid importing entire module here to prevent circulars; compute local date key inline.
      const toDateKeyLocal = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      };
      const lastKey = toDateKeyLocal(lastCreated);
      const todayKey = toDateKeyLocal(new Date());
      if (lastKey === todayKey) {
        // next allowed at start of next local calendar day
        const nextDay = new Date(lastCreated);
        nextDay.setHours(24, 0, 0, 0); // move to next midnight local time
        return { allowed: false, reason: "You already posted today", nextAllowedAt: nextDay.getTime(), lastPostedAt: lastCreated.getTime() };
      }
    }
  } catch (e) {
    throw e;
  }
  return { allowed: true };
}

export async function createOrReplaceToday({ imageUrl, imageUrls, caption, alt, replace = false, public: isPublic = true }: { imageUrl?: string; imageUrls?: string[]; caption?: string; alt?: string; replace?: boolean; public?: boolean }) {
  const cur = await getCurrentUser();
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
  
}

// Helper function to get current user - needed for posts
async function getCurrentUser() {
  const sb = getClient();
  ensureAuthListener(sb);
  const user = await getCachedAuthUser(sb);
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