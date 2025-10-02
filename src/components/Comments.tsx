/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { getCachedComments, setCachedComments } from "@/lib/commentCache";
import { useToast } from "./Toast";

type Props = {
  postId: string;
  onCountChange?: (n: number) => void;
};

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

  // helper to notify parent about comment count without causing
  // render-phase updates (defers the call to a microtask)
  const notifyCount = (n: number) => {
    Promise.resolve().then(() => onCountChange?.(n));
  };

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
    const list = await api.getComments(postId);
    setComments(list);
    setCachedComments(postId, list);
    notifyCount(list.length);
    setLoading(false);
  }, [postId, onCountChange]);

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

  const doOptimisticAdd = async (bodyText: string) => {
    const tempId = `optimistic-${Date.now()}`;
    const optimistic = {
      id: tempId,
      text: bodyText,
      createdAt: new Date().toISOString(),
      user: currentUser || { id: 'me', displayName: 'You', avatarUrl: '/logo.svg' }
    } as any;

    setComments(prev => {
      const next = [...prev, optimistic];
      try { setCachedComments(postId, next); } catch (_) {}
      notifyCount(next.length);
      return next;
    });

    setNewCommentId(tempId);

    try {
      const added = await api.addComment(postId, bodyText);
      setComments(prev => {
        const next = prev.map(c => c.id === tempId ? added : c);
        try { setCachedComments(postId, next); } catch (_) {}
        return next;
      });
      setNewCommentId(added?.id ?? null);
      setTimeout(() => setNewCommentId(null), 420);
    } catch (err: any) {
      setComments(prev => {
        const next = prev.filter(c => c.id !== tempId);
        try { setCachedComments(postId, next); } catch (_) {}
        notifyCount(next.length);
        return next;
      });
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
              <img className="comment-avatar" src={c.user?.avatarUrl || "/logo.svg"} alt={c.user?.displayName || "User"} />
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
                              const res = await fetch('/api/comments/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actorId: currentUser.id, commentId: c.id }) });
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
                      <Trash2 size={14} />
                    </button>
                  ) : null}
                </div>
                <div className="comment-text">{c.text}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="comment-box" style={{ marginTop: 8 }}>
        <input
          className="input"
          type="text"
          placeholder="Add a comment…"
          aria-label="Add a comment"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={async (e) => {
            if (e.key === "Enter") {
              if (!text.trim()) return;
              setSending(true);
              const sendText = text;
              setText("");
              await doOptimisticAdd(sendText);
              setSending(false);
            }
          }}
        />

        <button
          ref={sendBtnRef}
          className={`btn follow-btn icon-reveal ${sendAnim || ''}`}
          onClick={async () => {
            if (!text.trim()) {
              sendBtnRef.current?.blur();
              return;
            }
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
          <span className="icon" aria-hidden="true"><Send size={16} /></span>
          {/* keep a screen-reader-only label so assistive tech still announces the action */}
          <span className="sr-only">{sending ? "Sending comment" : "Send comment"}</span>
        </button>
      </div>
    </div>
  );
}