import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/api/serverSupabase';

export async function POST(req: Request) {
  try {
    const { id, patch } = await req.json();
    if (!id || !patch) return NextResponse.json({ error: 'Missing id or patch' }, { status: 400 });
    const sb = getServiceSupabase();
    const updates: any = {};
    if (patch.caption !== undefined) updates.caption = patch.caption;
    if (patch.alt !== undefined) updates.alt = patch.alt;
    if (patch.public !== undefined) updates.public = patch.public;
    const { error } = await sb.from('posts').update(updates).eq('id', id);
    if (error) return NextResponse.json({ error: error.message || error }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
