// authActions.ts
import { getSupabaseClient } from "@/src/lib/api/supabase";

export async function signIn(identifier: string, password: string) {
  const sb = getSupabaseClient();
  const resp = await fetch('/api/auth/signin-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password })
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body?.error || `Sign-in failed (${resp.status})`);
  }
  const body = await resp.json();
  const session = body?.data?.session ?? body?.data ?? null;
  if (!session || !session.access_token) {
    throw new Error('Sign-in failed: no session returned');
  }
  // Set the supabase client session on the browser so SB client knows user is signed in
  try {
    await sb.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
  } catch (e) {
    // If setting session fails, still treat as auth failure
    throw new Error('Failed to establish client session after sign-in');
  }

  // Ensure the user's profile row exists in the users table (fire-and-forget)
  (async () => {
    try {
      const get = await sb.auth.getUser();
      const u = (get as any)?.data?.user;
      if (u) {
        const { data: existing } = await sb.from('users').select('id').eq('id', u.id).limit(1).maybeSingle();
        if (!existing) {
          const synthUsername = u.user_metadata?.username || (u.email ? u.email.split('@')[0] : u.id);
          try {
            await sb.from('users').insert({ id: u.id, username: synthUsername, display_name: null, avatar_url: '/logo.svg' });
          } catch (e) { /* ignore */ }
        }
      }
    } catch (e) { /* ignore background errors */ }
  })();
}

export async function signUp(email: string, password: string, username: string) {
  const sb = getSupabaseClient();
  const chosen = username.trim().toLowerCase();
  const { data, error } = await sb.auth.signUp({ email, password, options: { data: { username: chosen, name: null } } });
  if (error) throw error;
  // when signing up, only create a users profile row client-side if the
  // signup returned an active session (some flows require email
  // confirmation and don't provide a session; in that case the client
  // is still anon and RLS will block INSERTs). If no session is present
  // skip creation here and rely on the sign-in flow to create the row.
  const userId = (data as any)?.user?.id;
  const sessionPresent = (data as any)?.session ?? false;
  if (userId && sessionPresent) {
    try {
      await sb.from('users').upsert({ id: userId, username: chosen, display_name: null, avatar_url: "/logo.svg" });
    } catch (e) { /* ignore upsert errors for now */ }
  }
}

export async function checkUsernameAvailability(username: string) {
  const sb = getSupabaseClient();
  const chosen = username.trim().toLowerCase();
  const { data: existing, error: exErr } = await sb.from("users").select("id").eq("username", chosen).limit(1).maybeSingle();
  if (exErr) {
    throw new Error('Unable to check username');
  }
  return !existing;
}