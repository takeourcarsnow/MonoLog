import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import { getUserFromAuthHeader } from '@/src/lib/api/serverVerifyAuth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const commentId = body.commentId;
    if (!commentId) return NextResponse.json({ error: 'Missing commentId' }, { status: 400 });
    const authUser = await getUserFromAuthHeader(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const actorId = authUser.id;
    const sb = getServiceSupabase();

    // Try deleting using common snake_case column names first, then fall back
    // to alternates to support different schema shapes.
    try {
      const res = await sb.from('comments').delete().eq('id', commentId);
      if (!res.error) return NextResponse.json({ ok: true });
    } catch (e) {}

    try {
      const res2 = await sb.from('comments').delete().eq('comment_id', commentId);
      if (!res2.error) return NextResponse.json({ ok: true });
    } catch (e) {}

    // final attempt (best-effort)
    try {
      const res3 = await sb.from('comments').delete().eq('id', commentId);
      if (!res3.error) return NextResponse.json({ ok: true });
    } catch (e) {}

    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
