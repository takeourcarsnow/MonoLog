import { NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../src/lib/api/serverSupabase';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const postId = url.searchParams.get('postId');
    if (!postId) return NextResponse.json({ error: 'Missing postId' }, { status: 400 });

    const sb = getServiceSupabase();

    // Query comments with user info, allowing public read
    const { data, error } = await sb.from('comments').select('*, users!left(*)').eq('post_id', postId).order('created_at', { ascending: true });
    if (error) return NextResponse.json({ error: String(error.message || error) }, { status: 500 });

    const comments = (data || []) as any[];

    // If the related users join returned null, fetch user rows by id
    const missingUsers = comments.filter(c => !c.users).map(c => c.user_id).filter(Boolean);
    let userMap: Record<string, any> = {};
    if (missingUsers.length) {
      try {
        const uniq = Array.from(new Set(missingUsers));
        const { data: usersData, error: usersErr } = await sb.from('users').select('*').in('id', uniq);
        if (!usersErr && usersData) {
          for (const u of usersData) userMap[u.id] = u;
        }
      } catch (e) {
        // ignore
      }
    }

    const result = comments.map((c: any) => {
      const urow = c.users || userMap[c.user_id] || null;
      return {
        id: c.id,
        postId: c.post_id,
        userId: c.user_id,
        text: c.text,
        createdAt: c.created_at,
        user: {
          id: urow?.id || c.user_id,
          username: urow?.username || urow?.user_name || '',
          displayName: urow?.display_name || urow?.displayName || urow?.username || urow?.user_name || '',
          avatarUrl: urow?.avatar_url || urow?.avatarUrl || '/logo.svg',
        }
      };
    });

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}