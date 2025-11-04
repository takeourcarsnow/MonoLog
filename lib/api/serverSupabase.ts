import { createClient, SupabaseClient } from '@supabase/supabase-js';

let svc: SupabaseClient | null = null;

export function getServiceSupabase() {
  if (svc) return svc;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;
  const hasUrl = !!url;
  const hasKey = !!key;
  if (!hasUrl || !hasKey) {
    // avoid logging secrets; only surface which variables are missing
    throw new Error(`Server supabase not configured. Set SUPABASE_SERVICE_ROLE_KEY (server env) and NEXT_PUBLIC_SUPABASE_URL. Detected: url=${hasUrl}, key=${hasKey}`);
  }
  // common mistake: putting the project URL into the service role key env var.
  // detect obvious swaps and provide an actionable message (without printing secrets).
  const keyLooksLikeUrl = String(key).includes('.supabase.co') || String(key).startsWith('http');
  if (keyLooksLikeUrl) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY appears to contain the Supabase project URL. Make sure SUPABASE_SERVICE_ROLE_KEY contains the service_role (JWT-like) secret from Supabase Project → Settings → API, and that NEXT_PUBLIC_SUPABASE_URL contains the project URL.');
  }
  svc = createClient(url, key, {
    auth: {
      persistSession: false, // Server-side doesn't need session persistence
      autoRefreshToken: false, // Disable token refresh on server
    },
    // Add connection pooling hints for better performance
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-application-name': 'monolog-server',
      },
    },
  });
  return svc;
}

export async function getUserSupabase(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  const supabase = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-application-name': 'monolog-server-user',
      },
    },
  });
  // Set the session to ensure auth.uid() is available in RLS
  await supabase.auth.setSession({ access_token: token, refresh_token: '' });
  return supabase;
}
