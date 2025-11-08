import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/api/serverSupabase';
import { getUserFromAuthHeader } from '@/lib/api/serverVerifyAuth';

export async function POST(req: Request) {
  try {
    const authUser = await getUserFromAuthHeader(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const actorId = authUser.id;
    const sb = getServiceSupabase();

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body.limit) || 20, 50); // Default 20, max 50
    const before = body.before;

    try {
      // Return all notifications, not just unread, so users can see history
      let query = sb.from('notifications')
        .select('*')
        .eq('user_id', actorId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (before) {
        query = query.lt('created_at', before);
      }

      const { data, error } = await query;
      if (error) {
        console.log('Notifications query error:', error);
        return NextResponse.json({ notifications: [] });
      }

      if (!data || data.length === 0) {
        return NextResponse.json({ notifications: [] });
      }

      // Get unique actor_ids
      const actorIds = Array.from(new Set(data.map(n => n.actor_id).filter(Boolean)));

      // Check which actors still exist
      const { data: existingUsers, error: usersError } = await sb.from('users').select('id').in('id', actorIds);
      if (usersError) {
        console.log('Users query error:', usersError);
        // If error, return all notifications to avoid breaking
        return NextResponse.json({ notifications: data });
      }

      const existingUserIds = new Set(existingUsers?.map(u => u.id) || []);

      // Filter notifications where actor exists
      const validNotifications = data.filter(n => existingUserIds.has(n.actor_id));

      return NextResponse.json({ notifications: validNotifications });
    } catch (e) {
      return NextResponse.json({ notifications: [] });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
