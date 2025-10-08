import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const username = (body?.username || '').toString().trim();
    if (!username) return NextResponse.json({ error: 'Missing username' }, { status: 400 });

    const sb = getServiceSupabase();

    // Try to find the users.profile row to get the linked auth user id.
    // The public `users` table typically does not store the auth email, so
    // use the service role client to look up the auth user by id.
    const tryFindProfile = async () => {
      // exact match
      let res: any = await sb.from('users').select('id').eq('username', username).limit(1).maybeSingle();
      if (res && res.data && res.data.id) return res.data.id;
      // legacy column
      res = await sb.from('users').select('id').eq('user_name', username).limit(1).maybeSingle();
      if (res && res.data && res.data.id) return res.data.id;
      // case-insensitive
      res = await sb.from('users').select('id').ilike('username', username).limit(1).maybeSingle();
      if (res && res.data && res.data.id) return res.data.id;
      return null;
    };

    const profileId = await tryFindProfile();
    if (profileId) {
      try {
        // Use admin API to fetch auth user by id and read the email
        // @ts-ignore - admin API available when using service role key
        const adminRes: any = await sb.auth.admin.getUserById(profileId);
        const authUser = adminRes?.data?.user ?? adminRes?.user ?? null;
        if (authUser && authUser.email) return NextResponse.json({ ok: true, email: authUser.email });
      } catch (e) {
        // ignore and continue to other fallbacks
      }
    }

    // Older deployments may have stored email directly on the public users row.
    // As a fallback try to select email from the profile table.
    try {
      const { data: profileWithEmail, error: pErr } = await sb.from('users').select('email').or(`username.eq.${username},user_name.eq.${username}`).limit(1).maybeSingle();
      if (!pErr && profileWithEmail && profileWithEmail.email) return NextResponse.json({ ok: true, email: profileWithEmail.email });
    } catch (e) {
      // ignore
    }

    return NextResponse.json({ ok: false, email: null }, { status: 404 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
