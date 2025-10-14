// Avatar images should use the OptimizedImage wrapper so Next can
// serve appropriately sized versions via its image optimizer.
"use client";

import { useCallback, useEffect, useRef, useState, lazy, Suspense } from "react";
import { api } from "@/src/lib/api";
import { getClient, getAccessToken } from '@/src/lib/api/client';
import { OptimizedImage } from "@/app/components/OptimizedImage";
import { getCachedComments, setCachedComments } from "@/src/lib/commentCache";
import { useToast } from "./Toast";
import { ReportButton } from "./ReportButton";

// Lazy load icons to reduce initial bundle size
const Send = lazy(() => import("lucide-react").then(mod => ({ default: mod.Send })));
const Trash2 = lazy(() => import("lucide-react").then(mod => ({ default: mod.Trash2 })));

type Props = {
  postId: string;
  onCountChange?: (n: number) => void;
};

export function Comments({ postId, onCountChange }: Props) {
  const COMMENT_MAX = 500;
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendAnim, setSendAnim] = useState<'following-anim' | null>(null);
  const [newCommentId, setNewCommentId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [confirmingIds, setConfirmingIds] = useState<Set<string>>(new Set());
  const confirmTimers = useRef<Map<string, number>>(new Map());

  // helper to notify parent about comment count without causing
  // render-phase updates (defers the call to a microtask)
  const notifyCount = useCallback((n: number) => {
    Promise.resolve().then(() => onCountChange?.(n));
  }, [onCountChange]);

  const load = useCallback(async (force?: boolean) => {
    if (!force) {
      const cached = getCachedComments(postId);
      if (cached) {
        setComments(cached);
        notifyCount(cached.length);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      const list = await api.getComments(postId);
      setComments(list);
      setCachedComments(postId, list);
      notifyCount(list.length);
    } catch (e: any) {
      console.error('Failed to load comments:', e);
      // On error, show empty comments instead of crashing
      setComments([]);
      notifyCount(0);
    } finally {
      setLoading(false);
    }
  }, [postId, notifyCount]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const u = await api.getCurrentUser();
        if (mounted) setCurrentUser(u);
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  const sendBtnRef = useRef<HTMLButtonElement | null>(null);
  const toast = useToast();
  const commentRemaining = Math.max(0, COMMENT_MAX - (text?.length || 0));

  const doOptimisticAdd = async (bodyText: string) => {
    const tempId = `optimistic-${Date.now()}`;
    const optimistic = {
      id: tempId,
      text: bodyText,
      createdAt: new Date().toISOString(),
      user: currentUser || { id: 'me', displayName: 'You', avatarUrl: '/logo.svg' }
    } as any;

    // Add optimistic comment
    setComments(prev => {
      const next = [...prev, optimistic];
      try { setCachedComments(postId, next); } catch (_) {}
      notifyCount(next.length);
      return next;
    });

    setNewCommentId(tempId);

    try {
      const added = await api.addComment(postId, bodyText);
      
      // Replace optimistic with real comment without flickering
      setComments(prev => {
        // If the optimistic comment is still there, replace it
        const hasOptimistic = prev.some(c => c.id === tempId);
        if (!hasOptimistic) {
          // Already removed or replaced, just add the real one
          const next = [...prev, added];
          try { setCachedComments(postId, next); } catch (_) {}
          return next;
        }
        
        // Replace optimistic with real comment smoothly
        const next = prev.map(c => c.id === tempId ? added : c);
        try { setCachedComments(postId, next); } catch (_) {}
        return next;
      });
      
      // Update the new comment ID to the real one for animation
      setNewCommentId(added?.id ?? null);
      setTimeout(() => setNewCommentId(null), 420);
    } catch (err: any) {
      // Remove optimistic comment on error
      setComments(prev => {
        const next = prev.filter(c => c.id !== tempId);
        try { setCachedComments(postId, next); } catch (_) {}
        notifyCount(next.length);
        return next;
      });
      setNewCommentId(null);
      toast.show(err?.message || 'Failed to add comment');
    }
  };

  return (
    <div>
      <div className="comment-list">
        {loading && comments.length === 0 ? (
          <div className="dim">Loading comments…</div>
        ) : !comments.length ? (
          <div className="empty">No comments yet. Be the first to comment.</div>
        ) : (
          comments.map((c, idx) => (
            <div key={c.id} className={`comment-item appear ${c.id === newCommentId ? 'new' : ''} ${removingIds.has(c.id) ? 'removing' : ''}`} style={{ animationDelay: `${idx * 40}ms` }}>
              <OptimizedImage
                className="comment-avatar"
                src={c.user?.avatarUrl || "/logo.svg"}
                alt={c.user?.displayName || "User"}
                width={32}
                height={32}
                unoptimized={false}
              />
              <div className="comment-body">
                <div className="comment-head">
                  <span className="author">{c.user?.displayName || "User"}</span>
                  <span className="dim">{new Date(c.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  {currentUser && currentUser.id === c.user?.id ? (
                    <button
                      className={`comment-badge ${confirmingIds.has(c.id) ? 'confirming' : ''}`}
                      title={confirmingIds.has(c.id) ? 'Confirm delete' : 'Delete comment'}
                      aria-pressed={confirmingIds.has(c.id) ? 'true' : 'false'}
                      onClick={async () => {
                        if (confirmingIds.has(c.id)) {
                          const t = confirmTimers.current.get(c.id);
                          if (t) { clearTimeout(t); confirmTimers.current.delete(c.id); }

                          const backup = comments.slice();
                          setComments(prev => {
                            const next = prev.filter(x => x.id !== c.id);
                            try { setCachedComments(postId, next); } catch (_) {}
                            notifyCount(next.length);
                            return next;
                          });

                          setConfirmingIds(prev => {
                            const n = new Set(prev);
                            n.delete(c.id);
                            return n;
                          });

                          setRemovingIds(prev => new Set(prev).add(c.id));

                          setTimeout(async () => {
                            try {
                              const sb = getClient();
                              const token = await getAccessToken(sb);
                              const res = await fetch('/api/comments/delete', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ commentId: c.id }) });
                              const json = await res.json();
                              if (!res.ok) throw new Error(json?.error || 'Failed');
                              await load(true);
                            } catch (e: any) {
                              setComments(backup);
                              try { setCachedComments(postId, backup); } catch (_) {}
                              notifyCount(backup.length);
                              toast.show(e?.message || 'Failed to delete comment');
                            } finally {
                              setRemovingIds(prev => {
                                const n = new Set(prev);
                                n.delete(c.id);
                                return n;
                              });
                            }
                          }, 320);

                          return;
                        }

                        setConfirmingIds(prev => new Set(prev).add(c.id));
                        const timer = window.setTimeout(() => {
                          setConfirmingIds(prev => {
                            const n = new Set(prev);
                            n.delete(c.id);
                            return n;
                          });
                          confirmTimers.current.delete(c.id);
                        }, 3500);
                        confirmTimers.current.set(c.id, timer);
                      }}
                    >
                      <Suspense fallback={<span>×</span>}>
                        <Trash2 size={14} />
                      </Suspense>
                    </button>
                  ) : null}
                  {currentUser && currentUser.id !== c.user?.id ? (
                    <ReportButton commentId={c.id} />
                  ) : null}
                </div>
                <div
                  className="comment-text"
                  style={{ whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordBreak: 'break-word' }}
                >
                  {c.text}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="comment-box" style={{ marginTop: 8 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            className="input"
            type="text"
            placeholder="Add a comment…"
            aria-label="Add a comment"
            value={text}
            maxLength={COMMENT_MAX}
            onChange={e => {
              const v = e.target.value;
              if (v.length <= COMMENT_MAX) setText(v);
              else {
                // defensive: should be prevented by maxLength but notify user if they paste huge text
                toast.show(`Comments are limited to ${COMMENT_MAX} characters`);
              }
            }}
            onKeyDown={async (e) => {
              if (e.key === "Enter") {
                if (!text.trim()) return;
                if (text.length > COMMENT_MAX) { toast.show(`Comments are limited to ${COMMENT_MAX} characters`); return; }
                setSending(true);
                const sendText = text;
                setText("");
                await doOptimisticAdd(sendText);
                setSending(false);
              }
            }}
            style={{ width: '100%', paddingRight: 72 }}
          />
          {/* character counter overlaid inside the input on the right */}
          {text.length > 0 ? (
            <div
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
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

        <button
          ref={sendBtnRef}
          className={`btn follow-btn icon-reveal ${sendAnim || ''}`}
          onClick={async () => {
            if (!text.trim()) {
              sendBtnRef.current?.blur();
              return;
            }
            if (text.length > COMMENT_MAX) { toast.show(`Comments are limited to ${COMMENT_MAX} characters`); sendBtnRef.current?.blur(); return; }
            setSending(true);
            setSendAnim('following-anim');
            const sendText = text;
            setText("");
            await doOptimisticAdd(sendText);
            setTimeout(() => setSendAnim(null), 520);
            setSending(false);
          }}
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
