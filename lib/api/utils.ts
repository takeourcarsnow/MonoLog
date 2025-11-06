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

// ---------- Small normalization helpers (reduce repetition) ----------
function pick<T = any>(obj: any, ...keys: string[]): T | undefined {
  for (const k of keys) {
    if (obj && obj[k] !== undefined) return obj[k] as T;
  }
  return undefined;
}

function tryParseJSON(value: any, allowDouble = false): any {
  if (typeof value !== 'string') return value;
  try {
    const once = JSON.parse(value);
    if (allowDouble && typeof once === 'string') {
      try { return JSON.parse(once); } catch { return once; }
    }
    return once;
  } catch {
    return value;
  }
}

function sanitizeDisplayName(value: any): string | undefined {
  if (value === undefined || value === null) return undefined;
  const s = String(value);
  return s.trim() === '' ? undefined : s;
}

export function mapProfileToUser(profile: any) {
  if (!profile) return null;

  const socialLinks = tryParseJSON(pick(profile, 'socialLinks', 'social_links'));
  const exifPresets = tryParseJSON(pick(profile, 'exifPresets', 'exif_presets'), true);

  return {
    id: profile.id,
    username: profile.username || profile.user_name || "",
    // Treat explicit NULL or empty-string display names as absent so callers
    // can rely on `undefined` and fall back to username when rendering.
    displayName: sanitizeDisplayName(pick(profile, 'displayName', 'display_name')),
    avatarUrl: profile.avatarUrl || profile.avatar_url || DEFAULT_AVATAR,
    bio: profile.bio,
    socialLinks,
    joinedAt: profile.joinedAt || profile.joined_at,
    following: profile.following,
    favorites: profile.favorites,
    usernameChangedAt: profile.username_changed_at || profile.usernameChangedAt,
    exifPresets,
  } as any;
}

function toStringArray(value: any): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    // If it looks like a JSON array, try to parse; otherwise treat as single URL
    const s = value.trim();
    if (s.startsWith('[') && s.endsWith(']')) {
      const parsed = tryParseJSON(s);
      return Array.isArray(parsed) ? parsed.map(String) : [value];
    }
    return [value];
  }
  try {
    const maybe = Array.from(value as any);
    return Array.isArray(maybe) ? maybe.map(String) : [String(value)];
  } catch {
    return [String(value)];
  }
}

export function mapRowToHydratedPost(row: any): HydratedPost {
  // Normalize imageUrls into a predictable array shape
  const raw = row.image_urls ?? row.image_urls_json ?? row.image_urls_jsonb ?? row.image_url ?? row.imageUrl ?? undefined;
  const imageUrls = toStringArray(raw);

  // Normalize thumbnailUrls into a predictable array shape
  const thumbRaw = row.thumbnail_urls ?? row.thumbnail_urls_json ?? row.thumbnail_urls_jsonb ?? row.thumbnail_url ?? row.thumbnailUrl ?? undefined;
  const thumbnailUrls = toStringArray(thumbRaw);

  return {
    id: row.id,
    userId: row.user_id || row.userId,
    imageUrls,
    thumbnailUrls,
    alt: row.alt || "",
    caption: row.caption || "",
    spotifyLink: row.spotify_link || row.spotifyLink || undefined,
    createdAt: row.created_at || row.createdAt,
    public: !!row.public,
    camera: row.camera || undefined,
    lens: row.lens || undefined,
    filmType: row.film_type || row.filmType || undefined,
    weatherCondition: row.weather_condition || row.weatherCondition || undefined,
    weatherTemperature: row.weather_temperature || row.weatherTemperature || undefined,
    weatherLocation: row.weather_location || row.weatherLocation || undefined,
    locationAddress: row.location_address || row.locationAddress || undefined,
    user: {
      id: (row.users || row.public_profiles)?.id || row.user_id,
      username: (row.users || row.public_profiles)?.username || "",
      displayName: (() => {
        const src = (row.users || row.public_profiles)?.display_name ?? (row.users || row.public_profiles)?.displayName;
        if (src === undefined || src === null) return undefined;
        const s = String(src);
        return s.trim() === '' ? undefined : s;
      })(),
      avatarUrl: (((row.users || row.public_profiles)?.avatar_url || (row.users || row.public_profiles)?.avatarUrl || "").trim() || DEFAULT_AVATAR),
    },
    // If the server query included a `comments` array, use its length. Otherwise
    // fall back to common count columns or 0.
    commentsCount: (Array.isArray(row.comments) ? row.comments.length : (row.comments_count || row.commentsCount || 0)),
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

import { NextResponse } from 'next/server';
import { apiError } from '@/lib/apiResponse';

// Extract best-effort client IP from common proxy headers
export function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for') || '';
  if (fwd) {
    // XFF may contain a list: client, proxy1, proxy2
    const first = fwd.split(',')[0].trim();
    if (first) return first;
  }
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}

// Generate a weak ETag from a JSON-serializable body
export function makeWeakETag(data: any): string {
  // lightweight non-cryptographic hash
  const str = (() => {
    try { return JSON.stringify(data); } catch { return String(data); }
  })();
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    // hash * 33 ^ char
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  const h = (hash >>> 0).toString(16);
  return `W/"${str.length.toString(16)}-${h}"`;
}

export function checkRateLimitResponse(limiter: any, ip: string, useApiError = false) {
  const rateLimit = limiter.checkLimit(ip);
  if (!rateLimit.allowed) {
    const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
    if (useApiError) {
      return apiError('Too many requests. Please try again later.', 429, { retryAfter });
    } else {
      return NextResponse.json({
        error: 'Too many requests. Please try again later.',
        retryAfter
      }, {
        status: 429,
        headers: { 'Retry-After': retryAfter.toString() }
      });
    }
  }
  return null;
}
