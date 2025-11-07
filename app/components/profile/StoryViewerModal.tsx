import { createPortal } from 'react-dom';
import { api } from "@/lib/api";
import { dedupe } from "@/lib/requestDeduplication";
import type { Story } from "@/lib/types";

interface StoryViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  stories: Story[];
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
  deleteArmed: boolean;
  setDeleteArmed: (armed: boolean) => void;
  onLiveCamera: () => void;
  onFileUpload: () => void;
  userId: string;
  setStories: (stories: Story[]) => void;
  setHasActiveStories: (has: boolean) => void;
}

export function StoryViewerModal({
  isOpen,
  onClose,
  stories,
  currentIndex,
  onPrev,
  onNext,
  deleteArmed,
  setDeleteArmed,
  onLiveCamera,
  onFileUpload,
  userId,
  setStories,
  setHasActiveStories
}: StoryViewerModalProps) {
  if (!isOpen || stories.length === 0) return null;

  const handleDelete = async () => {
    if (!deleteArmed) {
      setDeleteArmed(true);
      return;
    }
    try {
      await api.deleteStory(stories[currentIndex].id);
      const updatedStories = await dedupe(`getActiveStoriesForUser:${userId}`, () => api.getActiveStoriesForUser(userId));
      setStories(updatedStories);
      setHasActiveStories(updatedStories.length > 0);
      if (updatedStories.length === 0) {
        onClose();
      } else if (currentIndex >= updatedStories.length) {
        // Adjust index if needed, but onNext/onPrev handle it
      }
      setDeleteArmed(false);
    } catch (e: any) {
      console.warn('Failed to delete story:', e?.message);
      setDeleteArmed(false);
    }
  };

  return createPortal(
    <div className="story-viewer-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10000, height: '100vh' }} onClick={onClose}>
      <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8 }} onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onPrev} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '8px', borderRadius: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button type="button" onClick={onNext} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '8px', borderRadius: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button type="button" onClick={handleDelete} style={{ background: deleteArmed ? 'rgba(255,0,0,0.3)' : 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '8px', borderRadius: 8 }}>
          {deleteArmed ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6h18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 11v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 11v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
        <button type="button" onClick={onLiveCamera} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '8px', borderRadius: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </button>
        <button type="button" onClick={onFileUpload} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '8px', borderRadius: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="10,9 9,9 8,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
      <div style={{ maxWidth: '90vw', maxHeight: '80vh', width: 'min(640px, 90vw)', height: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
        {stories[currentIndex].mediaType === 'video' ? (
          <video src={stories[currentIndex].mediaUrl} style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 16 }} autoPlay controls playsInline />
        ) : (
          <img src={stories[currentIndex].mediaUrl} alt="Your story" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 16 }} />
        )}
      </div>
      <div style={{ position: 'absolute', bottom: 28, fontSize: 14, color: '#fff' }} onClick={(e) => e.stopPropagation()}>
        Your story • {currentIndex + 1}/{stories.length}
      </div>
    </div>,
    document.body
  );
}