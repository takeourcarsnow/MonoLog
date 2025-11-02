"use client";

import { lazy, Suspense, useRef } from "react";

// Lazy load icons to reduce initial bundle size
const Send = lazy(() => import("lucide-react").then(mod => ({ default: mod.Send })));

type CommentInputProps = {
  text: string;
  setText: (text: string) => void;
  commentRemaining: number;
  sendAnim: 'following-anim' | null;
  sending: boolean;
  toast: any;
  onSend: () => void;
  COMMENT_MAX: number;
};

export function CommentInput({
  text,
  setText,
  commentRemaining,
  sendAnim,
  sending,
  toast,
  onSend,
  COMMENT_MAX
}: CommentInputProps) {
  const sendBtnRef = useRef<HTMLButtonElement | null>(null);

  return (
    <div className="comment-box" style={{ marginTop: 8 }}>
      <div style={{ position: 'relative', flex: 1 }}>
        <textarea
          className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-2.5 pr-3.5 rounded-full text-xs font-sans resize-none"
          placeholder="Add a comment…"
          aria-label="Add a comment"
          value={text}
          maxLength={COMMENT_MAX}
          rows={1}
          style={{ width: '100%', paddingRight: 72, resize: 'none', minHeight: '40px' }}
          onChange={e => {
            const v = e.target.value;
            if (v.length <= COMMENT_MAX) setText(v);
            else {
              // defensive: should be prevented by maxLength but notify user if they paste huge text
              toast.show(`Comments are limited to ${COMMENT_MAX} characters`);
            }
          }}
          onKeyDown={async (e) => {
            if (e.key === "Enter" && e.shiftKey) {
              if (!text.trim()) return;
              if (text.length > COMMENT_MAX) { toast.show(`Comments are limited to ${COMMENT_MAX} characters`); return; }
              onSend();
            }
          }}
        />
        {/* character counter overlaid inside the input on the right */}
        {text.length > 0 ? (
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
            {text.length}/{COMMENT_MAX}
          </div>
        ) : null}
      </div>

      <div style={{ width: text.trim() ? '48px' : '0px', overflow: 'hidden', transition: 'width 0.3s ease' }}>
        <button
          ref={sendBtnRef}
          className={`btn follow-btn icon-reveal ${sendAnim || ''}`}
          onClick={onSend}
          disabled={sending}
          aria-label={sending ? "Sending comment" : "Send comment"}
          title={sending ? "Sending…" : "Send comment"}
        >
          <span className="icon" aria-hidden="true">
            <Suspense fallback={<span>→</span>}>
              <Send size={16} />
            </Suspense>
          </span>
          {/* keep a screen-reader-only label so assistive tech still announces the action */}
          <span className="sr-only">{sending ? "Sending comment" : "Send comment"}</span>
        </button>
      </div>
    </div>
  );
}