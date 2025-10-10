import { memo, useRef, useState, useEffect } from "react";
import type { HydratedPost } from "@/src/lib/types";
import { api } from "@/src/lib/api";
import { formatRelative } from "@/src/lib/date";
import Link from "next/link";
import Image from "next/image";
import { OptimizedImage } from "@/app/components/OptimizedImage";
import { Lock, UserPlus, UserCheck, Edit, Trash } from "lucide-react";
import { AuthForm } from "../AuthForm";
import { useToast } from "../Toast";

interface UserHeaderProps {
  post: HydratedPost;
  isMe: boolean;
  authLoading: boolean;
  isFollowing: boolean;
  setIsFollowing: (value: boolean) => void;
  showAuth: boolean;
  setShowAuth: (value: boolean) => void;
  editing: boolean;
  setEditing: (value: boolean) => void;
  editExpanded: boolean;
  setEditExpanded: (value: boolean) => void;
  editTimerRef: React.MutableRefObject<number | null>;
  editorSaving: boolean;
  deleteExpanded: boolean;
  setDeleteExpanded: (value: boolean) => void;
  showConfirmText: boolean;
  deleteExpandTimerRef: React.MutableRefObject<number | null>;
  isPressingDelete: boolean;
  setIsPressingDelete: (value: boolean) => void;
  overlayEnabled: boolean;
  setOverlayEnabled: (value: boolean) => void;
  deleteBtnRef: React.RefObject<HTMLButtonElement>;
  deleteHandlerRef: React.MutableRefObject<(() => void) | null>;
  editorRef?: React.MutableRefObject<{ save?: () => Promise<void>; cancel?: () => void } | null>;
  editorOpeningRef?: React.MutableRefObject<boolean | null>;
  followBtnRef: React.RefObject<HTMLButtonElement>;
  followAnim: 'following-anim' | 'unfollow-anim' | null;
  setFollowAnim: (value: 'following-anim' | 'unfollow-anim' | null) => void;
  followExpanded: boolean;
  setFollowExpanded: (value: boolean) => void;
  followExpandTimerRef: React.MutableRefObject<number | null>;
  followAnimTimerRef: React.MutableRefObject<number | null>;
  followInFlightRef: React.MutableRefObject<boolean>;
  toast: ReturnType<typeof useToast>;
}

