import { useRef, useState, useEffect } from "react";
import { createPortal } from 'react-dom';
import { api, getSupabaseClient } from "@/lib/api";
import { compressImage } from "@/lib/image";
import { uid } from "@/lib/id";
import Image from "next/image";
import { OptimizedImage } from "@/app/components/media/OptimizedImage";
import { useRouter, useSearchParams } from "next/navigation";
import type { User, Story } from "@/lib/types";

interface ProfileAvatarProps {
  user: User;
  currentUserId: string | null;
  onAvatarChange: () => void;
}

export function ProfileAvatar({ user, currentUserId, onAvatarChange }: ProfileAvatarProps) {
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const storyInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  // expanded controls in-place scale animation of avatar
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hasActiveStories, setHasActiveStories] = useState(false);
  const [ownStories, setOwnStories] = useState<Story[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIdx, setViewerIdx] = useState(0);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  useEffect(() => {
    if (searchParams.get('changeAvatar') === 'true') {
      setTimeout(() => {
        avatarInputRef.current?.click();
        router.replace('/profile'); // remove the param
      }, 100);
    }
  }, [searchParams, router]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stories = await api.getActiveStoriesForUser(user.id);
        if (mounted) {
          setHasActiveStories(stories.length > 0);
          setOwnStories(stories);
        }
      } catch (_) {
        if (mounted) {
          setHasActiveStories(false);
          setOwnStories([]);
        }
      }
    })();
    return () => { mounted = false; };
  }, [user.id]);

  const handleAvatarChange = async () => {
    if (avatarUploading) return;
    const f = avatarInputRef.current?.files?.[0];
    if (!f) return;
    // capture current displayed avatar src so we can wait until it changes
    const getDisplayedSrc = () => {
      if (typeof window === 'undefined') return null;
      const el = document.querySelector('.profile-avatar') as HTMLImageElement | null;
      return el ? (el.currentSrc || el.src || null) : null;
    };
    const prevDisplayedSrc = getDisplayedSrc();
    setAvatarUploading(true);
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
  const uploaderId = userObj.id || currentUserId;
  if (!uploaderId) throw new Error("Cannot determine user id for avatar upload");
  // Capture the old avatar URL before updating
  const oldAvatarUrl = userObj.avatarUrl;
  const path = `avatars/${uploaderId}/${file.name}`;
  const { data: uploadData, error: uploadErr } = await sb.storage.from("posts").upload(path, file, { upsert: true, contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' });
      if (uploadErr) throw uploadErr;
      const urlRes = sb.storage.from("posts").getPublicUrl(path);
      const publicUrl = urlRes.data.publicUrl;
      // Add a cache-busting query param so the browser requests the fresh image
      const cacheBusted = publicUrl + (publicUrl.includes('?') ? '&' : '?') + `v=${Date.now()}`;

      // Wait for the browser to actually load the new image (covers CDN processing)
      const waitForImageLoad = (url: string, timeout = 10000) => new Promise<void>((resolve, reject) => {
        if (typeof window === 'undefined') return resolve();
        const img = new window.Image();
        let timer: number | null = null;
        const clean = () => {
          img.onload = null;
          img.onerror = null;
          if (timer !== null) window.clearTimeout(timer);
        };
        img.onload = () => { clean(); resolve(); };
        img.onerror = () => { clean(); reject(new Error('image load error')); };
        // cache-bust at fetch time too
        img.src = url;
        timer = window.setTimeout(() => { clean(); reject(new Error('image load timeout')); }, timeout);
      });

      // Verify the uploaded image loads before updating the user profile
      try {
        await waitForImageLoad(cacheBusted, 12000);
      } catch (loadError) {
        console.warn('Avatar image failed to load after upload, but proceeding with update:', loadError);
        // Proceed anyway since we have fallback in display
      }

      await api.updateCurrentUser({ avatarUrl: cacheBusted });

      // After successful update, delete the old avatar if it's not the default
      if (oldAvatarUrl && oldAvatarUrl !== '/logo.svg' && oldAvatarUrl.includes('supabase.co')) {
        try {
          // Extract path from URL: https://xxx.supabase.co/storage/v1/object/public/posts/avatars/userId/filename.jpg
          const url = new URL(oldAvatarUrl);
          const pathParts = url.pathname.split('/storage/v1/object/public/posts/');
          if (pathParts.length > 1) {
            const oldPath = pathParts[1];
            await sb.storage.from("posts").remove([oldPath]);
          }
        } catch (deleteError) {
          console.warn('Failed to delete old avatar:', deleteError);
          // Don't throw - old avatar deletion failure shouldn't block the upload
        }
      }

      // Refresh user in UI: notify listeners (useUserData listens for 'auth:changed')
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:changed'));
        }
      } catch (_) {
        // ignore
      }
      try {
        onAvatarChange?.();
      } catch (_) {
        // ignore
      }

      // Wait until the DOM's displayed avatar image actually reflects the new image.
      const waitForDomImageUpdate = (prevSrc: string | null, expectedUrl: string, timeout = 12000) => new Promise<void>(async (resolve) => {
        if (typeof window === 'undefined') return resolve();
        const start = Date.now();

        const tryDecode = async (imgEl: HTMLImageElement, remaining: number) => {
          // Prefer decode() which resolves when the image is decoded and ready to paint
          if (typeof imgEl.decode === 'function') {
            try {
              const decodePromise = imgEl.decode();
              const timer = new Promise((res, rej) => window.setTimeout(() => rej(new Error('decode timeout')), remaining));
              await Promise.race([decodePromise, timer]);
              return true;
            } catch (_) {
              return false;
            }
          }
          // fallback: check complete + naturalWidth over a few frames
          for (let i = 0; i < 6; i++) {
            if (imgEl.complete && imgEl.naturalWidth && imgEl.naturalWidth > 0) return true;
            // wait a frame
            // eslint-disable-next-line no-await-in-loop
            await new Promise(r => requestAnimationFrame(r));
          }
          return false;
        };

        const check = async () => {
          const cur = getDisplayedSrc();
          if (cur && cur !== prevSrc) {
            // If the src changed, find the element and ensure it's decoded/paint-ready.
            const el = document.querySelector('.profile-avatar') as HTMLImageElement | null;
            if (el) {
              // Accept when the element's currentSrc includes the expected URL (or filename), or simply when it changed from prev
              const matchesExpected = (el.currentSrc || el.src || '').includes(expectedUrl) || (el.currentSrc || el.src || '').includes(expectedUrl.split('?')[0]);
              const remaining = Math.max(0, timeout - (Date.now() - start));
              const decoded = await tryDecode(el, remaining);
              if (decoded && (matchesExpected || (el.currentSrc || el.src || '') !== prevSrc)) return resolve();
            } else {
              // no element found but src changed; accept the change
              return resolve();
            }
          }
          if (Date.now() - start > timeout) return resolve();
          requestAnimationFrame(check);
        };

        check();
      });

      try {
        await waitForDomImageUpdate(prevDisplayedSrc, cacheBusted, 12000);
      } catch (_) {
        // ignore
      }
    } catch (e: any) {
      console.warn(e?.message || "Failed to upload avatar");
    }
    finally {
      setAvatarUploading(false);
    }
  };

  const handleStoryChange = async () => {
    const f = storyInputRef.current?.files?.[0];
    if (!f) return;
    try {
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
      const uploaderId = userObj.id || currentUserId;
      if (!uploaderId) throw new Error("Cannot determine user id for story upload");
      const path = `stories/${uploaderId}/${file.name}`;
      const { data: uploadData, error: uploadErr } = await sb.storage.from("posts").upload(path, file, { upsert: true, contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' });
      if (uploadErr) throw uploadErr;
      const urlRes = sb.storage.from("posts").getPublicUrl(path);
      const publicUrl = urlRes.data.publicUrl;

      await api.createStory({ mediaUrl: publicUrl, mediaType: 'image' });

      // Refresh stories
      const stories = await api.getActiveStoriesForUser(user.id);
      setHasActiveStories(stories.length > 0);
      setOwnStories(stories);
    } catch (e: any) {
      console.warn(e?.message || "Failed to upload story");
    }
  };

  // Auto advance stories
  useEffect(() => {
    if (!viewerOpen || !ownStories.length) return;
    const cur = ownStories[viewerIdx];
    const dur = cur?.mediaType === 'video' ? Math.min(Math.max(cur.durationSeconds || 6, 3), 15) : 6;
    const t = setTimeout(() => {
      setViewerIdx(v => (v + 1) >= ownStories.length ? 0 : v + 1); // loop for own stories
    }, dur * 1000);
    return () => clearTimeout(t);
  }, [viewerOpen, viewerIdx, ownStories]);

  useEffect(() => {
    if (!viewerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewerOpen(false);
      else if (e.key === 'ArrowLeft') setViewerIdx(v => v === 0 ? ownStories.length - 1 : v - 1);
      else if (e.key === 'ArrowRight') setViewerIdx(v => (v + 1) % ownStories.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewerOpen, viewerIdx, ownStories.length]);

  // Prevent body scroll and scroll to top when viewer opens
  useEffect(() => {
    if (viewerOpen) {
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
  }, [viewerOpen]);

  return (
    <>
      {currentUserId && user?.id === currentUserId ? (
        <>
          <button
            className="avatar-button"
            aria-label={hasActiveStories ? "View your stories or change avatar" : "Change avatar"}
            onClick={() => {
              if (hasActiveStories) {
                setViewerOpen(true);
                setViewerIdx(0);
              } else {
                avatarInputRef.current?.click();
              }
            }}
            disabled={avatarUploading}
            aria-busy={avatarUploading}
            type="button"
          >
            <div className={`avatar-wrap ${avatarUploading ? 'avatar-uploading' : ''}`} style={{ width: 160, height: 160, outline: hasActiveStories ? '4px solid #ff7e39' : 'none', outlineOffset: 4, borderRadius: 9999 }}>
              <OptimizedImage key={user.avatarUrl} className={`profile-avatar avatar ${(user.avatarUrl || "/logo.svg") === "/logo.svg" ? 'default-avatar' : ''}`} src={user.avatarUrl || "/logo.svg"} alt={user.displayName ?? user.username} width={160} height={160} priority loading="eager" disableLoadingTransition />
            </div>
          </button>
          <input type="file" accept="image/*" ref={avatarInputRef} style={{ display: 'none' }} onChange={handleAvatarChange} disabled={avatarUploading} />
          <input type="file" accept="image/*,video/*" ref={storyInputRef} style={{ display: 'none' }} onChange={handleStoryChange} />
        </>
      ) : (
        <>
          <button
            type="button"
            aria-label={`Toggle ${(user.displayName ?? user.username)}'s avatar`}
            className="profile-avatar-button"
            onClick={() => setExpanded((s) => !s)}
            aria-expanded={expanded}
            style={{ background: 'none', border: 'none', padding: 0, cursor: expanded ? 'zoom-out' : 'zoom-in' }}
          >
            <div
              className={`avatar-wrap ${expanded ? 'avatar-expanded' : ''}`}
              style={{
                width: 160,
                height: 160,
                // simple scale animation with a tiny opacity fade
                transform: expanded ? 'scale(2.8)' : 'scale(1)',
                opacity: expanded ? 1 : 0.96,
                transition: 'transform 220ms cubic-bezier(.22,.9,.3,1), opacity 200ms ease, box-shadow 220ms ease',
                // expand downward: grow from top center
                transformOrigin: 'top center',
                position: 'relative',
                zIndex: expanded ? 50 : 1,
                overflow: 'visible',
                boxShadow: expanded ? '0 18px 46px rgba(0,0,0,0.42)' : '0 6px 18px rgba(0,0,0,0.12)',
                borderRadius: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <OptimizedImage
                key={user.avatarUrl}
                className={`profile-avatar avatar ${(user.avatarUrl || "/logo.svg") === "/logo.svg" ? 'default-avatar' : ''}`}
                src={user.avatarUrl || "/logo.svg"}
                alt={user.displayName ?? user.username}
                width={160}
                height={160}
                priority
                loading="eager"
                disableLoadingTransition
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '9999px', filter: expanded ? 'none' : 'none', outline: hasActiveStories ? '4px solid #ff7e39' : 'none', outlineOffset: 4 }}
              />
            </div>
          </button>
        </>
      )}
      {viewerOpen && ownStories.length > 0 && createPortal(
        <div className="story-viewer-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10000, height: '100vh' }} onClick={() => setViewerOpen(false)}>
          <div style={{ position: 'absolute', top: 12, left: 12 }} onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setViewerOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8 }}>Close</button>
          </div>
          <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }} onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setViewerIdx(v => v === 0 ? ownStories.length - 1 : v - 1)} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8 }}>Prev</button>
            <button type="button" onClick={() => setViewerIdx(v => (v + 1) % ownStories.length)} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8 }}>Next</button>
            <button type="button" onClick={() => storyInputRef.current?.click()} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8 }}>Add Story</button>
          </div>
          <div style={{ maxWidth: '90vw', maxHeight: '80vh', width: 'min(640px, 90vw)', height: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
            {ownStories[viewerIdx].mediaType === 'video' ? (
              <video src={ownStories[viewerIdx].mediaUrl} style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 16 }} autoPlay controls playsInline />
            ) : (
              <img src={ownStories[viewerIdx].mediaUrl} alt="Your story" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 16 }} />
            )}
          </div>
          <div style={{ position: 'absolute', bottom: 28, fontSize: 14, color: '#fff' }} onClick={(e) => e.stopPropagation()}>
            Your story • {viewerIdx + 1}/{ownStories.length}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
