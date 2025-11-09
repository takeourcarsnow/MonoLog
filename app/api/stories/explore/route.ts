import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServiceSupabase } from '@/lib/api/serverSupabase';
import { getUserFromAuthHeader } from '@/lib/api/serverVerifyAuth';

export async function GET(req: Request) {
  try {
    const authUser = await getUserFromAuthHeader(req);
    if (!authUser) return NextResponse.json({ ok: true, items: [] });
    const sb = getServiceSupabase();
    // Fetch following list from users table
    const { data: profile, error: profErr } = await sb.from('users').select('following').eq('id', authUser.id).limit(1).single();
    if (profErr) return NextResponse.json({ error: profErr.message || String(profErr) }, { status: 500 });
    const following: string[] = (profile?.following || []);
    // Exclude current user and followed users
    const excludedUsers = [...following, authUser.id];
    const nowIso = new Date().toISOString();
    // Get active stories NOT from followed users or current user
    let query = sb.from('stories').select('*').gt('expires_at', nowIso);
    if (excludedUsers.length > 0) {
      query = query.not('user_id', 'in', `(${excludedUsers.join(',')})`);
    }
    // Limit to recent stories, say last 24 hours, and limit total results
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    query = query.gt('created_at', oneDayAgo).limit(50); // Limit to 50 stories for performance
    const { data: stories, error: storiesErr } = await query;
    if (storiesErr) return NextResponse.json({ error: storiesErr.message || String(storiesErr) }, { status: 500 });
    // Group by user
    const byUser: Record<string, any[]> = {};
    for (const s of stories || []) {
      if (!byUser[s.user_id]) byUser[s.user_id] = [];
      byUser[s.user_id].push(s);
    }
    // Fetch minimal user fields
    const { data: users, error: usersErr } = await sb.from('users').select('id, username, display_name, avatar_url').in('id', Object.keys(byUser));
    if (usersErr) return NextResponse.json({ error: usersErr.message || String(usersErr) }, { status: 500 });
    const items = users.map(u => ({
      user: { id: u.id, username: u.username, displayName: u.display_name, avatarUrl: u.avatar_url },
      stories: byUser[u.id] || [],
    }));
    return NextResponse.json({ ok: true, items }, {
      headers: {
        'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=180',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}