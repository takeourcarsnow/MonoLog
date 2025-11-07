import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServiceSupabase } from '@/lib/api/serverSupabase';

export async function POST() {
  try {
    const sb = getServiceSupabase();
    const nowIso = new Date().toISOString();
    const { data, error } = await sb.from('stories').delete().lt('expires_at', nowIso).select('id');
    if (error) return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
    const deleted = (data || []).length;
    return NextResponse.json({ ok: true, deleted });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
