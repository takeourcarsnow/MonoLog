import { NextResponse } from 'next/server';

// Restricted debug endpoint: only exposes minimal, non-sensitive information.
// Removed hasServiceRoleKey to avoid revealing server capability surface.
// Public Supabase URL + anon key are still considered safe, but we only return
// them when the bundle reported local mode (client will request in that case).
export async function GET(req: Request) {
  try {
    // Restrict this endpoint in production. In CI or local dev it's fine.
    const secret = req.headers.get('x-debug-secret') || null;
    const allowed = process.env.NODE_ENV !== 'production' || (process.env.DEBUG_SECRET && secret === process.env.DEBUG_SECRET);
    if (!allowed) return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
    const url = new URL(req.url);
    const includePublic = url.searchParams.get('public') === '1';
    const base = {
      nextPublicMode: process.env.NEXT_PUBLIC_MODE ?? null,
      hasNextPublicSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasNextPublicSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      nodeEnv: process.env.NODE_ENV || null,
    } as any;
    if (includePublic) {
      base.nextPublicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
      base.nextPublicSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null;
    }
    return NextResponse.json(base);
  } catch (e) {
    return NextResponse.json({ error: 'failed', details: String(e) }, { status: 500 });
  }
}
