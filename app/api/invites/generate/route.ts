import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SUPABASE } from '@/src/lib/config';

export async function POST(req: NextRequest) {
  try {
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

    const { data: { user }, error: userError } = await sb.auth.getUser();
    if (userError || !user) {
      console.error('User error:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate a unique invite code
    const code = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Insert into invites table
    const { data, error } = await sb
      .from('invites')
      .insert({
        code,
        created_by: user.id,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating invite:', error);
      return NextResponse.json({ error: `Failed to create invite: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ code: data.code });
  } catch (error) {
    console.error('Invite generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}