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
      // List all communities ordered by last activity
      // Add simple pagination to limit DB/RPC load
      const urlParams = new URL(req.url).searchParams;
      const page = Math.max(1, parseInt(urlParams.get('page') || '1', 10));
      const limit = Math.min(50, Math.max(5, parseInt(urlParams.get('limit') || '20', 10)));
      const offset = (page - 1) * limit;

      let communities: any[] = [];
      let error = null;

      try {
        // Call RPC and apply pagination server-side (RPC currently returns all rows)
        const result = await sb.rpc('get_communities_ordered_by_activity');
        const rows = (result && result.data) || [];
        communities = rows.slice(offset, offset + limit);
        error = result.error;
        console.debug('[GET /api/communities] rpc result:', { ok: !error, rows: (rows || []).length, returned: communities.length, error });
      } catch (rpcError) {
        error = rpcError;
        console.debug('[GET /api/communities] rpc threw an exception:', rpcError);
      }

      if (error) {
        // Fallback to simple ordering if RPC doesn't exist
        // Fallback: select only the minimal fields for list view and apply pagination
        const { data: fallbackCommunities, error: fallbackError } = await sb
          .from('communities')
          .select(`
            id, name, slug, description, image_url, creator_id, created_at, updated_at
          `)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (fallbackError) {
          return NextResponse.json({ error: fallbackError.message }, { status: 500 });
        }

        communities = fallbackCommunities || [];
      }

      // Process communities based on source
      let communitiesWithCounts;
      let totalCount = 0;

      if (error) {
        // Fallback case: get counts for each community
        communitiesWithCounts = await Promise.all(
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
        // For fallback (we used .range), compute total count separately
        const { count } = await sb.from('communities').select('id', { count: 'exact', head: true });
        totalCount = count || 0;
      } else {
        // RPC case: data already includes counts, transform creator
        communitiesWithCounts = communities.map((community: any) => ({
          ...community,
          memberCount: community.member_count || 0,
          threadCount: community.thread_count || 0,
          creator: community.creator, // Already JSONB object
        }));
        // If RPC returned a full set (we sliced server-side), we can try to infer total from result.data length
        try {
          const fullResult = await sb.rpc('get_communities_ordered_by_activity');
          totalCount = (fullResult && fullResult.data && fullResult.data.length) || communitiesWithCounts.length;
        } catch (e) {
          totalCount = communitiesWithCounts.length;
        }
      }

      const res = NextResponse.json(communitiesWithCounts);
      // Attach total count header for client pagination controls
      try {
        res.headers.set('X-Total-Count', String(totalCount));
      } catch (e) {
        // NextResponse.headers may be read-only in some runtimes; ignore if set fails
      }
      return res;
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