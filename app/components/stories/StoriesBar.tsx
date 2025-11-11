"use client";
import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useUserHasStory } from '@/lib/hooks/useUserHasStory';
import type { Story } from '@/lib/types';
import { StoryAvatar } from '../ui/StoryAvatar';
import { Plus } from 'lucide-react';
import { LoadingIndicator } from '../ui/LoadingIndicator';
import { LiveCameraView } from '../uploader/LiveCameraView';
import { StoryViewerModal } from '../profile/StoryViewerModal';
import { PublicStoryViewerModal } from '../profile/PublicStoryViewerModal';
import { useCameraContext } from '../context/CameraContext';

interface Item { user: { id: string; username: string; displayName?: string; avatarUrl: string }; stories: Story[] }

interface StoriesBarProps {
  fetchStories?: () => Promise<Item[]>;
}

export function StoriesBar({ fetchStories }: StoriesBarProps = {}) {
  const { data: currentUser } = useCurrentUser();
  const { hasStory: userHasStory, refetch: refetchUserStory } = useUserHasStory(currentUser?.id);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ user: Item['user']; stories: Story[]; idx: number; isOwn: boolean } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { setIsCameraOpen, setCaptureCallback } = useCameraContext();

  useEffect(() => {
    let mounted = true;
    const fetchStoriesData = async () => {
      try {
        const data = fetchStories ? await fetchStories() : await api.getFollowingStories();
        if (mounted) setItems(data.filter(d => d.stories.length));
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Failed to load stories');
      }
    };
    fetchStoriesData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchStoriesData, 5 * 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [fetchStories]);

  const open = async (item: Item) => {
    const isOwn = currentUser?.id === item.user.id;
    setViewer({ user: item.user, stories: item.stories, idx: 0, isOwn });
  };
  const close = useCallback(() => {
    setViewer(null);
    setDeleteArmed(false);
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

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadError(null);
    if (!/^image\//.test(f.type) && !/^video\//.test(f.type)) {
      setUploadError('Please select an image or a short video');
      return;
    }
    // Size limits
    const maxImage = 10 * 1024 * 1024; // 10MB
    const maxVideo = 15 * 1024 * 1024; // 15MB
    if (/^image\//.test(f.type) && f.size > maxImage) {
      setUploadError('Image too large (max 10MB)');
      return;
    }
    if (/^video\//.test(f.type) && f.size > maxVideo) {
      setUploadError('Video too large (max 15MB)');
      return;
    }
    setUploading(true);
    try {
      if (/^image\//.test(f.type)) {
        const dataUrl: string = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onerror = () => rej(new Error('read error'));
          r.onload = () => res(String(r.result));
          r.readAsDataURL(f);
        });
        await api.createStory({ dataUrl, mediaType: 'image' });
      } else {
        const dataUrl: string = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onerror = () => rej(new Error('read error'));
          r.onload = () => res(String(r.result));
          r.readAsDataURL(f);
        });
        await api.createStory({ dataUrl, mediaType: 'video' });
      }
      // Refresh stories after upload
      const data = fetchStories ? await fetchStories() : await api.getFollowingStories();
      setItems(data.filter(d => d.stories.length));
      refetchUserStory();
      if (fileRef.current) fileRef.current.value = '';
    } catch (e: any) {
      setUploadError(e?.message || 'Failed to upload');
    } finally {
      setUploading(false);
    }
  };

  const handleCameraCapture = async (blob: Blob) => {
    setUploadError(null);
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onerror = () => rej(new Error('read error'));
        r.onload = () => res(String(r.result));
        r.readAsDataURL(blob);
      });
      await api.createStory({ dataUrl, mediaType: 'image' });
      // Refresh stories after upload
      const data = fetchStories ? await fetchStories() : await api.getFollowingStories();
      setItems(data.filter(d => d.stories.length));
      refetchUserStory();
    } catch (e: any) {
      setUploadError(e?.message || 'Failed to upload');
    } finally {
      setUploading(false);
    }
  };

  const addStory = () => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      setCaptureCallback(() => handleCameraCapture);
      setIsCameraOpen(true);
    } else {
      // Fallback to file input
      fileRef.current?.click();
    }
  };

  const handleStoriesUpdate = useCallback(async (updatedStories: Story[]) => {
    if (viewer?.isOwn) {
      // Update the viewer with new stories
      setViewer(prev => prev ? { ...prev, stories: updatedStories } : null);
      // Force refresh the user story status
      await refetchUserStory();
    }
    // Always refresh the story bar items
    try {
      const data = fetchStories ? await fetchStories() : await api.getFollowingStories();
      setItems(data.filter(d => d.stories.length));
    } catch (e: any) {
      console.error('Failed to refresh stories:', e);
    }
  }, [viewer?.isOwn, refetchUserStory, fetchStories]);

  const handleHasActiveStoriesUpdate = useCallback(async (hasActive: boolean) => {
    if (viewer?.isOwn) {
      // This will trigger a re-render of the story bar
      refetchUserStory();
    }
    // Always refresh the story bar items
    try {
      const data = fetchStories ? await fetchStories() : await api.getFollowingStories();
      setItems(data.filter(d => d.stories.length));
    } catch (e: any) {
      console.error('Failed to refresh stories:', e);
    }
  }, [viewer?.isOwn, refetchUserStory, fetchStories]);

  const handleCurrentUserClick = async () => {
    if (userHasStory && currentUser) {
      // View own stories
      const stories = await api.getActiveStoriesForUser(currentUser.id);
      if (stories.length > 0) {
        setViewer({ user: currentUser, stories, idx: 0, isOwn: true });
      }
    } else {
      addStory();
    }
  };

  useEffect(() => {
    if (!viewer) return;
    const cur = viewer.stories[viewer.idx];
    if (cur) api.markStoryViewed(cur.id).catch(() => {});
  }, [viewer?.idx, viewer]);

  if (!items.length && !error && !currentUser) return null;

  return (
    <div className="stories-bar" style={{ display: 'flex', gap: 12, padding: '8px 16px', overflowX: 'auto' }}>
      {currentUser && (
        <div style={{ position: 'relative' }}>
          <StoryAvatar
            key={`user-avatar-${userHasStory ? 'has-story' : 'no-story'}`}
            src={currentUser.avatarUrl || '/logo.svg'}
            alt="Your story"
            hasStory={userHasStory}
            size={56}
            onClick={handleCurrentUserClick}
            aria-label={userHasStory ? "View your stories" : "Add your story"}
          />
          {!userHasStory && (
            <div style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              background: '#007bff',
              borderRadius: '50%',
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid white'
            }}>
              <Plus size={12} color="white" />
            </div>
          )}
          {uploading && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <LoadingIndicator size="small" />
            </div>
          )}
        </div>
      )}
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
      <input ref={fileRef} type="file" accept="image/*,video/*" onChange={onPick} style={{ display: 'none' }} />
      {viewer && (
        viewer.isOwn ? (
          <StoryViewerModal
            isOpen={true}
            onClose={close}
            stories={viewer.stories}
            currentIndex={viewer.idx}
            onPrev={prev}
            onNext={next}
            deleteArmed={deleteArmed}
            setDeleteArmed={setDeleteArmed}
            onLiveCamera={() => {
              setCaptureCallback(() => handleCameraCapture);
              setIsCameraOpen(true);
            }}
            user={viewer.user}
            setStories={handleStoriesUpdate}
            setHasActiveStories={handleHasActiveStoriesUpdate}
          />
        ) : (
          <PublicStoryViewerModal
            isOpen={true}
            onClose={close}
            stories={viewer.stories}
            currentIndex={viewer.idx}
            onPrev={prev}
            onNext={next}
            user={viewer.user}
          />
        )
      )}
      {(error || uploadError) && <div className="text-red-500 text-sm" role="alert">{error || uploadError}</div>}
    </div>
  );
}
