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
import TimeDisplay from "./TimeDisplay";
import Link from "next/link";
import { renderCaption } from "@/src/lib/hashtags";

// Lazy load icons to reduce initial bundle size
const Send = lazy(() => import("lucide-react").then(mod => ({ default: mod.Send })));
const Trash2 = lazy(() => import("lucide-react").then(mod => ({ default: mod.Trash2 })));
const MessageCircle = lazy(() => import("lucide-react").then(mod => ({ default: mod.MessageCircle })));

const COMMENT_MAX = 500;

type CommentContext = {
  comments: any[];
  newCommentId: string | null;
  removingIds: Set<string>;
  currentUser: any | null;
  replyingTo: string | null;
  replyText: string;
  commentRemaining: number;
  sendAnim: 'following-anim' | null;
  toast: any;
  postId: string;
  load: (force?: boolean) => Promise<void>;
  doOptimisticAdd: (bodyText: string, parentId?: string) => Promise<void>;
  setReplyingTo: (id: string | null) => void;
  setReplyText: (text: string) => void;
  setSending: (sending: boolean) => void;
  setSendAnim: (anim: 'following-anim' | null) => void;
  setConfirmingIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  confirmTimers: React.MutableRefObject<Map<string, number>>;
  setComments: React.Dispatch<React.SetStateAction<any[]>>;
  setCachedComments: (postId: string, comments: any[]) => void;
  notifyCount: (n: number) => void;
  setRemovingIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  sending: boolean;
  confirmingIds: Set<string>;
};

type Props = {
  postId: string;
  onCountChange?: (n: number) => void;
};

function renderComment(
  comment: any,
  isReply: boolean,
  context: CommentContext
) {
  const replies = context.comments.filter(c => c.parentId === comment.id);
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
            <TimeDisplay date={comment.createdAt} className="dim" />
            <div className="comment-action-slot">
              {!isReply && context.currentUser && (
                <button
                  className="comment-badge reply-btn"
                  title="Reply to comment"
                  onClick={() => {
                    context.setReplyingTo(comment.id);
                    context.setReplyText("");
                  }}
                  aria-label="Reply to comment"
                >
                  <Suspense fallback={<span>↩</span>}>
                    <MessageCircle size={14} />
                  </Suspense>
                </button>
              )}
              {context.currentUser && context.currentUser.id === comment.user?.id ? (
                <button
                  className={`comment-badge ${context.confirmingIds.has(comment.id) ? 'confirming' : ''}`}
                  title={context.confirmingIds.has(comment.id) ? 'Confirm delete' : 'Delete comment'}
                  aria-pressed={context.confirmingIds.has(comment.id) ? 'true' : 'false'}
                  onClick={async () => {
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
                          context.toast.show(e?.message || 'Failed to delete comment');
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
                  }}
                >
                  <Suspense fallback={<span>×</span>}>
                    <Trash2 size={14} />
                  </Suspense>
                </button>
              ) : context.currentUser ? (
                <ReportButton commentId={comment.id} />
              ) : null}
            </div>
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
        <div className="reply-box" style={{ marginLeft: isReply ? 40 : 20, marginTop: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <textarea
              className="input"
              placeholder={`Reply to ${comment.user?.username || comment.user?.displayName || 'user'}…`}
              aria-label="Reply to comment"
              value={context.replyText}
              maxLength={COMMENT_MAX}
              rows={1}
              style={{ width: '100%', paddingRight: 72, resize: 'none', minHeight: '40px' }}
              onChange={e => {
                const v = e.target.value;
                if (v.length <= COMMENT_MAX) context.setReplyText(v);
                else {
                  context.toast.show(`Comments are limited to ${COMMENT_MAX} characters`);
                }
              }}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && e.shiftKey) {
                  if (!context.replyText.trim()) return;
                  if (context.replyText.length > COMMENT_MAX) { context.toast.show(`Comments are limited to ${COMMENT_MAX} characters`); return; }
                  context.setSending(true);
                  const sendText = context.replyText;
                  context.setReplyText("");
                  context.setReplyingTo(null);
                  await context.doOptimisticAdd(sendText, comment.id);
                  context.setSending(false);
                }
              }}
            />
            {context.replyText.length > 0 ? (
              <div
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-55%)',
                  fontSize: 12,
                  color: context.commentRemaining <= 20 ? '#d9534f' : 'var(--dim)',
                  pointerEvents: 'none',
                  fontVariantNumeric: 'tabular-nums'
                }}
                aria-live="polite"
                aria-atomic="true"
              >
                {context.replyText.length}/{COMMENT_MAX}
              </div>
            ) : null}
          </div>
          <button
            className={`btn follow-btn icon-reveal ${context.sendAnim || ''}`}
            style={{ opacity: context.replyText.trim() ? 1 : 0, pointerEvents: context.replyText.trim() ? 'auto' : 'none' }}
            onClick={async () => {
              if (!context.replyText.trim()) return;
              if (context.replyText.length > COMMENT_MAX) { context.toast.show(`Comments are limited to ${COMMENT_MAX} characters`); return; }
              context.setSending(true);
              context.setSendAnim('following-anim');
              const sendText = context.replyText;
              context.setReplyText("");
              context.setReplyingTo(null);
              await context.doOptimisticAdd(sendText, comment.id);
              setTimeout(() => context.setSendAnim(null), 520);
              context.setSending(false);
            }}
            disabled={context.sending}
            aria-label={context.sending ? "Sending reply" : "Send reply"}
            title={context.sending ? "Sending…" : "Send reply"}
          >
            <span className="icon" aria-hidden="true">
              <Suspense fallback={<span>→</span>}>
                <Send size={16} />
              </Suspense>
            </span>
            <span className="sr-only">{context.sending ? "Sending reply" : "Send reply"}</span>
          </button>
        </div>
      )}
      {replies.length > 0 && (
        <div className="replies" style={{ marginLeft: isReply ? 40 : 20, marginTop: 8 }}>
          {replies.map(reply => renderComment(reply, true, context))}
        </div>
      )}
    </div>
  );
}

