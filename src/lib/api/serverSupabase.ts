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
  svc = createClient(url, key);
  return svc;
}
