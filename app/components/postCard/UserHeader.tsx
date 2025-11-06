"use client";

import { memo, useRef, useState, useEffect } from "react";
import { preloadOverlayThumbnails } from "../imageEditor/overlaysPreload";
import type { HydratedPost } from "@/lib/types";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/date";
import Link from "next/link";
import Image from "next/image";
import { OptimizedImage } from "@/app/components/media/OptimizedImage";
import { Lock, UserPlus, UserCheck, Edit, Pencil, Trash, Cloud, MapPin, Sun, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, Moon, X } from "lucide-react";
import ToggleActionButton from "@/app/components/ui/ToggleActionButton";
import { AuthForm } from "@/app/components/auth/AuthForm";
import AutoScroll from "../AutoScroll";
import { usePathname, useRouter } from "next/navigation";
import { getWeatherIcon } from "@/lib/weatherIcons";

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
  editorSaving: boolean;
  deleteExpanded: boolean;
  setDeleteExpanded: (value: boolean) => void;
  showConfirmText: boolean;
  deleteExpandTimerRef: React.MutableRefObject<number | null>;
  followBtnRef: React.RefObject<HTMLButtonElement | null>;
  followAnim: 'following-anim' | 'unfollow-anim' | null;
  setFollowAnim: (value: 'following-anim' | 'unfollow-anim' | null) => void;
  followExpanded: boolean;
  setFollowExpanded: (value: boolean) => void;
  followExpandTimerRef: React.MutableRefObject<number | null>;
  followAnimTimerRef: React.MutableRefObject<number | null>;
  followInFlightRef: React.MutableRefObject<boolean>;
  handleDeleteActivation: () => void;
  editorRef?: React.MutableRefObject<{ save?: () => Promise<void>; cancel?: () => void } | null>;
  editorOpeningRef?: React.MutableRefObject<boolean | null>;
  toast?: unknown; // deprecated
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
  editorSaving,
  deleteExpanded,
  setDeleteExpanded,
  showConfirmText,
  deleteExpandTimerRef,
  followBtnRef,
  followAnim,
  setFollowAnim,
  followExpanded,
  setFollowExpanded,
  followExpandTimerRef,
  followAnimTimerRef,
  followInFlightRef,
  handleDeleteActivation,
  editorRef,
  editorOpeningRef,
  toast: _toast,
}: UserHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showFullDate, setShowFullDate] = useState(false);
  const [currentText, setCurrentText] = useState(formatRelative(post.createdAt));
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    setOpacity(0);
    const timer = setTimeout(() => {
      setCurrentText(showFullDate ? new Date(post.createdAt).toLocaleDateString() : formatRelative(post.createdAt));
      setOpacity(1);
    }, 150);
    return () => clearTimeout(timer);
  }, [showFullDate, post.createdAt]);

  const IconComponent = getWeatherIcon(post.weatherCondition || '', new Date(post.createdAt));
  const lockIcon = post.public ? null : <Lock size={14} strokeWidth={2} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} />;
  const userLine = (
    <span
      className="post-date"
      onClick={() => setShowFullDate(!showFullDate)}
      style={{ cursor: 'pointer', opacity, transition: 'opacity 0.3s ease-in-out' }}
      title={showFullDate ? 'Click to show relative time' : 'Click to show full date'}
    >
      {currentText}
    </span>
  );

  return (
    <div className="card-head">
      <div className="user-meta">
        <Link className="user-link" href={`/${post.user.username || post.user.id}`}>
          <OptimizedImage className="avatar" src={(post.user.avatarUrl || "").trim() || "/logo.svg"} alt={post.user.username} width={30} height={30} loading="lazy" sizes="30px" />
          <div className="user-line">
            <span className="username" style={{ whiteSpace: 'nowrap' }}>@{post.user.username}</span>
          </div>
        </Link>
        <span className="dim">{userLine} {lockIcon}</span>
        {(post.weatherCondition || post.weatherTemperature || post.weatherLocation || post.locationAddress) && (
          <div className="post-meta dim">
            <AutoScroll innerStyle={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
              {post.locationAddress && (
                <Link href={`/search?q=${encodeURIComponent(post.locationAddress)}`} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 13, textDecoration: 'none', color: 'inherit' }}>
                  <MapPin size={14} aria-hidden />
                  <span style={{ display: 'inline-block' }}>{post.locationAddress.split(',')[0]?.trim()}</span>
                </Link>
              )}
              {/* explicit spacer between location and temperature so copies and
                  duplicate-track scenarios always have a visible gap */}
              {post.weatherTemperature !== undefined && post.weatherLocation && (
                <span className="auto-scroll-spacer" aria-hidden />
              )}
              {post.weatherTemperature !== undefined && (
                <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                  <IconComponent size={14} aria-hidden />
                  <span style={{ display: 'inline-block' }}>{Math.round(post.weatherTemperature)}°C</span>
                </span>
              )}
            </AutoScroll>
          </div>
        )}
      </div>
      <div className={`post-actions ${isMe ? 'is-me' : ''}`} style={{ marginLeft: "auto", position: "relative", flexShrink: 0, alignItems: "center" }}>
        {!authLoading && (
          <>
            {!isMe ? (
              <>
                <>
                  {/* follow/unfollow: use ToggleActionButton to DRY icon + reveal label */}
                  <ToggleActionButton
                    ref={followBtnRef as any}
                    className={`btn follow-btn icon-reveal ${isFollowing ? 'following' : 'not-following'} ${followAnim || ''} ${followExpanded ? 'expanded' : ''}`}
                    active={isFollowing}
                    pending={!!followInFlightRef.current}
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
                        try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:follow_changed', { detail: { userId: post.userId, following: !prev } })); } catch (_) {}
                      } catch (e: any) {
                        setIsFollowing(prev);
                        console.warn(e?.message || 'Failed to update follow');
                      } finally {
                        followInFlightRef.current = false;
                        setTimeout(() => setFollowAnim(null), 520);
                      }
                    }}
                    activeIcon={<UserCheck size={16} />}
                    inactiveIcon={<UserPlus size={16} />}
                    ariaActiveLabel="Unfollow"
                    ariaInactiveLabel="Follow"
                    titleActive="Unfollow"
                    titleInactive="Follow"
                    revealLabel={isFollowing ? 'Followed' : 'Unfollowed'}
                  />
                  {showAuth ? (
                    <>
                      <div className="auth-dialog-backdrop" onClick={() => setShowAuth(false)} />
                      <div role="dialog" aria-modal="true" aria-label="Sign in or sign up" className="auth-dialog">
                        <AuthForm onClose={() => setShowAuth(false)} />
                      </div>
                    </>
                  ) : null}
                </>
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
              <div style={{ display: 'flex', gap: 0 }}>
                <button
                  className={`btn edit-btn ${editorSaving ? 'saving' : ''}`}
                  onClick={() => setEditing(!editing)}
                  title="Edit post"
                >
                  <Pencil size={16} />
                </button>
                <button className="btn delete-btn" style={{ color: deleteExpanded ? 'red' : undefined }} onClick={handleDeleteActivation} title={deleteExpanded ? "Confirm delete" : "Delete post"}>
                  <Trash size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});
