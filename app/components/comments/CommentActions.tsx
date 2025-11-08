"use client";

import { lazy, Suspense } from "react";
import { ReportButton } from "@/app/components/ReportButton";

// Lazy load icons to reduce initial bundle size
const Trash2 = lazy(() => import("lucide-react").then(mod => ({ default: mod.Trash2 })));
const MessageCircle = lazy(() => import("lucide-react").then(mod => ({ default: mod.MessageCircle })));

type CommentActionsProps = {
  commentId: string;
  isReply: boolean;
  currentUser: any | null;
  commentUserId: string;
  confirmingIds: Set<string>;
  setConfirmingIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  onDelete: () => void;
  setReplyingTo: (id: string | null) => void;
  setReplyText: (text: string) => void;
};

export function CommentActions({
  commentId,
  isReply,
  currentUser,
  commentUserId,
  confirmingIds,
  setConfirmingIds,
  onDelete,
  setReplyingTo,
  setReplyText
}: CommentActionsProps) {
  return (
    <div className="comment-action-slot">
      {currentUser && (
        <button
          className="comment-badge reply-btn"
          title="Reply to comment"
          onClick={() => {
            setReplyingTo(commentId);
            setReplyText("");
          }}
          aria-label="Reply to comment"
        >
          <Suspense fallback={<span>↩</span>}>
            <MessageCircle size={14} />
          </Suspense>
        </button>
      )}
      {currentUser ? (
        <button
          className={`comment-badge ${(confirmingIds instanceof Set && confirmingIds.has(commentId)) ? 'confirming' : ''}`}
          title={(confirmingIds instanceof Set && confirmingIds.has(commentId)) ? 'Confirm delete' : 'Delete comment'}
          onClick={() => {
            if (confirmingIds instanceof Set && confirmingIds.has(commentId)) {
              onDelete();
              setConfirmingIds(prev => {
                if (prev instanceof Set) {
                  const newSet = new Set(prev);
                  newSet.delete(commentId);
                  return newSet;
                } else {
                  return new Set();
                }
              });
            } else {
              setConfirmingIds(prev => {
                if (prev instanceof Set) {
                  return new Set(prev).add(commentId);
                } else {
                  return new Set([commentId]);
                }
              });
            }
          }}
        >
          <Suspense fallback={<span>×</span>}>
            <Trash2 size={14} />
          </Suspense>
        </button>
      ) : currentUser ? (
        <ReportButton commentId={commentId} />
      ) : null}
    </div>
  );
}