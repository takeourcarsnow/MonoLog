import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import { mapProfileToUser } from '@/src/lib/api/utils';

function looksLikeUuid(s: string) {
  return /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(s);
}

export async function GET(req: Request, { params }: { params: { username: string } }) {
  try {
    const identifier = params.username;
    if (!identifier) {
      return NextResponse.json({ error: 'Identifier required' }, { status: 400 });
    }

    const sb = getServiceSupabase();

    if (looksLikeUuid(identifier)) {
      // Treat as user ID
      const res = await sb.from('users').select('*').eq('id', identifier).limit(1).maybeSingle();
      if (res.error || !res.data) {
        return NextResponse.json({ user: null });
      }
      return NextResponse.json({ user: mapProfileToUser(res.data) });
    } else {
      // Treat as username
      // Try exact match on username
      let res = await sb.from('users').select('*').eq('username', identifier).limit(1).maybeSingle();
      if (res.data) {
        return NextResponse.json({ user: mapProfileToUser(res.data) });
      }

      // Fallback to legacy user_name column
      res = await sb.from('users').select('*').eq('user_name', identifier).limit(1).maybeSingle();
      if (res.data) {
        return NextResponse.json({ user: mapProfileToUser(res.data) });
      }

      // Final attempt: case-insensitive match
      res = await sb.from('users').select('*').ilike('username', identifier).limit(1).maybeSingle();
      if (res.data) {
        return NextResponse.json({ user: mapProfileToUser(res.data) });
      }

      return NextResponse.json({ user: null });
    }
  } catch (e: any) {
    console.error('GET /api/users/[username]: error', e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}