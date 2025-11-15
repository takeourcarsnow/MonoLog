import { createPortal } from 'react-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from "@/lib/api";
import { dedupe } from "@/lib/requestDeduplication";
import type { Story, User } from "@/lib/types";
import { StoryComments } from '../comments/StoryComments';

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
  user: Pick<User, "id" | "username" | "displayName" | "avatarUrl">;
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
  user,
  setStories,
  setHasActiveStories
}: StoryViewerModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [loadedStories, setLoadedStories] = useState<Set<number>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const controlsRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLVideoElement | HTMLImageElement>(null);
  const minSwipeDistance = 50;

  const currentStory = stories[currentIndex];

  // Handle media loading
  const handleMediaLoad = useCallback(() => {
    setIsLoading(false);
    setLoadedStories(prev => new Set(prev).add(currentIndex));
  }, [currentIndex]);

  const handleMediaError = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          onPrev();
          break;
        case 'ArrowRight':
          onNext();
          break;
        case 'Delete':
        case 'Backspace':
          if (!deleteArmed) {
            setDeleteArmed(true);
            setTimeout(() => setDeleteArmed(false), 3000);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onPrev, onNext, deleteArmed, setDeleteArmed]);

  // Touch/swipe handling
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      onNext();
    } else if (isRightSwipe) {
      onPrev();
    }
  };

  // Reset loading state when story changes
  useEffect(() => {
    if (!loadedStories.has(currentIndex)) {
      setIsLoading(true);
    }
  }, [currentIndex, loadedStories]);

  // Reset loaded stories when modal closes
  useEffect(() => {
    if (!isOpen) {
      setLoadedStories(new Set());
      setIsLoading(false);
    }
  }, [isOpen]);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isOpen || stories.length === 0) return null;

  const handleDelete = async () => {
    if (!deleteArmed) {
      setDeleteArmed(true);
      return;
    }
    try {
      const storyToDelete = stories[currentIndex];
      await api.deleteStory(storyToDelete.id);
      
      // Update local state optimistically by removing the deleted story
      const updatedStories = stories.filter(story => story.id !== storyToDelete.id);
      setStories(updatedStories);
      
      onClose();
      setDeleteArmed(false);
    } catch (e: any) {
      console.warn('Failed to delete story:', e?.message);
      // On failure, refresh to correct state
      try {
        const refreshedStories = await dedupe(`getActiveStoriesForUser:${user.id}`, () => api.getActiveStoriesForUser(user.id));
        setStories(refreshedStories);
      } catch (_) {
        // ignore
      }
      setDeleteArmed(false);
    }
  };

  return createPortal(
    <div 
      className="story-viewer-overlay" 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        background: 'rgba(0,0,0,0.92)', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        zIndex: 10000, 
        height: '100vh',
        cursor: 'default'
      }} 
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Controls */}
      <div 
        ref={controlsRef}
        style={{ 
          position: 'absolute', 
          top: 12, 
          left: '50%', 
          transform: 'translateX(-50%)', 
          display: 'flex', 
          gap: 8,
          opacity: 0.7,
          transition: 'opacity 0.2s'
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          type="button" 
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }} 
          style={{ 
            background: 'rgba(255,255,255,0.1)', 
            color: '#fff', 
            border: 'none', 
            padding: '12px', 
            borderRadius: 8,
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          aria-label="Previous story"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <button 
          type="button" 
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }} 
          style={{ 
            background: 'rgba(255,255,255,0.1)', 
            color: '#fff', 
            border: 'none', 
            padding: '12px', 
            borderRadius: 8,
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          aria-label="Next story"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        
        <button 
          type="button" 
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }} 
          style={{ 
            background: deleteArmed ? 'rgba(255,0,0,0.3)' : 'rgba(255,255,255,0.1)', 
            color: '#fff', 
            border: 'none', 
            padding: '12px', 
            borderRadius: 8,
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = deleteArmed ? 'rgba(255,0,0,0.4)' : 'rgba(255,255,255,0.2)'}
          onMouseLeave={(e) => e.currentTarget.style.background = deleteArmed ? 'rgba(255,0,0,0.3)' : 'rgba(255,255,255,0.1)'}
          aria-label={deleteArmed ? "Confirm delete" : "Delete story"}
        >
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

        <button 
          type="button" 
          onClick={(e) => {
            e.stopPropagation();
            setShowComments(!showComments);
          }} 
          style={{ 
            background: showComments ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)', 
            color: '#fff', 
            border: 'none', 
            padding: '12px', 
            borderRadius: 8,
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = showComments ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.2)'}
          onMouseLeave={(e) => e.currentTarget.style.background = showComments ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'}
          aria-label="Toggle comments"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <button 
          type="button" 
          onClick={(e) => {
            e.stopPropagation();
            onLiveCamera();
          }} 
          style={{ 
            background: 'rgba(255,255,255,0.1)', 
            color: '#fff', 
            border: 'none', 
            padding: '12px', 
            borderRadius: 8,
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          aria-label="Open live camera"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </button>
      </div>

      {/* Media container */}
      <div 
        style={{ 
          maxWidth: '90vw', 
          maxHeight: '80vh', 
          width: 'min(640px, 90vw)', 
          height: 'auto', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          position: 'relative'
        }} 
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
      >
        {isLoading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
            borderRadius: 16,
            zIndex: 1
          }}>
            <div style={{
              width: 40,
              height: 40,
              border: '3px solid transparent',
              borderTop: '3px solid #fff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite, story-progress-rainbow 3s linear infinite',
              background: 'linear-gradient(45deg, #ff0096, #00ccff, #ff7e39, #ffff00, #ff0096) border-box',
              backgroundSize: '400% 400%',
              backgroundClip: 'border-box',
              willChange: 'background-position'
            }} />
          </div>
        )}
        
        {currentStory.mediaType === 'video' ? (
          <video 
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            src={currentStory.mediaUrl} 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '80vh', 
              borderRadius: 16,
              display: isLoading ? 'none' : 'block'
            }} 
            controls={false} 
            playsInline 
            muted
            onLoadedData={handleMediaLoad}
            onError={handleMediaError}
            onEnded={() => {
              // Prevent any default behavior when video ends
            }}
          />
        ) : (
          <img 
            ref={mediaRef as React.RefObject<HTMLImageElement>}
            src={currentStory.mediaUrl} 
            alt="Your story" 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '80vh', 
              borderRadius: 16,
              display: isLoading ? 'none' : 'block'
            }}
            onLoad={handleMediaLoad}
            onError={handleMediaError}
          />
        )}

        {/* Comments section */}
        {showComments && (
          <div 
            className="story-comments-pane"
            style={{ 
              position: 'absolute', 
              bottom: 0, 
              left: 0, 
              right: 0, 
              height: isMobile ? 200 : 250, 
              background: 'rgba(0,0,0,0.8)', 
              borderTop: '1px solid rgba(255,255,255,0.1)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '0 0 16px 16px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>Comments</span>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px' }}>
              <StoryComments storyId={currentStory.id} />
            </div>
          </div>
        )}
      </div>

      {/* Story info */}
      <div 
        style={{ 
          position: 'absolute', 
          bottom: 28, 
          fontSize: 14, 
          color: '#fff',
          textAlign: 'center',
          opacity: 0.8,
          transition: 'opacity 0.2s, bottom 0.3s',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <img 
            src={user.avatarUrl || "/logo.svg"} 
            alt={user.displayName ?? user.username}
            style={{ 
              width: 40, 
              height: 40, 
              borderRadius: '50%', 
              objectFit: 'cover'
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {stories.map((_, index) => (
              <div
                key={index}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: index === currentIndex ? '#fff' : 'rgba(255,255,255,0.4)',
                  transition: 'background-color 0.2s'
                }}
              />
            ))}
          </div>
        </div>
      </div>

    </div>,
    document.body
  );
}