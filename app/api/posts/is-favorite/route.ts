import { NextResponse } from 'next/server';
import { getUserFromAuthHeader } from '@/lib/api/serverVerifyAuth';
import { getServiceSupabase } from '@/lib/api/serverSupabase';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const postId = url.searchParams.get('postId');
    if (!postId) return NextResponse.json({ error: 'Missing postId' }, { status: 400 });
    const authUser = await getUserFromAuthHeader(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const actorId = authUser.id;
    const sb = getServiceSupabase();

    const { data: profile } = await sb.from('users').select('favorites').eq('id', actorId).limit(1).single();
    const favorites: string[] = (profile && profile.favorites) || [];
    const isFavorite = favorites.includes(postId);
    return NextResponse.json({ isFavorite });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}