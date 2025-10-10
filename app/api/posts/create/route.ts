import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import { uid } from '@/src/lib/id';
import { logger } from '@/src/lib/logger';
import { parseMentions } from '@/src/lib/mentions';
import { getUserFromAuthHeader } from '@/src/lib/api/serverVerifyAuth';

export async function POST(req: Request) {
  try {
  const body = await req.json();
  const { imageUrls, thumbnailUrls, caption, alt, replace = false, public: isPublic = true, spotifyLink } = body;
  const authUser = await getUserFromAuthHeader(req);
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = authUser.id;
    // Debug: log incoming payload so we can verify client is sending multiple images
  try { logger.debug('[posts.create] incoming', { userId, imageUrlsLen: Array.isArray(imageUrls) ? imageUrls.length : (imageUrls ? 1 : 0) }); } catch (e) {}
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const CAPTION_MAX = 1000;
  if (caption && typeof caption === 'string' && caption.length > CAPTION_MAX) return NextResponse.json({ error: `Caption exceeds ${CAPTION_MAX} characters` }, { status: 400 });
    const sb = getServiceSupabase();

    // --- SAFEGUARD: ensure a matching users row exists to satisfy FK ---
    // A race or client-side failure to create the profile row (e.g. RLS blocking
    // insert, swallowed error, or network interruption) can cause a FK violation
    // when inserting into posts. Since this endpoint uses the service role key,
    // we can safely create a minimal users row if it does not yet exist.
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

    // If replace is true, delete today's posts for the user first
    if (replace) {
      // Use UTC-based date boundaries to match database timestamps
      const now = new Date();
      const startOfDayUTC = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDayUTC = new Date(startOfDayUTC.getTime() + 24 * 60 * 60 * 1000);
      const { data: todays } = await sb.from('posts').select('*').eq('user_id', userId).gte('created_at', startOfDayUTC.toISOString()).lt('created_at', endOfDayUTC.toISOString());
      if ((todays || []).length) {
        const ids = (todays || []).map((p: any) => p.id);
        // delete comments
        await sb.from('comments').delete().in('post_id', ids);
        // remove storage objects as best-effort
        try {
          const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '') + '/storage/v1/object/public/posts/';
          const toRemove: string[] = [];
          for (const p of (todays || [])) {
            const existingImageUrls: string[] = [];
            if (p.image_urls && Array.isArray(p.image_urls)) existingImageUrls.push(...p.image_urls);
            else if (p.image_url) existingImageUrls.push(p.image_url);
            for (const u of existingImageUrls) {
              if (typeof u === 'string' && u.startsWith(base)) {
                toRemove.push(decodeURIComponent(u.slice(base.length)));
              }
            }
          }
          if (toRemove.length) await sb.storage.from('posts').remove(toRemove);
        } catch (e) {
          logger.warn('storage removal failed', e);
        }
        await sb.from('posts').delete().in('id', ids);
      }
    }

  // If not replacing, enforce calendar-day rule server-side: disallow creating
  // a new post when the user already has a post for the current local date.
  // Allow a temporary bypass for testing via env var NEXT_PUBLIC_DISABLE_UPLOAD_LIMIT
  const DISABLE_UPLOAD_LIMIT = (process.env.NEXT_PUBLIC_DISABLE_UPLOAD_LIMIT === '1' || process.env.NEXT_PUBLIC_DISABLE_UPLOAD_LIMIT === 'true');
  if (!replace && !DISABLE_UPLOAD_LIMIT) {
      // Use UTC-based date boundaries to match database timestamps
      const now = new Date();
      const startOfDayUTC = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDayUTC = new Date(startOfDayUTC.getTime() + 24 * 60 * 60 * 1000);
      const { data: todays } = await sb.from('posts').select('created_at').eq('user_id', userId).gte('created_at', startOfDayUTC.toISOString()).lt('created_at', endOfDayUTC.toISOString());
      if ((todays || []).length) {
        // find most recent post timestamp
        let lastMs = 0;
        for (const p of (todays || [])) {
          try { const t = new Date(p.created_at).getTime(); if (t > lastMs) lastMs = t; } catch (e) {}
        }
        return NextResponse.json({ error: 'You already posted today', nextAllowedAt: endOfDayUTC.getTime(), lastPostedAt: lastMs || null }, { status: 409 });
      }
    } else if (!replace && DISABLE_UPLOAD_LIMIT) {
      try { logger.debug('[posts.create] upload limit disabled by NEXT_PUBLIC_DISABLE_UPLOAD_LIMIT'); } catch (e) {}
    }

    // Insert new post
    const id = uid();
    const created_at = new Date().toISOString();
  const insertObj: any = { id, user_id: userId, alt: alt || '', caption: caption || '', created_at, public: !!isPublic };
  if (spotifyLink) insertObj.spotify_link = spotifyLink;
    
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
        // If the error is about the image_urls column not existing, try without it
        if (res.error.message?.toLowerCase().includes('image_urls') || res.error.message?.toLowerCase().includes('column')) {
          const fallbackObj = { ...insertObj };
          delete fallbackObj.image_urls; // Remove the problematic column
          // Also remove spotify_link if that's the problematic column
          if (fallbackObj.spotify_link) delete fallbackObj.spotify_link;
          const fallbackRes = await sb.from('posts').insert(fallbackObj).select('*').limit(1).single();
          if (fallbackRes.error) {
            return NextResponse.json({ error: `Database schema error: ${fallbackRes.error.message}` }, { status: 500 });
          }
          insertData = fallbackRes.data;
        } else {
          return NextResponse.json({ error: res.error.message || res.error }, { status: 500 });
        }
      } else {
        insertData = res.data;
      }
    } catch (e: any) {
      return NextResponse.json({ error: `Database error: ${e?.message || String(e)}` }, { status: 500 });
    }

    // Ensure the public field is set correctly
    await sb.from('posts').update({ public: !!isPublic }).eq('id', id);

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

    // Attach spotifyLink from the inserted row if available
    try {
      if (insertData && (insertData.spotify_link || insertData.spotifyLink)) {
        insertData.spotify_link = insertData.spotify_link || insertData.spotifyLink;
      }
    } catch (e) {}

    try { logger.debug('[posts.create] inserted', { id: insertData?.id, imageCount: normalizedImageUrls.length }); } catch (e) {}

    // Handle mentions
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
              const mentionedUserIds = mentionedUsers.map(u => u.id);
              // Insert into post_mentions (best-effort, table may not exist)
              try {
                const mentionInserts = mentionedUserIds.map(mentionedId => ({
                  id: uid(),
                  post_id: id,
                  mentioned_user_id: mentionedId,
                  created_at: created_at,
                }));
                await sb.from('post_mentions').insert(mentionInserts);
              } catch (e) {
                // Ignore if table doesn't exist
              }
              // Create notifications for mentions
              try {
                const notifInserts = mentionedUserIds.map(mentionedId => ({
                  id: uid(),
                  user_id: mentionedId,
                  actor_id: userId,
                  post_id: id,
                  type: 'mention',
                  text: `You were mentioned in a post`,
                  created_at: created_at,
                  read: false,
                }));
                await sb.from('notifications').insert(notifInserts);
              } catch (e) {
                // Ignore notification errors
              }
            }
          } catch (e) {
            // Ignore mention processing errors
          }
        })();
      }
    }

    return NextResponse.json({ ok: true, post: insertData, normalizedImageUrls, normalizedThumbnailUrls });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
