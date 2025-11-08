import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/api/serverSupabase';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    const sb = getServiceSupabase();
    const nowIso = new Date().toISOString();
    const { data, error } = await sb.from('stories').select('*').eq('user_id', userId).gt('expires_at', nowIso).order('created_at', { ascending: true });
    if (error) return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
    return NextResponse.json({ ok: true, stories: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
