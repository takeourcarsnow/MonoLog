import { NextResponse, NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServiceSupabase } from '@/lib/api/serverSupabase';
import { getUserFromAuthHeader } from '@/lib/api/serverVerifyAuth';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getUserFromAuthHeader(req);
    if (!authUser) return NextResponse.json({ ok: true }); // silently ignore
    const { id: storyId } = await context.params;
    if (!storyId) return NextResponse.json({ error: 'Missing story id' }, { status: 400 });
    const sb = getServiceSupabase();
    // upsert into story_views table
    const view = { story_id: storyId, user_id: authUser.id, viewed_at: new Date().toISOString() };
    const { error } = await sb.from('story_views').upsert(view, { onConflict: 'story_id,user_id' });
    if (error) {
      const msg = error.message || String(error);
      if (/relation .*story_views/i.test(msg)) {
        return NextResponse.json({ error: 'story_views table missing. Create table story_views(story_id uuid references stories(id) on delete cascade, user_id uuid not null, viewed_at timestamptz default now(), primary key(story_id,user_id));' }, { status: 500 });
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
