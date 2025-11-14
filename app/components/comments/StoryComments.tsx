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
import { STORY_COMMENT_MAX, StoryComment, StoryCommentContext, StoryCommentsProps } from "@/app/components/comments/story-comments-types";

export function StoryComments({ storyId, onCountChange }: StoryCommentsProps) {
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [confirmingIds, setConfirmingIds] = useState<Set<string>>(new Set());
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
      const cached = getCachedComments(storyId, 'story');
      if (cached) {
        setComments(cached);
        notifyCount(cached.length);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      const list = await api.getStoryComments(storyId);
      setComments(list);
      setCachedComments(storyId, list, 'story');
      notifyCount(list.length);
    } catch (e: any) {
      console.error('Failed to load story comments:', e);
      // On error, show empty comments instead of crashing
      setComments([]);
      notifyCount(0);
    } finally {
      setLoading(false);
    }
  }, [storyId, notifyCount]);

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
  const commentRemaining = Math.max(0, STORY_COMMENT_MAX - (text?.length || 0));

  const addComment = async (bodyText: string, parentId?: string) => {
    const tempId = `optimistic-${Date.now()}`;
    const optimistic: StoryComment = {
      id: tempId,
      text: bodyText,
      createdAt: new Date().toISOString(),
      parentId,
      user: currentUser || { id: 'me', displayName: 'You', avatarUrl: '/logo.svg' }
    };

    // Add optimistic comment
    setComments(prev => {
      const next = [...prev, optimistic];
      setCachedComments(storyId, next, 'story');
      return next;
    });
    notifyCount(comments.length + 1);

    setSending(true);
    try {
      const added = await api.addStoryComment(storyId, bodyText, parentId);

      // Update optimistic with real data, keeping temp id for stable key
      setComments(prev => {
        const next = prev.map(c => c.id === tempId ? { ...added, id: tempId, realId: added.id } : c);
        setCachedComments(storyId, next, 'story');
        return next;
      });

      if (parentId) {
        setReplyText("");
        setReplyingTo(null);
      } else {
        setText("");
      }
    } catch (err: any) {
      // Remove optimistic comment on error
      setComments(prev => {
        const next = prev.filter(c => c.id !== tempId);
        setCachedComments(storyId, next, 'story');
        notifyCount(next.length);
        return next;
      });
      if (parentId) {
        setReplyError(err?.message || 'Failed to add reply');
      } else {
        setCommentError(err?.message || 'Failed to add comment');
      }
    } finally {
      setSending(false);
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
                currentUser,
                replyingTo,
                replyText,
                commentRemaining,
                toast,
                postId: storyId, // Note: using postId for compatibility, but it's storyId
                load,
                addComment,
                setReplyingTo,
                setReplyText,
                setSending,
                setConfirmingIds,
                setComments,
                setCachedComments: (id, comments) => setCachedComments(id, comments, 'story'),
                notifyCount,
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
        sendAnim={null}
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
          if (text.length > STORY_COMMENT_MAX) { console.warn(`Comments are limited to ${STORY_COMMENT_MAX} characters`); return; }
          setCommentError(null);
          await addComment(text.trim());
        }}
        COMMENT_MAX={STORY_COMMENT_MAX}
      />
      {commentError && (
        <div className="text-red-500 text-sm mt-1 px-3">
          {commentError}
        </div>
      )}
    </>
  );
}