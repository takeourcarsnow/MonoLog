import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/api/serverSupabase';
import { uid } from '@/lib/id';

export async function POST(req: Request) {
  try {
    const { actorId, postId, text } = await req.json();
    if (!actorId || !postId || !text) return NextResponse.json({ error: 'Missing actorId/postId/text' }, { status: 400 });
    const sb = getServiceSupabase();

  const id = uid();
    const created_at = new Date().toISOString();
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
