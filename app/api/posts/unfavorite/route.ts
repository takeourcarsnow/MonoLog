import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import { getUserFromAuthHeader } from '@/src/lib/api/serverVerifyAuth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const postId = body.postId;
    if (!postId) return NextResponse.json({ error: 'Missing postId' }, { status: 400 });
    const authUser = await getUserFromAuthHeader(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const actorId = authUser.id;
    const sb = getServiceSupabase();

    const { data: profile } = await sb.from('users').select('favorites').eq('id', actorId).limit(1).single();
    let current: string[] = (profile && profile.favorites) || [];
    current = current.filter((id: string) => id !== postId);
    const { error } = await sb.from('users').update({ favorites: current }).eq('id', actorId);
    if (error) return NextResponse.json({ error: error.message || error }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
