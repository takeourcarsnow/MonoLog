import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import { logger } from '@/src/lib/logger';
import { getUserFromAuthHeader } from '@/src/lib/api/serverVerifyAuth';
import { strictRateLimiter } from '@/src/lib/rateLimiter';
import {
  ensureUserExists,
  handleReplaceLogic,
  checkCalendarRule,
  insertPost,
  normalizeImageUrls,
  processMentions,
  clearCaches
} from './helpers';

export async function POST(req: Request) {
  try {
    // Rate limiting: strict limits for post creation
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimit = strictRateLimiter.checkLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json({
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
      }, {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString()
        }
      });
    }

    const body = await req.json();
    const { imageUrls, thumbnailUrls, caption, alt, replace = false, public: isPublic = true, spotifyLink, camera, lens, filmType } = body;
    const authUser = await getUserFromAuthHeader(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = authUser.id;

    // Debug: log incoming payload so we can verify client is sending multiple images
    try { logger.debug('[posts.create] incoming', { userId, imageUrlsLen: Array.isArray(imageUrls) ? imageUrls.length : (imageUrls ? 1 : 0) }); } catch (e) {}

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const CAPTION_MAX = 1000;
    if (caption && typeof caption === 'string' && caption.length > CAPTION_MAX) {
      return NextResponse.json({ error: `Caption exceeds ${CAPTION_MAX} characters` }, { status: 400 });
    }

    const sb = getServiceSupabase();

    // Ensure user exists
    await ensureUserExists(userId);

    // Handle replace logic
    if (replace) {
      await handleReplaceLogic(userId, sb);
    }

    // Check calendar rule
    const calendarError = await checkCalendarRule(userId, replace, sb);
    if (calendarError) {
      return NextResponse.json(calendarError, { status: 409 });
    }

    // Insert post
    const { id, insertData } = await insertPost(sb, userId, imageUrls, thumbnailUrls, caption, alt, isPublic, spotifyLink, camera, lens, filmType);

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
    processMentions(sb, caption, id, userId, insertData.created_at);

    // Clear caches
    clearCaches();

    return NextResponse.json({ ok: true, post: insertData, normalizedImageUrls, normalizedThumbnailUrls });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
