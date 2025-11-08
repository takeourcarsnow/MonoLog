"use client";
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Story } from '@/lib/types';
import { PublicStoryViewerModal } from '../profile/PublicStoryViewerModal';
import { StoryAvatar } from '../ui/StoryAvatar';

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
      if (v.idx + 1 >= v.stories.length) {
        // Last story finished, close
        return null;
      }
      const newIdx = v.idx + 1;
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
    <div className="stories-bar" style={{ display: 'flex', gap: 12, padding: '8px 16px', overflowX: 'auto' }}>
      {items.map(item => (
        <StoryAvatar
          key={item.user.id}
          src={item.user.avatarUrl || '/logo.svg'}
          alt={item.user.displayName || item.user.username}
          hasStory={true}
          size={56}
          showCount={item.stories.length}
          onClick={() => open(item)}
          aria-label={`View ${item.user.displayName || item.user.username}'s stories`}
        />
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
