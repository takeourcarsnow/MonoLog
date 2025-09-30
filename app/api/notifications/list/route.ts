import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/api/serverSupabase';

export async function POST(req: Request) {
  try {
    const { actorId } = await req.json();
    if (!actorId) return NextResponse.json({ error: 'Missing actorId' }, { status: 400 });
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
