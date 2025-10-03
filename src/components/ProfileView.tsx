/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api, getSupabaseClient } from "@/lib/api";
import { compressImage } from "@/lib/image";
import { uid } from "@/lib/id";
import { dedupe } from "@/lib/requestDeduplication";
import type { HydratedPost, User } from "@/lib/types";
import Link from "next/link";
import ImageZoom from "./ImageZoom";
import { AuthForm } from "@/components/AuthForm";
import { SignOutButton } from "@/components/SignOut";
import { useToast } from "./Toast";

export function ProfileView({ userId }: { userId?: string }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<HydratedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<boolean | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  // `isOtherParam` indicates whether the route included an explicit userId param.
  // Later we'll compare the fetched current user to the viewed user to decide
  // whether the profile belongs to the signed-in user (owner) or another user.
  const isOtherParam = !!userId;

  // Optimize data fetching with request deduplication
  const fetchUserData = useCallback(async () => {
    try {
      // Determine signed-in user with deduplication
      const me = await dedupe('getCurrentUser', () => api.getCurrentUser());
      setCurrentUserId(me?.id || null);

      // Fetch user profile with deduplication
      const u = userId 
        ? await dedupe(`getUser:${userId}`, () => api.getUser(userId))
        : me;
      
      if (!u) {
        setUser(null);
        setPosts([]);
        if (userId) setFollowing(false);
        return;
      }

      setUser(u);
      
      // Fetch posts with deduplication
      const userPosts = await dedupe(`getUserPosts:${u.id}`, () => api.getUserPosts(u.id));
      setPosts(userPosts);

      // Only compute following state when viewing another user's profile
      if (userId) {
        if (me?.id === u.id) {
          setFollowing(null);
        } else {
          const isFollowingUser = await dedupe(`isFollowing:${u.id}`, () => api.isFollowing(u.id));
          setFollowing(isFollowingUser);
        }
      }
    } catch (e) {
      // swallow and let UI show not-found if appropriate
    }
  }, [userId]);

  useEffect(() => {
    let mounted = true;
    
    setLoading(true);
    
    fetchUserData().finally(() => {
      if (mounted) setLoading(false);
    });
    
    return () => { mounted = false; };
  }, [fetchUserData]);

  // Listen for newly created posts (from uploader) - optimized
  useEffect(() => {
    const onPostCreated = async () => {
      try {
        const me = await dedupe('getCurrentUser', () => api.getCurrentUser());
        if (!me) return;
        if (userId && userId !== me.id) return;
        
        const list = await dedupe(`getUserPosts:${me.id}`, () => api.getUserPosts(me.id));
        setUser(prev => prev || me);
        setPosts(list);
      } catch (e) { /* ignore refresh errors */ }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('monolog:post_created', onPostCreated as any);
    }
    return () => { 
      if (typeof window !== 'undefined') {
        window.removeEventListener('monolog:post_created', onPostCreated as any); 
      }
    };
  }, [userId]);

  const [showAuth, setShowAuth] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const toast = useToast();
  const followInFlightRef = useRef(false);

  // Inline edit state (when viewing own profile we allow editing directly in header)
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editUsername, setEditUsername] = useState("");

  // When a global auth:changed event fires - optimized
  useEffect(() => {
    const handleAuthChanged = async () => {
      if (isOtherParam && currentUserId && currentUserId !== userId) return;
      
      let me: any = null;
      for (let i = 0; i < 8; i++) {
        // Use deduplication for auth checks
        me = await dedupe('getCurrentUser', () => api.getCurrentUser());
        if (me) break;
        await new Promise(r => setTimeout(r, 120));
      }
      
      if (me) {
        setCurrentUserId(me.id);
        setUser(me);
        try {
          const userPosts = await dedupe(`getUserPosts:${me.id}`, () => api.getUserPosts(me.id));
          setPosts(userPosts);
        } catch (_) {}
        setLoading(false);
        return;
      }

      // No authenticated user found. Clear viewer state for the "own profile"
      // route so the page can show the sign in / sign up form instead of
      // incorrectly continuing to render a stale signed-in profile.
      setCurrentUserId(null);
      if (!isOtherParam) {
        setUser(null);
        setPosts([]);
        setLoading(false);
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('auth:changed', handleAuthChanged as any);
    }
    return () => { 
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth:changed', handleAuthChanged as any); 
      }
    };
  }, [userId, isOtherParam, currentUserId]);
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
    
    const oldUsername = user?.username;
    const usernameChanged = oldUsername && uname !== oldUsername;
    
    setEditProcessing(true);
    try {
      await api.updateCurrentUser({ username: uname, displayName: (editDisplayName || '').trim() || undefined, bio: (editBio || '').trim().slice(0,200) });
      const me = await api.getCurrentUser();
      setUser(me);
      if (me) setPosts(await api.getUserPosts(me.id));
      setIsEditingProfile(false);
      
      // If username changed and we're on a username route, redirect to new username
      if (usernameChanged && me?.username && typeof window !== 'undefined') {
        // Check if current path contains the old username
        const currentPath = window.location.pathname;
        if (currentPath.includes(`/${oldUsername}`)) {
          router.push(`/${me.username}`);
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
      // refresh user in UI
      const me = await api.getCurrentUser();
      setUser(me);
    } catch (e: any) {
      try { toast.show(e?.message || "Failed to upload avatar"); } catch (_) { /* ignore */ }
    }
  };

  

  if (!user) {
    // while loading, show a proper skeleton with multiple placeholders
    if (loading) {
      return (
        <div className="view-fade">
          <div className="profile-header toolbar">
            <div className="profile-left" style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center", width: "100%" }}>
              <div className="skeleton" style={{ width: 96, height: 96, borderRadius: '50%' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', width: '100%' }}>
                <div className="skeleton" style={{ width: 180, height: 20, borderRadius: 8 }} />
                <div className="skeleton" style={{ width: 220, height: 16, borderRadius: 6 }} />
              </div>
            </div>
          </div>
          <div style={{ height: 8 }} />
          <div className="grid" aria-label="Loading posts">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="tile skeleton" style={{ height: 200, animationDelay: `${i * 60}ms` }} />
            ))}
          </div>
        </div>
      );
    }

  // while not loading, prefer the upload-style sign-in prompt when the
  // viewer is not signed in and they're looking at their own profile.
  if (!loading && !isOtherParam && !currentUserId) {
      return (
        <div className="view-fade auth-host" style={{ maxWidth: 520, margin: "28px auto 32px", textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <AuthForm onClose={async () => {
            // refresh authenticated user state after sign-in
            const me = await api.getCurrentUser();
            setCurrentUserId(me?.id || null);
            if (me) {
              setUser(me);
              setPosts(await api.getUserPosts(me.id));
            }
          }} />
        </div>
      );
    }

    return (
      <div className="empty" style={{ position: "relative" }}>
        <div>User not found. Pick an account from the Account menu to get started.</div>
        <div style={{ marginTop: 12 }}>
          <button className="btn" onClick={() => { try { (document.activeElement as HTMLElement | null)?.blur?.(); } catch (_) {} setShowAuth(true); }}>Sign in / Sign up</button>
        </div>

        {showAuth ? (
          <>
            <div
              className="auth-dialog-backdrop"
              onClick={() => setShowAuth(false)}
            />
            <div 
              role="dialog" 
              aria-modal="true" 
              aria-label="Sign in or sign up" 
              className="auth-dialog"
            >
              <AuthForm onClose={() => setShowAuth(false)} />
            </div>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="view-fade">
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
                    setShowAuth(true);
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

      {/* inline avatar rendering (no portal) */}

      <div style={{ height: 8 }} />

      {/* bio is rendered in the header panel to keep profile in a single card */}
      <div className="grid" aria-label="User posts">
        {posts.map(p => {
          const urls = (p as any).imageUrls || ((p as any).imageUrl ? [(p as any).imageUrl] : []);
          const src = urls[0] || (p as any).imageUrl || "";
          const alts = Array.isArray(p.alt) ? p.alt : [p.alt || ""];
            return (
            <Link key={p.id} className="tile" href={`/post/${p.user.username || p.userId}-${p.id.slice(0,8)}`}>
              <ImageZoom loading="lazy" src={src} alt={alts[0] || "Photo"} />
            </Link>
          );
        })}
      </div>
      {/* design restored: no debug dump */}
    </div>
  );
}

function EditProfile({ onSaved }: { onSaved?: () => Promise<void> | void } = {}) {
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [original, setOriginal] = useState("");
  const [username, setUsername] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [originalDisplayName, setOriginalDisplayName] = useState("");
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    (async () => {
      const me = await api.getCurrentUser();
      // enforce client-side cap so the editor never exceeds the visible limit
      const BIO_MAX = 200;
      const trimmed = me?.bio ? String(me.bio).slice(0, BIO_MAX) : "";
      setBio(trimmed);
      setOriginal(trimmed);
      setUsername(me?.username || "");
      setOriginalUsername(me?.username || "");
      setDisplayName(me?.displayName || "");
      setOriginalDisplayName(me?.displayName || "");
    })();
  }, []);


  const toast = useToast();

  // Always render the edit button so it doesn't disappear when the
  // edit panel is opened. The panel is rendered as an absolutely
  // positioned overlay anchored to `.profile-actions`.
  return (
    <div className="edit-profile-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="btn icon-reveal edit-profile-btn"
        onClick={() => setEditing(e => !e)}
        aria-expanded={editing}
        aria-controls="edit-profile-panel"
        type="button"
      >
        <span className="icon" aria-hidden>
          {/* edit/profile icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 20h9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </span>
        <span className="reveal">Edit Profile</span>
      </button>

      {editing && (
        <div id="edit-profile-panel" className="edit-panel" role="dialog" aria-label="Edit profile">
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
            <input
              type="file"
              accept="image/*"
              ref={fileRef}
              style={{ display: "none" }}
              onChange={async () => {
                const f = fileRef.current?.files?.[0];
                if (!f) return;
                setProcessing(true);
                try {
                  // compress to data URL then upload to storage
                  const dataUrl = await compressImage(f);
                  // convert dataUrl -> File
                  const parts = dataUrl.split(',');
                  const meta = parts[0];
                  const mime = meta.split(':')[1].split(';')[0];
                  const bstr = atob(parts[1]);
                  let n = bstr.length;
                  const u8arr = new Uint8Array(n);
                  while (n--) u8arr[n] = bstr.charCodeAt(n);
                  const file = new File([u8arr], `${uid()}.jpg`, { type: mime });

                  const sb = getSupabaseClient();
                  const s = (v: any) => {
                    try { return JSON.stringify(v, null, 2); } catch (e) { try { return String(v); } catch { return "[unserializable]"; } }
                  };
                  const user = await api.getCurrentUser();
                  if (!user) throw new Error("Not logged in");
                  const path = `avatars/${user.id}/${file.name}`;
                  const { data: uploadData, error: uploadErr } = await sb.storage.from("posts").upload(path, file, { upsert: true });
                  if (uploadErr) throw uploadErr;
                  const urlRes = sb.storage.from("posts").getPublicUrl(path);
                  const publicUrl = urlRes.data.publicUrl;
                  await api.updateCurrentUser({ avatarUrl: publicUrl });
                } catch (e: any) {
                  console.error(e);
                  toast.show(e?.message || "Failed to upload avatar");
                } finally {
                  setProcessing(false);
                }
              }}
            />
            <button className="btn" onClick={() => fileRef.current?.click()} disabled={processing}>
              {processing ? "Uploading…" : "Change Avatar"}
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="dim">Display name</span>
              <input className="input" type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Display name" />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="dim">Username (used in @handle)</span>
              <input className="input" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="username" />
            </label>
            <label className="bio-col" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="dim">Bio</span>
                {/* live counter */}
                <span className="dim" aria-live="polite" style={{ fontSize: 12 }}>{bio.length}/200</span>
              </div>
              <textarea
                className="bio-editor"
                value={bio}
                maxLength={200}
                onChange={e => {
                  const v = e.target.value.slice(0, 200);
                  setBio(v);
                }}
              />
            </label>
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <div className="edit-actions" style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button
                className="btn save-bio"
                onClick={async () => {
                  const uname = username.trim();
                  if (!uname) { toast.show("Username cannot be empty"); return; }
                  setProcessing(true);
                  try {
                    // ensure bio respects the server-side limit as well
                    const BIO_MAX = 200;
                    await api.updateCurrentUser({ username: uname, displayName: displayName.trim() || undefined, bio: bio.trim().slice(0, BIO_MAX) });
                    setEditing(false);
                    try { await onSaved?.(); } catch (e) { /* ignore parent refresh errors */ }
                  } catch (e: any) {
                    toast.show(e?.message || "Failed to update profile");
                  } finally {
                    setProcessing(false);
                  }
                }}
              >
                Save
              </button>
              <button
                className="btn cancel-bio"
                onClick={() => {
                  setBio(original);
                  setUsername(originalUsername);
                  setDisplayName(originalDisplayName);
                  setEditing(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}