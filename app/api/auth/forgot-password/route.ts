import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/api/serverSupabase';
import { isAllowedEmailDomain } from '@/lib/utils';
import { withHandler } from '@/lib/api/withHandler';
import { forgotPasswordSchema } from '@/lib/api/schemas';

export const POST = withHandler({ method: 'POST', bodySchema: forgotPasswordSchema })(async (req, ctx) => {
  const { email } = ctx?.body as any;

  // if (!isAllowedEmailDomain(email)) {
  //   return NextResponse.json({ error: 'Email domain not allowed' }, { status: 400 });
  // }

  const sb = getServiceSupabase();

  // Use Supabase's built-in password reset functionality
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://monolog.ink'}/reset-password`,
  });

  if (error) {
    return NextResponse.json({ error: error.message || 'Failed to send reset email' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Reset email sent successfully' }, { status: 200 });
});