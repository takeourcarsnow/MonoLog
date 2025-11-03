import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import { getUserFromAuthHeader } from '@/src/lib/api/serverVerifyAuth';

export async function GET(req: Request) {
  try {
    const authUser = await getUserFromAuthHeader(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const actorId = authUser.id;
    const sb = getServiceSupabase();

    try {
      const { count, error } = await sb
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', actorId)
        .neq('read', true);

      if (error) return NextResponse.json({ count: 0 });
      return NextResponse.json({ count: count || 0 });
    } catch (_) {
      return NextResponse.json({ count: 0 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // Allow POST as well for consistency with other endpoints
  return GET(req);
}
