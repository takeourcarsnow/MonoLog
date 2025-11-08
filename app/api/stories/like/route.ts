import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/api/serverSupabase';
import { getUserFromAuthHeader } from '@/lib/api/serverVerifyAuth';
import { uid } from '@/lib/id';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const storyId = body.storyId;
    if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });
    const authUser = await getUserFromAuthHeader(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const actorId = authUser.id;
    const sb = getServiceSupabase();

    // Check if user already liked the story
    const { data: profile } = await sb.from('users').select('liked_stories').eq('id', actorId).limit(1).single();
    let current: string[] = (profile && profile.liked_stories) || [];
    if (current.includes(storyId)) {
      return NextResponse.json({ error: 'Already liked' }, { status: 400 });
    }
    current.push(storyId);
    const { error } = await sb.from('users').update({ liked_stories: current }).eq('id', actorId);
    if (error) return NextResponse.json({ error: error.message || error }, { status: 500 });

    // Create a notification for the story owner. This is best-effort
    // — if the notifications table doesn't exist or the insert fails, we
    // shouldn't block like creation.
    (async () => {
      try {
        // lookup story owner
        const { data: story, error: storyErr } = await sb.from('stories').select('id, user_id').eq('id', storyId).limit(1).single();
        if (!story || storyErr) return;
        // Don't send notification if user is liking their own story
        if (actorId === story.user_id) return;
        const notifId = uid();
        const notif = {
          id: notifId,
          user_id: story.user_id,
          actor_id: actorId,
          post_id: storyId,
          type: 'like',
          text: 'Someone liked your story',
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