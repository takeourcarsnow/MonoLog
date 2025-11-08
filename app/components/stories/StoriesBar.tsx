"use client";
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Story } from '@/lib/types';
import Image from 'next/image';
import { PublicStoryViewerModal } from '../profile/PublicStoryViewerModal';

interface Item { user: { id: string; username: string; displayName?: string; avatarUrl: string }; stories: Story[] }

export function StoriesBar() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ user: Item['user']; stories: Story[]; idx: number } | null>(null);

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
  };
  const close = useCallback(() => {
    setViewer(null);
  }, []);
  const next = useCallback(async () => {
    setViewer(v => {
      if (!v) return v;
      const newIdx = (v.idx + 1) % v.stories.length;
      return { ...v, idx: newIdx };
    });
  }, []);
  const prev = useCallback(async () => {
    setViewer(v => {
      if (!v) return v;
      const newIdx = v.idx === 0 ? v.stories.length - 1 : v.idx - 1;
      return { ...v, idx: newIdx };
    });
  }, []);

  useEffect(() => {
    if (!viewer) return;
    const cur = viewer.stories[viewer.idx];
    if (cur) api.markStoryViewed(cur.id).catch(() => {});
  }, [viewer?.idx, viewer]);

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
      {viewer && (
        <PublicStoryViewerModal
          isOpen={true}
          onClose={close}
          stories={viewer.stories}
          currentIndex={viewer.idx}
          onPrev={prev}
          onNext={next}
          user={viewer.user}
        />
      )}
      {error && <div className="text-red-500 text-sm" role="alert">{error}</div>}
    </div>
  );
}
