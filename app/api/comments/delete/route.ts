import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/api/serverSupabase';
import { getUserFromAuthHeader } from '@/lib/api/serverVerifyAuth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const commentId = body.commentId?.trim();
    if (!commentId) return NextResponse.json({ error: 'Missing commentId' }, { status: 400 });
    const authUser = await getUserFromAuthHeader(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const actorId = authUser.id;
    const sb = getServiceSupabase();

    // First, check if the comment exists
    // Fetch the comment. Coerce comparisons to strings to
    // avoid mismatches between numeric/uuid types returned by the DB and the
    // auth payload (which may be a string).
    const { data: comment, error: fetchError } = await sb.from('comments').select('id, user_id').eq('id', commentId).single();
    if (fetchError || !comment) {
      return NextResponse.json({ error: 'Comment not found', details: String(fetchError?.message || fetchError) }, { status: 404 });
    }
    // Only allow deleting own comments
    if (String(comment.user_id) !== String(actorId)) {
      return NextResponse.json({ error: 'Unauthorized to delete this comment' }, { status: 403 });
    }

    // Update replies to have no parent (make them top-level comments)
    const { error: updateError } = await sb.from('comments').update({ parent_id: null }).eq('parent_id', commentId);
    if (updateError) {
      return NextResponse.json({ error: 'Failed to update replies', details: String(updateError?.message || updateError) }, { status: 500 });
    }

    // Now delete the comment and return the deleted row for debugging so the
    // client can validate what actually changed. Using `.select()` on delete
    // returns the deleted rows when supported by the client driver.
    const { data: deleted, error: deleteError } = await sb.from('comments').delete().eq('id', commentId).select('*');
    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete comment', details: String(deleteError?.message || deleteError) }, { status: 500 });
    }

    // Delete associated notifications
    (async () => {
      try {
        const { error: notifError } = await sb.from('notifications').delete().eq('comment_id', commentId);
        if (notifError) {
          console.log('Failed to delete notifications for comment:', commentId, notifError);
        }
      } catch (e) {
        console.log('Error deleting notifications:', e);
      }
    })();

    return NextResponse.json({ ok: true, deleted });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
