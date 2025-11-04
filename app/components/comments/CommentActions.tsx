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
  confirmTimers: React.MutableRefObject<Map<string, number>>;
  setReplyingTo: (id: string | null) => void;
  setReplyText: (text: string) => void;
  onDelete: () => void;
};

export function CommentActions({
  commentId,
  isReply,
  currentUser,
  commentUserId,
  confirmingIds,
  setConfirmingIds,
  confirmTimers,
  setReplyingTo,
  setReplyText,
  onDelete
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
      {currentUser && currentUser.id === commentUserId ? (
        <button
          className={`comment-badge ${confirmingIds.has(commentId) ? 'confirming' : ''}`}
          title={confirmingIds.has(commentId) ? 'Confirm delete' : 'Delete comment'}
          aria-pressed={confirmingIds.has(commentId) ? 'true' : 'false'}
          onClick={onDelete}
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