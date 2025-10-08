import { useRef } from "react";
import { api } from "@/src/lib/api";
import { useToast } from "../Toast";
import { SignOutButton } from "@/app/components/SignOut";
import Link from "next/link";
import { ViewToggle } from "@/app/components/ViewToggle";
import type { User } from "@/src/lib/types";

interface ProfileActionsProps {
  user: User;
  currentUserId: string | null;
  following: boolean | null;
  setFollowing: (following: boolean | null) => void;
  isEditingProfile: boolean;
  onEditToggle: () => void;
  // optional view state for toggling grid/list in profile
  view?: "list" | "grid";
  setView?: (v: "list" | "grid") => void;
}

export function ProfileActions({
  user,
  currentUserId,
  following,
  setFollowing,
  isEditingProfile,
  onEditToggle,
  view,
  setView
}: ProfileActionsProps) {
  const toast = useToast();
  const followInFlightRef = useRef(false);

  const handleFollowToggle = async () => {
    const cur = await api.getCurrentUser();
    if (!cur) {
      // This should be handled by the parent component
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
      // Revert optimistic change on error and show toast
      setFollowing(prev);
      try { toast.show(e?.message || 'Failed to update follow'); } catch (_) {}
    }
    finally {
      followInFlightRef.current = false;
    }
  };

  return (
    <div className="profile-actions" style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "center", width: "100%", flexWrap: "wrap", marginTop: 8 }}>
      {/* Optional view toggle (grid / list) - parent can pass view & setView props */}
      {setView ? (
        <ViewToggle
          title={<strong>Posts</strong>}
          subtitle="Toggle posts layout"
          selected={view || "grid"}
          onSelect={(v) => setView(v)}
        />
      ) : null}
      {/* Show owner actions when the signed-in user is viewing their own profile.
          This handles both /profile (no param) and /profile/[id] when the id
          matches the current user. */}
      {currentUserId && user?.id === currentUserId ? (
        <>
          <Link className="btn" href="/profile/following" aria-label="Following">
            <span className="icon" aria-hidden>
              {/* people icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 20v-1c0-2.2 3.58-4 6-4s6 1.8 6 4v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
            <span>Following</span>
          </Link>
          <button
            className="btn edit-profile-btn"
            onClick={onEditToggle}
            aria-expanded={isEditingProfile}
            type="button"
          >
            <span className="icon" aria-hidden>
              {/* edit/profile icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 20h9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
            <span>{isEditingProfile ? 'Close' : 'Edit Profile'}</span>
          </button>
          {/* New Post button removed from profile actions */}
          {/* show sign out only when the viewed profile belongs to the signed-in user */}
          {currentUserId && user?.id === currentUserId ? <SignOutButton /> : null}
        </>
      ) : (
        // If the viewer is looking at another user's profile, render follow/unfollow.
        // Note: `following` may be null when we intentionally skipped computing
        // it because the viewed id matched the signed-in user — in that case
        // we won't render this branch because the owner branch executes above.
        <button
          className={`btn profile-follow-btn${following ? ' following' : ''}`}
          aria-pressed={!!following || false}
          onClick={handleFollowToggle}
        >
          <span className="icon" aria-hidden>
            {/* follow / person icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 20v-1c0-2.2 3.58-4 6-4s6 1.8 6 4v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </span>
          <span>{following ? 'Followed' : 'Unfollowed'}</span>
        </button>
      )}
    </div>
  );
}
