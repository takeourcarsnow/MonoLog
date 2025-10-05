import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';

export async function POST(req: Request) {
  try {
    const { actorId, postId } = await req.json();
    if (!actorId || !postId) return NextResponse.json({ error: 'Missing actorId or postId' }, { status: 400 });
    const sb = getServiceSupabase();

    const { data: profile } = await sb.from('users').select('favorites').eq('id', actorId).limit(1).single();
    let current: string[] = (profile && profile.favorites) || [];
    if (!current.includes(postId)) current.push(postId);
    const { error } = await sb.from('users').update({ favorites: current }).eq('id', actorId);
    if (error) return NextResponse.json({ error: error.message || error }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
