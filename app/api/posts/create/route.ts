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
    const { imageUrls, thumbnailUrls, caption, alt, public: isPublic = true, spotifyLink, camera, lens, filmType } = validation.data;
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

    // Insert post
    const { id, insertData } = await insertPost(sb, userId, imageUrls, thumbnailUrls, caption || '', alt || '', isPublic, spotifyLink || '', camera || '', lens || '', filmType || '');

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
