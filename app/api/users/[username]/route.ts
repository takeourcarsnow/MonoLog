import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import { mapProfileToUser } from '@/src/lib/api/supabase-utils';

export async function GET(req: Request, { params }: { params: { username: string } }) {
  try {
    const username = params.username;
    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }

    const sb = getServiceSupabase();

    // Try exact match on username
    let res = await sb.from('users').select('*').eq('username', username).limit(1).maybeSingle();
    if (res.data) {
      return NextResponse.json({ user: mapProfileToUser(res.data) });
    }

    // Fallback to legacy user_name column
    res = await sb.from('users').select('*').eq('user_name', username).limit(1).maybeSingle();
    if (res.data) {
      return NextResponse.json({ user: mapProfileToUser(res.data) });
    }

    // Final attempt: case-insensitive match
    res = await sb.from('users').select('*').ilike('username', username).limit(1).maybeSingle();
    if (res.data) {
      return NextResponse.json({ user: mapProfileToUser(res.data) });
    }

    return NextResponse.json({ user: null });
  } catch (e: any) {
    console.error('GET /api/users/[username]: error', e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}