export function Comments({ postId, onCountChange }: Props) {
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
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

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

  const doOptimisticAdd = async (bodyText: string, parentId?: string) => {
    const tempId = `optimistic-${Date.now()}`;
    const optimistic = {
      id: tempId,
      text: bodyText,
      createdAt: new Date().toISOString(),
      parentId,
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
      const added = await api.addComment(postId, bodyText, parentId);
      
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
    <>
      <div className="comment-list">
        {loading && comments.length === 0 ? (
          <div className="dim">Loading comments…</div>
        ) : !comments.length ? (
          <div className="empty">No comments yet. Be the first to comment.</div>
        ) : (
          comments.filter(c => !c.parentId).map((c, idx) => renderComment(c, false, {
            comments,
            newCommentId,
            removingIds,
            currentUser,
            replyingTo,
            replyText,
            commentRemaining,
            sendAnim,
            toast,
            postId,
            load,
            doOptimisticAdd,
            setReplyingTo,
            setReplyText,
            setSending,
            setSendAnim,
            setConfirmingIds,
            confirmTimers,
            setComments,
            setCachedComments,
            notifyCount,
            setRemovingIds,
            sending,
            confirmingIds
          }))
        )}
      </div>

      <div className="comment-box" style={{ marginTop: 8 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <textarea
            className="input"
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
                setSending(true);
                const sendText = text;
                setText("");
                await doOptimisticAdd(sendText);
                setSending(false);
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

        <button
          ref={sendBtnRef}
          className={`btn follow-btn icon-reveal ${sendAnim || ''}`}
          style={{ opacity: text.trim() ? 1 : 0, pointerEvents: text.trim() ? 'auto' : 'none' }}
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
    </>
  );
}
