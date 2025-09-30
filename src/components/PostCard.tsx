/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { HydratedPost } from "@/lib/types";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/date";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Comments } from "./Comments";
import ImageZoom from "./ImageZoom";
import { AuthForm } from "./AuthForm";
import { useToast } from "./Toast";

export function PostCard({ post: initial, allowCarouselTouch }: { post: HydratedPost; allowCarouselTouch?: boolean }) {
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
  const [showAuth, setShowAuth] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteBtnRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const [isPressingDelete, setIsPressingDelete] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Close the anchored confirm when clicking outside or pressing Escape
  useEffect(() => {
    if (!showDeleteConfirm) return;
    function onDoc(e: MouseEvent) {
      const target = e.target as Node | null;
      if (popRef.current && !popRef.current.contains(target) && deleteBtnRef.current && !deleteBtnRef.current.contains(target)) {
        setShowDeleteConfirm(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowDeleteConfirm(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [showDeleteConfirm]);

  useEffect(() => {
    (async () => {
      const cur = await api.getCurrentUser();
      setIsMe(cur?.id === post.userId);
      if (cur?.id !== post.userId) {
        setIsFollowing(await api.isFollowing(post.userId));
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

  const lock = post.public ? "" : "🔒";

  const toast = useToast();

  const userLine = useMemo(() => {
    return `@${post.user.username} • ${formatRelative(post.createdAt)} ${lock}`;
  }, [post.user.username, post.createdAt, lock]);

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
  const trackRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);

  useEffect(() => {
    // clamp index when images change
    if (index >= imageUrls.length) setIndex(Math.max(0, imageUrls.length - 1));
  }, [imageUrls.length, index]);

  useEffect(() => {
    if (!trackRef.current) return;
    trackRef.current.style.transform = `translateX(-${index * 100}%)`;
  }, [index]);

  const prev = () => setIndex(i => (i <= 0 ? 0 : i - 1));
  const next = () => setIndex(i => (i >= imageUrls.length - 1 ? imageUrls.length - 1 : i + 1));

  const onTouchStart = (e: React.TouchEvent) => {
    // prevent the touch from bubbling up to parent swipers
    e.stopPropagation();
    try { e.nativeEvent?.stopImmediatePropagation?.(); } catch (_) { /* ignore */ }
    try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:carousel_drag_start')); } catch (_) {}
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    // stop propagation here as well so parent swipe/drag handlers don't run
    e.stopPropagation();
    try { e.nativeEvent?.stopImmediatePropagation?.(); } catch (_) { /* ignore */ }
    if (touchStartX.current == null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
    // apply a slight drag transform for feel
    if (trackRef.current) trackRef.current.style.transform = `translateX(calc(-${index * 100}% + ${touchDeltaX.current}px))`;
  };
  const onTouchEnd = () => {
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

  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    try { e.nativeEvent?.stopImmediatePropagation?.(); } catch (_) { /* ignore */ }
    // only primary
    if (e.button !== 0) return;
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
    if (!draggingRef.current || touchStartX.current == null) return;
    e.preventDefault();
    touchDeltaX.current = e.clientX - touchStartX.current;
    if (trackRef.current) trackRef.current.style.transform = `translateX(calc(-${index * 100}% + ${touchDeltaX.current}px))`;
  };

  const finishPointerDrag = (clientX?: number) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
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
    finishPointerDrag();
  };

  const onPointerCancel = (e: React.PointerEvent) => {
    const el = trackRef.current as any;
    try { if (el && el.releasePointerCapture) el.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    // snap back
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
  }, []);

  // On post pages, disable carousel touch handling to allow app-level swipe navigation
  // If `allowCarouselTouch` is passed (PostView wants inner carousel to handle swipes),
  // enable the handlers even on post pages.
  const carouselTouchProps = (pathname?.startsWith('/post/') && !allowCarouselTouch) ? {} : (
    pointerSupported
      ? { onPointerDown, onPointerMove, onPointerUp, onPointerCancel }
      : { onTouchStart, onTouchMove, onTouchEnd, onMouseDown }
  );

  return (
    <article className="card">
      <div className="card-head">
  <Link className="user-link" href={`/profile/${post.user.username || post.user.id}`} style={{ display: "flex", alignItems: "center", textDecoration: "none", color: "inherit" }}>
          <img className="avatar" src={post.user.avatarUrl} alt={post.user.displayName} />
          <div className="user-line">
            <span className="username">{post.user.displayName}</span>
            <span className="dim">{userLine}</span>
          </div>
        </Link>
  <div style={{ marginLeft: "auto", position: "relative" }}>
              {!isMe ? (
                <>
                  <button
                    className="btn follow-btn"
                    aria-pressed={isFollowing}
                    onClick={async () => {
                      const cur = await api.getCurrentUser();
                      if (!cur) {
                        try { (document.activeElement as HTMLElement | null)?.blur?.(); } catch (_) {}
                        setShowAuth(true);
                        return;
                      }
                      if (!isFollowing) {
                        await api.follow(post.userId);
                        setIsFollowing(true);
                        try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:follow_changed', { detail: { userId: post.userId, following: true } })); } catch (e) { /* ignore */ }
                      } else {
                        await api.unfollow(post.userId);
                        setIsFollowing(false);
                        try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:follow_changed', { detail: { userId: post.userId, following: false } })); } catch (e) { /* ignore */ }
                      }
                    }}
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                  {showAuth ? (
                    <>
                      <div onClick={() => setShowAuth(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                      <div role="dialog" aria-modal="true" aria-label="Sign in or sign up" style={{ position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)", zIndex: 50, background: "var(--bg)", padding: 16, borderRadius: 8 }}>
                        <AuthForm onClose={() => setShowAuth(false)} />
                      </div>
                    </>
                  ) : null}
                </>
          ) : (
            <>
              {!editing && (
                <button className="btn" onClick={() => setEditing(true)}>Edit</button>
              )}
              <button
                ref={deleteBtnRef}
                className={`btn ghost ${isPressingDelete ? "pressing-delete" : ""}`}
                onMouseDown={() => setIsPressingDelete(true)}
                onMouseUp={() => setIsPressingDelete(false)}
                onMouseLeave={() => setIsPressingDelete(false)}
                onTouchStart={() => setIsPressingDelete(true)}
                onTouchEnd={() => setIsPressingDelete(false)}
                onClick={() => setShowDeleteConfirm(true)}
                aria-haspopup="dialog"
                aria-expanded={showDeleteConfirm}
              >
                Delete
              </button>
                  {showDeleteConfirm && (
                <div ref={popRef} className="confirm-popover" role="dialog" aria-label="Confirm delete" aria-modal={true}>
                  <div className="confirm-popover-arrow" aria-hidden="true" />
                  <div className="confirm-popover-body">
                    <div className="confirm-message">Delete this post? This cannot be undone.</div>
                    <div className="confirm-actions">
                      <button
                        className="btn danger"
                        onClick={async () => {
                          try {
                            await api.deletePost(post.id);
                            setShowDeleteConfirm(false);
                            // If viewing single post page, go back to the main feed (home)
                            if (pathname.startsWith("/post/")) {
                              // send user to the home page rather than back to the deleted post
                              router.push("/");
                            }
                            // Let parent remove it from list; here we just hide
                            (document.getElementById(`post-${post.id}`)?.remove?.());
                          } catch (e: any) {
                            setShowDeleteConfirm(false);
                            toast.show(e?.message || "Failed to delete post");
                          }
                        }}
                      >
                        Delete
                      </button>
                      <button className="btn ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="card-media">
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
                        <Link href={postHref} className="media-link">
                          <ImageZoom
                            loading="lazy"
                            src={u}
                            alt={alts[idx] || `Photo ${idx + 1}`}
                            onLoad={e => (e.currentTarget.classList.add("loaded"))}
                            onDragStart={e => e.preventDefault()}
                          />
                        </Link>
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
                <Link href={postHref} className="media-link">
                  <ImageZoom
                    loading="lazy"
                    src={imageUrls[0]}
                    alt={alts[0] || "Photo"}
                    onLoad={e => (e.currentTarget.classList.add("loaded"))}
                  />
                </Link>
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
                  // If not mounted, mount and animate open
                  if (!commentsMounted) {
                    setCommentsMounted(true);

                    // Wait for the element to be mounted and painted, then trigger the measured-height open animation
                    if (typeof window !== "undefined") {
                      requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                          const el = commentsRef.current;
                          if (!el) return;
                          const node = el as HTMLDivElement;
                          // ensure starting styles
                          node.style.maxHeight = '0px';
                          node.style.opacity = '0';
                          node.style.transform = 'translateY(-6px)';
                          // force layout
                          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                          node.offsetHeight;
                          const h = node.scrollHeight;
                          // set the open class so aria and css reflect the open state
                          setCommentsOpen(true);
                          // then set measured max-height to trigger the transition (CSS handles duration)
                          node.style.maxHeight = h + 'px';
                          node.style.opacity = '1';
                          node.style.transform = 'translateY(0)';

                          function onEnd(e: TransitionEvent) {
                            if (e.propertyName !== 'max-height') return;
                            node.style.maxHeight = '';
                            node.removeEventListener('transitionend', onEnd as any);
                          }
                          node.addEventListener('transitionend', onEnd as any);
                        });
                      });
                    } else {
                      // fallback
                      setTimeout(() => setCommentsOpen(true), 8);
                    }
                  } else {
                    // Closing: set aria state, then animate to 0 and unmount on finish
                    setCommentsOpen(false);
                    const el = commentsRef.current;
                    if (!el) {
                      setCommentsMounted(false);
                      return;
                    }
                    const node = el as HTMLDivElement;
                    // set current height then animate to 0
                    node.style.maxHeight = node.scrollHeight + 'px';
                    // force layout
                    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                    node.offsetHeight;
                    node.style.maxHeight = '0px';
                    node.style.opacity = '0';
                    node.style.transform = 'translateY(-6px)';

                    function onEnd(e: TransitionEvent) {
                      if (e.propertyName !== 'max-height') return;
                      node.removeEventListener('transitionend', onEnd as any);
                      // cleanup
                      node.style.maxHeight = '';
                      setCommentsMounted(false);
                    }
                    node.addEventListener('transitionend', onEnd as any);
                  }
                }}
                title="Toggle comments"
              >
                💬 {count}
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
                  <span className="star" aria-hidden="true">{isFavorite ? "★" : "☆"}</span>
                </button>
            </div>
            {commentsMounted && (
              <div className={`comments ${commentsOpen ? "open" : ""}`} id={`comments-${post.id}`} ref={commentsRef}>
                <Comments postId={post.id} onCountChange={setCount} />
              </div>
            )}
          </>
        ) : (
          <Editor
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

function Editor({ post, onCancel, onSave }: {
  post: HydratedPost;
  onCancel: () => void;
  onSave: (patch: { caption: string; public: boolean }) => Promise<void>;
}) {
  const [caption, setCaption] = useState(post.caption || "");
  const [visibility, setVisibility] = useState(post.public ? "public" : "private");
  const [saving, setSaving] = useState(false);

  return (
    <div className="post-editor">
      <input
        className="edit-caption input"
        type="text"
  placeholder="Tell your story (if you feel like it)"
  aria-label="Edit caption"
        value={caption}
        onChange={e => setCaption(e.target.value)}
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
      <div style={{ marginTop: 8 }}>
        <button
          className="btn save"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            await onSave({ caption, public: visibility === "public" });
            setSaving(false);
          }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button className="btn ghost cancel" onClick={onCancel} style={{ marginLeft: 8 }}>Cancel</button>
      </div>
    </div>
  );
}