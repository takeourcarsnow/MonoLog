import { memo, useRef, useState, useEffect } from "react";
import { preloadOverlayThumbnails } from "../imageEditor/overlaysPreload";
import type { HydratedPost } from "@/lib/types";
import { api } from "@/lib/api";
import Link from "next/link";
import { OptimizedImage } from "@/app/components/media/OptimizedImage";
import { UserPlus, UserCheck, Edit, Pencil, Trash, X, MapPin, Clock, Cloud, Sun, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, Moon } from "lucide-react";
import ToggleActionButton from "@/app/components/ui/ToggleActionButton";
import { AuthForm } from "@/app/components/auth/AuthForm";
import { usePathname, useRouter } from "next/navigation";
import TimeDisplay from "@/app/components/ui/TimeDisplay";
import { getWeatherIcon } from "@/lib/weatherIcons";
import { PublicStoryViewerModal } from "../profile/PublicStoryViewerModal";

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
  const [showMeta, setShowMeta] = useState(true);
  const [hasStories, setHasStories] = useState(false);
  const [stories, setStories] = useState<any[]>([]);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [storyIdx, setStoryIdx] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const userStories = await api.getActiveStoriesForUser(post.user.id);
        if (mounted) {
          setHasStories(userStories.length > 0);
          setStories(userStories);
        }
      } catch (_) {
        if (mounted) {
          setHasStories(false);
          setStories([]);
        }
      }
    })();
    return () => { mounted = false; };
  }, [post.user.id]);

  // Auto advance stories
  useEffect(() => {
    if (!storyViewerOpen || !stories.length) return;
    const cur = stories[storyIdx];
    if (cur) api.markStoryViewed(cur.id).catch(() => {});
    const dur = cur?.mediaType === 'video' ? Math.min(Math.max(cur.durationSeconds || 6, 3), 15) : 6;
    const t = setTimeout(() => {
      setStoryIdx(v => (v + 1) >= stories.length ? 0 : v + 1); // loop
    }, dur * 1000);
    return () => clearTimeout(t);
  }, [storyViewerOpen, storyIdx, stories]);

  useEffect(() => {
    if (!storyViewerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setStoryViewerOpen(false);
      else if (e.key === 'ArrowLeft') setStoryIdx(v => v === 0 ? stories.length - 1 : v - 1);
      else if (e.key === 'ArrowRight') setStoryIdx(v => (v + 1) % stories.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [storyViewerOpen, storyIdx, stories.length]);

  // Prevent body scroll and scroll to top when viewer opens
  useEffect(() => {
    if (storyViewerOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('story-modal-open');
      window.scrollTo(0, 0);
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('story-modal-open');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('story-modal-open');
    };
  }, [storyViewerOpen]);

  // Small helper: if the text inside the header (location / weather) is
  // too wide for the available space, enable a continuous horizontal
  // auto-scroll. We implement a tiny local component to measure the
  // content and duplicate it when scrolling is needed so the animation
  // appears continuous.
  function ScrollIfTruncated({ children, className }: { children: React.ReactNode; className?: string }) {
    const wrapRef = useRef<HTMLSpanElement | null>(null);
    const trackRef = useRef<HTMLDivElement | null>(null);
    const [shouldScroll, setShouldScroll] = useState(false);

    useEffect(() => {
      const wrap = wrapRef.current;
      const track = trackRef.current;
      if (!wrap || !track) return;

      const prefersReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let anim: Animation | null = null;

      const check = () => {
        const need = track.scrollWidth > wrap.clientWidth + 2;
        setShouldScroll(!prefersReduced && need);

        // toggle a class on the wrapper so CSS can show/hide fade masks
        try { wrap.classList.toggle('is-scrolling', !prefersReduced && need); } catch (_) {}

        if (!prefersReduced && need) {
          // amount to translate left so the trailing edge becomes visible
          const overflow = track.scrollWidth - wrap.clientWidth;
          // pick a duration proportional to overflow (ms) with a sensible minimum
          const durMs = Math.max(3000, Math.round(overflow * 28));

          // cancel any previous animation
          try { anim?.cancel(); } catch (_) {}

          // Use the Web Animations API to animate a ping-pong (alternate)
          // between 0 and -overflow, so the track moves left then back right.
          anim = (track as any).animate(
            [ { transform: 'translateX(0px)' }, { transform: `translateX(-${overflow}px)` } ],
            { duration: durMs, iterations: Infinity, direction: 'alternate', easing: 'linear' }
          );
        } else {
          try { anim?.cancel(); } catch (_) {}
          anim = null;
          track.style.transform = '';
          try { wrap.classList.remove('is-scrolling'); } catch (_) {}
        }
      };

      check();

      const ro = new ResizeObserver(check);
      ro.observe(wrap);
      ro.observe(track);
      window.addEventListener('resize', check);
      return () => { ro.disconnect(); window.removeEventListener('resize', check); try { anim?.cancel(); } catch (_) {} };
    }, []);

    return (
      <span ref={wrapRef} className={`auto-scroll-container ${className || ''}`} style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'middle', minWidth: 0 }}>
        <div ref={trackRef} className="auto-scroll-inner" style={{ display: 'inline-block', whiteSpace: 'nowrap', minWidth: '100%' }}>
          <span style={{ display: 'inline-block' }}>{children}</span>
        </div>
      </span>
    );
  }

  // previously toggled meta visibility when full date was shown on click.
  // TimeDisplay now shows full date on hover (tooltip) so no toggle handler is needed.

  return (
    <div className="card-head">
      <div className="user-and-meta">
        <div className="user-link">
          <div
            className="avatar-container"
            onClick={() => {
              if (hasStories) {
                setStoryViewerOpen(true);
                setStoryIdx(0);
              } else {
                router.push(`/${post.user.username || post.user.id}`);
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <OptimizedImage className={`avatar ${hasStories ? 'has-stories' : ''}`} src={(post.user.avatarUrl || "").trim() || "/logo.svg"} alt={post.user.username} width={30} height={30} loading="lazy" sizes="30px" style={{ borderRadius: '50%', objectFit: 'cover' }} />
          </div>
          <Link className="username-link" href={`/${post.user.username || post.user.id}`}>
            <span className="username">@{post.user.username}</span>
          </Link>
        </div>
        {/* render the date outside the link so toggling the full date doesn't
            trigger navigation to the user's page. Wrap in .date-wrap so we
            can show a subtle fade when it reaches the username. */}
        <span className="date-wrap">
          <Clock size={12} className="dim" aria-hidden="true" style={{ marginRight: 6 }} />
          <TimeDisplay date={post.createdAt} className="post-date dim" />
        </span>
        <div className="user-meta">
          {showMeta && (
            <>
              {(post.locationAddress?.trim() || post.weatherTemperature !== undefined) && (
                <ScrollIfTruncated className="meta-combined">
                  {post.locationAddress && (
                    <Link href={`/search?q=${encodeURIComponent(post.locationAddress.split(',')[0]?.trim() || post.locationAddress)}`} className="location-meta" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                      <MapPin size={12} className="dim" style={{ marginRight: '4px' }} />
                      <span className="location-text dim">{(() => {
                        const city = post.locationAddress?.split(',')[0]?.trim();
                        return city || post.locationAddress;
                      })()}</span>
                    </Link>
                  )}
                  {post.weatherTemperature !== undefined && (
                    <span className="weather-meta" style={{ display: 'inline-flex', alignItems: 'center', marginLeft: post.locationAddress ? '8px' : undefined }}>
                      {(() => {
                        const IconComponent = getWeatherIcon(post.weatherCondition || '', new Date(post.createdAt));
                        return <IconComponent size={12} className="dim" style={{ marginRight: '4px' }} />;
                      })()}
                      <span className="weather-text dim">{Math.round(post.weatherTemperature)}°C</span>
                    </span>
                  )}
                </ScrollIfTruncated>
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
                        console.log('DEBUG UserHeader: following userId', post.userId);
                        await api.follow(post.userId);
                      } else {
                        console.log('DEBUG UserHeader: unfollowing userId', post.userId);
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
      {storyViewerOpen && stories.length > 0 && (
        <PublicStoryViewerModal
          isOpen={storyViewerOpen}
          onClose={() => setStoryViewerOpen(false)}
          stories={stories}
          currentIndex={storyIdx}
          onPrev={() => setStoryIdx(v => v === 0 ? stories.length - 1 : v - 1)}
          onNext={() => {
            if (storyIdx + 1 >= stories.length) {
              setStoryViewerOpen(false);
            } else {
              setStoryIdx(v => v + 1);
            }
          }}
          user={post.user}
        />
      )}
    </div>
  );
});
