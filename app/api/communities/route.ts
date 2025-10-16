import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import { getUserFromAuthHeader } from '@/src/lib/api/serverVerifyAuth';

export async function GET(req: Request) {
  try {
    const sb = getServiceSupabase();
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');

    if (slug) {
      // Get single community
      const { data: community, error } = await sb
        .from('communities')
        .select(`
          *,
          creator:users!communities_creator_id_fkey(id, username, display_name, avatar_url)
        `)
        .eq('slug', slug)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      // Get member and thread counts
      const [memberCountResult, threadCountResult] = await Promise.all([
        sb.from('community_members').select('*', { count: 'exact', head: true }).eq('community_id', community.id),
        sb.from('threads').select('*', { count: 'exact', head: true }).eq('community_id', community.id)
      ]);

      // Check if current user is a member
      const authUser = await getUserFromAuthHeader(req);
      let isMember = false;
      if (authUser) {
        const { data: membership } = await sb
          .from('community_members')
          .select('id')
          .eq('community_id', community.id)
          .eq('user_id', authUser.id)
          .single();
        isMember = !!membership;
      }

      return NextResponse.json({
        ...community,
        memberCount: memberCountResult.count || 0,
        threadCount: threadCountResult.count || 0,
        isMember
      });
    } else {
      // List all communities
      const { data: communities, error } = await sb
        .from('communities')
        .select(`
          *,
          creator:users!communities_creator_id_fkey(id, username, display_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Get counts for each community
      const communitiesWithCounts = await Promise.all(
        communities.map(async (community) => {
          const [memberCountResult, threadCountResult] = await Promise.all([
            sb.from('community_members').select('*', { count: 'exact', head: true }).eq('community_id', community.id),
            sb.from('threads').select('*', { count: 'exact', head: true }).eq('community_id', community.id)
          ]);

          return {
            ...community,
            memberCount: memberCountResult.count || 0,
            threadCount: threadCountResult.count || 0,
          };
        })
      );

      return NextResponse.json(communitiesWithCounts);
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');
    if (!slug) return NextResponse.json({ error: 'Community slug is required' }, { status: 400 });

    const authUser = await getUserFromAuthHeader(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sb = getServiceSupabase();

    // Check if community exists and user is the creator
    const { data: community } = await sb
      .from('communities')
      .select('creator_id')
      .eq('slug', slug)
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
      .eq('slug', slug);

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

export async function PUT(req: Request) {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');
    if (!slug) return NextResponse.json({ error: 'Community slug is required' }, { status: 400 });

    const authUser = await getUserFromAuthHeader(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { name, description, imageUrl } = body;

    const sb = getServiceSupabase();

    // Check if community exists and user is the creator
    const { data: existingCommunity } = await sb
      .from('communities')
      .select('*')
      .eq('slug', slug)
      .single();

    if (!existingCommunity) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    if (existingCommunity.creator_id !== authUser.id) {
      return NextResponse.json({ error: 'Only the community creator can edit it' }, { status: 403 });
    }

    // Prepare update data
    const updateData: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) {
      updateData.name = name;
      updateData.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
    if (description !== undefined) updateData.description = description;
    if (imageUrl !== undefined) updateData.image_url = imageUrl;

    // Update the community
    const { data: updatedCommunity, error } = await sb
      .from('communities')
      .update(updateData)
      .eq('id', existingCommunity.id)
      .select(`
        *,
        creator:users!communities_creator_id_fkey(id, username, display_name, avatar_url)
      `)
      .single();

    if (error) {
      console.error('Update community error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get member and thread counts
    const [memberCountResult, threadCountResult] = await Promise.all([
      sb.from('community_members').select('*', { count: 'exact', head: true }).eq('community_id', updatedCommunity.id),
      sb.from('threads').select('*', { count: 'exact', head: true }).eq('community_id', updatedCommunity.id)
    ]);

    // Check if current user is a member
    let isMember = false;
    const { data: membership } = await sb
      .from('community_members')
      .select('id')
      .eq('community_id', updatedCommunity.id)
      .eq('user_id', authUser.id)
      .single();
    isMember = !!membership;

    return NextResponse.json({
      ...updatedCommunity,
      imageUrl: updatedCommunity.image_url,
      memberCount: memberCountResult.count || 0,
      threadCount: threadCountResult.count || 0,
      isMember
    });
  } catch (e: any) {
    console.error('Update community exception:', e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}