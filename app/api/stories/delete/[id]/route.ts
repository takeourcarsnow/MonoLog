import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServiceSupabase } from '@/lib/api/serverSupabase';
import { getUserFromAuthHeader } from '@/lib/api/serverVerifyAuth';

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getUserFromAuthHeader(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: storyId } = await context.params;
    if (!storyId) return NextResponse.json({ error: 'Missing story id' }, { status: 400 });

    const sb = getServiceSupabase();
    // First check if the story exists and belongs to the user
    const { data: story, error: fetchError } = await sb.from('stories').select('id, user_id').eq('id', storyId).single();
    if (fetchError) {
      if (fetchError.code === 'PGRST116') return NextResponse.json({ error: 'Story not found' }, { status: 404 });
      return NextResponse.json({ error: fetchError.message || String(fetchError) }, { status: 500 });
    }
    if (story.user_id !== authUser.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Delete the story
    const { error: deleteError } = await sb.from('stories').delete().eq('id', storyId);
    if (deleteError) return NextResponse.json({ error: deleteError.message || String(deleteError) }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
