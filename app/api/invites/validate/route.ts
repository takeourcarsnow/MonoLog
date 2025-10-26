import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SUPABASE } from '@/src/lib/config';

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    const cookieStore = cookies();
    const sb = createServerClient(SUPABASE.url, SUPABASE.anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    });

    // Check if invite exists, not used, and not expired
    const { data, error } = await sb
      .from('invites')
      .select('id, code, used_by, expires_at')
      .eq('code', code.trim())
      .single();

    if (error || !data) {
      return NextResponse.json({ valid: false });
    }

    const now = new Date();
    const expiresAt = new Date(data.expires_at);
    if (data.used_by || expiresAt < now) {
      return NextResponse.json({ valid: false });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error('Invite validation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}