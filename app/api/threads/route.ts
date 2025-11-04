import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/api/serverSupabase';
import { slugify } from '@/lib/utils';
import { apiError, apiSuccess } from '@/lib/apiResponse';
import { makeWeakETag } from '@/lib/api/utils';

async function getReplyCount(sb: any, threadId: string): Promise<number> {
  const { count } = await sb
    .from('thread_replies')
    .select('*', { count: 'exact', head: true })
    .eq('thread_id', threadId);
  return count || 0;
}

async function getThreadById(sb: any, id: string) {
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

  const replyCount = await getReplyCount(sb, id);

  return NextResponse.json({
    ...thread,
    slug: thread.slug || slugify(thread.title),
    replyCount
  });
}

async function getThreadBySlug(sb: any, slug: string) {
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

  const replyCount = await getReplyCount(sb, thread.id);

  return NextResponse.json({
    ...thread,
    slug: thread.slug || slugify(thread.title),
    replyCount
  });
}

async function getCommunityThreads(sb: any, communityId: string) {
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
      fallbackThreads.map(async (thread: any) => {
        const replyCount = await getReplyCount(sb, thread.id);
        return {
          ...thread,
          slug: thread.slug || slugify(thread.title),
          replyCount,
        };
      })
    );

      const etag = makeWeakETag(threadsWithReplyCounts);
      const headers: HeadersInit = { ETag: etag };
      const cacheSeconds = 20;
      return apiSuccess(threadsWithReplyCounts, 200, { headers, cacheSeconds });
  }

    // RPC returned threads, cacheable list
    const etag = makeWeakETag(threads);
    const headers: HeadersInit = { ETag: etag };
    const cacheSeconds = 20;
    return apiSuccess(threads, 200, { headers, cacheSeconds });
}

export async function GET(req: Request) {
  try {
    const sb = getServiceSupabase();
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const slug = url.searchParams.get('slug');
    const communityId = url.searchParams.get('communityId');

    if (id) {
      return await getThreadById(sb, id);
    } else if (slug) {
      return await getThreadBySlug(sb, slug);
    } else if (communityId) {
      return await getCommunityThreads(sb, communityId);
    } else {
        return apiError('Either id, slug, or communityId parameter is required', 400);
    }
  } catch (e: any) {
      return apiError(e?.message || String(e), 500);
  }
}