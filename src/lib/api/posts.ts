import { getClient, ensureAuthListener, getCachedAuthUser, logSupabaseError, getAccessToken } from "./client";
import { mapRowToHydratedPost, selectUserFields } from "./utils";
import { logger } from "../logger";

export async function getExploreFeed() {
logger.debug("supabaseApi.getExploreFeed called");
  const sb = getClient();
  // Exclude posts created by the current authenticated user and followed users so the Explore
  // view only shows other people's public posts that you aren't following.
  ensureAuthListener(sb);
  const me = await getCachedAuthUser(sb);
  let q: any = sb.from("posts").select("*, users!left(*), public_profiles!left(*), comments!left(id)").eq("public", true).order("created_at", { ascending: false });
  if (me) {
    // Get following list to exclude followed users' posts
    const { data: profile, error: profErr } = await sb.from("users").select("following").eq("id", me.id).limit(1).single();
    if (!profErr && profile) {
      const followingIds: string[] = profile.following || [];
      const excludeIds = [me.id, ...followingIds];
      q = q.not("user_id", "in", `(${excludeIds.join(',')})`);
    } else {
      // If can't get following, at least exclude own posts
      q = q.neq("user_id", me.id);
    }
  }
  const { data, error } = await q;
  logSupabaseError("getExploreFeed", { data, error });
  if (error) throw error;
  return (data || []).map((row: any) => mapRowToHydratedPost(row));
}

export async function getExploreFeedPage({ limit, before }: { limit: number; before?: string }) {
  const sb = getClient();
  // Exclude current user's posts and posts from followed users from explore results.
  ensureAuthListener(sb);
  const me = await getCachedAuthUser(sb);
  let q: any = sb.from("posts").select("*, users!left(*), public_profiles!left(*), comments!left(id)").eq("public", true).order("created_at", { ascending: false }).limit(limit);
  if (me) {
    // Get following list to exclude followed users' posts
    const { data: profile, error: profErr } = await sb.from("users").select("following").eq("id", me.id).limit(1).single();
    if (!profErr && profile) {
      const followingIds: string[] = profile.following || [];
      const excludeIds = [me.id, ...followingIds];
      q = q.not("user_id", "in", `(${excludeIds.join(',')})`);
    } else {
      // If can't get following, at least exclude own posts
      q = q.neq("user_id", me.id);
    }
  }
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
const { data: followedRows, error: followedErr } = await sb.from("posts").select("*, users!left(*), public_profiles!left(*), comments!left(id)").in("user_id", ids).eq("public", true).order("created_at", { ascending: false });
  logSupabaseError("getFollowingFeed.followed", { data: followedRows, error: followedErr });
  if (followedErr) throw followedErr;
  // Also fetch the current user's posts (include private posts owned by the user)
  const { data: myRows, error: myErr } = await sb.from("posts").select("*, users!left(*), public_profiles!left(*), comments!left(id)").eq("user_id", me.id).order("created_at", { ascending: false });
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
let q1: any = sb.from("posts").select("*, users!left(*), public_profiles!left(*), comments!left(id)").in("user_id", ids).eq("public", true).order("created_at", { ascending: false }).limit(limit);
  if (before) q1 = q1.lt("created_at", before);
  const { data: followedRows, error: followedErr } = await q1;
  logSupabaseError("getFollowingFeedPage.followed", { data: followedRows, error: followedErr });
  if (followedErr) throw followedErr;
  // Also fetch the current user's own posts (not limited by public flag). For pagination, fetch up to `limit` posts before `before` as well.
let q2: any = sb.from("posts").select("*, users!left(*), public_profiles!left(*), comments!left(id)").eq("user_id", me.id).order("created_at", { ascending: false }).limit(limit);
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
const { data, error } = await sb.from("posts").select("*, users!left(*), public_profiles!left(*), comments!left(id)").eq("user_id", userId).order("created_at", { ascending: false });
logSupabaseError("getUserPosts", { data, error });
  if (error) throw error;
  return (data || []).map((row: any) => mapRowToHydratedPost(row));
}

