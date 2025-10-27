import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import { uid } from '@/src/lib/id';
import { getUserFromAuthHeader } from '@/src/lib/api/serverVerifyAuth';
import { slugify } from '@/src/lib/utils';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { communityId, title, content } = body;
    const authUser = await getUserFromAuthHeader(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = authUser.id;

    if (!communityId || !title || !content) {
      return NextResponse.json({ error: 'Community ID, title, and content are required' }, { status: 400 });
    }

    if (title.length < 5 || title.length > 200) {
      return NextResponse.json({ error: 'Thread title must be between 5 and 200 characters' }, { status: 400 });
    }

    if (content.length < 10 || content.length > 10000) {
      return NextResponse.json({ error: 'Thread content must be between 10 and 10,000 characters' }, { status: 400 });
    }

    const sb = getServiceSupabase();

    // Check if community exists and user is a member
    const { data: membership } = await sb
      .from('community_members')
      .select('id')
      .eq('community_id', communityId)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'You must be a member of this community to create threads' }, { status: 403 });
    }

    const id = uid();
    const created_at = new Date().toISOString();

    // Create thread
    const { data: thread, error } = await sb
      .from('threads')
      .insert({
        id,
        community_id: communityId,
        user_id: userId,
        title,
        content,
        slug: slugify(title),
        created_at,
        updated_at: created_at
      })
      .select(`
        *,
        user:users!threads_user_id_fkey(id, username, display_name, avatar_url),
        community:communities!threads_community_id_fkey(id, name)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ...thread,
      replyCount: 0
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}