// Avatar images should use the OptimizedImage wrapper so Next can
// serve appropriately sized versions via its image optimizer.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getCachedComments, setCachedComments } from "@/lib/commentCache";
import { CommentItem } from "@/app/components/comments/CommentItem";
import { CommentInput } from "@/app/components/comments/CommentInput";
import { LoadingIndicator } from "@/app/components/ui/LoadingIndicator";
import { SpinningLogo } from "@/app/components/ui/SpinningLogo";
import { COMMENT_MAX, Comment, CommentContext, CommentsProps } from "@/app/components/comments/comments-types";

export function Comments({ postId, onCountChange }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
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
  const [commentError, setCommentError] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);

  const router = useRouter();

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

  // Toasts are removed; prefer inline UI or console logging
  const toast = { show: (_: unknown) => {} } as const;
  const commentRemaining = Math.max(0, COMMENT_MAX - (text?.length || 0));

  const doOptimisticAdd = async (bodyText: string, parentId?: string) => {
    const tempId = `optimistic-${Date.now()}`;
    const optimistic: Comment = {
      id: tempId,
      text: bodyText,
      createdAt: new Date().toISOString(),
      parentId,
      user: currentUser || { id: 'me', displayName: 'You', avatarUrl: '/logo.svg' }
    };

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
      if (parentId) {
        setReplyError(err?.message || 'Failed to add reply');
      } else {
        setCommentError(err?.message || 'Failed to add comment');
      }
    }
  };

  return (
    <>
      <div className="comment-list">
        {loading && comments.length === 0 ? (
          <div className="dim">
            <div className="flex items-center justify-center">
              <SpinningLogo size={20} />
            </div>
          </div>
        ) : !comments.length ? (
          <div className="empty">No comments yet. Be the first to comment.</div>
        ) : (
          comments.filter(c => !c.parentId).map((c, idx) => (
            <CommentItem
              key={c.id}
              comment={c}
              isReply={false}
              context={{
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
                confirmingIds,
                router,
                replyError,
                setReplyError
              }}
            />
          ))
        )}
      </div>

      <CommentInput
        text={text}
        setText={setText}
        commentRemaining={commentRemaining}
        sendAnim={sendAnim}
        sending={sending}
        toast={toast}
        onSend={async () => {
          if (!currentUser) {
            router.push('/profile');
            return;
          }
          if (!text.trim()) {
            return;
          }
          if (text.length > COMMENT_MAX) { console.warn(`Comments are limited to ${COMMENT_MAX} characters`); return; }
          setCommentError(null);
          setSending(true);
          setSendAnim('following-anim');
          const sendText = text;
          setText("");
          await doOptimisticAdd(sendText);
          setTimeout(() => setSendAnim(null), 520);
          setSending(false);
        }}
        COMMENT_MAX={COMMENT_MAX}
      />
      {commentError && (
        <div className="text-red-500 text-sm mt-1 px-3">
          {commentError}
        </div>
      )}
    </>
  );
}
