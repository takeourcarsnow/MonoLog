import { useRef, useState } from "react";
import { api } from "@/lib/api";
import { SignOutButton } from "@/app/components/auth/SignOut";
import Link from "next/link";
import { User } from "lucide-react";
import { UserPlus, UserCheck } from "lucide-react";
import { BarChart3 } from "lucide-react";
import { Bell } from "lucide-react";
import { Star } from "lucide-react";
import { Edit } from "lucide-react";
import type { User as UserType } from "@/lib/types";

interface ProfileActionsProps {
  user: UserType;
  currentUserId: string | null;
  following: boolean | null;
  setFollowing: (following: boolean | null) => void;
  isEditingProfile: boolean;
  setIsEditingProfile: (editing: boolean) => void;
  onEditProfile: () => void;
  // callback when follow is clicked but user is not logged in
  onAuthRequired?: () => void;
  showInvites: boolean;
  setShowInvites: (show: boolean) => void;
}

export function ProfileActions({
  user,
  currentUserId,
  following,
  setFollowing,
  isEditingProfile,
  setIsEditingProfile,
  onEditProfile,
  onAuthRequired,
  showInvites,
  setShowInvites
}: ProfileActionsProps) {
  const followInFlightRef = useRef(false);

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
      // Revert optimistic change on error
      setFollowing(prev);
      console.warn(e?.message || 'Failed to update follow');
    }
    finally {
      followInFlightRef.current = false;
    }
  };

  return (
    <>
      <style>{`
        .profile-actions .btn:hover .icon svg {
          color: var(--primary) !important;
        }
        .profile-actions .delete-account-btn:hover .icon svg {
          color: red !important;
        }
        .profile-actions .signout-btn:hover .icon svg {
          color: red !important;
        }
        .profile-actions .signout-btn.confirm .icon svg {
          color: white !important;
        }
        .profile-actions .btn:not(.signout-btn):hover {
          background: transparent !important;
        }
        .profile-actions .btn:hover::before {
          display: none !important;
        }
        .delete-account-btn-wrapper {
          margin-top: -2px;
        }
      `}</style>
      {/* Simple follow button */}
      {currentUserId && user?.id !== currentUserId ? (
        <div style={{ margin: '8px 0' }}>
          <button
            onClick={handleFollowToggle}
            style={{
              padding: '8px 12px',
              border: '1px solid #555',
              borderRadius: '4px',
              background: following ? '#333' : '#222',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            aria-label={following ? "Unfollow" : "Follow"}
            title={following ? "Unfollow" : "Follow"}
            type="button"
          >
            {following ? <UserCheck size={14} /> : <UserPlus size={14} />}
            <span>{following ? 'Following' : 'Follow'}</span>
          </button>
        </div>
      ) : null}
      <div className="profile-actions" style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", width: "100%", flexWrap: "wrap", marginTop: 12 }}>
        {/* Show owner actions when the signed-in user is viewing their own profile.
            This handles both /profile (no param) and /profile/[id] when the id
            matches the current user. */}
        {currentUserId && user?.id === currentUserId ? (
          <>
            <button
              className="btn icon edit-profile-btn no-effects"
              onClick={onEditProfile}
              aria-label="Edit profile"
              title="Edit profile"
              type="button"
            >
              <span className="icon" aria-hidden>
                <Edit size={18} strokeWidth={2} />
              </span>
            </button>
            <Link className="btn icon following-link no-effects" href="/profile/following" aria-label="Following" title="View following list">
              <span className="icon" aria-hidden>
                <User size={18} strokeWidth={2} />
              </span>
            </Link>
            <Link className="btn icon week-review-link no-effects" href="/week-review" aria-label="Week in Review" title="View week in review">
              <span className="icon" aria-hidden>
                <BarChart3 size={18} strokeWidth={2} />
              </span>
            </Link>
            <Link className="btn icon favorites-link no-effects" href="/favorites" aria-label="Favorites" title="View favorites">
              <span className="icon" aria-hidden>
                <Star size={18} strokeWidth={2} />
              </span>
            </Link>

            <button
              className={`btn icon invite-btn ${showInvites ? 'bg-blue-50 border-blue-500 text-blue-700' : 'no-effects'}`}
              onClick={() => setShowInvites(!showInvites)}
              aria-expanded={showInvites}
              aria-label="Invite friends"
              title="Invite friends"
              type="button"
            >
              <span className="icon" aria-hidden>
                <UserPlus size={18} strokeWidth={2} />
              </span>
            </button>
            {/* New Post button removed from profile actions */}
            {/* show sign out only when the viewed profile belongs to the signed-in user */}
            {currentUserId && user?.id === currentUserId ? <SignOutButton /> : null}
            {/* show delete account only when the viewed profile belongs to the signed-in user */}
          </>
        ) : null}
      </div>
    </>
  );
}
