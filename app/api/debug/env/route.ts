import { NextResponse } from 'next/server';

// Safe debug endpoint: returns presence flags for environment variables used by
// the app. This endpoint intentionally does NOT return secret values.
export async function GET() {
  try {
    const payload = {
      nextPublicMode: process.env.NEXT_PUBLIC_MODE ?? null,
      // presence flags
      hasNextPublicSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasNextPublicSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY || !!process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY,
      nodeEnv: process.env.NODE_ENV || null,
      // Non-secret public values. These are safe to expose to the browser: the
      // Supabase URL and anon key are intended to be used client-side and are
      // not secret. Returning them here allows a cached/old client bundle to
      // initialize a runtime supabase client without requiring a rebuild.
      nextPublicSupabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
      nextPublicSupabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null,
    };
    return NextResponse.json(payload);
  } catch (e) {
    return NextResponse.json({ error: 'failed', details: String(e) }, { status: 500 });
  }
}
