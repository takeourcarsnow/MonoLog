import { NextResponse } from 'next/server';
import { getUserFromAuthHeader } from '@/lib/api/serverVerifyAuth';
import { getServiceSupabase } from '@/lib/api/serverSupabase';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const storyId = url.searchParams.get('storyId');
    if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });
    const authUser = await getUserFromAuthHeader(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const actorId = authUser.id;
    const sb = getServiceSupabase();

    const { data: profile } = await sb.from('users').select('liked_stories').eq('id', actorId).limit(1).single();
    const likedStories: string[] = (profile && profile.liked_stories) || [];
    const isLiked = likedStories.includes(storyId);
    return NextResponse.json({ isLiked });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}