export const UserHeader = memo(function UserHeader({
  post,
  isMe,
  authLoading,
  isFollowing,
  setIsFollowing,
  showAuth,
  setShowAuth,
  editing,
  setEditing,
  editExpanded,
  setEditExpanded,
  editTimerRef,
  editorSaving,
  deleteExpanded,
  setDeleteExpanded,
  showConfirmText,
  deleteExpandTimerRef,
  isPressingDelete,
  setIsPressingDelete,
  overlayEnabled,
  setOverlayEnabled,
  deleteBtnRef,
  deleteHandlerRef,
  followBtnRef,
  followAnim,
  setFollowAnim,
  followExpanded,
  setFollowExpanded,
  followExpandTimerRef,
  followAnimTimerRef,
  followInFlightRef,
  editorRef,
  editorOpeningRef,
  toast,
}: UserHeaderProps) {
  const editClickLockRef = useRef<number | null>(null);
  const lockIcon = post.public ? null : <Lock size={14} strokeWidth={2} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} />;
  const userLine = (
    <>
      {formatRelative(post.createdAt)} {lockIcon}
    </>
  );

  return (
    <div className="card-head">
      <Link className="user-link" href={`/${post.user.username || post.user.id}`} style={{ display: "flex", alignItems: "center", textDecoration: "none", color: "inherit" }}>
  <OptimizedImage className="avatar" src={post.user.avatarUrl || "/logo.svg"} alt={post.user.username} width={30} height={30} loading="lazy" sizes="30px" />
        <div className="user-line">
          <span className="username">@{post.user.username} <span className="dim">{userLine}</span></span>
        </div>
      </Link>
      <div style={{ marginLeft: "auto", position: "relative", display: "flex", gap: 8, flexShrink: 0 }}>
        {!authLoading && (
          <>
            {!isMe ? (
              <>
                <button
                  ref={followBtnRef}
                  className={`btn follow-btn icon-reveal ${isFollowing ? 'following' : 'not-following'} ${followAnim || ''} ${followExpanded ? 'expanded' : ''}`}
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
                    setIsFollowing(!prev);
                    setFollowExpanded(true);
                    if (followExpandTimerRef.current) { window.clearTimeout(followExpandTimerRef.current); followExpandTimerRef.current = null; }
                    followExpandTimerRef.current = window.setTimeout(() => { setFollowExpanded(false); followExpandTimerRef.current = null; }, 2000);
                    const willFollow = !prev;
                    setFollowAnim(willFollow ? 'following-anim' : 'unfollow-anim');
                    followInFlightRef.current = true;
                    try {
                      if (!prev) {
                        await api.follow(post.userId);
                      } else {
                        await api.unfollow(post.userId);
                      }
                      // Dispatch confirmed change after success so other views can
                      // refresh reliably.
                      try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:follow_changed', { detail: { userId: post.userId, following: !prev } })); } catch (_) {}
                    } catch (e: any) {
                      setIsFollowing(prev);
                      try { toast.show(e?.message || 'Failed to update follow'); } catch (_) {}
                    } finally {
                      followInFlightRef.current = false;
                      setTimeout(() => setFollowAnim(null), 520);
                    }
                  }}
                >
                  <span className="icon" aria-hidden="true">
                    {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
                  </span>
                  <span className="reveal label">{isFollowing ? 'Followed' : 'Unfollowed'}</span>
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
                <button
                  className={`btn icon-reveal edit-btn ${editExpanded ? 'expanded' : ''} ${editing ? 'active' : ''} ${editorSaving ? 'saving' : ''}`}
                  onClick={async (e) => {
                    // Guard against rapid double-clicks that can immediately trigger the
                    // save branch right after opening. If a click occurred very recently,
                    // ignore this one.
                    const now = Date.now();
                    const LOCK_MS = 400;
                    if (editClickLockRef.current && (now - editClickLockRef.current) < LOCK_MS) {
                      try { e.preventDefault(); e.stopPropagation(); } catch (_) {}
                      return;
                    }

                    if (!editing) {
                      // Record click time so a follow-up click is ignored briefly
                      editClickLockRef.current = now;
                      setTimeout(() => { editClickLockRef.current = null; }, LOCK_MS);

                      setEditExpanded(true);
                      if (editTimerRef.current) { window.clearTimeout(editTimerRef.current); editTimerRef.current = null; }
                      editTimerRef.current = window.setTimeout(() => { setEditExpanded(false); editTimerRef.current = null; }, 3500);
                      // set editing
                      setEditing(true);
                      return;
                    }

                    // When already editing, try to save via editorRef (if provided)
                    try {
                      // If the editor is still opening, ignore the save click to avoid
                      // triggering an immediate close via the save path.
                      if (editorOpeningRef && editorOpeningRef.current) {
                        // save ignored while opening
                        return;
                      }
                      if (editorRef && editorRef.current && typeof editorRef.current.save === 'function') {
                        // invoking editorRef.save()
                        await editorRef.current.save();
                      }
                    } catch (e) {
                      // ignore — parent hook will show toast on failure
                    }
                  }}
                >
                  <span className="icon" aria-hidden="true"><Edit size={16} /></span>
                  <span className="reveal label">{editorSaving ? 'Saving…' : 'Edit'}</span>
                </button>
                <div className={`btn ghost icon-reveal delete-btn ${isPressingDelete ? "pressing-delete" : ""} ${deleteExpanded ? 'confirming expanded' : ''}`} style={{ position: 'relative' }}>
                  <div aria-hidden="true">
                    <span className="icon"><Trash size={16} /></span>
                    <span className="reveal label">{showConfirmText ? 'Confirm' : 'Delete'}</span>
                  </div>
                  {overlayEnabled && (
                    <div
                      ref={deleteBtnRef as any}
                      style={{ position: 'absolute', inset: 0, cursor: 'pointer', background: 'transparent', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                      onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => { try { e.preventDefault(); } catch (_) {} setIsPressingDelete(true); }}
                      onMouseUp={() => setIsPressingDelete(false)}
                      onMouseLeave={() => setIsPressingDelete(false)}
                      onTouchStart={() => { setIsPressingDelete(true); }}
                      onTouchEnd={() => setIsPressingDelete(false)}
                      onClick={() => {
                        try { setIsPressingDelete(false); } catch (_) {}
                        try { setOverlayEnabled(false); } catch (_) {}
                        try { setTimeout(() => { setOverlayEnabled(true); }, 220); } catch (_) {}
                        deleteHandlerRef.current && deleteHandlerRef.current();
                      }}
                    />
                  )}
                  <button
                    aria-label={showConfirmText ? 'Confirm delete' : 'Delete post'}
                    onClick={() => { deleteHandlerRef.current && deleteHandlerRef.current(); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); deleteHandlerRef.current && deleteHandlerRef.current(); } }}
                    style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}
                  />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
});
