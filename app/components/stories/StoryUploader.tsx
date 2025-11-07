"use client";
import { useRef, useState } from 'react';
import { api } from '@/lib/api';

type Props = {
  onCreated?: () => void;
  className?: string;
};

export function StoryUploader({ onCreated, className }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null);
    if (!/^image\//.test(f.type) && !/^video\//.test(f.type)) {
      setError('Please select an image or a short video');
      return;
    }
    // Size limits
    const maxImage = 10 * 1024 * 1024; // 10MB
    const maxVideo = 15 * 1024 * 1024; // 15MB
    if (/^image\//.test(f.type) && f.size > maxImage) {
      setError('Image too large (max 10MB)');
      return;
    }
    if (/^video\//.test(f.type) && f.size > maxVideo) {
      setError('Video too large (max 15MB)');
      return;
    }
    setBusy(true);
    try {
      if (/^image\//.test(f.type)) {
        // Read as data URL and let server convert/compress
        const dataUrl: string = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onerror = () => rej(new Error('read error'));
          r.onload = () => res(String(r.result));
          r.readAsDataURL(f);
        });
        await api.createStory({ dataUrl, mediaType: 'image' });
      } else {
        // Video: read as dataURL for minimal upload; production should use multipart + chunked upload
        const dataUrl: string = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onerror = () => rej(new Error('read error'));
          r.onload = () => res(String(r.result));
          r.readAsDataURL(f);
        });
        await api.createStory({ dataUrl, mediaType: 'video' });
      }
      try { onCreated?.(); } catch {}
      if (fileRef.current) fileRef.current.value = '';
    } catch (e: any) {
      setError(e?.message || 'Failed to upload');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <button type="button" className="btn" onClick={() => fileRef.current?.click()} disabled={busy} aria-busy={busy}>
        {busy ? 'Uploading…' : 'Add story'}
      </button>
      <input ref={fileRef} type="file" accept="image/*,video/*" onChange={onPick} style={{ display: 'none' }} />
      {error && <div className="text-red-500 text-sm mt-2" role="alert">{error}</div>}
    </div>
  );
}
