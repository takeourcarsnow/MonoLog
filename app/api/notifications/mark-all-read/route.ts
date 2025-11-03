import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import { getUserFromAuthHeader } from '@/src/lib/api/serverVerifyAuth';

export async function POST(req: Request) {
  try {
    const authUser = await getUserFromAuthHeader(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const actorId = authUser.id;
    const sb = getServiceSupabase();
    try {
      const { error } = await sb
        .from('notifications')
        .update({ read: true })
        .eq('user_id', actorId)
        .neq('read', true);
      if (error) return NextResponse.json({ ok: false, error: error.message || error }, { status: 500 });
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
