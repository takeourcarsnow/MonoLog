import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import { getUserFromAuthHeader } from '@/src/lib/api/serverVerifyAuth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const targetId = body.targetId;
    if (!targetId) return NextResponse.json({ error: 'Missing targetId' }, { status: 400 });
    const authUser = await getUserFromAuthHeader(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const actorId = authUser.id;
    const sb = getServiceSupabase();

    // Try to delete from dedicated follows table first (if present)
    try {
      await sb.from('follows').delete().eq('follower', actorId).eq('followee', targetId);
    } catch (e) {
      // ignore missing table or constraint errors
    }

    // Also keep the legacy users.following array in sync for older UI code
    try {
      const { data: profile } = await sb.from('users').select('following').eq('id', actorId).limit(1).single();
      const current: string[] = (profile && profile.following) || [];
      const updated = current.filter((id: string) => id !== targetId);
      const { error } = await sb.from('users').update({ following: updated }).eq('id', actorId);
      if (error) return NextResponse.json({ error: error.message || error }, { status: 500 });
    } catch (e) {
      // ignore legacy-array update errors
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
