import { getServiceSupabase } from '@/lib/api/serverSupabase';
import { uid } from '@/lib/id';
import { logger } from '@/lib/logger';
import { clearServerCachePrefix } from '@/lib/serverCache';
import { strictRateLimiter } from '@/lib/rateLimiter';
import { apiError, apiSuccess } from '@/lib/apiResponse';
import { z } from 'zod';
import { checkRateLimitResponse } from '@/lib/api/utils';
import { processMentions, processHashtags, clearPostCaches, safeInsertPost } from '@/lib/postUtils';
import { createPostSchema } from '@/lib/validation';

export { createPostSchema };

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

    return { condition, temperature, location, address: location };
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

export async function createPost(req: Request, body: any, user: any) {
  // Rate limiting: strict limits for post creation
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const rateLimitRes = checkRateLimitResponse(strictRateLimiter, ip, true);
  if (rateLimitRes) return rateLimitRes;

  const validation = createPostSchema.safeParse(body);
  if (!validation.success) {
    return apiError('Invalid input', 400);
  }
  const { imageUrls, thumbnailUrls, caption, alt, public: isPublic = true, spotifyLink, camera, lens, filmType, weather: providedWeather, location: providedLocation } = validation.data;
  const userId = user.id;

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
      location = location || { address: fetched.address };
    }
  }

  // Build insert object
  const id = uid();
  const created_at = new Date().toISOString();
  const insertObj: any = { id, user_id: userId, alt: Array.isArray(alt) ? alt.join('\n') : (alt || ''), caption: caption || '', created_at, public: Boolean(isPublic) };
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
    if (location.address) insertObj.location_address = location.address;
  }

  // Parse hashtags from caption
  const hashtags = processHashtags(caption || '');
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

  // Insert post
  let insertData: any;
  try {
    insertData = await safeInsertPost(sb, insertObj);
  } catch (e) {
    try { logger.error('[posts.create] insert failed', { error: String(e), userId }); } catch (logErr) {}
    return apiError('Failed to create post', 500);
  }

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
  clearPostCaches();

  return apiSuccess({ ok: true, post: insertData, normalizedImageUrls, normalizedThumbnailUrls });
}