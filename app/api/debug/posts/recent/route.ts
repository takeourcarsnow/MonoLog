import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';

export async function GET(req: Request) {
  try {
    const sb = getServiceSupabase();
    // Return the 10 most recent posts (raw DB rows) so we can inspect image columns
    const { data, error } = await sb.from('posts').select('*').order('created_at', { ascending: false }).limit(10);
    if (error) return NextResponse.json({ error: error.message || error }, { status: 500 });
    return NextResponse.json({ ok: true, rows: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
