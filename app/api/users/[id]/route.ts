import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import { mapProfileToUser } from '@/src/lib/api/supabase-utils';

function looksLikeUuid(s: string) {
  return /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(s);
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    if (!id || !looksLikeUuid(id)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const sb = getServiceSupabase();

    const res = await sb.from('users').select('*').eq('id', id).limit(1).maybeSingle();
    if (res.error || !res.data) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user: mapProfileToUser(res.data) });
  } catch (e: any) {
    console.error('GET /api/users/[id]: error', e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}