import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from "react";
import type { FormEvent } from 'react';
import { useRouter } from "next/navigation";
import { Twitter, Instagram, Github, Facebook, Globe } from "lucide-react";
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
    const usernameRef = useRef<HTMLInputElement | null>(null);
  const twitterRef = useRef<HTMLInputElement | null>(null);

    const [editDisplayName, setEditDisplayName] = useState("");
    const [editUsername, setEditUsername] = useState("");
    const [editBio, setEditBio] = useState("");
    const [editTwitter, setEditTwitter] = useState("");
    const [editInstagram, setEditInstagram] = useState("");
  const [editGithub, setEditGithub] = useState("");
  const [editFacebook, setEditFacebook] = useState("");
    const [editWebsite, setEditWebsite] = useState("");
    const [editProcessing, setEditProcessing] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [animateIn, setAnimateIn] = useState(false);

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
        if (editFacebook.trim()) socialLinks.facebook = editFacebook.trim();
        if (editWebsite.trim()) socialLinks.website = editWebsite.trim();

        // Normalize social links: send null when the user cleared all social fields
        const socialLinksNormalized = Object.keys(socialLinks).length ? socialLinks : null;

  // Normalize displayName: send null when the user cleared the field so the
  // server can set the DB column to NULL. Previously we sent `undefined`
  // which caused the key to be omitted from the PATCH body and the old
  // display name remained.
  const displayNameNormalized = (editDisplayName || '').trim() === '' ? null : (editDisplayName || '').trim();
  // Debug: log the payload we're about to send
  try { console.log('[ProfileEditForm] outgoing payload', { username: uname, displayName: displayNameNormalized, bio: (editBio || '').trim().slice(0,200), socialLinks: socialLinksNormalized }); } catch (_) {}

  const payload = { username: uname, displayName: displayNameNormalized, bio: (editBio || '').trim().slice(0,200), socialLinks: socialLinksNormalized } as any;
  await api.updateCurrentUser(payload as Partial<User>);
        // Notify any listeners and revalidate app-router data so the UI updates
        try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('auth:changed')); } catch (_) {}
        try { router.refresh?.(); } catch (_) {}

        setIsClosing(true);
        setTimeout(() => {
          setIsEditingProfile(false);
          setIsClosing(false);
        }, 200);

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
        try { console.error('[ProfileEditForm] saveEdits error', e); } catch (_) {}
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
  setEditFacebook(user.socialLinks?.facebook || "");
        setEditWebsite(user.socialLinks?.website || "");
        setIsEditingProfile(true);
        // focus after next paint so input exists - focus username first per request
        requestAnimationFrame(() => { usernameRef.current?.focus?.(); });
        return;
      }
      // when already editing, save the changes
      await saveEdits();
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

    useEffect(() => {
      if (isEditingProfile && !isClosing) {
        // Delay to allow the element to render with opacity 0, then animate in
        requestAnimationFrame(() => setAnimateIn(true));
      } else {
        setAnimateIn(false);
      }
    }, [isEditingProfile, isClosing]);

    useImperativeHandle(ref, () => ({ toggleEdit }));

    // Simple heuristics to detect a valid-looking link/handle for each platform.
    const looksLikeTwitter = (v?: string) => {
      if (!v) return false;
      const t = v.trim();
      return t.startsWith('@') || t.includes('twitter.com') || t.includes('x.com') || t.includes('t.co');
    };
    const looksLikeInstagram = (v?: string) => {
      if (!v) return false;
      const t = v.trim();
      return t.startsWith('@') || t.includes('instagram.com') || t.includes('instagr.am');
    };
    const looksLikeGithub = (v?: string) => {
      if (!v) return false;
      const t = v.trim();
      if (t.includes('github.com')) return true;
      // simple username pattern: alphanumeric, hyphens
      return /^[a-zA-Z0-9-]+$/.test(t);
    };
    const looksLikeFacebook = (v?: string) => {
      if (!v) return false;
      const t = v.trim();
      return t.startsWith('@') || t.includes('facebook.com') || t.includes('fb.me');
    };
    const looksLikeWebsite = (v?: string) => {
      if (!v) return false;
      const t = v.trim();
      // basic: contains a dot and no spaces, or starts with http
      return t.startsWith('http://') || t.startsWith('https://') || (/\./.test(t) && !/\s/.test(t));
    };

    // Auto-prefix helpers: add leading @ for handle inputs when appropriate.
    const shouldPrefixAt = (v: string) => {
      const t = (v || '').trim();
      if (!t) return false;
      // If it's already an @handle or a URL or contains a slash or domain, don't prefix
      if (t.startsWith('@')) return false;
      if (t.startsWith('http://') || t.startsWith('https://')) return false;
      if (t.includes('/') || t.includes('.')) return false;
      return true;
    };
    const ensureAt = (v: string) => {
      const t = (v || '').trim();
      if (!t) return '';
      return shouldPrefixAt(t) ? `@${t}` : t;
    };

    return (
      <>
        {!isEditingProfile && !isClosing && (
          <div className="profile-static-info">
            <div className="username">@{user.username}</div>
            {user.displayName && <div className="dim">{user.displayName}</div>}
            <div className="dim">joined {new Date(user.joinedAt).toLocaleDateString()}</div>
            {user.bio ? <div className="dim profile-bio">{user.bio}</div> : null}
          </div>
        )}
        {(isEditingProfile || isClosing) && (
          <form className={`inline-edit-card ${animateIn && !isClosing ? 'visible' : isClosing ? 'closing' : ''}`} style={{ width: '100%', maxWidth: 720 }} onSubmit={(e: FormEvent) => saveEdits(e)}>
        <label className="label-group">
          <div className="muted-label sr-only">@Username</div>
          <div className="input-container">
            <input ref={usernameRef} className="input" placeholder="@Username" value={editUsername} onChange={e => setEditUsername(e.target.value)} />
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

        <label className="label-group">
          <div className="muted-label sr-only">Display name</div>
          <input ref={displayNameRef} className="input" placeholder="Display name" value={editDisplayName} onChange={e => setEditDisplayName(e.target.value)} />
        </label>

        <label className="bio-col label-group">
          <div className="muted-label sr-only">Bio</div>
          <div className="bio-editor-container">
            <textarea className="bio-editor" placeholder="Tell people about yourself" value={editBio} maxLength={200} onChange={e => setEditBio(e.target.value.slice(0,200))} aria-label="Profile bio" />
            <div className="bio-char-count" aria-live="polite">{editBio.length}/200</div>
          </div>
        </label>

        {/* Social links section - always visible */}
        <div className="social-drawer" role="region">
          <div style={{ display: 'grid', gap: 8 }}>
            <label className="label-group">
              <div className="muted-label sr-only">Twitter</div>
              <div className="input-container">
                <input className="input" placeholder="Twitter" value={editTwitter} onChange={e => setEditTwitter(e.target.value)} onBlur={() => setEditTwitter(ensureAt(editTwitter))} />
                <Twitter size={16} className={`input-icon ${looksLikeTwitter(editTwitter) ? 'twitter-filled' : ''}`} />
              </div>
            </label>
            <label className="label-group">
              <div className="muted-label sr-only">Instagram</div>
              <div className="input-container">
                <input className="input" placeholder="Instagram" value={editInstagram} onChange={e => setEditInstagram(e.target.value)} onBlur={() => setEditInstagram(ensureAt(editInstagram))} />
                <Instagram size={16} className={`input-icon ${looksLikeInstagram(editInstagram) ? 'instagram-filled' : ''}`} />
              </div>
            </label>
            <label className="label-group">
              <div className="muted-label sr-only">GitHub</div>
              <div className="input-container">
                <input className="input" placeholder="GitHub" value={editGithub} onChange={e => setEditGithub(e.target.value)} />
                <Github size={16} className={`input-icon ${looksLikeGithub(editGithub) ? 'github-filled' : ''}`} />
              </div>
            </label>
            <label className="label-group">
              <div className="muted-label sr-only">Facebook</div>
              <div className="input-container">
                <input className="input" placeholder="Facebook" value={editFacebook} onChange={e => setEditFacebook(e.target.value)} onBlur={() => setEditFacebook(ensureAt(editFacebook))} />
                <Facebook size={16} className={`input-icon ${looksLikeFacebook(editFacebook) ? 'facebook-filled' : ''}`} />
              </div>
            </label>
            <label className="label-group">
              <div className="muted-label sr-only">Website</div>
              <div className="input-container">
                <input className="input" placeholder="Website" value={editWebsite} onChange={e => setEditWebsite(e.target.value)} />
                <Globe size={16} className={`input-icon ${looksLikeWebsite(editWebsite) ? 'website-filled' : ''}`} />
              </div>
            </label>
          </div>
        </div>

      </form>
        )}
      </>
    );
  }
);
ProfileEditForm.displayName = 'ProfileEditForm';
