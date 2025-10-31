import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import { logger } from '@/src/lib/logger';
import { getUserFromAuthHeader } from '@/src/lib/api/serverVerifyAuth';
import { strictRateLimiter } from '@/src/lib/rateLimiter';
import { apiError, apiSuccess } from '@/lib/apiResponse';
import { z } from 'zod';
import {
  ensureUserExists,
  checkCalendarRule,
  insertPost,
  normalizeImageUrls,
  processMentions,
  clearCaches
} from './helpers';

async function fetchWeather(ip: string) {
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

const createPostSchema = z.object({
  imageUrls: z.array(z.string()).optional(),
  thumbnailUrls: z.array(z.string()).optional(),
  caption: z.string().max(1000).optional(),
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

export async function POST(req: Request) {
  try {
    // Rate limiting: strict limits for post creation
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimit = strictRateLimiter.checkLimit(ip);
    if (!rateLimit.allowed) {
      return apiError('Too many requests. Please try again later.', 429, {
        retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
      });
    }

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

    // Clear caches
    clearCaches();

    return apiSuccess({ ok: true, post: insertData, normalizedImageUrls, normalizedThumbnailUrls });
  } catch (e: any) {
    return apiError(e?.message || String(e), 500);
  }
}
