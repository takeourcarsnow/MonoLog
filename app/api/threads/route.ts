import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';

export async function GET(req: Request) {
  try {
    const sb = getServiceSupabase();
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const communityId = url.searchParams.get('communityId');

    if (id) {
      // Get single thread
      const { data: thread, error } = await sb
        .from('threads')
        .select(`
          *,
          user:users!threads_user_id_fkey(id, username, display_name, avatar_url),
          community:communities!threads_community_id_fkey(id, name),
          replyCount:thread_replies(count)
        `)
        .eq('id', id)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      return NextResponse.json({
        ...thread,
        replyCount: thread.replyCount?.count || 0
      });
    } else if (communityId) {
      // List threads in a community
      const { data: threads, error } = await sb
        .from('threads')
        .select(`
          *,
          user:users!threads_user_id_fkey(id, username, display_name, avatar_url),
          community:communities!threads_community_id_fkey(id, name),
          replyCount:thread_replies(count)
        `)
        .eq('community_id', communityId)
        .order('created_at', { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Transform the count objects to numbers
      const transformedThreads = threads.map(thread => ({
        ...thread,
        replyCount: thread.replyCount?.count || 0,
      }));

      return NextResponse.json(transformedThreads);
    } else {
      return NextResponse.json({ error: 'Either id or communityId parameter is required' }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}