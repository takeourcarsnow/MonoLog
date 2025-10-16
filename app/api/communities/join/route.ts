import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import { uid } from '@/src/lib/id';
import { getUserFromAuthHeader } from '@/src/lib/api/serverVerifyAuth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { communityId } = body;
    const authUser = await getUserFromAuthHeader(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = authUser.id;

    if (!communityId) {
      return NextResponse.json({ error: 'Community ID is required' }, { status: 400 });
    }

    const sb = getServiceSupabase();

    // Check if community exists
    const { data: community } = await sb
      .from('communities')
      .select('id')
      .eq('id', communityId)
      .single();

    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    // Check if already a member
    const { data: existing } = await sb
      .from('community_members')
      .select('id')
      .eq('community_id', communityId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Already a member of this community' }, { status: 409 });
    }

    // Join community
    const { error } = await sb
      .from('community_members')
      .insert({
        id: uid(),
        community_id: communityId,
        user_id: userId,
        joined_at: new Date().toISOString()
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}