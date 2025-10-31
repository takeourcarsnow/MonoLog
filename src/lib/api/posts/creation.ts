import { getClient, ensureAuthListener, getCachedAuthUser, getAccessToken } from "../client";
import { toDateKey } from "../../date";
import { getCurrentUser } from "./helpers";

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
      const lastKey = toDateKey(lastCreated);
      const todayKey = toDateKey(new Date());
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

export async function createOrReplaceToday({ imageUrl, imageUrls, caption, alt, public: isPublic = true, spotifyLink, camera, lens, filmType, weatherCondition, weatherTemperature, weatherLocation, locationLatitude, locationLongitude, locationAddress }: { imageUrl?: string; imageUrls?: string[]; caption?: string; alt?: string; public?: boolean; spotifyLink?: string; camera?: string; lens?: string; filmType?: string; weatherCondition?: string; weatherTemperature?: number; weatherLocation?: string; locationLatitude?: number; locationLongitude?: number; locationAddress?: string }) {
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
  const payload: any = {
    imageUrls: finalUrls,
    thumbnailUrls: finalThumbUrls,
    caption,
    alt,
    public: isPublic,
    spotifyLink,
    camera,
    lens,
    filmType,
  };

  // Include nested weather/location objects per server API expectations
  if (weatherCondition !== undefined || weatherTemperature !== undefined || weatherLocation !== undefined) {
    payload.weather = {
      condition: weatherCondition,
      temperature: weatherTemperature,
      location: weatherLocation,
    };
  }
  if (locationLatitude !== undefined || locationLongitude !== undefined || locationAddress !== undefined) {
    payload.location = {
      latitude: locationLatitude,
      longitude: locationLongitude,
      address: locationAddress,
    };
  }

  const res = await fetch('/api/posts/create', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token2 ? { Authorization: `Bearer ${token2}` } : {}) }, body: JSON.stringify(payload) });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to create post');
  return json.post as any;
}