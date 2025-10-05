import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/api";
import { useToast } from "../Toast";
import type { User } from "@/src/lib/types";

interface ProfileEditFormProps {
  user: User;
  isEditingProfile: boolean;
  setIsEditingProfile: (editing: boolean) => void;
}

export interface ProfileEditFormRef {
  toggleEdit: () => void;
}

export const ProfileEditForm = forwardRef<ProfileEditFormRef, ProfileEditFormProps>(
  ({ user, isEditingProfile, setIsEditingProfile }, ref) => {
    const router = useRouter();
    const toast = useToast();
    const displayNameRef = useRef<HTMLInputElement | null>(null);

    const [editDisplayName, setEditDisplayName] = useState("");
    const [editUsername, setEditUsername] = useState("");
    const [editBio, setEditBio] = useState("");
    const [editProcessing, setEditProcessing] = useState(false);

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
        // Notify any listeners and revalidate app-router data so the UI updates
        try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('auth:changed')); } catch (_) {}
        try { router.refresh?.(); } catch (_) {}

        setIsEditingProfile(false);

        // If username changed and we're on a username route, redirect to new username
        if (usernameChanged && oldUsername && typeof window !== 'undefined') {
          // Check if current path contains the old username
          const currentPath = window.location.pathname;
          if (currentPath.includes(`/${oldUsername}`)) {
            // use the new username value (uname) for redirect
            router.push(`/${uname}`);
          }
        }
      } catch (e: any) {
        toast.show(e?.message || 'Failed to update profile');
      } finally {
        setEditProcessing(false);
      }
    };

    const toggleEdit = async () => {
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
    };

    useImperativeHandle(ref, () => ({
      toggleEdit,
    }));

    if (!isEditingProfile) {
      return (
        <>
          <div className="username">{user.displayName}</div>
          <div className="dim">@{user.username} • joined {new Date(user.joinedAt).toLocaleDateString()}</div>
          {user.bio ? <div className="dim profile-bio">{user.bio}</div> : null}
        </>
      );
    }

    return (
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
    );
  }
);

ProfileEditForm.displayName = 'ProfileEditForm';
