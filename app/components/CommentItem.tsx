"use client";

import Link from "next/link";
import { OptimizedImage } from "@/app/components/OptimizedImage";
import TimeDisplay from "./TimeDisplay";
import { Clock } from 'lucide-react';
import { renderCaption } from "@/src/lib/hashtags";
import { CommentActions } from "./CommentActions";
import { ReplyInput } from "./ReplyInput";
import { Comment, CommentContext } from "./comments-types";

type CommentItemProps = {
  comment: Comment;
  isReply: boolean;
  context: CommentContext;
};

export function CommentItem({ comment, isReply, context }: CommentItemProps) {
  const replies = context.comments.filter(c => c.parentId === comment.id);

  const handleDelete = async () => {
    if (context.confirmingIds.has(comment.id)) {
      const t = context.confirmTimers.current.get(comment.id);
      if (t) { clearTimeout(t); context.confirmTimers.current.delete(comment.id); }

      const backup = context.comments.slice();
      context.setComments(prev => {
        const next = prev.filter(x => x.id !== comment.id);
        try { context.setCachedComments(context.postId, next); } catch (_) {}
        context.notifyCount(next.length);
        return next;
      });

      context.setConfirmingIds(prev => {
        const n = new Set(prev);
        n.delete(comment.id);
        return n;
      });

      context.setRemovingIds(prev => new Set(prev).add(comment.id));

      setTimeout(async () => {
        try {
          const { getClient, getAccessToken } = await import('@/src/lib/api/client');
          const sb = getClient();
          const token = await getAccessToken(sb);
          const res = await fetch('/api/comments/delete', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ commentId: comment.id }) });
          const json = await res.json();
          if (!res.ok) throw new Error(json?.error || 'Failed');
          await context.load(true);
        } catch (e: any) {
          context.setComments(backup);
          try { context.setCachedComments(context.postId, backup); } catch (_) {}
          context.notifyCount(backup.length);
          console.warn(e?.message || 'Failed to delete comment');
        } finally {
          context.setRemovingIds(prev => {
            const n = new Set(prev);
            n.delete(comment.id);
            return n;
          });
        }
      }, 320);

      return;
    }

    context.setConfirmingIds(prev => new Set(prev).add(comment.id));
    const timer = window.setTimeout(() => {
      context.setConfirmingIds(prev => {
        const n = new Set(prev);
        n.delete(comment.id);
        return n;
      });
      context.confirmTimers.current.delete(comment.id);
    }, 3500);
    context.confirmTimers.current.set(comment.id, timer);
  };

  const handleReplySend = async () => {
    if (!context.currentUser) {
      context.router.push('/profile');
      return;
    }
    if (!context.replyText.trim()) return;
    if (context.replyText.length > 500) { console.warn(`Comments are limited to 500 characters`); return; }
    context.setReplyError(null);
    context.setSending(true);
    const sendText = context.replyText;
    context.setReplyText("");
    context.setReplyingTo(null);
    await context.doOptimisticAdd(sendText, comment.id);
    context.setSending(false);
  };

  return (
    <div key={comment.id}>
      <div className={`comment-item appear ${comment.id === context.newCommentId ? 'new' : ''} ${context.removingIds.has(comment.id) ? 'removing' : ''} ${isReply ? 'reply' : ''}`} style={{ animationDelay: `${context.comments.indexOf(comment) * 40}ms` }}>
        <div className="comment-row">
          <Link
            href={`/${comment.user?.username || comment.user?.id}`}
            className="comment-avatar-link"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div className="comment-avatar">
              <OptimizedImage
                src={comment.user?.avatarUrl || "/logo.svg"}
                alt={comment.user?.username || comment.user?.displayName || "User"}
                fill={true}
                unoptimized={false}
                sizes="30px"
                className="avatar"
              />
            </div>
          </Link>
          <div className="comment-head">
            <Link
              href={`/${comment.user?.username || comment.user?.id}`}
              className="comment-author-link"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <span className="author">{comment.user?.username ? `@${comment.user?.username}` : (comment.user?.displayName || "User")}</span>
            </Link>
            <span className="inline-flex items-center gap-2 dim"><Clock size={12} className="mr-1" />{"\u00A0"}<TimeDisplay date={comment.createdAt} className="dim" /></span>
            <CommentActions
              commentId={comment.id}
              isReply={isReply}
              currentUser={context.currentUser}
              commentUserId={comment.user?.id}
              confirmingIds={context.confirmingIds}
              setConfirmingIds={context.setConfirmingIds}
              confirmTimers={context.confirmTimers}
              setReplyingTo={context.setReplyingTo}
              setReplyText={context.setReplyText}
              onDelete={handleDelete}
            />
          </div>
        </div>
        <div className="comment-body">
          <div
            className="comment-text"
            style={{ whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordBreak: 'break-word' }}
          >
            {renderCaption(comment.text)}
          </div>
        </div>
      </div>
      {context.replyingTo === comment.id && (
        <ReplyInput
          replyText={context.replyText}
          setReplyText={context.setReplyText}
          commentRemaining={context.commentRemaining}
          sendAnim={context.sendAnim}
          sending={context.sending}
          toast={context.toast}
          onSend={handleReplySend}
          placeholder={`Reply to ${comment.user?.username || comment.user?.displayName || 'user'}…`}
          COMMENT_MAX={500}
        />
      )}
      {context.replyError && context.replyingTo === comment.id && (
        <div className="text-red-500 text-sm mt-1 px-3 ml-5">
          {context.replyError}
        </div>
      )}
      {replies.length > 0 && (
        <div className={`replies ${isReply ? 'reply-level' : ''}`} style={{ marginTop: 8 }}>
          {replies.map(reply => (
            <CommentItem key={reply.id} comment={reply} isReply={true} context={context} />
          ))}
        </div>
      )}
    </div>
  );
}