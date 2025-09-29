import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/api/serverSupabase';
import { uid } from '@/lib/id';

export async function POST(req: Request) {
  try {
    const { actorId, postId, text } = await req.json();
    if (!actorId || !postId || !text) return NextResponse.json({ error: 'Missing actorId/postId/text' }, { status: 400 });
    const sb = getServiceSupabase();

  const id = uid();
    const created_at = new Date().toISOString();
    const { error } = await sb.from('comments').insert({ id, post_id: postId, user_id: actorId, text: text.trim(), created_at });
    if (error) return NextResponse.json({ error: error.message || error }, { status: 500 });
    return NextResponse.json({ ok: true, id, created_at });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
