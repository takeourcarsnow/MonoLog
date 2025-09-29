import { createClient, SupabaseClient } from '@supabase/supabase-js';

let svc: SupabaseClient | null = null;

export function getServiceSupabase() {
  if (svc) return svc;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Server supabase not configured. Set SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL.');
  }
  svc = createClient(url, key);
  return svc;
}
