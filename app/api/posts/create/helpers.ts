import { getServiceSupabase } from '@/lib/api/serverSupabase';
import { uid } from '@/lib/id';
import { logger } from '@/lib/logger';
import { parseMentions } from '@/lib/mentions';
import { parseHashtags } from '@/lib/hashtags';
import { clearServerCachePrefix } from '@/lib/serverCache';
import { getUserFromAuthHeader } from '@/lib/api/serverVerifyAuth';
import { strictRateLimiter } from '@/lib/rateLimiter';
import { apiError, apiSuccess } from '@/lib/apiResponse';
import { z } from 'zod';
import { checkRateLimitResponse } from '@/lib/api/utils';

const createPostSchema = z.object({
  imageUrls: z.array(z.string()).optional(),
  thumbnailUrls: z.array(z.string()).optional(),
  caption: z.string().max(2000).optional(),
  alt: z.union([z.string(), z.array(z.string())]).optional(),
  public: z.boolean().optional().default(true),
  spotifyLink: z.string().optional(),
  camera: z.string().optional(),
  lens: z.string().optional(),
  filmType: z.string().optional(),
  weather: z.object({
    condition: z.string().optional(),
    temperature: z.number().optional(),
    location: z.string().optional(),
  }).optional(),
  location: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    address: z.string().optional(),
  }).optional(),
});

export async function fetchWeather(ip: string) {
  try {
    // First, get location from IP
    const locationRes = await fetch(`http://ip-api.com/json/${ip}`);
    const locationData = await locationRes.json();
    if (locationData.status !== 'success') return null;
    const { city, country, lat, lon } = locationData;
    const location = `${city}, ${country}`;

    // Fetch weather from wttr.in
    const weatherRes = await fetch(`https://wttr.in/${city}?format=j1`);
    const weatherData = await weatherRes.json();
    const current = weatherData.current_condition[0];
    const condition = current.weatherDesc[0].value;
    const temperature = parseFloat(current.temp_C);

    return { condition, temperature, location, latitude: lat, longitude: lon, address: location };
  } catch (e) {
    try { logger.debug('[fetchWeather] error', { error: String(e) }); } catch (e) {}
    return null;
  }
}

export async function ensureUserExists(userId: string) {
  const sb = getServiceSupabase();

  try {
    const { data: existingUser, error: userSelErr } = await sb.from('users').select('id').eq('id', userId).limit(1).maybeSingle();
    if (!existingUser && !userSelErr) {
      const synthUsername = 'user_' + userId.slice(0, 8);
      const joined = new Date().toISOString();
      const insertUser: any = { id: userId, username: synthUsername, display_name: synthUsername, joined_at: joined };
      // Ignore duplicate key / unique violations – another request may create it concurrently
      const ins = await sb.from('users').insert(insertUser);
      if (ins.error) {
        // Log but don't fail post creation; FK may still pass if another request inserted the row.
        try { logger.warn('[posts.create] user auto-insert failed', { message: ins.error.message, code: ins.error.code }); } catch (e) {}
      } else {
        try { logger.debug('[posts.create] created missing user profile row'); } catch (e) {}
      }
    }
  } catch (ensureErr) {
    // Non-fatal – continue; worst case the original FK error will surface as before.
    try { logger.warn('[posts.create] ensure user row failed', { err: String(ensureErr) }); } catch (e) {}
  }
}

