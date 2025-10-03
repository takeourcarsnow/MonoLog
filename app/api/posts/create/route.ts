import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/api/serverSupabase';
import { uid } from '@/lib/id';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, imageUrls, caption, alt, replace = false, public: isPublic = true } = body;
    // Debug: log incoming payload so we can verify client is sending multiple images
  try { logger.debug('[posts.create] incoming', { userId, imageUrlsLen: Array.isArray(imageUrls) ? imageUrls.length : (imageUrls ? 1 : 0) }); } catch (e) {}
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
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
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setDate(start.getDate() + 1);
      const { data: todays } = await sb.from('posts').select('*').eq('user_id', userId).gte('created_at', start.toISOString()).lt('created_at', end.toISOString());
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

    // Insert new post
    const id = uid();
    const created_at = new Date().toISOString();
    const insertObj: any = { id, user_id: userId, alt: alt || '', caption: caption || '', created_at, public: !!isPublic };
    // Always set primary image_url to preserve compatibility with older schemas.
    if (imageUrls && imageUrls.length >= 1) insertObj.image_url = imageUrls[0];
    // Prefer storing multiple urls when provided, but this column may not exist in
    // older / minimal schemas. We'll attempt the insert with image_urls and fall
    // back to inserting only image_url if the DB rejects the unknown column.
    if (imageUrls && imageUrls.length > 1) insertObj.image_urls = imageUrls;

    // Try insert; if it fails due to missing `image_urls` column, try a few
    // fallbacks (json/jsonb column names) before giving up and inserting only
    // the legacy single `image_url`.
    let insertData: any = null;
    let error: any = null;
    try {
      const res = await sb.from('posts').insert(insertObj).select('*').limit(1).single();
      error = res.error;
      insertData = res.data;
    } catch (e: any) {
      error = e;
    }

    if (error) {
      const msg = (error && (error.message || String(error))).toLowerCase();
      // common error when a column doesn't exist or schema cache mismatch
      if (msg.includes('image_urls') || msg.includes('column') || msg.includes('could not find')) {
        // Try alternative column names that some schemas use
        const tryNames = ['image_urls_json', 'image_urls_jsonb'];
        let success = false;
        for (const name of tryNames) {
          try {
            const altObj: any = { ...insertObj };
            delete altObj.image_urls; // remove the original array field
            // store as an actual array/JSON value in the alternate column so
            // json/jsonb columns receive a proper array value instead of a string
            // (Supabase/Postgres will accept JS arrays for jsonb columns).
            altObj[name] = imageUrls || [];
            const res2 = await sb.from('posts').insert(altObj).select('*').limit(1).single();
            if (!res2.error && res2.data) {
              insertData = res2.data;
              success = true;
              break;
            }
          } catch (e: any) {
            // ignore and try next fallback
          }
        }
        if (!success) {
          // final attempt: insert without multi-image column (legacy fallback)
          try {
            const safeObj = { ...insertObj };
            delete safeObj.image_urls;
            const res3 = await sb.from('posts').insert(safeObj).select('*').limit(1).single();
            if (res3.error) return NextResponse.json({ error: res3.error.message || res3.error }, { status: 500 });
            insertData = res3.data;
          } catch (e: any) {
            return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
          }
        }
      } else {
        return NextResponse.json({ error: error.message || error }, { status: 500 });
      }
    }

    // Compute a normalized imageUrls representation from whatever the DB returned
    let normalizedImageUrls: string[] | undefined = undefined;
    try {
      if (insertData) {
        normalizedImageUrls = insertData.image_urls ?? insertData.image_urls_json ?? insertData.image_urls_jsonb ?? (insertData.image_url ? [insertData.image_url] : undefined);
        // If the value is a string containing JSON, attempt to parse it
        if (typeof normalizedImageUrls === 'string') {
          try {
            const parsed = JSON.parse(normalizedImageUrls as any);
            if (Array.isArray(parsed)) normalizedImageUrls = parsed.map(String);
          } catch (e) {
            normalizedImageUrls = [String(normalizedImageUrls)];
          }
        }
      }
    } catch (e) {
      // ignore normalization failures
    }

  try { logger.debug('[posts.create] inserted', { id: insertData?.id, normalizedImageUrls: normalizedImageUrls?.slice(0,5) }); } catch (e) {}

    // If the client provided multiple images but the returned row doesn't
    // include a multi-image column, attempt a follow-up update to persist
    // the array into common fallback columns. This helps when the initial
    // insert path had to drop the unknown column and returned a legacy row.
    if ((imageUrls && imageUrls.length > 1) && insertData) {
      const hasArrayOnRow = Array.isArray(insertData.image_urls) || Array.isArray(insertData.image_urls_json) || Array.isArray(insertData.image_urls_jsonb);
      if (!hasArrayOnRow) {
        try {
          const updateTryNames = ['image_urls', 'image_urls_json', 'image_urls_jsonb'];
          for (const name of updateTryNames) {
            try {
              const payload: any = {};
              payload[name] = imageUrls || [];
              const upRes: any = await sb.from('posts').update(payload).eq('id', insertData.id).select('*').limit(1).single();
              if (!upRes.error && upRes.data) {
                insertData = upRes.data;
                try { logger.debug('[posts.create] post-insert updated', { id: insertData.id, updatedBy: name }); } catch (e) {}
                break;
              }
            } catch (e) {
              // ignore and try next
            }
          }
        } catch (e) {
          // ignore
        }
      }
    }

    // Recompute normalizedImageUrls based on possibly-updated row
    try {
      if (insertData) {
        normalizedImageUrls = insertData.image_urls ?? insertData.image_urls_json ?? insertData.image_urls_jsonb ?? (insertData.image_url ? [insertData.image_url] : undefined);
        if (typeof normalizedImageUrls === 'string') {
          try {
            const parsed = JSON.parse(normalizedImageUrls as any);
            if (Array.isArray(parsed)) normalizedImageUrls = parsed.map(String);
          } catch (e) {
            normalizedImageUrls = [String(normalizedImageUrls)];
          }
        }
      }
    } catch (e) {}

  try { logger.debug('[posts.create] final', { id: insertData?.id, normalizedImageUrls: normalizedImageUrls?.slice(0,5) }); } catch (e) {}

    return NextResponse.json({ ok: true, post: insertData, normalizedImageUrls });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
