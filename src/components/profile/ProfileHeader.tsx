import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getSupabaseClient } from "@/lib/api";
import { compressImage } from "@/lib/image";
import { uid } from "@/lib/id";
import { useToast } from "../Toast";
import { SignOutButton } from "@/components/SignOut";
import Link from "next/link";
import type { User } from "@/lib/types";

interface ProfileHeaderProps {
  user: User;
  currentUserId: string | null;
  isOtherParam: boolean;
  following: boolean | null;
  setFollowing: (following: boolean | null) => void;
  onAvatarChange: () => void;
}

export function ProfileHeader({ user, currentUserId, isOtherParam, following, setFollowing }: ProfileHeaderProps) {
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const toast = useToast();
  const followInFlightRef = useRef(false);

  // Inline edit state (when viewing own profile we allow editing directly in header)
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editProcessing, setEditProcessing] = useState(false);
  const displayNameRef = useRef<HTMLInputElement | null>(null);

  // helper to persist edits and refresh UI
  const saveEdits = async () => {
    const uname = (editUsername || '').trim();
    if (!uname) { toast.show('Username cannot be empty'); return; }

    // Check for reserved route names
    const RESERVED_ROUTES = [
      'about', 'api', 'calendar', 'explore', 'favorites',
      'feed', 'post', 'profile', 'upload', 'admin',
      'settings', 'help', 'terms', 'privacy', 'login',
      'register', 'signup', 'signin', 'logout', 'auth'
    ];

    if (RESERVED_ROUTES.includes(uname.toLowerCase())) {
      toast.show('This username is reserved. Please choose a different one.');
      return;
    }

    // Basic username validation
    if (!/^[a-zA-Z0-9_-]+$/.test(uname)) {
      toast.show('Username can only contain letters, numbers, hyphens, and underscores');
      return;
    }

    if (uname.length < 3 || uname.length > 30) {
      toast.show('Username must be between 3 and 30 characters');
      return;
    }

    const oldUsername = user.username;
    const usernameChanged = oldUsername && uname !== oldUsername;

    setEditProcessing(true);
    try {
      await api.updateCurrentUser({ username: uname, displayName: (editDisplayName || '').trim() || undefined, bio: (editBio || '').trim().slice(0,200) });
      // Refresh will happen via the useUserData hook listening to auth changes
      setIsEditingProfile(false);

      // If username changed and we're on a username route, redirect to new username
      if (usernameChanged && user.username && typeof window !== 'undefined') {
        // Check if current path contains the old username
        const currentPath = window.location.pathname;
        if (currentPath.includes(`/${oldUsername}`)) {
          router.push(`/${user.username}`);
        }
      }
    } catch (e: any) {
      toast.show(e?.message || 'Failed to update profile');
    } finally {
      setEditProcessing(false);
    }
  };

  // handle avatar file selection directly in the profile view so we don't
  // need to open the edit panel just to change avatar
  const handleAvatarChange = async () => {
    const f = avatarInputRef.current?.files?.[0];
    if (!f) return;
    try {
      // reuse compress/upload flow from EditProfile
      const dataUrl = await compressImage(f);
      const parts = dataUrl.split(',');
      const meta = parts[0];
      const mime = meta.split(':')[1].split(';')[0];
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) u8arr[n] = bstr.charCodeAt(n);
      const file = new File([u8arr], `${uid()}.jpg`, { type: mime });

      const sb = getSupabaseClient();
      const userObj = await api.getCurrentUser();
      if (!userObj) throw new Error("Not logged in");
      const path = `avatars/${userObj.id}/${file.name}`;
      const { data: uploadData, error: uploadErr } = await sb.storage.from("posts").upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const urlRes = sb.storage.from("posts").getPublicUrl(path);
      const publicUrl = urlRes.data.publicUrl;
      await api.updateCurrentUser({ avatarUrl: publicUrl });
      // refresh user in UI will happen via useUserData hook
    } catch (e: any) {
      try { toast.show(e?.message || "Failed to upload avatar"); } catch (_) { /* ignore */ }
    }
  };

  return (
    <div className="profile-header toolbar">
      <div className="profile-left" style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center", width: "100%" }}>
        {/* make avatar clickable for the signed-in profile owner to change avatar */}
        {currentUserId && user?.id === currentUserId ? (
          <>
            <button
              className="avatar-button"
              data-tooltip="Change avatar"
              aria-label="Change avatar"
              onClick={() => avatarInputRef.current?.click()}
              type="button"
            >
              <img className="profile-avatar" src={user.avatarUrl} alt={user.displayName} />
            </button>
            <input type="file" accept="image/*" ref={avatarInputRef} style={{ display: 'none' }} onChange={handleAvatarChange} />
          </>
        ) : (
          <img className="profile-avatar" src={user.avatarUrl} alt={user.displayName} />
        )}
        <div style={{ textAlign: "center", minWidth: 0, width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
          {!isEditingProfile ? (
            <>
              <div className="username">{user.displayName}</div>
              <div className="dim">@{user.username} • joined {new Date(user.joinedAt).toLocaleDateString()}</div>
              {user.bio ? <div className="dim profile-bio">{user.bio}</div> : null}
            </>
          ) : (
            // Inline edit form inside header
            <div className="inline-edit-card" style={{ width: '100%', maxWidth: 720 }}>
              <label style={{ display: 'block', marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Display name</div>
                <input ref={displayNameRef} className="input" value={editDisplayName} onChange={e => setEditDisplayName(e.target.value)} />
              </label>
              <label style={{ display: 'block', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Username (used in @handle)</div>
                  {user.usernameChangedAt && (() => {
                    const lastChanged = new Date(user.usernameChangedAt).getTime();
                    const hoursSince = (Date.now() - lastChanged) / (1000 * 60 * 60);
                    if (hoursSince < 24) {
                      const hoursRemaining = Math.ceil(24 - hoursSince);
                      return <div style={{ fontSize: 11, color: 'var(--muted)' }} title="You can only change your username once every 24 hours">🔒 {hoursRemaining}h cooldown</div>;
                    }
                    return null;
                  })()}
                </div>
                <input className="input" value={editUsername} onChange={e => setEditUsername(e.target.value)} />
                {/* Warning about username change cooldown */}
                {editUsername !== user.username && (
                  <div style={{
                    marginTop: 6,
                    padding: '8px 12px',
                    background: 'rgba(255, 165, 0, 0.1)',
                    border: '1px solid rgba(255, 165, 0, 0.3)',
                    borderRadius: 6,
                    fontSize: 12,
                    color: 'var(--text)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8
                  }}>
                    <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
                    <div>
                      <strong>Note:</strong> You can only change your username once every 24 hours. Choose carefully!
                    </div>
                  </div>
                )}
              </label>
              <label className="bio-col" style={{ display: 'block', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Bio</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }} aria-live="polite">{editBio.length}/200</div>
                </div>
                <textarea className="bio-editor" value={editBio} maxLength={200} onChange={e => setEditBio(e.target.value.slice(0,200))} />
              </label>
            </div>
          )}
        </div>
      </div>
      <div className="profile-actions" style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "center", width: "100%", flexWrap: "wrap", marginTop: 8 }}>
        {/* Show owner actions when the signed-in user is viewing their own profile.
            This handles both /profile (no param) and /profile/[id] when the id
            matches the current user. */}
        {currentUserId && user?.id === currentUserId ? (
          <>
            <button
              className="btn icon-reveal edit-profile-btn"
              onClick={async () => {
                // toggle inline edit mode; when entering populate fields
                if (!isEditingProfile) {
                  setEditDisplayName(user.displayName || "");
                  setEditUsername(user.username || "");
                  setEditBio((user.bio || "").slice(0,200));
                  setIsEditingProfile(true);
                  // focus after next paint so input exists
                  requestAnimationFrame(() => { displayNameRef.current?.focus?.(); });
                  return;
                }
                // when closing via the Edit Profile button, auto-save the edits
                await saveEdits();
              }}
              aria-expanded={isEditingProfile}
              type="button"
            >
              <span className="icon" aria-hidden>
                {/* edit/profile icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 20h9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
              <span className="reveal">{isEditingProfile ? 'Close' : 'Edit Profile'}</span>
            </button>
            {/* Save will occur when closing the inline card; no separate Save/Cancel buttons */}
            <Link className="btn primary icon-reveal" href="/upload" aria-label="New Post">
              <span className="icon" aria-hidden>
                {/* camera icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 7h3l2-2h6l2 2h3v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
              <span className="reveal">New Post</span>
            </Link>
            {/* show sign out only when the viewed profile belongs to the signed-in user */}
            {currentUserId && user?.id === currentUserId ? <SignOutButton /> : null}
          </>
        ) : (
          // If the viewer is looking at another user's profile, render follow/unfollow.
          // Note: `following` may be null when we intentionally skipped computing
          // it because the viewed id matched the signed-in user — in that case
          // we won't render this branch because the owner branch executes above.
          <button
            className={`btn icon-reveal follow-btn${following ? ' following' : ''}`}
            aria-pressed={!!following || false}
            onClick={async () => {
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
              // Optimistic update: flip state immediately
              setFollowing(!prev);
              // Dispatch follow change immediately so other UI can respond optimistically
              try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:follow_changed', { detail: { userId: user.id, following: !prev } })); } catch (_) {}

              followInFlightRef.current = true;
              try {
                if (!prev) {
                  await api.follow(user.id);
                } else {
                  await api.unfollow(user.id);
                }
              } catch (e: any) {
                // Revert optimistic change on error and show toast
                setFollowing(prev);
                try { toast.show(e?.message || 'Failed to update follow'); } catch (_) {}
              }
              finally {
                followInFlightRef.current = false;
              }
            }}
          >
            <span className="icon" aria-hidden>
              {/* follow / person icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 20v-1c0-2.2 3.58-4 6-4s6 1.8 6 4v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
            <span className="reveal">{following ? 'Followed' : 'Unfollowed'}</span>
          </button>
        )}
      </div>
    </div>
  );
}