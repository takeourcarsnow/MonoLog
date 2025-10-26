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

    // Check if user already has an invite for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfDay = today.toISOString();

    const { data: todaysInvite, error: todaysError } = await sb
      .from('invites')
      .select('code')
      .eq('created_by', user.id)
      .gte('created_at', startOfDay)
      .order('created_at', { ascending: false })
      .limit(1);

    if (todaysError) {
      console.error('Error checking todays invite:', todaysError);
      return NextResponse.json({ error: 'Failed to check todays invite' }, { status: 500 });
    }

    if (todaysInvite && todaysInvite.length > 0) {
      return NextResponse.json({ code: todaysInvite[0].code });
    }

    // Generate a unique invite code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Check if invite already exists
    const { data: existing, error: selectError } = await sb
      .from('invites')
      .select('code')
      .eq('code', code);

    if (selectError) {
      console.error('Error checking invite:', selectError);
      return NextResponse.json({ error: 'Failed to check invite' }, { status: 500 });
    }

    if (existing && existing.length > 0) {
      return NextResponse.json({ code });
    }

    // Insert into invites table
    const { data, error } = await sb
      .from('invites')
      .insert({
        code,
        created_by: user.id,
        created_at: new Date().toISOString(),
        expires_at: new Date('2100-01-01').toISOString(), // Never expires
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