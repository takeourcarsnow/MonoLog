import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import { apiError, apiSuccess } from '@/lib/apiResponse';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body?.email || '').toString().trim();
    const password = (body?.password || '').toString();
    const username = (body?.username || '').toString().trim().toLowerCase();
    const inviteCode = (body?.inviteCode || '').toString().trim();

    if (!email || !password || !username || !inviteCode) {
      return apiError('Missing required fields', 400);
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      return apiError('Invalid email', 400);
    }

    if (password.length < 8) {
      return apiError('Password too short', 400);
    }

    // Validate username format
    if (username.length < 3 || username.length > 32 || !/^[a-z0-9._-]+$/.test(username)) {
      return apiError('Invalid username', 400);
    }

    const sb = getServiceSupabase();

    let tempClaim = '';

    // Check if username is available
    const { data: existingUser } = await sb
      .from('users')
      .select('id')
      .eq('username', username)
      .limit(1)
      .maybeSingle();

    if (existingUser) {
      return apiError('Username already taken', 400);
    }

    // Validate and claim invite as used in a transaction-like manner
    if (inviteCode !== 'EARLYADOPTER') {
      // First, try to claim the invite by setting used_by to a temp value
      tempClaim = `temp-${Date.now()}-${Math.random()}`;
      const { data: claimedInvite, error: claimError } = await sb
        .from('invites')
        .update({ used_by: tempClaim })
        .eq('code', inviteCode)
        .eq('used_by', null)
        .select('id, expires_at')
        .single();

      if (claimError || !claimedInvite) {
        return apiError('Invalid invite code or already used', 400);
      }

      const now = new Date();
      const expiresAt = new Date(claimedInvite.expires_at);
      if (expiresAt < now) {
        // Revert the claim since it's expired
        await sb
          .from('invites')
          .update({ used_by: null })
          .eq('code', inviteCode)
          .eq('used_by', tempClaim);
        return apiError('Invite code expired', 400);
      }

      // Note: If signup fails later, we'll revert the claim
    }

    // Perform signup. Include an email redirect so confirmation links point to the running app.
    // If you don't want to force a redirect, you can omit `emailRedirectTo`.
    const emailRedirectTo = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000';
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { username, name: null }, emailRedirectTo }
    });

    // Helpful debug logging for signup flow. Avoid printing secrets.
    // This will help diagnose why confirmation emails are not arriving after a refactor.
    try {
      console.log('[signup-proxy] signUp result:', {
        userId: (data as any)?.user?.id || null,
        userEmail: (data as any)?.user?.email || null,
        confirmationSent: Boolean((data as any)?.user?.email_confirmed_at === null || (data as any)?.user?.confirm_sent_at),
      });
    } catch (err) {
      // don't fail the request just for logging
      console.log('[signup-proxy] signUp logging failed', String(err));
    }

    if (error) {
      console.log('[signup-proxy] signUp error:', String(error));
      // Revert the invite claim if signup failed
      if (inviteCode !== 'EARLYADOPTER') {
        await sb
          .from('invites')
          .update({ used_by: null })
          .eq('code', inviteCode)
          .eq('used_by', tempClaim);
      }
      return apiError(error.message || String(error), 400);
    }

    const userId = (data as any)?.user?.id;
    if (!userId) {
      // Revert the invite claim
      if (inviteCode !== 'EARLYADOPTER') {
        await sb
          .from('invites')
          .update({ used_by: null })
          .eq('code', inviteCode)
          .eq('used_by', tempClaim);
      }
      return apiError('Signup failed: no user ID returned', 500);
    }

    // Mark invite as used (skip for EARLYADOPTER)
    if (inviteCode !== 'EARLYADOPTER') {
      await sb
        .from('invites')
        .update({ used_by: userId })
        .eq('code', inviteCode)
        .eq('used_by', tempClaim);
    }

    // Create user profile
    await sb.from('users').upsert({
      id: userId,
      username,
      display_name: null,
      avatar_url: '/logo.svg'
    });

    return apiSuccess({ data }, 200);
  } catch (e: any) {
    return apiError(e?.message || String(e), 500);
  }
}