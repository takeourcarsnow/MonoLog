import { createPortal } from 'react-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from "@/lib/api";
import { dedupe } from "@/lib/requestDeduplication";
import type { Story, User } from "@/lib/types";

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
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [loadedStories, setLoadedStories] = useState<Set<number>>(new Set());
  const controlsRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLVideoElement | HTMLImageElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
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

  // Progress tracking for auto-advance
  useEffect(() => {
    if (!isOpen || !currentStory || isPaused) return;

    const duration = currentStory.mediaType === 'video' ? 
      Math.min(Math.max(currentStory.durationSeconds || 6, 3), 15) : 6;

    const startTime = Date.now();
    progressIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        onNext();
      }
    }, 100);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isOpen, currentStory, currentIndex, isPaused, onNext]);

  // Pause on hover
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const handleMouseEnter = () => setIsPaused(true);
    const handleMouseLeave = () => setIsPaused(false);

    controls.addEventListener('mouseenter', handleMouseEnter);
    controls.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      controls.removeEventListener('mouseenter', handleMouseEnter);
      controls.removeEventListener('mouseleave', handleMouseLeave);
    };
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
        case ' ':
          e.preventDefault();
          setIsPaused(prev => !prev);
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
    setProgress(0);
  }, [currentIndex, loadedStories]);

  // Reset loaded stories when modal closes
  useEffect(() => {
    if (!isOpen) {
      setLoadedStories(new Set());
      setIsLoading(false);
      setProgress(0);
    }
  }, [isOpen]);

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
      {/* Progress bar */}
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        height: 3, 
        background: 'rgba(255,255,255,0.2)',
        zIndex: 10001
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: '#fff',
          transition: isPaused ? 'none' : 'width 0.1s linear'
        }} />
      </div>

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
          opacity: isPaused ? 1 : 0.7,
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
            setIsPaused(!isPaused);
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
          aria-label={isPaused ? "Play" : "Pause"}
        >
          {isPaused ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="5,3 19,12 5,21" fill="currentColor"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
              <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
            </svg>
          )}
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
          aria-label="Take live photo"
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
        onClick={(e) => e.stopPropagation()}
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
            autoPlay={!isPaused} 
            controls={false} 
            playsInline 
            muted
            onLoadedData={handleMediaLoad}
            onError={handleMediaError}
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
      </div>

      {/* Story info */}
      <div 
        style={{ 
          position: 'absolute', 
          bottom: 28, 
          fontSize: 14, 
          color: '#fff',
          textAlign: 'center',
          opacity: isPaused ? 1 : 0.8,
          transition: 'opacity 0.2s'
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
          <div style={{ fontWeight: '500' }}>Your story</div>
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

      {/* Invisible side areas for easier navigation on desktop */}
      <div 
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '20%',
          cursor: 'pointer'
        }}
        onClick={(e) => {
          e.stopPropagation();
          onPrev();
        }}
        aria-label="Previous story"
      />
      <div 
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '20%',
          cursor: 'pointer'
        }}
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
        aria-label="Next story"
      />
    </div>,
    document.body
  );
}