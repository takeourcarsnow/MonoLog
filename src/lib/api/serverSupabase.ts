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
  svc = createClient(url, key);
  return svc;
}
