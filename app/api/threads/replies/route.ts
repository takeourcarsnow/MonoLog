import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import { uid } from '@/src/lib/id';
import { getUserFromAuthHeader } from '@/src/lib/api/serverVerifyAuth';

export async function GET(req: Request) {
  try {
    const sb = getServiceSupabase();
    const url = new URL(req.url);
    const threadId = url.searchParams.get('threadId');

    if (!threadId) {
      return NextResponse.json({ error: 'threadId parameter is required' }, { status: 400 });
    }

    // Get thread replies
    const { data: replies, error } = await sb
      .from('thread_replies')
      .select(`
        *,
        user:users!thread_replies_user_id_fkey(id, username, display_name, avatar_url)
      `)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(replies);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { threadId, content } = body;
    const authUser = await getUserFromAuthHeader(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = authUser.id;

    if (!threadId || !content) {
      return NextResponse.json({ error: 'Thread ID and content are required' }, { status: 400 });
    }

    if (content.length < 1 || content.length > 5000) {
      return NextResponse.json({ error: 'Reply content must be between 1 and 5,000 characters' }, { status: 400 });
    }

    const sb = getServiceSupabase();

    // Check if thread exists and user is a member of the community
    const { data: thread } = await sb
      .from('threads')
      .select('id, community_id, user_id')
      .eq('id', threadId)
      .single();

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    const { data: membership } = await sb
      .from('community_members')
      .select('id')
      .eq('community_id', thread.community_id)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'You must be a member of this community to reply' }, { status: 403 });
    }

    const id = uid();
    const created_at = new Date().toISOString();

    // Create reply
    const { data: reply, error } = await sb
      .from('thread_replies')
      .insert({
        id,
        thread_id: threadId,
        user_id: userId,
        content,
        created_at
      })
      .select(`
        *,
        user:users!thread_replies_user_id_fkey(id, username, display_name, avatar_url)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Try to create a notification for the thread owner. This is best-effort
    // — if the notifications table doesn't exist or the insert fails, we
    // shouldn't block reply creation.
    (async () => {
      try {
        const notifId = uid();
        const notif = {
          id: notifId,
          user_id: thread.user_id,
          actor_id: userId,
          thread_id: threadId,
          type: 'thread_reply',
          text: content.trim().slice(0, 240),
          created_at,
          read: false,
        } as any;
        await sb.from('notifications').insert(notif);
      } catch (e) {
        // ignore notification errors
      }
    })();

    return NextResponse.json(reply);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { replyId, content } = body;
    const authUser = await getUserFromAuthHeader(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = authUser.id;

    if (!replyId || !content) {
      return NextResponse.json({ error: 'Reply ID and content are required' }, { status: 400 });
    }

    if (content.length < 1 || content.length > 5000) {
      return NextResponse.json({ error: 'Reply content must be between 1 and 5,000 characters' }, { status: 400 });
    }

    const sb = getServiceSupabase();

    // Check if reply exists and belongs to the user
    const { data: existingReply } = await sb
      .from('thread_replies')
      .select('id, user_id')
      .eq('id', replyId)
      .single();

    if (!existingReply) {
      return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
    }

    if (existingReply.user_id !== userId) {
      return NextResponse.json({ error: 'You can only edit your own replies' }, { status: 403 });
    }

    // Update reply
    const { data: reply, error } = await sb
      .from('thread_replies')
      .update({
        content
      })
      .eq('id', replyId)
      .select(`
        *,
        user:users!thread_replies_user_id_fkey(id, username, display_name, avatar_url)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(reply);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}