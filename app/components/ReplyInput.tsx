"use client";

import { lazy, Suspense } from "react";

// Lazy load icons to reduce initial bundle size
const Send = lazy(() => import("lucide-react").then(mod => ({ default: mod.Send })));

type ReplyInputProps = {
  replyText: string;
  setReplyText: (text: string) => void;
  commentRemaining: number;
  sendAnim: 'following-anim' | null;
  sending: boolean;
  toast: any;
  onSend: () => void;
  placeholder: string;
  COMMENT_MAX: number;
};

export function ReplyInput({
  replyText,
  setReplyText,
  commentRemaining,
  sendAnim,
  sending,
  toast,
  onSend,
  placeholder,
  COMMENT_MAX
}: ReplyInputProps) {
  return (
    <div className="reply-box" style={{ marginLeft: 20, marginTop: 8 }}>
      <div style={{ position: 'relative', flex: 1 }}>
        <textarea
          className="input"
          placeholder={placeholder}
          aria-label="Reply to comment"
          value={replyText}
          maxLength={COMMENT_MAX}
          rows={1}
          style={{ width: '100%', paddingRight: 72, resize: 'none', minHeight: '40px' }}
          onChange={e => {
            const v = e.target.value;
            if (v.length <= COMMENT_MAX) setReplyText(v);
            else {
              toast.show(`Comments are limited to ${COMMENT_MAX} characters`);
            }
          }}
          onKeyDown={async (e) => {
            if (e.key === "Enter" && e.shiftKey) {
              if (!replyText.trim()) return;
              if (replyText.length > COMMENT_MAX) { toast.show(`Comments are limited to ${COMMENT_MAX} characters`); return; }
              onSend();
            }
          }}
        />
        {replyText.length > 0 ? (
          <div
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-55%)',
              fontSize: 12,
              color: commentRemaining <= 20 ? '#d9534f' : 'var(--dim)',
              pointerEvents: 'none',
              fontVariantNumeric: 'tabular-nums'
            }}
            aria-live="polite"
            aria-atomic="true"
          >
            {replyText.length}/{COMMENT_MAX}
          </div>
        ) : null}
      </div>
      <button
        className={`btn follow-btn icon-reveal ${sendAnim || ''}`}
        style={{ opacity: replyText.trim() ? 1 : 0, pointerEvents: replyText.trim() ? 'auto' : 'none' }}
        onClick={onSend}
        disabled={sending}
        aria-label={sending ? "Sending reply" : "Send reply"}
        title={sending ? "Sending…" : "Send reply"}
      >
        <span className="icon" aria-hidden="true">
          <Suspense fallback={<span>→</span>}>
            <Send size={16} />
          </Suspense>
        </span>
        <span className="sr-only">{sending ? "Sending reply" : "Send reply"}</span>
      </button>
    </div>
  );
}