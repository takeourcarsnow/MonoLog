"use client";

import { memo, useRef, useState } from "react";
import { preloadOverlayThumbnails } from "../imageEditor/overlaysPreload";
import type { HydratedPost } from "@/lib/types";
import { api } from "@/lib/api";
import Link from "next/link";
import { OptimizedImage } from "@/app/components/media/OptimizedImage";
import { UserPlus, UserCheck, Edit, Pencil, Trash, X, MapPin, Cloud, Sun, CloudRain, CloudSnow, CloudLightning, CloudDrizzle } from "lucide-react";
import ToggleActionButton from "@/app/components/ui/ToggleActionButton";
import { AuthForm } from "@/app/components/auth/AuthForm";
import { usePathname, useRouter } from "next/navigation";
import TimeDisplay from "@/app/components/ui/TimeDisplay";

function getWeatherIcon(condition: string) {
  const lower = condition.toLowerCase();
  if (lower.includes('clear') || lower.includes('sunny')) return Sun;
  if (lower.includes('rain') || lower.includes('shower')) return CloudRain;
  if (lower.includes('snow') || lower.includes('freezing')) return CloudSnow;
  if (lower.includes('thunder') || lower.includes('storm')) return CloudLightning;
  if (lower.includes('drizzle')) return CloudDrizzle;
  if (lower.includes('fog') || lower.includes('overcast') || lower.includes('cloud')) return Cloud;
  return Cloud; // default
}

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
  const [showMeta, setShowMeta] = useState(true);

  const handleToggle = (showingFull: boolean) => {
    setShowFullDate(showingFull);
    if (showingFull) {
      setShowMeta(false);
    } else {
      setShowMeta(false);
      setTimeout(() => setShowMeta(true), 150);
    }
  };

  return (
    <div className="card-head">
      <div className="user-and-meta">
        <Link className="user-link" href={`/${post.user.username || post.user.id}`}>
          <OptimizedImage className="avatar" src={(post.user.avatarUrl || "").trim() || "/logo.svg"} alt={post.user.username} width={30} height={30} loading="lazy" sizes="30px" />
          <span className="username">@{post.user.username}</span>
        </Link>
        <div className="user-meta">
          <TimeDisplay date={post.createdAt} className="post-date dim" onToggle={handleToggle} />
          {showMeta && (
            <>
              {post.locationAddress && (
                <Link href={`/search?q=${encodeURIComponent(post.locationAddress.split(',')[0]?.trim() || post.locationAddress)}`} className="location-meta" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <MapPin size={12} style={{ marginRight: '4px' }} />
                  {(() => {
                    const city = post.locationAddress?.split(',')[0]?.trim();
                    return city || post.locationAddress;
                  })()}
                </Link>
              )}
              {post.weatherTemperature !== undefined && (
                <span className="weather-meta">
                  {(() => {
                    const IconComponent = getWeatherIcon(post.weatherCondition || '');
                    return <IconComponent size={12} style={{ marginRight: '4px' }} />;
                  })()}
                  {Math.round(post.weatherTemperature)}°C
                </span>
              )}
            </>
          )}
        </div>
      </div>
      <div className={`post-actions ${isMe ? 'is-me' : ''}`}>
        {!authLoading && (
          <>
            {!isMe ? (
              <>
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
                  activeIcon={<UserCheck size={14} />}
                  inactiveIcon={<UserPlus size={14} />}
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
            ) : (
              <div>
                <button
                  className={`btn edit-btn ${editorSaving ? 'saving' : ''}`}
                  onClick={() => setEditing(!editing)}
                  title="Edit post"
                >
                  {editing ? <X size={14} /> : <Pencil size={14} />}
                </button>
                <button className="btn delete-btn" style={{ color: deleteExpanded ? 'red' : undefined }} onClick={handleDeleteActivation} title={deleteExpanded ? "Confirm delete" : "Delete post"}>
                  <Trash size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});
