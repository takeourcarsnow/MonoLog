import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import { getUserFromAuthHeader } from '@/src/lib/api/serverVerifyAuth';

export async function GET(req: Request) {
  try {
    const sb = getServiceSupabase();
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (id) {
      // Get single community
      const { data: community, error } = await sb
        .from('communities')
        .select(`
          *,
          creator:users!communities_creator_id_fkey(id, username, display_name, avatar_url),
          memberCount:community_members(count),
          threadCount:threads(count)
        `)
        .eq('id', id)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      // Check if current user is a member
      const authUser = await getUserFromAuthHeader(req);
      let isMember = false;
      if (authUser) {
        const { data: membership } = await sb
          .from('community_members')
          .select('id')
          .eq('community_id', id)
          .eq('user_id', authUser.id)
          .single();
        isMember = !!membership;
      }

      return NextResponse.json({
        ...community,
        memberCount: community.memberCount?.count || 0,
        threadCount: community.threadCount?.count || 0,
        isMember
      });
    } else {
      // List all communities
      const { data: communities, error } = await sb
        .from('communities')
        .select(`
          *,
          creator:users!communities_creator_id_fkey(id, username, display_name, avatar_url),
          memberCount:community_members(count),
          threadCount:threads(count)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Transform the count objects to numbers
      const transformedCommunities = communities.map(community => ({
        ...community,
        memberCount: community.memberCount?.count || 0,
        threadCount: community.threadCount?.count || 0,
      }));

      return NextResponse.json(transformedCommunities);
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Community ID is required' }, { status: 400 });

    const authUser = await getUserFromAuthHeader(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sb = getServiceSupabase();

    // Check if community exists and user is the creator
    const { data: community } = await sb
      .from('communities')
      .select('creator_id')
      .eq('id', id)
      .single();

    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    if (community.creator_id !== authUser.id) {
      return NextResponse.json({ error: 'Only the community creator can delete it' }, { status: 403 });
    }

    // Delete the community (CASCADE will handle threads, replies, members)
    const { error } = await sb
      .from('communities')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete community error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Delete community exception:', e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}