export async function getPostsByDate(dateKey: string) {
  const sb = getClient();
  const start = new Date(dateKey + "T00:00:00.000Z");
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
const { data, error } = await sb.from("posts").select("*, users!left(*), public_profiles!left(*), comments!left(id)").gte("created_at", start.toISOString()).lt("created_at", end.toISOString()).order("created_at", { ascending: false });
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
  // debug removed
  let res: any = await sb.from("posts").select("*, users!left(*), public_profiles!left(*), comments!left(id)").eq("id", candidateId).limit(1).maybeSingle();
  // debug removed
  if (!res.error && res.data) {
    logSupabaseError("getPost", res);
    return mapRowToHydratedPost(res.data) as any;
  }

  // If candidateId is a short prefix (<= 12 chars), try prefix match
  if (!res.data && candidateId.length <= 12) {
    try {
      const prefRes: any = await sb.from("posts").select("*, users!left(*), public_profiles!left(*), comments!left(id)").ilike("id", `${candidateId}%`).limit(1).maybeSingle();
      logSupabaseError("getPost(prefix)", prefRes);
      if (!prefRes.error && prefRes.data) return mapRowToHydratedPost(prefRes.data) as any;
    } catch (e) {
      // ignore
    }
  }

  // lastly, try exact match on the original raw value
  try {
    const rawRes: any = await sb.from("posts").select("*, users!left(*), public_profiles!left(*), comments!left(id)").eq("id", raw).limit(1).maybeSingle();
    logSupabaseError("getPost(raw)", rawRes);
    if (!rawRes.error && rawRes.data) return mapRowToHydratedPost(rawRes.data) as any;
  } catch (e) {
    // ignore
  }
  return null;
}

export async function updatePost(id: string, patch: { caption?: string; alt?: string; public?: boolean }) {
  const sb = getClient();
  ensureAuthListener(sb);
  const token = await getAccessToken(sb);
  const res = await fetch('/api/posts/update', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ id, patch }) });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to update post');
  return await getPost(id) as any;
}

export async function deletePost(id: string) {
  const sb = getClient();
  ensureAuthListener(sb);
  const token = await getAccessToken(sb);
  const res = await fetch('/api/posts/delete', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ id }) });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to delete post');
  return true;
}

export async function canPostToday() {
  const sb = getClient();
  ensureAuthListener(sb);
  const user = await getCachedAuthUser(sb);
  if (!user) return { allowed: false, reason: "Not logged in" };
  // Allow temporary bypass for testing via client-exposed env var
  try {
    const DISABLE_UPLOAD_LIMIT = (typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_DISABLE_UPLOAD_LIMIT === '1' || process.env.NEXT_PUBLIC_DISABLE_UPLOAD_LIMIT === 'true')) || (typeof window !== 'undefined' && window.localStorage && (window.localStorage.getItem('monolog:disableUploadLimit') === '1' || window.localStorage.getItem('monolog:disableUploadLimit') === 'true'));
    if (DISABLE_UPLOAD_LIMIT) return { allowed: true };
  } catch (e) {}
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

export async function createOrReplaceToday({ imageUrl, imageUrls, caption, alt, replace = false, public: isPublic = true, spotifyLink }: { imageUrl?: string; imageUrls?: string[]; caption?: string; alt?: string; replace?: boolean; public?: boolean; spotifyLink?: string }) {
  const cur = await getCurrentUser();
  if (!cur) throw new Error('Not logged in');

  // For uploads, convert any data URLs via the server storage endpoint so the server can store via service role
  const inputs: string[] = imageUrls && imageUrls.length ? imageUrls.slice(0, 5) : imageUrl ? [imageUrl] : [];
  const finalUrls: string[] = [];
  const finalThumbUrls: string[] = [];
  for (const img of inputs) {
    if (!img) continue;
  if (typeof img === 'string' && img.startsWith('data:')) {
  const sb = getClient();
  ensureAuthListener(sb);
  const token = await getAccessToken(sb);
  const uploadRes = await fetch('/api/storage/upload', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ dataUrl: img }) });
      const up = await uploadRes.json();
      if (!uploadRes.ok) {
        console.warn('Server upload failed, falling back to data-url', up?.error);
        finalUrls.push(img as string);
        finalThumbUrls.push(img as string); // fallback to original for thumbnail too
      } else {
        finalUrls.push(up.publicUrl);
        finalThumbUrls.push(up.thumbnailUrl);
      }
    } else {
      finalUrls.push(img as string);
      finalThumbUrls.push(img as string); // if not data URL, assume it's already uploaded with thumbnail
    }
  }

  // call server create endpoint
  const sb2 = getClient();
  ensureAuthListener(sb2);
  const token2 = await getAccessToken(sb2);
  const res = await fetch('/api/posts/create', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token2 ? { Authorization: `Bearer ${token2}` } : {}) }, body: JSON.stringify({ imageUrls: finalUrls, thumbnailUrls: finalThumbUrls, caption, alt, replace, public: isPublic, spotifyLink }) });
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
