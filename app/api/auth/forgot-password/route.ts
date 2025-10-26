import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import { isAllowedEmailDomain } from '@/src/lib/utils';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body?.email || '').toString().trim();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: 'Valid email address required' }, { status: 400 });
    }
    if (!isAllowedEmailDomain(email)) {
      return NextResponse.json({ error: 'Email domain not allowed' }, { status: 400 });
    }

    const sb = getServiceSupabase();

    // Use Supabase's built-in password reset functionality
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://monolog.ink'}/reset-password`,
    });

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to send reset email' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Reset email sent successfully' }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}