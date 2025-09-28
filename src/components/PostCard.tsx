"use client";

import { useEffect, useMemo, useState } from "react";
import type { HydratedPost } from "@/lib/types";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/date";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Comments } from "./Comments";

export function PostCard({ post: initial }: { post: HydratedPost }) {
  const [post, setPost] = useState<HydratedPost>(initial);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [count, setCount] = useState<number>(initial.commentsCount || 0);
  const [isMe, setIsMe] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [editing, setEditing] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    (async () => {
      const cur = await api.getCurrentUser();
      setIsMe(cur?.id === post.userId);
      if (cur?.id !== post.userId) {
        setIsFollowing(await api.isFollowing(post.userId));
      }
    })();
  }, [post.userId]);

  const lock = post.public ? "" : "🔒";

  const userLine = useMemo(() => {
    return `@${post.user.username} • ${formatRelative(post.createdAt)} ${lock}`;
  }, [post]);

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
            <button
              className="btn"
              aria-pressed={isFollowing}
              onClick={async () => {
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
                    alert(e?.message || "Failed to delete post");
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
        <img
          loading="lazy"
          src={post.imageUrl}
          alt={post.alt || "Photo"}
          onLoad={e => (e.currentTarget.classList.add("loaded"))}
        />
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
                alert(e?.message || "Failed to update post");
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