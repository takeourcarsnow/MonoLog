import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body?.email || '').toString().trim();
    const password = (body?.password || '').toString();
    const username = (body?.username || '').toString().trim().toLowerCase();
    const inviteCode = (body?.inviteCode || '').toString().trim();

    if (!email || !password || !username || !inviteCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password too short' }, { status: 400 });
    }

    // Validate username format
    if (username.length < 3 || username.length > 32 || !/^[a-z0-9._-]+$/.test(username)) {
      return NextResponse.json({ error: 'Invalid username' }, { status: 400 });
    }

    const sb = getServiceSupabase();

    // Check if username is available
    const { data: existingUser } = await sb
      .from('users')
      .select('id')
      .eq('username', username)
      .limit(1)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
    }

    // Validate and mark invite as used in a transaction-like manner
    if (inviteCode !== 'EARLYADOPTER') {
      // Check if invite exists and is unused
      const { data: invite, error: inviteError } = await sb
        .from('invites')
        .select('id, used_by, expires_at')
        .eq('code', inviteCode)
        .single();

      if (inviteError || !invite) {
        return NextResponse.json({ error: 'Invalid invite code' }, { status: 400 });
      }

      if (invite.used_by) {
        return NextResponse.json({ error: 'Invite code already used' }, { status: 400 });
      }

      const now = new Date();
      const expiresAt = new Date(invite.expires_at);
      if (expiresAt < now) {
        return NextResponse.json({ error: 'Invite code expired' }, { status: 400 });
      }

      // Note: We can't do this in a true transaction with Supabase auth signup,
      // but since this is server-side and sequential, it should be fine.
      // If signup fails, the invite won't be marked, but that's acceptable.
    }

    // Perform signup
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { username, name: null } }
    });

    if (error) {
      return NextResponse.json({ error: error.message || error }, { status: 400 });
    }

    const userId = (data as any)?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Signup failed: no user ID returned' }, { status: 500 });
    }

    // Mark invite as used (skip for EARLYADOPTER)
    if (inviteCode !== 'EARLYADOPTER') {
      await sb
        .from('invites')
        .update({ used_by: userId })
        .eq('code', inviteCode)
        .eq('used_by', null);
    }

    // Create user profile
    await sb.from('users').upsert({
      id: userId,
      username,
      display_name: null,
      avatar_url: '/logo.svg'
    });

    return NextResponse.json({ data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}