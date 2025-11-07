"use client";
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/lib/api';
import type { Story } from '@/lib/types';
import Image from 'next/image';

interface Item { user: { id: string; username: string; displayName?: string; avatarUrl: string }; stories: Story[] }

export function StoriesBar() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ user: Item['user']; stories: Story[]; idx: number } | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await api.getFollowingStories();
        if (mounted) setItems(data.filter(d => d.stories.length));
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Failed to load stories');
      }
    })();
    return () => { mounted = false; };
  }, []);

  const open = (item: Item) => setViewer({ user: item.user, stories: item.stories, idx: 0 });
  const close = () => setViewer(null);
  const next = () => setViewer(v => v ? { ...v, idx: Math.min(v.idx + 1, v.stories.length - 1) } : v);
  const prev = () => setViewer(v => v ? { ...v, idx: Math.max(v.idx - 1, 0) } : v);

  useEffect(() => {
    if (!viewer) return;
    const cur = viewer.stories[viewer.idx];
    if (cur) api.markStoryViewed(cur.id).catch(() => {});
  }, [viewer?.idx, viewer]);

  // Prevent body scroll and scroll to top when viewer opens
  useEffect(() => {
    if (viewer) {
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
  }, [viewer]);

  // Auto advance every 6s for images (shorter for videos based on durationSeconds)
  useEffect(() => {
    if (!viewer) return;
    const cur = viewer.stories[viewer.idx];
    const dur = cur?.mediaType === 'video' ? Math.min(Math.max(cur.durationSeconds || 6, 3), 15) : 6;
    const t = setTimeout(() => {
      setViewer(v => v ? { ...v, idx: v.idx + 1 >= v.stories.length ? v.idx : v.idx + 1 } : v);
    }, dur * 1000);
    return () => clearTimeout(t);
  }, [viewer]);

  if (!items.length && !error) return null;

  return (
    <div className="stories-bar" style={{ display: 'flex', gap: 12, padding: '8px 4px', overflowX: 'auto' }}>
      {items.map(item => (
        <button key={item.user.id} type="button" onClick={() => open(item)} className="story-avatar" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }} aria-label={`View ${item.user.displayName || item.user.username}'s stories`}>
          <div style={{ width: 56, height: 56, position: 'relative' }}>
            <Image src={item.user.avatarUrl || '/logo.svg'} alt={item.user.displayName || item.user.username} width={56} height={56} style={{ borderRadius: '50%', objectFit: 'cover', width: '100%', height: '100%', outline: '3px solid #ff7e39', outlineOffset: 2 }} />
            <span style={{ position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)', fontSize: 10, background: '#111', color: '#fff', padding: '2px 6px', borderRadius: 10 }}>{item.stories.length}</span>
          </div>
        </button>
      ))}
      {viewer && createPortal(
        <div className="story-viewer-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10000, height: '100vh' }} onClick={close}>
          <div style={{ position: 'absolute', top: 12, left: 12 }} onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={close} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8 }}>Close</button>
          </div>
          <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }} onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={prev} disabled={viewer.idx === 0} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8 }}>Prev</button>
            <button type="button" onClick={next} disabled={viewer.idx >= viewer.stories.length - 1} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8 }}>Next</button>
          </div>
          <div style={{ maxWidth: '90vw', maxHeight: '80vh', width: 'min(640px, 90vw)', height: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
            {viewer.stories[viewer.idx].mediaType === 'video' ? (
              <video src={viewer.stories[viewer.idx].mediaUrl} style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 16 }} autoPlay controls playsInline />
            ) : (
              <img src={viewer.stories[viewer.idx].mediaUrl} alt="Story" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 16 }} />
            )}
          </div>
          <div style={{ position: 'absolute', bottom: 28, fontSize: 14, color: '#fff' }} onClick={(e) => e.stopPropagation()}>
            {viewer.user.displayName || viewer.user.username} • {viewer.idx + 1}/{viewer.stories.length}
          </div>
        </div>,
        document.body
      )}
      {error && <div className="text-red-500 text-sm" role="alert">{error}</div>}
    </div>
  );
}
