import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from "react";
import type { FormEvent } from 'react';
import { useRouter } from "next/navigation";
import { Twitter, Instagram, Github, Linkedin, Globe } from "lucide-react";
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
  const twitterRef = useRef<HTMLInputElement | null>(null);

    const [editDisplayName, setEditDisplayName] = useState("");
    const [editUsername, setEditUsername] = useState("");
    const [editBio, setEditBio] = useState("");
    const [editTwitter, setEditTwitter] = useState("");
    const [editInstagram, setEditInstagram] = useState("");
    const [editGithub, setEditGithub] = useState("");
    const [editLinkedin, setEditLinkedin] = useState("");
    const [editWebsite, setEditWebsite] = useState("");
    const [editProcessing, setEditProcessing] = useState(false);

    const saveEdits = async (e?: React.FormEvent) => {
      e?.preventDefault?.();
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
        const socialLinks: Record<string, string | undefined> = {};
        if (editTwitter.trim()) socialLinks.twitter = editTwitter.trim();
        if (editInstagram.trim()) socialLinks.instagram = editInstagram.trim();
        if (editGithub.trim()) socialLinks.github = editGithub.trim();
        if (editLinkedin.trim()) socialLinks.linkedin = editLinkedin.trim();
        if (editWebsite.trim()) socialLinks.website = editWebsite.trim();

  // Normalize social links: send null when the user cleared all social fields
  const socialLinksNormalized = Object.keys(socialLinks).length ? socialLinks : null;
  const payload = { username: uname, displayName: (editDisplayName || '').trim() || undefined, bio: (editBio || '').trim().slice(0,200), socialLinks: socialLinksNormalized } as any;
  console.log('socialLinks', socialLinks, 'normalized', socialLinksNormalized, 'payload', payload);
  await api.updateCurrentUser(payload as Partial<User>);
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
        setEditTwitter(user.socialLinks?.twitter || "");
        setEditInstagram(user.socialLinks?.instagram || "");
        setEditGithub(user.socialLinks?.github || "");
        setEditLinkedin(user.socialLinks?.linkedin || "");
        setEditWebsite(user.socialLinks?.website || "");
        setIsEditingProfile(true);
        // focus after next paint so input exists
        requestAnimationFrame(() => { displayNameRef.current?.focus?.(); });
        return;
      }
      // when already editing, cancel/close without saving
      setIsEditingProfile(false);
    };

    // close social collapsible on Escape for accessibility
    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          // No longer needed since social links are always visible
        }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, []);

    // focus the first social input when the drawer opens
    useEffect(() => {
      // No longer needed since social links are always visible
    }, []);

    useImperativeHandle(ref, () => ({ toggleEdit }));

    if (!isEditingProfile) {
      return (
        <>
          <div className="username">{user.displayName}</div>
          <div className="dim">@{user.username}</div>
          <div className="dim">joined {new Date(user.joinedAt).toLocaleDateString()}</div>
          {user.bio ? <div className="dim profile-bio">{user.bio}</div> : null}
        </>
      );
    }

    return (
      <form className="inline-edit-card" style={{ width: '100%', maxWidth: 720 }} onSubmit={(e: FormEvent) => saveEdits(e)}>
        <label className="label-group">
          <div className="muted-label sr-only">Display name</div>
          <input ref={displayNameRef} className="input" placeholder="Display name" value={editDisplayName} onChange={e => setEditDisplayName(e.target.value)} />
        </label>

        <label className="label-group">
          <div className="muted-label sr-only">Username (used in @handle)</div>
          <div className="input-container">
            <input className="input" placeholder="Username (used in @handle)" value={editUsername} onChange={e => setEditUsername(e.target.value)} />
            {user.usernameChangedAt && (() => {
              const lastChanged = new Date(user.usernameChangedAt).getTime();
              const hoursSince = (Date.now() - lastChanged) / (1000 * 60 * 60);
              if (hoursSince < 24) {
                const hoursRemaining = Math.ceil(24 - hoursSince);
                return <div className="input-indicator" title="You can only change your username once every 24 hours">🔒 {hoursRemaining}h</div>;
              }
              return null;
            })()}
          </div>
        </label>

        <label className="bio-col label-group">
          <div className="muted-label sr-only">Bio</div>
          <div className="bio-editor-container">
            <textarea className="bio-editor" placeholder="Tell people about yourself (max 200 chars)" value={editBio} maxLength={200} onChange={e => setEditBio(e.target.value.slice(0,200))} aria-label="Profile bio" />
            <div className="bio-char-count" aria-live="polite">{editBio.length}/200</div>
          </div>
        </label>

        {/* Social links section - always visible */}
        <div className="social-drawer" role="region">
          <div style={{ display: 'grid', gap: 8 }}>
            <label className="label-group">
              <div className="muted-label sr-only">Twitter (@ or full url)</div>
              <div className="input-container">
                <input className="input" placeholder="@username or full url" value={editTwitter} onChange={e => setEditTwitter(e.target.value)} />
                <Twitter size={16} className="input-icon" />
              </div>
            </label>
            <label className="label-group">
              <div className="muted-label sr-only">Instagram (@ or full url)</div>
              <div className="input-container">
                <input className="input" placeholder="@username or full url" value={editInstagram} onChange={e => setEditInstagram(e.target.value)} />
                <Instagram size={16} className="input-icon" />
              </div>
            </label>
            <label className="label-group">
              <div className="muted-label sr-only">GitHub (username or url)</div>
              <div className="input-container">
                <input className="input" placeholder="username or full url" value={editGithub} onChange={e => setEditGithub(e.target.value)} />
                <Github size={16} className="input-icon" />
              </div>
            </label>
            <label className="label-group">
              <div className="muted-label sr-only">LinkedIn (handle or url)</div>
              <div className="input-container">
                <input className="input" placeholder="handle or full url" value={editLinkedin} onChange={e => setEditLinkedin(e.target.value)} />
                <Linkedin size={16} className="input-icon" />
              </div>
            </label>
            <label className="label-group">
              <div className="muted-label sr-only">Website (full url or domain)</div>
              <div className="input-container">
                <input className="input" placeholder="full url or domain" value={editWebsite} onChange={e => setEditWebsite(e.target.value)} />
                <Globe size={16} className="input-icon" />
              </div>
            </label>
          </div>
        </div>

        <div className="edit-actions" role="group" aria-label="Edit profile actions">
          <button type="button" className="btn secondary cancel-btn" onClick={() => setIsEditingProfile(false)} disabled={editProcessing}>Cancel</button>
          <button type="submit" className="btn primary" disabled={editProcessing}>{editProcessing ? 'Saving…' : 'Save changes'}</button>
        </div>
      </form>
    );
  }
);
ProfileEditForm.displayName = 'ProfileEditForm';