export async function checkCalendarRule(userId: string, sb: any) {
  const DISABLE_UPLOAD_LIMIT = (process.env.NEXT_PUBLIC_DISABLE_UPLOAD_LIMIT === '1' || process.env.NEXT_PUBLIC_DISABLE_UPLOAD_LIMIT === 'true');
  if (!DISABLE_UPLOAD_LIMIT) {
    // Use UTC-based date boundaries to match database timestamps
    const now = new Date();
    const startOfDayUTC = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDayUTC = new Date(startOfDayUTC.getTime() + 24 * 60 * 60 * 1000);
    const { data: latestPost } = await sb
      .from('posts')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', startOfDayUTC.toISOString())
      .lt('created_at', endOfDayUTC.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (latestPost) {
      const lastPostedAt = new Date(latestPost.created_at).getTime();
      return { error: 'You already posted today', nextAllowedAt: endOfDayUTC.getTime(), lastPostedAt };
    }
  } else {
    try { logger.debug('[posts.create] upload limit disabled by NEXT_PUBLIC_DISABLE_UPLOAD_LIMIT'); } catch (e) {}
  }
  return null;
}

export async function insertPost(sb: any, userId: string, imageUrls: any, thumbnailUrls: any, caption: string, alt: any, isPublic: boolean, spotifyLink: string, camera: string, lens: string, filmType: string, weather?: { condition?: string; temperature?: number; location?: string }, location?: { latitude?: number; longitude?: number; address?: string }) {
  const id = uid();
  const created_at = new Date().toISOString();
  const insertObj: any = { id, user_id: userId, alt: alt || '', caption: caption || '', created_at, public: Boolean(isPublic) };
  if (spotifyLink) insertObj.spotify_link = spotifyLink;
  if (camera) insertObj.camera = camera;
  if (lens) insertObj.lens = lens;
  if (filmType) insertObj.film_type = filmType;
  if (weather) {
    if (weather.condition) insertObj.weather_condition = weather.condition;
    if (weather.temperature !== undefined) insertObj.weather_temperature = weather.temperature;
    if (weather.location) insertObj.weather_location = weather.location;
  }
  if (location) {
    if (location.latitude !== undefined) insertObj.location_latitude = location.latitude;
    if (location.longitude !== undefined) insertObj.location_longitude = location.longitude;
    if (location.address) insertObj.location_address = location.address;
  }

  // Parse hashtags from caption
  const hashtags = parseHashtags(caption || '');
  if (hashtags.length > 0) {
    insertObj.hashtags = hashtags;
  }

  // Handle image URLs - prefer array format when multiple images
  if (imageUrls && imageUrls.length > 0) {
    insertObj.image_url = imageUrls[0]; // Always set primary for compatibility
    if (imageUrls.length > 1) {
      insertObj.image_urls = imageUrls; // Try array column
    }
  }

  // Handle thumbnail URLs
  if (thumbnailUrls && thumbnailUrls.length > 0) {
    insertObj.thumbnail_url = thumbnailUrls[0]; // Always set primary thumbnail for compatibility
    if (thumbnailUrls.length > 1) {
      insertObj.thumbnail_urls = thumbnailUrls; // Try array column
    }
  }

  // Attempt to insert the post
  let insertData: any = null;
  try {
    const res = await sb.from('posts').insert(insertObj).select('*').limit(1).single();
    if (res.error) {
      // If the error is about missing columns, try without them
      if (res.error.message?.toLowerCase().includes('column') ||
          res.error.message?.toLowerCase().includes('image_urls') ||
          res.error.message?.toLowerCase().includes('camera') ||
          res.error.message?.toLowerCase().includes('lens') ||
          res.error.message?.toLowerCase().includes('film_type') ||
          res.error.message?.toLowerCase().includes('hashtags')) {
        const fallbackObj = { ...insertObj };
        // Remove potentially problematic columns
        delete fallbackObj.image_urls;
        delete fallbackObj.thumbnail_urls;
        if (fallbackObj.spotify_link) delete fallbackObj.spotify_link;
        if (fallbackObj.camera) delete fallbackObj.camera;
        if (fallbackObj.lens) delete fallbackObj.lens;
        if (fallbackObj.film_type) delete fallbackObj.film_type;
        if (fallbackObj.hashtags) delete fallbackObj.hashtags;
        if (fallbackObj.weather_condition) delete fallbackObj.weather_condition;
        if (fallbackObj.weather_temperature) delete fallbackObj.weather_temperature;
        if (fallbackObj.weather_location) delete fallbackObj.weather_location;
        if (fallbackObj.location_latitude) delete fallbackObj.location_latitude;
        if (fallbackObj.location_longitude) delete fallbackObj.location_longitude;
        if (fallbackObj.location_address) delete fallbackObj.location_address;
        const fallbackRes = await sb.from('posts').insert(fallbackObj).select('*').limit(1).single();
        if (fallbackRes.error) {
          throw new Error(`Database schema error: ${fallbackRes.error.message}`);
        }
        insertData = fallbackRes.data;
      } else {
        throw new Error(res.error.message || res.error);
      }
    } else {
      insertData = res.data;
    }
  } catch (e: any) {
    throw new Error(`Database error: ${e?.message || String(e)}`);
  }

  return { id, insertData };
}

export function normalizeImageUrls(insertData: any) {
  // Normalize image URLs from the inserted data
  let normalizedImageUrls: string[] = [];
  let normalizedThumbnailUrls: string[] = [];
  try {
    if (insertData) {
      if (Array.isArray(insertData.image_urls)) {
        normalizedImageUrls = insertData.image_urls;
      } else if (insertData.image_url) {
        normalizedImageUrls = [insertData.image_url];
      }
      if (Array.isArray(insertData.thumbnail_urls)) {
        normalizedThumbnailUrls = insertData.thumbnail_urls;
      } else if (insertData.thumbnail_url) {
        normalizedThumbnailUrls = [insertData.thumbnail_url];
      }
    }
  } catch (e) {
    // If normalization fails, at least return the primary image
    normalizedImageUrls = insertData?.image_url ? [insertData.image_url] : [];
    normalizedThumbnailUrls = insertData?.thumbnail_url ? [insertData.thumbnail_url] : [];
  }
  return { normalizedImageUrls, normalizedThumbnailUrls };
}

export async function processMentions(sb: any, caption: string, id: string, userId: string, created_at: string) {
  if (caption) {
    const mentions = parseMentions(caption);
    if (mentions.length > 0) {
      (async () => {
        try {
          // Get user IDs for mentioned usernames
          const { data: mentionedUsers, error: usersErr } = await sb
            .from('users')
            .select('id, username')
            .in('username', mentions);
          if (!usersErr && mentionedUsers) {
            const mentionedUserIds = mentionedUsers.map((u: any) => u.id);
            // Batch insert into post_mentions and notifications
            try {
              const mentionInserts = mentionedUserIds.map((mentionedId: string) => ({
                id: uid(),
                post_id: id,
                mentioned_user_id: mentionedId,
                created_at: created_at,
              }));
              const notifInserts = mentionedUserIds.map((mentionedId: string) => ({
                id: uid(),
                user_id: mentionedId,
                actor_id: userId,
                post_id: id,
                type: 'mention',
                text: `You were mentioned in a post`,
                created_at: created_at,
                read: false,
              }));

              // Batch insert mentions
              if (mentionInserts.length > 0) {
                await sb.from('post_mentions').insert(mentionInserts);
              }

              // Batch insert notifications
              if (notifInserts.length > 0) {
                await sb.from('notifications').insert(notifInserts);
              }
            } catch (e) {
              // Ignore if tables don't exist or other errors
            }
          }
        } catch (e) {
          // Ignore mention processing errors
        }
      })();
    }
  }
}

export async function processPostAfterBreak(sb: any, userId: string, postId: string, created_at: string) {
  // Check if user hasn't posted in the last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  try {
    const { data: recentPosts, error } = await sb
      .from('posts')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo)
      .neq('id', postId) // Exclude the current post
      .limit(1);

    if (error) {
      // If there's an error checking, just skip the notification
      return;
    }

    // If no recent posts (other than this one), this is posting after a break
    if (!recentPosts || recentPosts.length === 0) {
      // Get all followers and notify them
      const { data: followers } = await sb
        .from('follows')
        .select('follower_id')
        .eq('following_id', userId);

      if (followers && followers.length > 0) {
        const notifInserts = followers.map((follower: any) => ({
          id: uid(),
          user_id: follower.follower_id,
          actor_id: userId,
          post_id: postId,
          type: 'post_after_break',
          text: `Resumed posting after a break`,
          created_at: created_at,
          read: false,
        }));

        await sb.from('notifications').insert(notifInserts);
      }
    }
  } catch (e) {
    // Ignore notification errors
  }
}

