import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import { uid } from '@/src/lib/id';
import { getUserFromAuthHeader } from '@/src/lib/api/serverVerifyAuth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, description } = body;
    const authUser = await getUserFromAuthHeader(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = authUser.id;

    if (!name || !description) {
      return NextResponse.json({ error: 'Name and description are required' }, { status: 400 });
    }

    if (name.length < 3 || name.length > 50) {
      return NextResponse.json({ error: 'Community name must be between 3 and 50 characters' }, { status: 400 });
    }

    if (description.length < 10 || description.length > 500) {
      return NextResponse.json({ error: 'Community description must be between 10 and 500 characters' }, { status: 400 });
    }

    const sb = getServiceSupabase();

    // Check if community name already exists
    const { data: existing } = await sb
      .from('communities')
      .select('id')
      .eq('name', name)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Community name already exists' }, { status: 409 });
    }

    const id = uid();
    const created_at = new Date().toISOString();

    // Create community
    const { data: community, error } = await sb
      .from('communities')
      .insert({
        id,
        name,
        description,
        creator_id: userId,
        created_at,
        updated_at: created_at
      })
      .select(`
        *,
        creator:users!communities_creator_id_fkey(id, username, display_name, avatar_url)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Auto-join the creator to the community
    await sb
      .from('community_members')
      .insert({
        id: uid(),
        community_id: id,
        user_id: userId,
        joined_at: created_at
      });

    return NextResponse.json({
      ...community,
      memberCount: 1,
      threadCount: 0,
      isMember: true
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}