import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/api/serverSupabase';
import { getUserFromAuthHeader } from '@/lib/api/serverVerifyAuth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const storyId = body.storyId;
    if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });
    const authUser = await getUserFromAuthHeader(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const actorId = authUser.id;
    const sb = getServiceSupabase();

    const { data: profile } = await sb.from('users').select('liked_stories').eq('id', actorId).limit(1).single();
    let current: string[] = (profile && profile.liked_stories) || [];
    current = current.filter((id: string) => id !== storyId);
    const { error } = await sb.from('users').update({ liked_stories: current }).eq('id', actorId);
    if (error) return NextResponse.json({ error: error.message || error }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}