export function clearCaches() {
  // Invalidate short-lived server caches for feeds so new post surfaces quickly
  try {
    clearServerCachePrefix('explore:');
    clearServerCachePrefix('following:');
  } catch (_) {}
}

export async function createPost(req: Request) {
  // Rate limiting: strict limits for post creation
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const rateLimitRes = checkRateLimitResponse(strictRateLimiter, ip, true);
  if (rateLimitRes) return rateLimitRes;

  const body = await req.json();
  const validation = createPostSchema.safeParse(body);
  if (!validation.success) {
    return apiError('Invalid input', 400);
  }
  const { imageUrls, thumbnailUrls, caption, alt, public: isPublic = true, spotifyLink, camera, lens, filmType, weather: providedWeather, location: providedLocation } = validation.data;
  const authUser = await getUserFromAuthHeader(req);
  if (!authUser) return apiError('Unauthorized', 401);
  const userId = authUser.id;

  // Debug: log incoming payload so we can verify client is sending multiple images
  try { logger.debug('[posts.create] incoming', { userId, imageUrlsLen: Array.isArray(imageUrls) ? imageUrls.length : (imageUrls ? 1 : 0) }); } catch (e) {}

  if (!userId) return apiError('Unauthorized', 401);

  const sb = getServiceSupabase();

  // Ensure user exists
  await ensureUserExists(userId);

  // Check calendar rule
  const calendarError = await checkCalendarRule(userId, sb);
  if (calendarError) {
    return apiError(calendarError.error, 409, { nextAllowedAt: calendarError.nextAllowedAt, lastPostedAt: calendarError.lastPostedAt });
  }

  // Fetch weather and location if not provided
  let weather = providedWeather;
  let location = providedLocation;
  if (!weather || !location) {
    const fetched = await fetchWeather(ip);
    if (fetched) {
      weather = weather || { condition: fetched.condition, temperature: fetched.temperature, location: fetched.location };
      location = location || { latitude: fetched.latitude, longitude: fetched.longitude, address: fetched.address };
    }
  }

  // Insert post
  const { id, insertData } = await insertPost(sb, userId, imageUrls, thumbnailUrls, caption || '', alt || '', isPublic, spotifyLink || '', camera || '', lens || '', filmType || '', weather, location);

  // Normalize URLs
  const { normalizedImageUrls, normalizedThumbnailUrls } = normalizeImageUrls(insertData);

  // Attach spotifyLink from the inserted row if available
  try {
    if (insertData && (insertData.spotify_link || insertData.spotifyLink)) {
      insertData.spotify_link = insertData.spotify_link || insertData.spotifyLink;
    }
  } catch (e) {}

  try { logger.debug('[posts.create] inserted', { id: insertData?.id, imageCount: normalizedImageUrls.length }); } catch (e) {}

  // Process mentions
  processMentions(sb, caption || '', id, userId, insertData.created_at);

  // Process post after break notifications
  processPostAfterBreak(sb, userId, id, insertData.created_at);

  // Clear caches
  clearCaches();

  return apiSuccess({ ok: true, post: insertData, normalizedImageUrls, normalizedThumbnailUrls });
}