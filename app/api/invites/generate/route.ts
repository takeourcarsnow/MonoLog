import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SUPABASE } from '@/lib/config';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
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
      logger.error('User error:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user already has an invite for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfDay = today.toISOString();

    const { data: todaysInvite, error: todaysError } = await sb
      .from('invites')
      .select('code, used_by')
      .eq('created_by', user.id)
      .gte('created_at', startOfDay)
      .order('created_at', { ascending: false })
      .limit(1);

    if (todaysError) {
      logger.error('Error checking todays invite:', todaysError);
      return NextResponse.json({ error: 'Failed to check todays invite' }, { status: 500 });
    }

    if (todaysInvite && todaysInvite.length > 0 && todaysInvite[0].used_by == null) {
      return NextResponse.json({ code: todaysInvite[0].code });
    }

    // Generate a unique invite code that hasn't been used
    let code: string | null = null;
    const maxAttempts = 20; // Prevent infinite loop
    
    for (let attempts = 0; attempts < maxAttempts; attempts++) {
      const candidate = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data: existing, error: checkError } = await sb
        .from('invites')
        .select('used_by')
        .eq('code', candidate);

      if (checkError) {
        logger.error('Error checking invite:', checkError);
        return NextResponse.json({ error: 'Failed to check invite' }, { status: 500 });
      }

      // If no existing invite with this code, or it exists but is unused, use it
      if (!existing || existing.length === 0 || existing[0].used_by == null) {
        code = candidate;
        break;
      }
    }
    
    if (!code) {
      return NextResponse.json({ error: 'Failed to generate unique invite code' }, { status: 500 });
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
      logger.error('Error creating invite:', error);
      return NextResponse.json({ error: `Failed to create invite: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ code: data.code });
  } catch (error) {
    logger.error('Invite generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}