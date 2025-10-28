import { useRef, useState, useEffect } from "react";
import { api, getSupabaseClient } from "@/src/lib/api";
import { compressImage } from "@/src/lib/image";
import { uid } from "@/src/lib/id";
import { useToast } from "../Toast";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import type { User } from "@/src/lib/types";

interface ProfileAvatarProps {
  user: User;
  currentUserId: string | null;
  onAvatarChange: () => void;
}

export function ProfileAvatar({ user, currentUserId, onAvatarChange }: ProfileAvatarProps) {
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const toast = useToast();
  const [avatarUploading, setAvatarUploading] = useState(false);
  // expanded controls in-place scale animation of avatar
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

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
      try { toast.show(e?.message || "Failed to upload avatar"); } catch (_) { /* ignore */ }
    }
    finally {
      setAvatarUploading(false);
    }
  };

  return (
    <>
      {currentUserId && user?.id === currentUserId ? (
        <>
          <button
            className="avatar-button"
            aria-label="Change avatar"
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarUploading}
            aria-busy={avatarUploading}
            type="button"
          >
            <div className={`avatar-wrap ${avatarUploading ? 'avatar-uploading' : ''}`} style={{ width: 160, height: 160 }}>
              <Image key={user.avatarUrl} className={`profile-avatar avatar ${(user.avatarUrl || "/logo.svg") === "/logo.svg" ? 'default-avatar' : ''}`} src={user.avatarUrl || "/logo.svg"} alt={user.displayName ?? user.username} width={160} height={160} />
            </div>
          </button>
          <input type="file" accept="image/*" ref={avatarInputRef} style={{ display: 'none' }} onChange={handleAvatarChange} disabled={avatarUploading} />
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
              <Image
                key={user.avatarUrl}
                className={`profile-avatar avatar ${(user.avatarUrl || "/logo.svg") === "/logo.svg" ? 'default-avatar' : ''}`}
                src={user.avatarUrl || "/logo.svg"}
                alt={user.displayName ?? user.username}
                width={160}
                height={160}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '9999px', filter: expanded ? 'none' : 'none' }}
              />
            </div>
          </button>
        </>
      )}
    </>
  );
}
