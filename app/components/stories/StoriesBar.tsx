"use client";
import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/lib/api';
import type { Story } from '@/lib/types';
import Image from 'next/image';

interface Item { user: { id: string; username: string; displayName?: string; avatarUrl: string }; stories: Story[] }

export function StoriesBar() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ user: Item['user']; stories: Story[]; idx: number } | null>(null);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchStories = async () => {
      try {
        const data = await api.getFollowingStories();
        if (mounted) setItems(data.filter(d => d.stories.length));
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Failed to load stories');
      }
    };
    fetchStories();
    // Refresh every 5 minutes
    const interval = setInterval(fetchStories, 5 * 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const open = async (item: Item) => {
    setViewer({ user: item.user, stories: item.stories, idx: 0 });
    // Check if first story is liked
    try {
      const isLiked = await api.isLikedStory(item.stories[0].id);
      setLiked(isLiked);
    } catch {
      setLiked(false);
    }
  };
  const close = useCallback(() => {
    setViewer(null);
    setProgress(0);
    setPaused(false);
  }, []);
  const next = useCallback(async () => {
    setViewer(v => {
      if (!v) return v;
      const newIdx = Math.min(v.idx + 1, v.stories.length - 1);
      if (newIdx !== v.idx) {
        setProgress(0);
        // Check liked for new story
        api.isLikedStory(v.stories[newIdx].id).then(setLiked).catch(() => setLiked(false));
      }
      return { ...v, idx: newIdx };
    });
  }, []);
  const prev = useCallback(async () => {
    setViewer(v => {
      if (!v) return v;
      const newIdx = Math.max(v.idx - 1, 0);
      if (newIdx !== v.idx) {
        setProgress(0);
        // Check liked for new story
        api.isLikedStory(v.stories[newIdx].id).then(setLiked).catch(() => setLiked(false));
      }
      return { ...v, idx: newIdx };
    });
  }, []);
  const toggleLike = useCallback(async () => {
    if (!viewer) return;
    const storyId = viewer.stories[viewer.idx].id;
    try {
      if (liked) {
        await api.unlikeStory(storyId);
        setLiked(false);
      } else {
        await api.likeStory(storyId);
        setLiked(true);
      }
    } catch (e) {
      console.error('Failed to toggle like:', e);
    }
  }, [viewer, liked]);

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

  // Auto advance with progress
  useEffect(() => {
    if (!viewer || paused) return;
    const cur = viewer.stories[viewer.idx];
    const dur = cur?.mediaType === 'video' ? Math.min(Math.max(cur.durationSeconds || 6, 3), 15) : 6;
    const interval = 100; // update every 100ms
    const steps = (dur * 1000) / interval;
    let step = 0;
    const t = setInterval(() => {
      step++;
      setProgress((step / steps) * 100);
      if (step >= steps) {
        setViewer(v => {
          if (!v) return v;
          const newIdx = v.idx + 1;
          if (newIdx >= v.stories.length) {
            close();
            return null;
          }
          setProgress(0);
          return { ...v, idx: newIdx };
        });
      }
    }, interval);
    return () => clearInterval(t);
  }, [viewer, paused, close]);

  // Keyboard navigation
  useEffect(() => {
    if (!viewer) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [viewer, next, prev, close]);

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
          {/* Progress bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'rgba(255,255,255,0.2)', zIndex: 1 }}>
            <div style={{ height: '100%', background: '#fff', width: `${progress}%`, transition: 'width 0.1s linear' }} />
          </div>
          <div style={{ position: 'absolute', top: 12, left: 12 }} onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={close} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8 }}>Close</button>
          </div>
          <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }} onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={prev} disabled={viewer.idx === 0} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8 }}>Prev</button>
            <button type="button" onClick={next} disabled={viewer.idx >= viewer.stories.length - 1} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8 }}>Next</button>
            <button type="button" onClick={toggleLike} style={{ background: 'rgba(255,255,255,0.2)', color: liked ? '#ff7e39' : '#fff', border: '1px solid rgba(255,255,255,0.3)', padding: '8px 12px', borderRadius: 8, cursor: 'pointer' }}>
              {liked ? '❤️ Liked' : '🤍 Like'}
            </button>
          </div>
          <div style={{ maxWidth: '90vw', maxHeight: '80vh', width: 'min(640px, 90vw)', height: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
            {viewer.stories[viewer.idx].mediaType === 'video' ? (
              <video
                src={viewer.stories[viewer.idx].mediaUrl}
                style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 16 }}
                autoPlay
                playsInline
                onPlay={() => setPaused(false)}
                onPause={() => setPaused(true)}
                onEnded={() => next()}
              />
            ) : (
              <img src={viewer.stories[viewer.idx].mediaUrl} alt="Story" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 16 }} />
            )}
          </div>
          <div style={{ position: 'absolute', bottom: 28, fontSize: 14, color: '#fff', display: 'flex', alignItems: 'center', gap: 16 }} onClick={(e) => e.stopPropagation()}>
            <span>{viewer.user.displayName || viewer.user.username} • {viewer.idx + 1}/{viewer.stories.length} • {viewer.stories[viewer.idx].viewCount} views</span>
          </div>
        </div>,
        document.body
      )}
      {error && <div className="text-red-500 text-sm" role="alert">{error}</div>}
    </div>
  );
}
