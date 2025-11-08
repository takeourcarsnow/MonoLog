"use client";

import Link from "next/link";
import { OptimizedImage } from "@/app/components/media/OptimizedImage";
import TimeDisplay from "@/app/components/ui/TimeDisplay";
import { Clock } from 'lucide-react';
import { renderCaption } from "@/lib/hashtags";
import { CommentActions } from "@/app/components/comments/CommentActions";
import { ReplyInput } from "@/app/components/comments/ReplyInput";
import { Comment, CommentContext } from "@/app/components/comments/comments-types";

type CommentItemProps = {
  comment: Comment;
  isReply: boolean;
  context: CommentContext;
};

export function CommentItem({ comment, isReply, context }: CommentItemProps) {
  const replies = context.comments.filter(c => c.parentId === (comment.realId || comment.id));

  const handleDelete = async () => {
    console.log('handleDelete called for comment:', comment.realId || comment.id);
    try {
      const commentId = comment.realId || comment.id;
      const { getClient, getAccessToken } = await import('@/lib/api/client');
      const sb = getClient();
      const token = await getAccessToken(sb);
      console.log('Making delete API call for commentId:', commentId, 'with token:', !!token);
      const res = await fetch('/api/comments/delete', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ commentId }) });
      console.log('Delete API response status:', res.status);
      const json = await res.json();
      console.log('Delete API response:', json);
      if (!res.ok) throw new Error(json?.error || 'Failed');
      await context.load(true);
    } catch (e: any) {
      console.warn(e?.message || 'Failed to delete comment');
    }
  };

  const handleReplySend = async () => {
    if (!context.currentUser) {
      context.router.push('/profile');
      return;
    }
    if (!context.replyText.trim()) return;
    if (context.replyText.length > 500) { console.warn(`Comments are limited to 500 characters`); return; }
    context.setReplyError(null);
    await context.addComment(context.replyText.trim(), comment.realId || comment.id);
  };

  return (
    <div key={comment.id}>
      <div className={`comment-item appear ${isReply ? 'reply' : ''}`} style={{ animationDelay: `${context.comments.indexOf(comment) * 40}ms` }}>
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
              onDelete={handleDelete}
              setReplyingTo={context.setReplyingTo}
              setReplyText={context.setReplyText}
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
          sendAnim={null}
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