/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { HydratedPost } from "@/lib/types";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/date";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Comments } from "./Comments";
import { AuthForm } from "./AuthForm";
import { useToast } from "./Toast";

export function PostCard({ post: initial }: { post: HydratedPost }) {
  const [post, setPost] = useState<HydratedPost>(initial);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [count, setCount] = useState<number>(initial.commentsCount || 0);
  const [isMe, setIsMe] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [editing, setEditing] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

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

  // Carousel state for multi-image posts
  const [index, setIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);

  useEffect(() => {
    // clamp index when images change
    if (index >= imageUrls.length) setIndex(Math.max(0, imageUrls.length - 1));
  }, [imageUrls.length]);

  useEffect(() => {
    if (!trackRef.current) return;
    trackRef.current.style.transform = `translateX(-${index * 100}%)`;
  }, [index]);

  const prev = () => setIndex(i => (i <= 0 ? 0 : i - 1));
  const next = () => setIndex(i => (i >= imageUrls.length - 1 ? imageUrls.length - 1 : i + 1));

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
    // apply a slight drag transform for feel
    if (trackRef.current) trackRef.current.style.transform = `translateX(calc(-${index * 100}% + ${touchDeltaX.current}px))`;
  };
  const onTouchEnd = () => {
    if (touchStartX.current == null) return;
    const delta = touchDeltaX.current;
    const threshold = 40; // px
    if (delta > threshold) prev();
    else if (delta < -threshold) next();
    else {
      // snap back
      if (trackRef.current) trackRef.current.style.transform = `translateX(-${index * 100}%)`;
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
  };

  return (
    <article className="card">
      <div className="card-head">
        <Link className="user-link" href={`/profile/${post.user.id}`} style={{ display: "flex", alignItems: "center", textDecoration: "none", color: "inherit" }}>
          <img className="avatar" src={post.user.avatarUrl} alt={post.user.displayName} />
          <div className="user-line">
            <span className="username">{post.user.displayName}</span>
            <span className="dim">{userLine}</span>
          </div>
        </Link>
        <div style={{ marginLeft: "auto" }}>
              {!isMe ? (
                <>
                  <button
                    className="btn"
                    aria-pressed={isFollowing}
                    onClick={async () => {
                      const cur = await api.getCurrentUser();
                      if (!cur) {
                        // prompt sign in / sign up
                        setShowAuth(true);
                        return;
                      }
                      if (await api.isFollowing(post.userId)) {
                        await api.unfollow(post.userId);
                        setIsFollowing(false);
                      } else {
                        await api.follow(post.userId);
                        setIsFollowing(true);
                      }
                    }}
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                  {showAuth ? (
                    <>
                      <div onClick={() => setShowAuth(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                      <div style={{ position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)", zIndex: 50, background: "var(--bg)", padding: 16, borderRadius: 8 }}>
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
                className="btn ghost"
                onClick={async () => {
                  if (!confirm("Delete this post? This cannot be undone.")) return;
                  try {
                    await api.deletePost(post.id);
                    // If viewing single post page, go back to profile
                    if (pathname.startsWith("/post/")) router.push("/profile");
                    // Let parent remove it from list; here we just hide
                    (document.getElementById(`post-${post.id}`)?.remove?.());
                  } catch (e: any) {
                    toast.show(e?.message || "Failed to delete post");
                  }
                }}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="card-media">
        {imageUrls.length > 1 ? (
          <div className="carousel-wrapper" onKeyDown={(e) => {
            if (e.key === "ArrowLeft") prev();
            if (e.key === "ArrowRight") next();
          }} tabIndex={0}>
            {/* invisible edge areas: hovering these will reveal the nearby arrow control */}
            <div className="edge-area left" />
            <div className="edge-area right" />

            <div className="carousel-track" ref={trackRef} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} role="list">
              {imageUrls.map((u: string, idx: number) => (
                <div className="carousel-slide" key={idx} role="listitem" aria-roledescription="slide" aria-label={`${idx + 1} of ${imageUrls.length}`}>
                  <img
                    loading="lazy"
                    src={u}
                    alt={alts[idx] || `Photo ${idx + 1}`}
                    onLoad={e => (e.currentTarget.classList.add("loaded"))}
                  />
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
          <img
            loading="lazy"
            src={imageUrls[0]}
            alt={alts[0] || "Photo"}
            onLoad={e => (e.currentTarget.classList.add("loaded"))}
          />
        )}
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
                onClick={() => setCommentsOpen(v => !v)}
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
                      setShowAuth(true);
                      return;
                    }
                    try {
                      if (await api.isFavorite(post.id)) {
                        await api.unfavoritePost(post.id);
                        setIsFavorite(false);
                      } else {
                        await api.favoritePost(post.id);
                        setIsFavorite(true);
                      }
                    } catch (e: any) {
                      toast.show(e?.message || "Failed to toggle favorite");
                    }
                  }}
                >
                  {isFavorite ? "★" : "☆"}
                </button>
            </div>
            {commentsOpen && (
              <div className="comments" id={`comments-${post.id}`}>
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
        placeholder="Caption (optional)"
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