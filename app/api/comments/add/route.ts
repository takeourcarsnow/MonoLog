import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import { uid } from '@/src/lib/id';

export async function POST(req: Request) {
  try {
    const { actorId, postId, text } = await req.json();
    if (!actorId || !postId || !text) return NextResponse.json({ error: 'Missing actorId/postId/text' }, { status: 400 });
    const COMMENT_MAX = 500;
    if (typeof text === 'string' && text.trim().length > COMMENT_MAX) return NextResponse.json({ error: `Comment exceeds ${COMMENT_MAX} characters` }, { status: 400 });
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

  const up: any = { id: actorId, username, display_name: displayName };
  if (avatarUrl) up.avatar_url = avatarUrl;
  // only create the minimal profile when missing. Use insert rather
  // than upsert to avoid overwriting an existing row if the earlier
  // select failed due to schema cache issues.
  try { await sb.from('users').insert(up); } catch (e) { /* ignore */ }
      }
    } catch (e) {
      // ignore
    }

  // Try inserting using common snake_case column names first, then
    // fall back to alternate naming if the insert fails (some schemas
    // use `postid`/`userid` or camelCase). This keeps the endpoint
    // tolerant of DB variations.
    let insertErr: any = null;
    try {
      const res = await sb.from('comments').insert({ id, post_id: postId, user_id: actorId, text: text.trim(), created_at });
      insertErr = res.error;
    } catch (e) {
      insertErr = e;
    }
    if (insertErr) {
      // try compact snake / different conventions
      try {
        const res2 = await sb.from('comments').insert({ id, postid: postId, userid: actorId, text: text.trim(), createdat: created_at });
        insertErr = res2.error;
      } catch (e) {
        insertErr = e;
      }
    }
    if (insertErr) {
      // As a last resort, try camelCase variants
      try {
        const res3 = await sb.from('comments').insert({ id, postId, userId: actorId, text: text.trim(), createdAt: created_at });
        insertErr = res3.error;
      } catch (e) {
        insertErr = e;
      }
    }
    if (insertErr) return NextResponse.json({ error: String(insertErr.message || insertErr) }, { status: 500 });
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
