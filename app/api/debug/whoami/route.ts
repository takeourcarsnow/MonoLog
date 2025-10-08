import { NextResponse } from 'next/server';
import { getUserFromAuthHeader } from '@/src/lib/api/serverVerifyAuth';

// Dev-only helper to verify that the server can read and validate the
// Authorization: Bearer <token> header. Do NOT enable in production unless
// you understand the risk. This endpoint simply echoes the user object from
// Supabase auth/v1/user when given a valid access token.
export async function GET(req: Request) {
  try {
    const u = await getUserFromAuthHeader(req);
    if (!u) return NextResponse.json({ ok: false, error: 'unauthorized or invalid token' }, { status: 401 });
    return NextResponse.json({ ok: true, user: u });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
