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
      // Only return unread notifications so clients don't re-notify on each
      // page load. The `mark-read` endpoint sets `read: true` when a client
      // acknowledges notifications.
      const { data, error } = await sb.from('notifications')
        .select('*')
        .eq('user_id', actorId)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) return NextResponse.json({ notifications: [] });
      return NextResponse.json({ notifications: data || [] });
    } catch (e) {
      return NextResponse.json({ notifications: [] });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
