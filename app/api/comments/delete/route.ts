import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/api/serverSupabase';
import { getUserFromAuthHeader } from '@/lib/api/serverVerifyAuth';

export async function POST(req: Request) {
  try {
    // Defensive logging to help debug 404s reported by clients. Log minimal
    // request details (avoid logging sensitive tokens) so we can see what the
    // client sent when a comment delete fails in the wild.
    try {
      console.log('[api/comments/delete] incoming request:', { method: req.method, url: req.url });
    } catch (e) {
      // ignore logging errors
    }

    // Parse JSON body robustly and also accept query param fallback
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      // ignore parse errors; we'll try to read from URLSearchParams below
    }

    // Accept commentId in multiple shapes for robustness (body.commentId, body.id,
    // or ?commentId= in querystring). Trim when possible.
    const url = new URL(req.url);
    const qsId = url.searchParams.get('commentId') || url.searchParams.get('id');
    const rawId = body?.commentId ?? body?.id ?? qsId;
    const commentId = typeof rawId === 'string' ? rawId.trim() : (rawId ? String(rawId) : '');
    if (!commentId) {
      return NextResponse.json({ error: 'Missing commentId' }, { status: 400 });
    }
    const authUser = await getUserFromAuthHeader(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const actorId = authUser.id;
    const sb = getServiceSupabase();

    // First, check if the comment exists. Coerce comparisons to strings to
    // avoid mismatches between numeric/uuid types returned by the DB and the
    // auth payload (which may be a string).
    const { data: comment, error: fetchError } = await sb.from('comments').select('id, user_id').eq('id', commentId).single();
    if (fetchError || !comment) {
      // Provide the requested id in the error body to help clients debug
      // mismatches between optimistic/temp ids and persisted DB ids.
      return NextResponse.json({ error: 'Comment not found', requestedId: commentId, details: String(fetchError?.message || fetchError) }, { status: 404 });
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
