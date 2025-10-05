import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';

export async function POST(req: Request) {
  try {
    const { actorId, ids } = await req.json();
    if (!actorId || !ids || !Array.isArray(ids)) return NextResponse.json({ error: 'Missing actorId or ids' }, { status: 400 });
    const sb = getServiceSupabase();
    try {
      // Only mark notifications that belong to the actor
      const { error } = await sb.from('notifications').update({ read: true }).eq('user_id', actorId).in('id', ids);
      if (error) return NextResponse.json({ ok: false, error: error.message || error }, { status: 500 });
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json({ ok: false });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
