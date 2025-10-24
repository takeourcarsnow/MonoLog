import { useRef, useState, useEffect } from "react";
import { api } from "@/src/lib/api";
import { useToast } from "../Toast";
import { SignOutButton } from "@/app/components/SignOut";
import { DeleteAccountButton } from "@/app/components/DeleteAccount";
import Link from "next/link";
import { User } from "lucide-react";
import { UserPlus, UserCheck } from "lucide-react";
import { BarChart3 } from "lucide-react";
import type { User as UserType } from "@/src/lib/types";

interface ProfileActionsProps {
  user: UserType;
  currentUserId: string | null;
  following: boolean | null;
  setFollowing: (following: boolean | null) => void;
  isEditingProfile: boolean;
  onEditToggle: () => void;
  // callback when follow is clicked but user is not logged in
  onAuthRequired?: () => void;
}

export function ProfileActions({
  user,
  currentUserId,
  following,
  setFollowing,
  isEditingProfile,
  onEditToggle,
  onAuthRequired
}: ProfileActionsProps) {
  const toast = useToast();
  const followInFlightRef = useRef(false);
  const followBtnRef = useRef<HTMLButtonElement | null>(null);
  const [followAnim, setFollowAnim] = useState<'following-anim' | 'unfollow-anim' | null>(null);
  const [displayText, setDisplayText] = useState('Unfollowed');
  const [isAnimating, setIsAnimating] = useState(false);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Typewriter animation effect
  const animateTextChange = (fromText: string, toText: string) => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    let currentText = fromText;
    let currentIndex = fromText.length;
    const typeSpeed = 40; // ms per character - snappier timing
    
    const animate = () => {
      if (currentIndex > 0) {
        // Backspace phase
        currentIndex--;
        currentText = currentText.slice(0, currentIndex);
        setDisplayText(currentText);
        animationTimeoutRef.current = setTimeout(animate, typeSpeed);
      } else {
        // Find common prefix
        let commonLength = 0;
        while (commonLength < toText.length && commonLength < fromText.length && 
               toText[commonLength] === fromText[commonLength]) {
          commonLength++;
        }
        
        // Type new text
        const remainingText = toText.slice(commonLength);
        if (remainingText.length > 0) {
          currentText = toText.slice(0, commonLength + 1);
          setDisplayText(currentText);
          if (currentText.length < toText.length) {
            animationTimeoutRef.current = setTimeout(() => {
              animateTyping(toText, commonLength + 1);
            }, typeSpeed);
          } else {
            setIsAnimating(false);
          }
        } else {
          setIsAnimating(false);
        }
      }
    };
    
    const animateTyping = (targetText: string, startIndex: number) => {
      if (startIndex < targetText.length) {
        const newText = targetText.slice(0, startIndex + 1);
        setDisplayText(newText);
        animationTimeoutRef.current = setTimeout(() => {
          animateTyping(targetText, startIndex + 1);
        }, typeSpeed);
      } else {
        setIsAnimating(false);
      }
    };
    
    animate();
  };

  // Trigger animation when following state changes
  useEffect(() => {
    const targetText = following ? 'Followed' : 'Unfollowed';
    if (!isAnimating) {
      animateTextChange(displayText, targetText);
    }
  }, [following]);

  // Cleanup animation timeout on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  const handleFollowToggle = async () => {
    const cur = await api.getCurrentUser();
    if (!cur) {
      // User is not logged in, show auth form
      onAuthRequired?.();
      return;
    }
    // Defensive: prevent following yourself even if route param matched unexpectedly
    if (cur.id === user.id) return;

    // Prevent duplicate inflight requests
    if (followInFlightRef.current) return;

    // Treat null/undefined as not-following
    const prev = !!following;
    // Optimistic update: flip state immediately so local UI responds fast
    setFollowing(!prev);

    // Add subtle animation
    const willFollow = !prev;
    setFollowAnim(willFollow ? 'following-anim' : 'unfollow-anim');

    followInFlightRef.current = true;
    try {
      if (!prev) {
        await api.follow(user.id);
      } else {
        await api.unfollow(user.id);
      }
      // Only dispatch the global follow_changed event after the
      // server operation succeeds. This avoids other views
      // re-fetching on optimistic-only failures.
      try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:follow_changed', { detail: { userId: user.id, following: !prev } })); } catch (_) {}
    } catch (e: any) {
      // Revert optimistic change on error and show toast
      setFollowing(prev);
      try { toast.show(e?.message || 'Failed to update follow'); } catch (_) {}
    }
    finally {
      followInFlightRef.current = false;
      // Clear animation after a short delay
      setTimeout(() => setFollowAnim(null), 420);
    }
  };

  return (
    <>
      <style>{`
        .profile-actions .btn:hover .icon svg {
          color: lightblue !important;
        }
        .profile-actions .delete-account-btn:hover .icon svg {
          color: red !important;
        }
        .profile-actions .btn:hover {
          background: transparent !important;
        }
        .profile-actions .btn:hover::before {
          display: none !important;
        }
        .delete-account-btn-wrapper {
          margin-top: -2px;
        }
      `}</style>
      {/* Follow button moved outside profile-actions div */}
      {currentUserId && user?.id !== currentUserId ? (
        <button
          ref={followBtnRef}
          className={`btn follow-btn ${following ? 'following' : 'not-following'} expanded ${followAnim || ''}`}
          aria-pressed={!!following || false}
          onClick={handleFollowToggle}
        >
          <span className="icon" aria-hidden="true">
            {following ? <UserCheck size={18} /> : <UserPlus size={18} />}
          </span>
          <span className="reveal label">{displayText}</span>
        </button>
      ) : null}
      <div className="profile-actions" style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", width: "100%", flexWrap: "wrap", marginTop: 12 }}>
        {/* Show owner actions when the signed-in user is viewing their own profile.
            This handles both /profile (no param) and /profile/[id] when the id
            matches the current user. */}
        {currentUserId && user?.id === currentUserId ? (
          <>
            <Link className="btn icon following-link no-effects" href="/profile/following" aria-label="Following">
              <span className="icon" aria-hidden>
                <User size={18} strokeWidth={1.2} />
              </span>
            </Link>
            <Link className="btn icon week-review-link no-effects" href="/week-review" aria-label="Week in Review">
              <span className="icon" aria-hidden>
                <BarChart3 size={18} strokeWidth={1.2} />
              </span>
            </Link>
            <button
              className={`${isEditingProfile ? 'btn bg-green-50 border-green-500 text-green-700 edit-confirm-glow' : 'btn edit-profile-btn no-effects'}`}
              onClick={(e) => { onEditToggle(); (e.target as HTMLButtonElement).blur(); }}
              aria-expanded={isEditingProfile}
              aria-label={isEditingProfile ? 'Save profile changes' : 'Edit profile'}
              type="button"
            >
              <span className="icon" aria-hidden>
                {isEditingProfile ? (
                  // save icon
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ) : (
                  // edit/profile icon
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 20h9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                )}
              </span>
            </button>
            {/* New Post button removed from profile actions */}
            {/* show sign out only when the viewed profile belongs to the signed-in user */}
            {currentUserId && user?.id === currentUserId ? <SignOutButton /> : null}
            {/* show delete account only when the viewed profile belongs to the signed-in user */}
            {currentUserId && user?.id === currentUserId ? <DeleteAccountButton isEditing={isEditingProfile} /> : null}
          </>
        ) : null}
      </div>
    </>
  );
}
