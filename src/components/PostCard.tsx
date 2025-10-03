/* eslint-disable @next/next/no-img-element */
"use client";

import { memo, useEffect, useMemo, useRef, useState, useImperativeHandle, forwardRef, useCallback } from "react";
import type { HydratedPost } from "@/lib/types";
import { api } from "@/lib/api";
import { prefetchComments, hasCachedComments } from "@/lib/commentCache";
import { formatRelative } from "@/lib/date";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Comments } from "./Comments";
import ImageZoom from "./ImageZoom";
import { Lock, UserPlus, UserCheck, Edit, Trash, MessageCircle, Star as StarIcon, Link as LinkIcon } from "lucide-react";
import { AuthForm } from "./AuthForm";
import { useToast } from "./Toast";

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
    };
  }, []);
  const router = useRouter();
  const pathname = usePathname();

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

  const userLine = useMemo(() => {
    const lockIcon = post.public ? null : <Lock size={14} strokeWidth={2} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} />;
    return (
      <>
        @{post.user.username} • {formatRelative(post.createdAt)} {lockIcon}
      </>
    );
  }, [post.user.username, post.createdAt, post.public]);

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

  // Carousel state for multi-image posts
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [isZooming, setIsZooming] = useState(false);
  const isZoomingRef = useRef(false);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);

  useEffect(() => {
    // clamp index when images change
    if (index >= imageUrls.length) setIndex(Math.max(0, imageUrls.length - 1));
  }, [imageUrls.length, index]);

  // keep a ref copy of the latest index so event listeners with stale
  // closures (registered once) can read the current value.
  useEffect(() => { indexRef.current = index; }, [index]);

  useEffect(() => {
    if (!trackRef.current) return;
    // Don't override the inline transform while an ImageZoom pinch is active.
    // Updating the transform mid-pinch can cause the carousel to snap back to
    // the first slide on some devices/browsers. The ImageZoom already manages
    // its own touch handling and stops propagation; while zooming we simply
    // avoid touching the track's transform and re-sync when the zoom ends.
    if (isZoomingRef.current) return;
    trackRef.current.style.transform = `translateX(-${index * 100}%)`;
  }, [index]);

  const prev = () => setIndex(i => (i <= 0 ? 0 : i - 1));
  const next = () => setIndex(i => (i >= imageUrls.length - 1 ? imageUrls.length - 1 : i + 1));

  const onTouchStart = (e: React.TouchEvent) => {
    // If a pinch-zoom is active, don't start carousel touch handling
    if (isZoomingRef.current) return;
    // prevent the touch from bubbling up to parent swipers
    e.stopPropagation();
    try { e.nativeEvent?.stopImmediatePropagation?.(); } catch (_) { /* ignore */ }
    // Track active touches to detect multi-finger gestures on browsers
    // without PointerEvent support. We'll store the identifier values.
    try {
      for (let i = 0; i < e.touches.length; i++) {
        activeTouchPointers.current.add(e.touches[i].identifier as any as number);
      }
      if (activeTouchPointers.current.size >= 2) {
        // treat as pinch
        finishPointerDrag();
        setIsZooming(true);
        isZoomingRef.current = true;
        try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:zoom_start')); } catch (_) {}
        return;
      }
    } catch (_) { /* ignore */ }
    try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:carousel_drag_start')); } catch (_) {}
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (isZoomingRef.current) return;
    // stop propagation here as well so parent swipe/drag handlers don't run
    e.stopPropagation();
    try { e.nativeEvent?.stopImmediatePropagation?.(); } catch (_) { /* ignore */ }
    if (touchStartX.current == null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
    // apply a slight drag transform for feel
    if (trackRef.current) trackRef.current.style.transform = `translateX(calc(-${index * 100}% + ${touchDeltaX.current}px))`;
  };
  const onTouchEnd = () => {
    // Remove all touch pointers (we can't reliably know which ended here
    // from this handler signature), this keeps activeTouchPointers in sync
    // for the carousel's multi-touch detection.
    try { activeTouchPointers.current.clear(); } catch (_) { /* ignore */ }
    // Note: touchend doesn't provide the React.TouchEvent here, but we can still
    // ensure we clear local state. The touchstart/move already stopped propagation.
    if (touchStartX.current == null) return;
    const delta = touchDeltaX.current;
    const threshold = 40; // px
    // compute a clamped target index so dragging beyond edges snaps back
    let target = index;
    if (delta > threshold) target = Math.max(0, index - 1);
    else if (delta < -threshold) target = Math.min(imageUrls.length - 1, index + 1);
    // update state and ensure the track snaps to the target position immediately
    setIndex(target);
    if (trackRef.current) trackRef.current.style.transform = `translateX(-${target * 100}%)`;
    touchStartX.current = null;
    touchDeltaX.current = 0;
    try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:carousel_drag_end')); } catch (_) {}
  };

  // Prefer Pointer Events where available (covers mouse + touch + pen) and use
  // pointer capture so we continue receiving move/up even if the pointer
  // leaves the element. Fall back to touch handlers on older browsers.
  const pointerSupported = typeof window !== 'undefined' && (window as any).PointerEvent !== undefined;
  const draggingRef = useRef(false);
  // Track active touch pointer ids so we can detect multi-finger gestures
  // (pinch) at the carousel level and avoid starting carousel drags.
  const activeTouchPointers = useRef<Set<number>>(new Set());

  const onPointerDown = (e: React.PointerEvent) => {
    // If a pinch-zoom is active, don't start carousel pointer handling
    if (isZoomingRef.current) return;
    e.stopPropagation();
    try { e.nativeEvent?.stopImmediatePropagation?.(); } catch (_) { /* ignore */ }
    // only primary
    if (e.button !== 0) return;
    // If this is a touch pointer, track active pointers and bail out when
    // multiple touch pointers are present (this indicates a pinch). This
    // prevents starting a carousel drag when the user is beginning a pinch
    // gesture on the image.
    if ((e as any).pointerType === 'touch') {
      try { activeTouchPointers.current.add((e as any).pointerId); } catch (_) { /* ignore */ }
      if (activeTouchPointers.current.size >= 2) {
        // treat as pinch: cancel any active drag and mark zooming so other
        // handlers don't start a drag. We don't change the index here; the
        // ImageZoom component will dispatch 'monolog:zoom_start' shortly.
        finishPointerDrag();
        setIsZooming(true);
        isZoomingRef.current = true;
        try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:zoom_start')); } catch (_) {}
        return;
      }
    }
    touchStartX.current = e.clientX;
    touchDeltaX.current = 0;
    draggingRef.current = true;
  try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:carousel_drag_start')); } catch (_) {}
    // prevent text selection while dragging
    try { document.body.style.userSelect = 'none'; document.body.style.cursor = 'grabbing'; } catch (_) { /* ignore */ }
    const el = trackRef.current as any;
    try { if (el && el.setPointerCapture) el.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    // If multiple touch pointers are active, this is part of a pinch; don't
    // treat it as a carousel pointer move.
    if ((e as any).pointerType === 'touch' && activeTouchPointers.current.size >= 2) return;
    if (!draggingRef.current || touchStartX.current == null) return;
    e.preventDefault();
    touchDeltaX.current = e.clientX - touchStartX.current;
    if (trackRef.current) trackRef.current.style.transform = `translateX(calc(-${index * 100}% + ${touchDeltaX.current}px))`;
  };

  const finishPointerDrag = (clientX?: number) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    // If a pinch/zoom is active, do not change the carousel index when the
    // pointer drag finishes. Changing the index here can cause a jump back
    // to the first slide after releasing a pinch. Instead, simply re-sync
    // the visual transform to the current index and clear drag state.
    if (isZoomingRef.current) {
      try {
        if (trackRef.current) trackRef.current.style.transform = `translateX(-${index * 100}%)`;
      } catch (_) { /* ignore */ }
      touchStartX.current = null;
      touchDeltaX.current = 0;
      try { document.body.style.userSelect = ''; document.body.style.cursor = ''; } catch (_) { /* ignore */ }
      try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:carousel_drag_end')); } catch (_) {}
      return;
    }
    const delta = touchDeltaX.current;
    const threshold = 40;
    let target = index;
    if (delta > threshold) target = Math.max(0, index - 1);
    else if (delta < -threshold) target = Math.min(imageUrls.length - 1, index + 1);
    setIndex(target);
    if (trackRef.current) trackRef.current.style.transform = `translateX(-${target * 100}%)`;
    touchStartX.current = null;
    touchDeltaX.current = 0;
    try { document.body.style.userSelect = ''; document.body.style.cursor = ''; } catch (_) { /* ignore */ }
    try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:carousel_drag_end')); } catch (_) {}
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const el = trackRef.current as any;
    try { if (el && el.releasePointerCapture) el.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    // If this was a touch pointer, remove it from the active set
    if ((e as any).pointerType === 'touch') {
      try { activeTouchPointers.current.delete((e as any).pointerId); } catch (_) { /* ignore */ }
    }
    finishPointerDrag();
  };

  const onPointerCancel = (e: React.PointerEvent) => {
    const el = trackRef.current as any;
    try { if (el && el.releasePointerCapture) el.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    // snap back
    if ((e as any).pointerType === 'touch') {
      try { activeTouchPointers.current.delete((e as any).pointerId); } catch (_) { /* ignore */ }
    }
    finishPointerDrag();
  };

  // Fallback for browsers without PointerEvent: attach document-level mouse listeners
  const handleDocMouseMove = (e: MouseEvent) => {
    if (!draggingRef.current || touchStartX.current == null) return;
    e.preventDefault();
    touchDeltaX.current = e.clientX - touchStartX.current;
    if (trackRef.current) trackRef.current.style.transform = `translateX(calc(-${index * 100}% + ${touchDeltaX.current}px))`;
  };

  const handleDocMouseUp = (e: MouseEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    // If a pinch/zoom is active, don't change the index here.
    if (isZoomingRef.current) {
      try {
        if (trackRef.current) trackRef.current.style.transform = `translateX(-${index * 100}%)`;
      } catch (_) { /* ignore */ }
      touchStartX.current = null;
      touchDeltaX.current = 0;
      try { document.body.style.userSelect = ''; document.body.style.cursor = ''; } catch (_) { /* ignore */ }
      document.removeEventListener('mousemove', handleDocMouseMove);
      document.removeEventListener('mouseup', handleDocMouseUp);
      return;
    }
    const delta = touchDeltaX.current;
    const threshold = 40;
    let target = index;
    if (delta > threshold) target = Math.max(0, index - 1);
    else if (delta < -threshold) target = Math.min(imageUrls.length - 1, index + 1);
    setIndex(target);
    if (trackRef.current) trackRef.current.style.transform = `translateX(-${target * 100}%)`;
    touchStartX.current = null;
    touchDeltaX.current = 0;
    try { document.body.style.userSelect = ''; document.body.style.cursor = ''; } catch (_) { /* ignore */ }
    document.removeEventListener('mousemove', handleDocMouseMove);
    document.removeEventListener('mouseup', handleDocMouseUp);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (isZoomingRef.current) return;
    e.stopPropagation();
    try { e.nativeEvent?.stopImmediatePropagation?.(); } catch (_) { /* ignore */ }
    if (e.button !== 0) return;
    touchStartX.current = e.clientX;
    touchDeltaX.current = 0;
    draggingRef.current = true;
    try { document.body.style.userSelect = 'none'; document.body.style.cursor = 'grabbing'; } catch (_) { /* ignore */ }
    document.addEventListener('mousemove', handleDocMouseMove);
    document.addEventListener('mouseup', handleDocMouseUp);
  };

  // Ensure cleanup on unmount
  useEffect(() => {
    return () => {
      if (draggingRef.current) {
        draggingRef.current = false;
        try { document.body.style.userSelect = ''; document.body.style.cursor = ''; } catch (_) { /* ignore */ }
        document.removeEventListener('mousemove', handleDocMouseMove);
        document.removeEventListener('mouseup', handleDocMouseUp);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Listen for ImageZoom pinch start/end so we can disable carousel dragging while zooming
  useEffect(() => {
    function onZoomStart() {
      // cancel any active drag and prevent new drags
      finishPointerDrag();
      setIsZooming(true);
      isZoomingRef.current = true;
    }
    function onZoomEnd() {
      // Re-enable carousel updates and re-sync the track transform so the
      // carousel stays on the current slide after an ImageZoom ends.
      setIsZooming(false);
      isZoomingRef.current = false;
      try {
        // read the latest index from the ref to avoid stale closures
        if (trackRef.current) trackRef.current.style.transform = `translateX(-${indexRef.current * 100}%)`;
      } catch (_) { /* ignore */ }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('monolog:zoom_start', onZoomStart as EventListener);
      window.addEventListener('monolog:zoom_end', onZoomEnd as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('monolog:zoom_start', onZoomStart as EventListener);
        window.removeEventListener('monolog:zoom_end', onZoomEnd as EventListener);
      }
    };
  }, []);

  // On post pages, disable carousel touch handling to allow app-level swipe navigation
  // If `allowCarouselTouch` is passed (PostView wants inner carousel to handle swipes),
  // enable the handlers even on post pages.
  const carouselTouchProps = (pathname?.startsWith('/post/') && !allowCarouselTouch) ? {} : (
    pointerSupported
      ? { onPointerDown, onPointerMove, onPointerUp, onPointerCancel }
      : { onTouchStart, onTouchMove, onTouchEnd, onMouseDown }
  );

  // double-tap detection state
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<any>(null);
  const dblClickDetectedRef = useRef(false);
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

  const handleMediaClick = (e: React.MouseEvent, postHref: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // If we already detected a double-click in this cycle, ignore subsequent clicks
    if (dblClickDetectedRef.current) return;
    
    // If we're viewing a listing (feed or explore), don't navigate into the
    // single-post page when the media is tapped/clicked. Users expect to
    // interact with posts inline in the feed; double-click still toggles
    // favorites and keyboard handlers remain unchanged.
    const onListing = pathname === '/' || (pathname || '').startsWith('/feed') || (pathname || '').startsWith('/explore');
    if (onListing) return;

    clickCountRef.current += 1;
    
    if (clickCountRef.current === 1) {
      // First click: schedule navigation (reduced to 280ms for snappier feel)
      clickTimerRef.current = setTimeout(() => {
        if (!dblClickDetectedRef.current) {
          try { router.push(postHref); } catch (_) {}
        }
        clickCountRef.current = 0;
        dblClickDetectedRef.current = false;
      }, 280);
    }
  };

  const handleMediaDblClick = (e: React.MouseEvent, postHref: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Mark that double-click was detected
    dblClickDetectedRef.current = true;
    
    // Cancel any pending navigation
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    
    // Reset click count
    clickCountRef.current = 0;
    
    // Toggle favorite (add OR remove) and show visual feedback
    const willAdd = !isFavorite;
    toggleFavoriteWithAuth();
    showFavoriteFeedback(willAdd ? 'adding' : 'removing');
    
    // Reset the double-click flag after a delay
    setTimeout(() => {
      dblClickDetectedRef.current = false;
    }, 400);
  };

  useEffect(() => () => { 
    if (clickTimerRef.current) { try { clearTimeout(clickTimerRef.current); } catch (_) {} }
    if (overlayTimerRef.current) { try { clearTimeout(overlayTimerRef.current); } catch (_) {} }
  }, []);

  // share helper
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
      <div className="card-head">
  <Link className="user-link" href={`/${post.user.username || post.user.id}`} style={{ display: "flex", alignItems: "center", textDecoration: "none", color: "inherit" }}>
          <img className="avatar" src={post.user.avatarUrl} alt={post.user.displayName} />
          <div className="user-line">
            <span className="username">{post.user.displayName}</span>
            <span className="dim">{userLine}</span>
          </div>
        </Link>
  <div style={{ marginLeft: "auto", position: "relative", display: "flex", gap: 8, flexShrink: 0 }}>
              {!isMe ? (
                <>
                  <button
                    ref={followBtnRef}
                    className={`btn follow-btn icon-reveal ${isFollowing ? 'following' : 'not-following'} ${followAnim || ''}`}
                    aria-pressed={isFollowing}
                    onClick={async () => {
                      const cur = await api.getCurrentUser();
                      if (!cur) {
                        try { (document.activeElement as HTMLElement | null)?.blur?.(); } catch (_) {}
                        setShowAuth(true);
                        return;
                      }
                      if (followInFlightRef.current) return;
                      const prev = !!isFollowing;
                      // optimistic UI flip
                      setIsFollowing(!prev);
                      // trigger a small pop animation (use existing CSS animation hooks)
                      const willFollow = !prev;
                      setFollowAnim(willFollow ? 'following-anim' : 'unfollow-anim');
                      try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:follow_changed', { detail: { userId: post.userId, following: !prev } })); } catch (_) {}
                      followInFlightRef.current = true;
                      try {
                        if (!prev) {
                          await api.follow(post.userId);
                        } else {
                          await api.unfollow(post.userId);
                        }
                      } catch (e: any) {
                        // revert on error
                        setIsFollowing(prev);
                        try { toast.show(e?.message || 'Failed to update follow'); } catch (_) {}
                      } finally {
                        followInFlightRef.current = false;
                        // cleanup animation state after it runs
                        setTimeout(() => setFollowAnim(null), 520);
                      }
                    }}
                  >
                    <span className="icon" aria-hidden="true">
                      {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
                    </span>
                    <span className="reveal label">{isFollowing ? 'Following' : 'Follow'}</span>
                  </button>
                  {showAuth ? (
                    <>
                      <div className="auth-dialog-backdrop" onClick={() => setShowAuth(false)} />
                      <div role="dialog" aria-modal="true" aria-label="Sign in or sign up" className="auth-dialog">
                        <AuthForm onClose={() => setShowAuth(false)} />
                      </div>
                    </>
                  ) : null}
                </>
              ) : (
            <>
              {/* Always render the edit button so it remains visible while editing */}
              <button
                className={`btn icon-reveal edit-btn ${editExpanded ? 'expanded' : ''} ${editing ? 'active' : ''} ${editorSaving ? 'saving' : ''}`}
                onClick={async () => {
                  // If not currently editing, reveal label then enter edit mode
                  if (!editing) {
                    setEditExpanded(true);
                    if (editTimerRef.current) { window.clearTimeout(editTimerRef.current); editTimerRef.current = null; }
                    editTimerRef.current = window.setTimeout(() => { setEditExpanded(false); editTimerRef.current = null; }, 3500);
                    setEditing(true);
                    return;
                  }

                  // Already editing: trigger save on the Editor via ref
                  if (editorRef.current?.save) {
                    try {
                      setEditorSaving(true);
                      await editorRef.current.save();
                    } catch (e) {
                      // allow Editor/onSave to surface errors via toast
                    } finally {
                      setEditorSaving(false);
                    }
                  }
                }}
              >
                <span className="icon" aria-hidden="true"><Edit size={16} /></span>
                <span className="reveal label">{editorSaving ? 'Saving…' : 'Edit'}</span>
              </button>
              {/* Inline confirm-on-second-click delete flow (no popover) */}
              <button
                ref={deleteBtnRef}
                className={`btn ghost icon-reveal delete-btn ${isPressingDelete ? "pressing-delete" : ""} ${confirming ? 'confirming' : ''} ${deleteExpanded ? 'expanded' : ''}`}
                onMouseDown={() => setIsPressingDelete(true)}
                onMouseUp={() => setIsPressingDelete(false)}
                onMouseLeave={() => setIsPressingDelete(false)}
                onTouchStart={() => setIsPressingDelete(true)}
                onTouchEnd={() => setIsPressingDelete(false)}
                onClick={async () => {
                  // If already confirming, proceed to delete
                  if (confirming) {
                    try {
                      // optimistic UI: remove element immediately with small animation
                      (document.getElementById(`post-${post.id}`)?.remove?.());
                      // perform delete
                      await api.deletePost(post.id);
                      // If viewing single post page, go home
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
                }}
                aria-pressed={confirming ? 'true' : 'false'}
              >
                <span className="icon" aria-hidden="true"><Trash size={16} /></span>
                <span className="reveal label">{confirming ? 'Confirm' : 'Delete'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="card-media" style={{ position: 'relative' }}>
        {favoriteOverlayState && (
          <div className={`favorite-overlay ${favoriteOverlayState}`} aria-hidden="true">
            ★
          </div>
        )}
        {/* clickable media should navigate to the post page */}
        {(() => {
          const postHref = `/post/${post.user.username || post.userId}-${post.id.slice(0,8)}`;
          return (
            <>
              {imageUrls.length > 1 ? (
                <div className="carousel-wrapper" onKeyDown={(e) => {
                  if (e.key === "ArrowLeft") prev();
                  if (e.key === "ArrowRight") next();
                }} tabIndex={0}>
                  {/* invisible edge areas: hovering these will reveal the nearby arrow control */}
                  <div className="edge-area left" />
                  <div className="edge-area right" />

                  <div className="carousel-track" ref={trackRef} {...carouselTouchProps} role="list" style={{ touchAction: 'pan-y' }}>
                    {imageUrls.map((u: string, idx: number) => (
                      <div className="carousel-slide" key={idx} role="listitem" aria-roledescription="slide" aria-label={`${idx + 1} of ${imageUrls.length}`}>
                        <a
                          href={postHref}
                          className="media-link"
                          draggable={false}
                          onClick={(e) => handleMediaClick(e, postHref)}
                          onDoubleClick={(e) => handleMediaDblClick(e, postHref)}
                          onDragStart={e => e.preventDefault()}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleMediaClick(e as any, postHref); }}
                        >
                          <ImageZoom
                            loading="lazy"
                            src={u}
                            alt={alts[idx] || `Photo ${idx + 1}`}
                            onDoubleTap={(x,y) => {
                              // emulate desktop double-click behavior on touch devices
                              const willAdd = !isFavorite;
                              toggleFavoriteWithAuth();
                              showFavoriteFeedback(willAdd ? 'adding' : 'removing');
                            }}
                            onLoad={e => (e.currentTarget.classList.add("loaded"))}
                            onDragStart={e => e.preventDefault()}
                          />
                        </a>
                      </div>
                    ))}
                  </div>

                  <button className="carousel-arrow left" onClick={prev} aria-label="Previous image">‹</button>
                  <button className="carousel-arrow right" onClick={next} aria-label="Next image">›</button>

                  <div className="carousel-dots" aria-hidden="false">
                    {imageUrls.map((_, i) => (
                      <button key={i} className={`dot ${i === index ? "active" : ""}`} onClick={() => setIndex(i)} aria-label={`Show image ${i + 1}`} />
                    ))}
                  </div>
                </div>
              ) : (
                <a
                  href={postHref}
                  className="media-link"
                  draggable={false}
                  onClick={(e) => handleMediaClick(e, postHref)}
                  onDoubleClick={(e) => handleMediaDblClick(e, postHref)}
                  onDragStart={e => e.preventDefault()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleMediaClick(e as any, postHref); }}
                >
                  <ImageZoom
                    loading="lazy"
                    src={imageUrls[0]}
                    onDoubleTap={(x,y) => {
                      const willAdd = !isFavorite;
                      toggleFavoriteWithAuth();
                      showFavoriteFeedback(willAdd ? 'adding' : 'removing');
                    }}
                    alt={alts[0] || "Photo"}
                    onLoad={e => (e.currentTarget.classList.add("loaded"))}
                  />
                </a>
              )}
            </>
          );
        })()}
      </div>

      <div className="card-body">
        {!editing ? (
          <>
            {post.caption ? <div className="caption">{post.caption}</div> : null}
            <div className="actions">
              <button
                className="action comments-toggle"
                aria-expanded={commentsOpen}
                aria-controls={`comments-${post.id}`}
                onClick={() => {
                  if (!commentsMounted) {
                    // Mount and open in one step
                    setCommentsMounted(true);
                    // Next frame, flip open state so the measured animation runs
                    requestAnimationFrame(() => {
                      setCommentsOpen(true);
                      // Scroll into view after the open transition finishes
                      const onOpenEnd = (ev?: TransitionEvent) => {
                        if (!commentsRef.current) return;
                        if (ev && ev.propertyName !== 'max-height') return;
                        try { commentsRef.current.removeEventListener('transitionend', onOpenEnd as any); } catch (_) {}
                        try { commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (_) {}
                      };
                      commentsRef.current?.addEventListener('transitionend', onOpenEnd as any);
                    });
                  } else {
                    // Toggle open/closed state
                    const willOpen = !commentsOpen;
                    if (!willOpen) {
                      // start collapse animation; when it ends, unmount
                      setCommentsOpen(false);
                      const el = commentsRef.current;
                      if (el) {
                        const onClose = (ev: TransitionEvent) => {
                          // ensure we're responding to the max-height transition
                          if (ev.propertyName !== 'max-height') return;
                          try { el.removeEventListener('transitionend', onClose as any); } catch (_) {}
                          setCommentsMounted(false);
                        };
                        el.addEventListener('transitionend', onClose as any);
                        // also set a fallback timeout in case transitionend doesn't fire
                        setTimeout(() => {
                          try { el.removeEventListener('transitionend', onClose as any); } catch (_) {}
                          setCommentsMounted(false);
                        }, 520);
                      } else {
                        setCommentsMounted(false);
                      }
                    } else {
                      // opening while mounted
                      setCommentsOpen(true);
                      // scroll into view after open completes
                      const el = commentsRef.current;
                      if (el) {
                        const onOpen = (ev?: TransitionEvent) => {
                          if (ev && ev.propertyName !== 'max-height') return;
                          try { el.removeEventListener('transitionend', onOpen as any); } catch (_) {}
                          try { el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (_) {}
                        };
                        el.addEventListener('transitionend', onOpen as any);
                      }
                    }
                  }
                }}
                title="Toggle comments"
                >
                <MessageCircle size={16} />
                <span style={{ marginLeft: 8 }}>{count}</span>
              </button>
                <button
                  className={`action favorite ${isFavorite ? "active" : ""}`}
                  aria-pressed={isFavorite}
                  title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                  onClick={async () => {
                    const cur = await api.getCurrentUser();
                    if (!cur) {
                      try { (document.activeElement as HTMLElement | null)?.blur?.(); } catch (_) {}
                      setShowAuth(true);
                      return;
                    }
                    // optimistic update: flip UI immediately, call API, revert on error
                    const prev = isFavorite;
                    setIsFavorite(!prev);
                    try {
                      if (prev) {
                        await api.unfavoritePost(post.id);
                      } else {
                        await api.favoritePost(post.id);
                      }
                    } catch (e: any) {
                      // revert optimistic change and notify user
                      setIsFavorite(prev);
                      toast.show(e?.message || "Failed to toggle favorite");
                    }
                  }}
                >
                  <StarIcon size={16} aria-hidden="true" />
                </button>
                <button
                  className="action share"
                  title="Share link"
                  aria-label="Share post"
                  onClick={() => { sharePost(); }}
                >
                  <LinkIcon size={16} />
                </button>
            </div>
            {commentsMounted && (
              <div className={`comments ${commentsOpen ? "open" : ""}`} id={`comments-${post.id}`} ref={commentsRef}>
                <div>
                  <Comments postId={post.id} onCountChange={setCount} />
                </div>
              </div>
            )}
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

export const Editor = forwardRef(function Editor({ post, onCancel, onSave }: {
  post: HydratedPost;
  onCancel: () => void;
  onSave: (patch: { caption: string; public: boolean }) => Promise<void>;
}, ref: any) {
  const [caption, setCaption] = useState(post.caption || "");
  const [visibility, setVisibility] = useState(post.public ? "public" : "private");
  const [saving, setSaving] = useState(false);

  const doSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave({ caption, public: visibility === 'public' });
    } finally {
      setSaving(false);
    }
  }, [caption, visibility, onSave, saving]);

  useImperativeHandle(ref, () => ({
    save: doSave,
    cancel: () => onCancel(),
  }), [doSave, onCancel]);

  // Support ESC to cancel while editing
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    if (typeof window !== 'undefined') window.addEventListener('keydown', onKey);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('keydown', onKey); };
  }, [onCancel]);

  return (
    <div className="post-editor">
      <input
        className="edit-caption input"
        type="text"
        placeholder="Tell your story (if you feel like it)"
        aria-label="Edit caption"
        value={caption}
        onChange={e => setCaption(e.target.value)}
        onKeyDown={async (e) => {
          // Enter saves (unless combined with modifier keys). Shift+Enter should allow a newline.
          if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            await doSave();
          }
        }}
      />
      <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
        <span className="dim">Visibility:</span>
        <select
          className="edit-visibility"
          aria-label="Post visibility"
          value={visibility}
          onChange={e => setVisibility(e.target.value)}
        >
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
      </label>
      {/* Save/Cancel are handled by the parent edit button and ESC respectively */}
    </div>
  );
});