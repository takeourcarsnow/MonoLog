import { NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../../src/lib/api/serverSupabase';
import { uid } from '../../../../src/lib/id';
import { getUserFromAuthHeader } from '../../../../src/lib/api/serverVerifyAuth';
import { checkComment } from '../../../../src/lib/moderation';
import { apiRateLimiter } from '../../../../src/lib/rateLimiter';

export async function POST(req: Request) {
  try {
    // Rate limiting: moderate limits for comment creation
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimit = apiRateLimiter.checkLimit(ip);
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
    const postId = body.postId;
    const text = body.text;
    if (!postId || !text) return NextResponse.json({ error: 'Missing postId or text' }, { status: 400 });
    const authUser = await getUserFromAuthHeader(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const actorId = authUser.id;
    const COMMENT_MAX = 500;
    if (typeof text === 'string' && text.trim().length > COMMENT_MAX) return NextResponse.json({ error: `Comment exceeds ${COMMENT_MAX} characters` }, { status: 400 });
    // run automod checks
    try {
      const mod = checkComment(String(text));
      if (mod.action === 'reject') {
        return NextResponse.json({ error: 'Comment rejected by moderation', reasons: mod.reasons, score: mod.score }, { status: 400 });
      }
      if (mod.action === 'flag') {
        // For now treat flagged comments as rejected; alternatively we could
        // insert with a 'flagged' column or moderation queue. This is a
        // conservative default to avoid posting spam/links immediately.
        return NextResponse.json({ error: 'Comment flagged by moderation', reasons: mod.reasons, score: mod.score }, { status: 400 });
      }
    } catch (e) {
      // If moderation util throws for unexpected reason, allow the comment
      // to avoid blocking users. Moderation should be best-effort.
    }
    const sb = getServiceSupabase();

  const id = uid();
    const created_at = new Date().toISOString();
    // Ensure a minimal profile exists for the actor so the comment list
    // can join a users row and show a username/displayName instead of a generic fallback.
    try {
      // Don't clobber an existing profile. If a users row already exists, skip upsert.
      const { data: existing, error: existErr } = await sb.from('users').select('id,username,display_name,avatar_url').eq('id', actorId).limit(1).maybeSingle();
      if (!existErr && existing) {
        // we already have a profile row; leave it alone
      } else {
        // Try to enrich profile from Auth user metadata when available
        let username = String(actorId).slice(0, 8);
        let displayName = 'User';
        let avatarUrl: string | undefined = undefined;
        try {
          // admin.getUserById is available when using service role client; shape may vary
          const maybe = await (sb as any).auth?.admin?.getUserById?.(actorId);
          const authUser = maybe?.data?.user || maybe?.data || null;
          if (authUser) {
            // Try common metadata paths
            const md = authUser.user_metadata || authUser.raw_user_meta_data || authUser.raw_app_meta_data || {};
            if (md) {
              if (md.username) username = md.username;
              if (md.name) displayName = md.name;
              if (md.avatar_url) avatarUrl = md.avatar_url;
              if (md.avatarUrl) avatarUrl = avatarUrl || md.avatarUrl;
            }
            // fallback to email-based username
            if ((!md || !md.username) && authUser.email) username = authUser.email.split('@')[0];
          }
        } catch (e) {
          // ignore admin fetch errors
        }

  const up: any = { id: actorId, username, display_name: null };
  if (avatarUrl) up.avatar_url = avatarUrl;
  // only create the minimal profile when missing. Use insert rather
  // than upsert to avoid overwriting an existing row if the earlier
  // select failed due to schema cache issues.
  try { await sb.from('users').insert(up); } catch (e) { /* ignore */ }
      }
    } catch (e) {
      // ignore
    }

    // Insert using the correct snake_case column names that match the database schema
    const insertData = { id, post_id: postId, user_id: actorId, text: text.trim(), created_at };
    
    const res = await sb.from('comments').insert(insertData);
    if (res.error) return NextResponse.json({ error: String(res.error.message || res.error) }, { status: 500 });
    // Try to create a notification for the post owner. This is best-effort
    // — if the notifications table doesn't exist or the insert fails, we
    // shouldn't block comment creation.
    (async () => {
      try {
        // lookup post owner
        const { data: post, error: postErr } = await sb.from('posts').select('id, user_id').eq('id', postId).limit(1).single();
        if (!post || postErr) return;
        const notifId = uid();
        const notif = {
          id: notifId,
          user_id: post.user_id,
          actor_id: actorId,
          post_id: postId,
          type: 'comment',
          text: text.trim().slice(0, 240),
          created_at,
          read: false,
        } as any;
        await sb.from('notifications').insert(notif);
      } catch (e) {
        // ignore notification errors
      }
    })();

    return NextResponse.json({ ok: true, id, created_at });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
