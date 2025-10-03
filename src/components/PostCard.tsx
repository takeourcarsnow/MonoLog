/* eslint-disable @next/next/no-img-element */
"use client";

import { memo, useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from "react";
import type { HydratedPost } from "@/lib/types";
import { api } from "@/lib/api";
import { prefetchComments, hasCachedComments } from "@/lib/commentCache";
import { formatRelative } from "@/lib/date";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Comments } from "./Comments";
import ImageZoom from "./ImageZoom";
import { AuthForm } from "./AuthForm";
import { useToast } from "./Toast";
import { UserHeader } from "./postCard/UserHeader";
import { MediaSection } from "./postCard/MediaSection";
import { ActionsSection } from "./postCard/ActionsSection";
import { CommentsSection } from "./postCard/CommentsSection";
import { Editor } from "./postCard/Editor";

// Memoize PostCard to prevent unnecessary re-renders when parent updates
const PostCardComponent = ({ post: initial, allowCarouselTouch }: { post: HydratedPost; allowCarouselTouch?: boolean }) => {
  const [post, setPost] = useState<HydratedPost>(initial);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsMounted, setCommentsMounted] = useState(false);
  const commentsRef = useRef<HTMLDivElement | null>(null);
  const [count, setCount] = useState<number>(initial.commentsCount || 0);
  const [isMe, setIsMe] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  
  const [isFavorite, setIsFavorite] = useState(false);
  // Listen for global comment-added events so counts update without opening the comments pane
  useEffect(() => {
    function onGlobalComment(e: any) {
      try {
        const pid = e?.detail?.postId;
        if (!pid) return;
        if (pid === post.id) setCount(c => c + 1);
      } catch (err) { /* ignore */ }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('monolog:comment_added', onGlobalComment as any);
    }
    return () => { if (typeof window !== 'undefined') window.removeEventListener('monolog:comment_added', onGlobalComment as any); };
  }, [post.id]);

  // If the initial hydrated post didn't include a commentsCount (or it's 0),
  // fetch the comments once to ensure the visible count is accurate. This
  // guards against server queries that omit the comments relation.
  useEffect(() => {
    let mounted = true;
    // Only do this when the currently-displayed count is falsy and comments
    // pane isn't already mounted (which would load comments). This avoids
    // unnecessary duplicate requests.
    if ((count || 0) > 0) return;
    if (commentsMounted) return;
    (async () => {
      try {
        const list = await api.getComments(post.id);
        if (!mounted) return;
        setCount(list.length || 0);
      } catch (e) {
        // ignore failures; leave count as-is
      }
    })();
    return () => { mounted = false; };
  }, [post.id, count, commentsMounted]);

  // Prefetch comments in the background when the post becomes visible or hovered
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let obs: IntersectionObserver | null = null;
    const el = document.getElementById(`post-${post.id}`);
    // Only prefetch if there might be comments (count > 0) and not already cached
    if (!el || !(count > 0) || hasCachedComments(post.id)) return;
    try {
      obs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            // background prefetch; don't await
            prefetchComments(post.id, api.getComments as any).catch(() => {});
            if (obs) { obs.disconnect(); obs = null; }
          }
        });
      }, { rootMargin: '300px' });
      obs.observe(el);
    } catch (e) {
      // Fallback: if IntersectionObserver unsupported, prefetch after brief idle
      try { setTimeout(() => prefetchComments(post.id, api.getComments as any).catch(() => {}), 800); } catch (_) {}
    }

    // Also prefetch on pointer enter (hover) or focus for keyboard users
    const onEnter = () => {
      if (hasCachedComments(post.id)) return;
      prefetchComments(post.id, api.getComments as any).catch(() => {});
    };
    el?.addEventListener('pointerenter', onEnter);
    el?.addEventListener('focus', onEnter);

    return () => {
      try { el?.removeEventListener('pointerenter', onEnter); el?.removeEventListener('focus', onEnter); } catch (_) {}
      if (obs) obs.disconnect();
    };
  }, [post.id, count]);
  const [showAuth, setShowAuth] = useState(false);
  const [editing, setEditing] = useState(false);
  const deleteBtnRef = useRef<HTMLButtonElement | null>(null);
  const touchActivatedRef = useRef(false);
  const deleteHandlerRef = useRef<(() => void) | null>(null);
  const [overlayEnabled, setOverlayEnabled] = useState(true);
  const focusSinkRef = useRef<HTMLElement | null>(null);
  const [isPressingDelete, setIsPressingDelete] = useState(false);
  // Inline confirm state (confirm-on-second-click) for deleting a post
  const [confirming, setConfirming] = useState(false);
  const [confirmTimer, setConfirmTimer] = useState<number | null>(null);
  const confirmTimerRef = useRef<number | null>(null);
  const [editExpanded, setEditExpanded] = useState(false);
  const [deleteExpanded, setDeleteExpanded] = useState(false);
  const editTimerRef = useRef<number | null>(null);
  const deleteExpandTimerRef = useRef<number | null>(null);
  const editorRef = useRef<{ save: () => Promise<void>; cancel?: () => void } | null>(null);
  const [editorSaving, setEditorSaving] = useState(false);

  // cleanup any pending confirm timer when component unmounts
  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) {
        try { window.clearTimeout(confirmTimerRef.current); } catch (_) {}
        confirmTimerRef.current = null;
      }
      if (editTimerRef.current) { try { window.clearTimeout(editTimerRef.current); } catch (_) {} editTimerRef.current = null; }
      if (deleteExpandTimerRef.current) { try { window.clearTimeout(deleteExpandTimerRef.current); } catch (_) {} deleteExpandTimerRef.current = null; }
      if (followExpandTimerRef.current) { try { window.clearTimeout(followExpandTimerRef.current); } catch (_) {} followExpandTimerRef.current = null; }
      if (followAnimTimerRef.current) { try { window.clearTimeout(followAnimTimerRef.current); } catch (_) {} followAnimTimerRef.current = null; }
      if (overlayTimerRef.current) { try { clearTimeout(overlayTimerRef.current); } catch (_) {} }
    };
  }, []);

  // Listen for follow changes triggered elsewhere (ProfileView) so this
  // PostCard can animate when its user's follow state changes externally.
  useEffect(() => {
    const onFollowChanged = (e: any) => {
      try {
        const changedUserId = e?.detail?.userId;
        const following = !!e?.detail?.following;
        if (!changedUserId) return;
        if (changedUserId !== post.userId) return;
        if (followInFlightRef.current) return; // ignore if we initiated it

        setIsFollowing(prev => {
          if (prev === following) return prev;
          // expand the button briefly so label shows while we animate
          setFollowExpanded(true);
          if (followExpandTimerRef.current) { try { window.clearTimeout(followExpandTimerRef.current); } catch (_) {} followExpandTimerRef.current = null; }
          followExpandTimerRef.current = window.setTimeout(() => { setFollowExpanded(false); followExpandTimerRef.current = null; }, 2000);
          setFollowAnim(following ? 'following-anim' : 'unfollow-anim');
          if (followAnimTimerRef.current) { try { window.clearTimeout(followAnimTimerRef.current); } catch (_) {} followAnimTimerRef.current = null; }
          followAnimTimerRef.current = window.setTimeout(() => { setFollowAnim(null); followAnimTimerRef.current = null; }, 420);
          return following;
        });
      } catch (_) { /* ignore */ }
    };
    if (typeof window !== 'undefined') window.addEventListener('monolog:follow_changed', onFollowChanged as any);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('monolog:follow_changed', onFollowChanged as any); };
  }, [post.userId]);

  // Some mobile browsers apply focus after touch/click events (timing can be
  // inconsistent). Add a capture-phase focusin listener and document-level
  // pointer/touchend handlers to ensure the delete button never keeps focus.
  useEffect(() => {
    const el = deleteBtnRef.current;
    if (!el) return;

    const tryBlur = () => {
      try { (el as HTMLElement).blur?.(); } catch (_) {}
      try { (document.activeElement as HTMLElement | null)?.blur?.(); } catch (_) {}
      // Also attempt to focus a hidden focus sink to move focus away reliably
      try {
        const sink = focusSinkRef.current;
        if (sink) {
          sink.focus();
          // blur the sink shortly after
          setTimeout(() => { try { sink.blur(); } catch (_) {} }, 0);
        }
      } catch (_) {}
    };

    const onFocusIn = (ev: FocusEvent) => {
      try {
        if (ev.target === el) {
          // Defer slightly to handle browsers that move focus after the event
          setTimeout(tryBlur, 0);
        }
      } catch (_) { }
    };

    const onDocPointerUp = () => { setTimeout(tryBlur, 0); };
    const onDocTouchEnd = () => { setTimeout(tryBlur, 0); };

    document.addEventListener('focusin', onFocusIn as any, true);
    document.addEventListener('pointerup', onDocPointerUp);
    document.addEventListener('touchend', onDocTouchEnd);

    return () => {
      try { document.removeEventListener('focusin', onFocusIn as any, true); } catch (_) {}
      try { document.removeEventListener('pointerup', onDocPointerUp); } catch (_) {}
      try { document.removeEventListener('touchend', onDocTouchEnd); } catch (_) {}
    };
  }, []);

  // Create a hidden focus sink element appended to body to use as a reliable
  // target for stealing focus when mobile browsers re-focus the delete control.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sink = document.createElement('div');
    sink.tabIndex = -1;
    sink.setAttribute('aria-hidden', 'true');
    // keep it visually hidden but focusable
    sink.style.position = 'fixed';
    sink.style.left = '-9999px';
    sink.style.width = '1px';
    sink.style.height = '1px';
    sink.style.overflow = 'hidden';
    document.body.appendChild(sink);
    focusSinkRef.current = sink;
    return () => {
      try { focusSinkRef.current = null; document.body.removeChild(sink); } catch (_) {}
    };
  }, []);

  // Attach a native non-passive touchstart/end listener to the delete button so we can
  // handle activation on mobile (avoid relying on browser focus timing). We call the
  // latest handler via deleteHandlerRef to avoid stale closures.
  useEffect(() => {
    const el = deleteBtnRef.current;
    if (!el) return;
    const onTouchStartNative = (ev: TouchEvent) => {
      try { ev.preventDefault(); } catch (_) {}
      touchActivatedRef.current = true;
      try { (document.activeElement as HTMLElement | null)?.blur?.(); } catch (_) {}
      try { (el as HTMLElement).blur?.(); } catch (_) {}
      try { setIsPressingDelete(true); } catch (_) {}
    };
    const onTouchEndNative = (ev: TouchEvent) => {
      try { setIsPressingDelete(false); } catch (_) {}
      try { (document.activeElement as HTMLElement | null)?.blur?.(); } catch (_) {}
      try { (el as HTMLElement).blur?.(); } catch (_) {}
      // If a touch activation started on this element, call the React handler path
      try {
        if (touchActivatedRef.current && deleteHandlerRef.current) {
          // Defer so React state updates are applied consistently
          setTimeout(() => { try { deleteHandlerRef.current && deleteHandlerRef.current(); } catch (_) {} }, 0);
        }
      } catch (_) {}
      touchActivatedRef.current = false;
    };
    // passive: false so preventDefault is allowed
    el.addEventListener('touchstart', onTouchStartNative as EventListener, { passive: false });
    el.addEventListener('touchend', onTouchEndNative as EventListener);
    el.addEventListener('touchcancel', onTouchEndNative as EventListener);
    return () => {
      try { el.removeEventListener('touchstart', onTouchStartNative as any); } catch (_) {}
      try { el.removeEventListener('touchend', onTouchEndNative as any); } catch (_) {}
      try { el.removeEventListener('touchcancel', onTouchEndNative as any); } catch (_) {}
    };
  }, []);
  const router = useRouter();
  const pathname = usePathname();

  // Centralized delete activation handler used by both React onClick and native touchend
  const handleDeleteActivation = async () => {
    // Immediately remove focus from any element so the delete control never stays focused
    try { (document.activeElement as HTMLElement | null)?.blur?.(); } catch (_) {}
    try { setTimeout(() => { document.body.dispatchEvent(new MouseEvent('click', { bubbles: true })); }, 0); } catch (_) {}
    // Aggressively steal focus to a hidden sink for a few micro-ticks to handle
    // mobile browsers that re-apply focus after the event loop.
    try {
      const sink = focusSinkRef.current;
      if (sink) {
        // schedule multiple focus/blur cycles to cover delayed re-focus behaviors
        const delays = [0, 8, 40, 120, 400, 900];
        for (const d of delays) {
          setTimeout(() => {
            try {
              // debug what element is active right now (helps remote debugging)
              // eslint-disable-next-line no-console
              console.debug('[PostCard] delete blur pass - activeElement', document.activeElement?.tagName, document.activeElement?.id, document.activeElement?.className);
            } catch (_) {}
            try { sink.focus(); sink.blur(); } catch (_) {}
            try { (document.activeElement as HTMLElement | null)?.blur?.(); } catch (_) {}
          }, d);
        }
      }
    } catch (_) {}

  // Clear pressing visual state
  try { setIsPressingDelete(false); } catch (_) {}

  // If already confirming, proceed to delete
    if (confirming) {
      try {
        (document.getElementById(`post-${post.id}`)?.remove?.());
        await api.deletePost(post.id);
        if (pathname?.startsWith("/post/")) router.push("/");
      } catch (e: any) {
        toast.show(e?.message || "Failed to delete post");
      } finally {
        setConfirming(false);
        if (confirmTimerRef.current) { window.clearTimeout(confirmTimerRef.current); confirmTimerRef.current = null; setConfirmTimer(null); }
      }
      return;
    }

    // Enter confirming state and reveal label (expanded) and clear after timeout
    setConfirming(true);
    setDeleteExpanded(true);
    if (deleteExpandTimerRef.current) { window.clearTimeout(deleteExpandTimerRef.current); deleteExpandTimerRef.current = null; }
    deleteExpandTimerRef.current = window.setTimeout(() => { setDeleteExpanded(false); deleteExpandTimerRef.current = null; }, 3500);
    const t = window.setTimeout(() => {
      setConfirming(false);
      confirmTimerRef.current = null;
      setConfirmTimer(null);
      setDeleteExpanded(false);
    }, 3500);
    confirmTimerRef.current = t;
    setConfirmTimer(t);
    // final debug snapshot a little later
    setTimeout(() => { try { console.debug('[PostCard] final activeElement', document.activeElement?.tagName, document.activeElement?.id, document.activeElement?.className); } catch (_) {} }, 1200);
  };

  // keep a live reference so native listeners can call the latest handler
  deleteHandlerRef.current = handleDeleteActivation;

  // no anchored popover used for delete confirmation anymore

  useEffect(() => {
    (async () => {
      const cur = await api.getCurrentUser();
      setIsMe(cur?.id === post.userId);
      if (cur?.id !== post.userId) {
        setIsFollowing(await api.isFollowing(post.userId));
      }
      // Check favorite status for all posts (including user's own posts)
      if (cur) {
        setIsFavorite(await api.isFavorite(post.id));
      }
    })();
  }, [post.userId, post.id]);

  // If the hydrated post doesn't include an avatarUrl (possible for older rows),
  // fetch the user's profile and fill it in so the avatar renders consistently
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!post.user?.avatarUrl) {
          const u = await api.getUser(post.user.id);
          if (mounted && u && u.avatarUrl) {
            setPost(p => ({ ...p, user: { ...p.user, avatarUrl: u.avatarUrl, displayName: u.displayName || p.user.displayName } }));
          }
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [post.user?.id, post.user?.avatarUrl]);

  const toast = useToast();
  const followInFlightRef = useRef(false);
  const followBtnRef = useRef<HTMLButtonElement | null>(null);
  const [followAnim, setFollowAnim] = useState<'following-anim' | 'unfollow-anim' | null>(null);
  const [followExpanded, setFollowExpanded] = useState(false);
  const followExpandTimerRef = useRef<number | null>(null);
  const followAnimTimerRef = useRef<number | null>(null);

  // Normalize image urls and alt text for rendering
  const imageUrls: string[] = (post as any).imageUrls || ((post as any).imageUrl ? [(post as any).imageUrl] : []);
  const alts: string[] = Array.isArray(post.alt) ? post.alt : [post.alt || ""];

  // DEV: debug log when there are multiple images to help verify carousel rendering
  try {
    if (typeof window !== 'undefined' && imageUrls.length > 1) {
      // eslint-disable-next-line no-console
      // Print a compact object that's easy to copy/paste from Chrome DevTools
      // (id, image count, first few urls, alt/caption, user)
      console.debug('[PostCard] snapshot', {
        id: post.id,
        images: imageUrls.length,
        imageUrls: imageUrls.slice(0,5),
        alt: Array.isArray(post.alt) ? post.alt.slice(0,5) : post.alt,
        caption: post.caption,
        user: { id: post.user?.id, username: post.user?.username }
      });
    }
  } catch (e) { /* ignore */ }

  // double-tap detection state and favorite overlay are in MediaSection
  const [favoriteOverlayState, setFavoriteOverlayState] = useState<'adding' | 'removing' | null>(null);
  const overlayTimerRef = useRef<any>(null);

  async function toggleFavoriteWithAuth() {
    const cur = await api.getCurrentUser();
    if (!cur) {
      try { (document.activeElement as HTMLElement | null)?.blur?.(); } catch (_) {}
      setShowAuth(true);
      return;
    }
    const prev = isFavorite;
    setIsFavorite(!prev);
    try {
      if (prev) await api.unfavoritePost(post.id); else await api.favoritePost(post.id);
    } catch (e: any) {
      setIsFavorite(prev);
      toast.show(e?.message || "Failed to toggle favorite");
    }
  }

  const showFavoriteFeedback = (action: 'adding' | 'removing') => {
    // Clear any existing overlay timer
    if (overlayTimerRef.current) {
      try { clearTimeout(overlayTimerRef.current); } catch (_) {}
    }
    
    setFavoriteOverlayState(action);
    const duration = action === 'adding' ? 600 : 500;
    overlayTimerRef.current = setTimeout(() => {
      setFavoriteOverlayState(null);
    }, duration);
  };

  // share helper is in ActionsSection
  const sharePost = async () => {
    const url = `${(typeof window !== 'undefined' ? window.location.origin : '')}/post/${post.user.username || post.userId}-${post.id.slice(0,8)}`;
    const title = `${post.user.displayName}'s MonoLog`;
    const text = post.caption ? post.caption : 'Check out this MonoLog photo';
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({ title, text, url });
        return;
      }
    } catch (e) {
      // fallback to copy
    }
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        toast.show('Link copied');
      } else {
        // fallback: temporary input
        const tmp = document.createElement('input');
        tmp.value = url;
        document.body.appendChild(tmp);
        tmp.select();
        try { document.execCommand('copy'); toast.show('Link copied'); } catch (_) { /* ignore */ }
        document.body.removeChild(tmp);
      }
    } catch (e:any) {
      toast.show(e?.message || 'Failed to share');
    }
  };

  // helper to set animated max-height on the comments container
  const setCommentsVisible = (open: boolean) => {
    const el = commentsRef.current;
    if (!el) return;
    if (open) {
      // measure and set explicit max-height so CSS can animate it
      const h = el.scrollHeight;
      // allow a small extra so inner margins/paddings don't clip
      el.style.maxHeight = h + 24 + 'px';
      // ensure the open class is present so opacity transitions
      el.classList.add('open');
      // remove any previous transitionend handlers
      const onEnd = () => { el.style.maxHeight = ''; el.removeEventListener('transitionend', onEnd); };
      el.addEventListener('transitionend', onEnd);
    } else {
      // closing: set maxHeight to current height then to 0 so transition runs
      const h = el.scrollHeight;
      el.style.maxHeight = h + 'px';
      // Force layout so the browser notices the change before collapsing
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      el.offsetHeight;
      // remove open class after transition completes
      const onEnd = (ev: TransitionEvent) => {
        if (ev.propertyName === 'max-height' || ev.propertyName === 'max-height') {
          el.classList.remove('open');
          el.style.maxHeight = '';
          el.removeEventListener('transitionend', onEnd as any);
        }
      };
      el.addEventListener('transitionend', onEnd as any);
      // trigger collapse
      el.style.maxHeight = '0px';
      el.style.opacity = '0';
    }
  };

  useEffect(() => {
    // whenever commentsOpen changes, drive the measured animation
    try { setCommentsVisible(commentsOpen); } catch (_) {}
  }, [commentsOpen]);

  return (
    <article className="card">
      <UserHeader
        post={post}
        isMe={isMe}
        isFollowing={isFollowing}
        setIsFollowing={setIsFollowing}
        showAuth={showAuth}
        setShowAuth={setShowAuth}
        editing={editing}
        setEditing={setEditing}
        editExpanded={editExpanded}
        setEditExpanded={setEditExpanded}
        editTimerRef={editTimerRef}
        editorSaving={editorSaving}
        confirming={confirming}
        deleteExpanded={deleteExpanded}
        setDeleteExpanded={setDeleteExpanded}
        deleteExpandTimerRef={deleteExpandTimerRef}
        isPressingDelete={isPressingDelete}
        setIsPressingDelete={setIsPressingDelete}
        overlayEnabled={overlayEnabled}
        setOverlayEnabled={setOverlayEnabled}
        deleteBtnRef={deleteBtnRef}
        deleteHandlerRef={deleteHandlerRef}
        followBtnRef={followBtnRef}
        followAnim={followAnim}
        setFollowAnim={setFollowAnim}
        followExpanded={followExpanded}
        setFollowExpanded={setFollowExpanded}
        followExpandTimerRef={followExpandTimerRef}
        followAnimTimerRef={followAnimTimerRef}
        followInFlightRef={followInFlightRef}
        toast={toast}
      />

      <MediaSection
        post={post}
        isFavorite={isFavorite}
        toggleFavoriteWithAuth={toggleFavoriteWithAuth}
        showFavoriteFeedback={showFavoriteFeedback}
        favoriteOverlayState={favoriteOverlayState}
        pathname={pathname}
        allowCarouselTouch={allowCarouselTouch}
      />

      <div className="card-body">
        {!editing ? (
          <>
            {post.caption ? <div className="caption">{post.caption}</div> : null}
            <ActionsSection
              postId={post.id}
              count={count}
              commentsOpen={commentsOpen}
              setCommentsOpen={setCommentsOpen}
              commentsMounted={commentsMounted}
              setCommentsMounted={setCommentsMounted}
              commentsRef={commentsRef}
              isFavorite={isFavorite}
              setIsFavorite={setIsFavorite}
              showAuth={showAuth}
              setShowAuth={setShowAuth}
              sharePost={sharePost}
              api={api}
              toast={toast}
            />
            <CommentsSection
              postId={post.id}
              commentsMounted={commentsMounted}
              commentsOpen={commentsOpen}
              commentsRef={commentsRef}
              setCount={setCount}
            />
          </>
        ) : (
          <Editor
            ref={editorRef}
            post={post}
            onCancel={() => setEditing(false)}
            onSave={async (patch) => {
              try {
                const updated = await api.updatePost(post.id, patch);
                setPost(updated);
                setEditing(false);
              } catch (e: any) {
                toast.show(e?.message || "Failed to update post");
              }
            }}
          />
        )}
      </div>
    </article>
  );
}

// Memoize PostCard with shallow comparison to prevent re-renders when posts haven't changed
export const PostCard = memo(PostCardComponent, (prev, next) => {
  // Only re-render if post ID or allowCarouselTouch changes
  return prev.post.id === next.post.id && 
         prev.allowCarouselTouch === next.allowCarouselTouch &&
         prev.post.caption === next.post.caption &&
         prev.post.public === next.post.public &&
         prev.post.commentsCount === next.post.commentsCount;
});