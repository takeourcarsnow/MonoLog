import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/api/serverSupabase';

export async function POST(req: Request) {
  try {
    const { actorId, targetId } = await req.json();
    if (!actorId || !targetId) return NextResponse.json({ error: 'Missing actorId or targetId' }, { status: 400 });
    const sb = getServiceSupabase();

    // Try to insert into a dedicated follows table first (if present)
    try {
      const insertRes = await sb.from('follows').insert({ follower: actorId, followee: targetId }).select('*');
      // ignore errors here; if the table doesn't exist this will throw
    } catch (e) {
      // ignore missing table or constraint errors
    }

    // Also keep the legacy users.following array in sync for older UI code
    try {
      const { data: profile } = await sb.from('users').select('following').eq('id', actorId).limit(1).single();
      const current: string[] = (profile && profile.following) || [];
      if (!current.includes(targetId)) current.push(targetId);
      const { error } = await sb.from('users').update({ following: current }).eq('id', actorId);
      if (error) return NextResponse.json({ error: error.message || error }, { status: 500 });
    } catch (e) {
      // ignore errors updating legacy array
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
