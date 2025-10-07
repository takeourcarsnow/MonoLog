import type { User, HydratedPost } from "../types";

// Default avatar used when a user has not set one; points to public/logo.svg.
export const DEFAULT_AVATAR = "/logo.svg";

// small helpers to normalize DB rows to app types and to safely stringify debug objects
export function safeStringify(v: any) {
  try {
    return JSON.stringify(v, null, 2);
  } catch (e) {
    try { return String(v); } catch { return "[unserializable]"; }
  }
}

export function mapProfileToUser(profile: any) {
  if (!profile) return null;
  return {
    id: profile.id,
    username: profile.username || profile.user_name || "",
    displayName: profile.displayName || profile.display_name || "",
    avatarUrl: profile.avatarUrl || profile.avatar_url || DEFAULT_AVATAR,
    bio: profile.bio,
    joinedAt: profile.joinedAt || profile.joined_at,
    following: profile.following,
    favorites: profile.favorites,
    usernameChangedAt: profile.username_changed_at || profile.usernameChangedAt,
  } as any;
}

export function mapRowToHydratedPost(row: any): HydratedPost {
  // Normalize imageUrls into a predictable array shape and provide
  // lightweight debug logging when unusual shapes are encountered.
  const raw = row.image_urls ?? row.image_urls_json ?? row.image_urls_jsonb ?? row.image_url ?? row.imageUrl ?? undefined;
  let imageUrls: string[] | undefined = undefined;
  if (raw !== undefined && raw !== null) {
    if (Array.isArray(raw)) imageUrls = raw.map(String);
    else if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) imageUrls = parsed.map(String);
        else imageUrls = [raw];
      } catch (e) {
        imageUrls = [raw];
      }
    } else {
      try {
        const maybe = Array.from(raw as any);
        if (Array.isArray(maybe)) imageUrls = maybe.map(String);
        else imageUrls = [String(raw)];
      } catch (e) {
        imageUrls = [String(raw)];
      }
    }
  }

  // DEV: emit concise mapping info to the browser console so you can paste it from F12
  try {
    if (typeof window !== 'undefined') {
      const shouldLog = Array.isArray(imageUrls) && imageUrls.length > 1 || typeof row.image_urls === 'string' && row.image_urls.length > 0;
      // logging removed per user request
    }
  } catch (e) { /* ignore logging errors */ }

  return {
    id: row.id,
    userId: row.user_id || row.userId,
    imageUrls,
    alt: row.alt || "",
    caption: row.caption || "",
    spotifyLink: row.spotify_link || row.spotifyLink || undefined,
    createdAt: row.created_at || row.createdAt,
    public: !!row.public,
    user: {
      id: row.users?.id || row.user_id,
      username: row.users?.username || row.users?.user_name || "",
      displayName: row.users?.displayName || row.users?.display_name || "",
        avatarUrl: row.users?.avatarUrl || row.users?.avatar_url || DEFAULT_AVATAR,
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
export async function selectUserFields(sb: any, id: string, fields: string) {
  try {
    // Use maybeSingle so a missing row returns { data: null, error: null }
    const res: any = await sb.from("users").select("*").eq("id", id).limit(1).maybeSingle();
    return res;
  } catch (e) {
    return { data: null, error: e } as any;
  }
}
