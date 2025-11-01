import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import { slugify } from '@/src/lib/utils';

export async function GET(req: Request) {
  try {
    const sb = getServiceSupabase();
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const slug = url.searchParams.get('slug');
    const communityId = url.searchParams.get('communityId');

    if (id) {
      // Get single thread
      const { data: thread, error } = await sb
        .from('threads')
        .select(`
          *,
          user:users!threads_user_id_fkey(id, username, display_name, avatar_url),
          community:communities!threads_community_id_fkey(id, name, slug)
        `)
        .eq('id', id)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      // Get reply count
      const { count: replyCount } = await sb
        .from('thread_replies')
        .select('*', { count: 'exact', head: true })
        .eq('thread_id', id);

      return NextResponse.json({
        ...thread,
        slug: thread.slug || slugify(thread.title),
        replyCount: replyCount || 0
      });
    } else if (slug) {
      // Get single thread by slug
      const { data: thread, error } = await sb
        .from('threads')
        .select(`
          *,
          user:users!threads_user_id_fkey(id, username, display_name, avatar_url),
          community:communities!threads_community_id_fkey(id, name, slug)
        `)
        .eq('slug', slug)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      // Get reply count
      const { count: replyCount } = await sb
        .from('thread_replies')
        .select('*', { count: 'exact', head: true })
        .eq('thread_id', thread.id);

      return NextResponse.json({
        ...thread,
        slug: thread.slug || slugify(thread.title),
        replyCount: replyCount || 0
      });
    } else if (communityId) {
      // List threads in a community ordered by last activity
      const { data: threads, error } = await sb.rpc('get_community_threads_ordered_by_activity', {
        p_community_id: communityId
      });

      if (error) {
        // Fallback to simple ordering if RPC doesn't exist
        const { data: fallbackThreads, error: fallbackError } = await sb
          .from('threads')
          .select(`
            *,
            user:users!threads_user_id_fkey(id, username, display_name, avatar_url),
            community:communities!threads_community_id_fkey(id, name, slug)
          `)
          .eq('community_id', communityId)
          .order('created_at', { ascending: false });

        if (fallbackError) {
          return NextResponse.json({ error: fallbackError.message }, { status: 500 });
        }

        // Get reply counts for each thread
        const threadsWithReplyCounts = await Promise.all(
          fallbackThreads.map(async (thread) => {
            const { count: replyCount } = await sb
              .from('thread_replies')
              .select('*', { count: 'exact', head: true })
              .eq('thread_id', thread.id);
            return {
              ...thread,
              slug: thread.slug || slugify(thread.title),
              replyCount: replyCount || 0,
            };
          })
        );

        return NextResponse.json(threadsWithReplyCounts);
      }

      return NextResponse.json(threads);
    } else {
      return NextResponse.json({ error: 'Either id or communityId parameter is required' }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}