import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import { getUserFromAuthHeader } from '@/src/lib/api/serverVerifyAuth';
import { uid } from '@/src/lib/id';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const postId = body.postId;
    if (!postId) return NextResponse.json({ error: 'Missing postId' }, { status: 400 });
    const authUser = await getUserFromAuthHeader(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const actorId = authUser.id;
    const sb = getServiceSupabase();

    const { data: profile } = await sb.from('users').select('favorites').eq('id', actorId).limit(1).single();
    let current: string[] = (profile && profile.favorites) || [];
    if (!current.includes(postId)) current.push(postId);
    const { error } = await sb.from('users').update({ favorites: current }).eq('id', actorId);
    if (error) return NextResponse.json({ error: error.message || error }, { status: 500 });

    // Create a notification for the post owner. This is best-effort
    // — if the notifications table doesn't exist or the insert fails, we
    // shouldn't block favorite creation.
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
          type: 'favorite',
          text: 'Someone favorited your post',
          created_at: new Date().toISOString(),
          read: false,
        } as any;
        await sb.from('notifications').insert(notif);
      } catch (e) {
        // ignore notification errors
      }
    })();

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
