import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';

export async function GET(req: Request) {
  try {
    const sb = getServiceSupabase();
    const url = new URL(req.url);
    const since = url.searchParams.get('since');

    if (!since) {
      return NextResponse.json({ error: 'since parameter is required' }, { status: 400 });
    }

    // Get current user
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await sb.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get communities the user is a member of
    const { data: memberships, error: membershipError } = await sb
      .from('community_members')
      .select('community_id')
      .eq('user_id', user.id);

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ hasNewThreads: false });
    }

    const communityIds = memberships.map(m => m.community_id);

    // Check if there are any threads created after the since timestamp in these communities
    const { data: threads, error: threadsError } = await sb
      .from('threads')
      .select('id')
      .in('community_id', communityIds)
      .gt('created_at', since)
      .limit(1);

    if (threadsError) {
      return NextResponse.json({ error: threadsError.message }, { status: 500 });
    }

    // Also check for new replies in threads that the user has participated in
    // Get threads where user is the author or has replied
    const { data: participatedThreads, error: participatedError } = await sb
      .from('threads')
      .select('id')
      .or(`user_id.eq.${user.id}`)
      .in('community_id', communityIds);

    if (participatedError) {
      return NextResponse.json({ error: participatedError.message }, { status: 500 });
    }

    // Also get threads where user has replied (but not authored)
    const { data: repliedThreads, error: repliedError } = await sb
      .from('thread_replies')
      .select('thread_id')
      .eq('user_id', user.id);

    if (repliedError) {
      return NextResponse.json({ error: repliedError.message }, { status: 500 });
    }

    const participatedThreadIds = participatedThreads ? participatedThreads.map(t => t.id) : [];
    const repliedThreadIds = repliedThreads ? repliedThreads.map(r => r.thread_id as string) : [];
    const allRelevantThreadIds = [...new Set([...participatedThreadIds, ...repliedThreadIds])];

    let hasNewReplies = false;
    if (allRelevantThreadIds.length > 0) {
      // Check for new replies in these threads
      const { data: replies, error: repliesError } = await sb
        .from('thread_replies')
        .select('id')
        .in('thread_id', allRelevantThreadIds)
        .gt('created_at', since)
        .neq('user_id', user.id) // Don't notify about user's own replies
        .limit(1);

      if (repliesError) {
        return NextResponse.json({ error: repliesError.message }, { status: 500 });
      }

      hasNewReplies = replies && replies.length > 0;
    }

    const hasNewActivity = (threads && threads.length > 0) || hasNewReplies;

    return NextResponse.json({ hasNewThreads: hasNewActivity });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}