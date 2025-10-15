"use client";


import { useCallback, useEffect, useRef, useState } from "react";
import Portal from "./Portal";
import dynamic from 'next/dynamic';
const ImageZoom = dynamic(() => import('./ImageZoom'), { ssr: false });


type Props = {
  images: {src: string, alt: string}[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
};


export default function FullscreenViewer({ images, currentIndex, onClose, onNext, onPrev }: Props) {
  const [isActive, setIsActive] = useState(false);
  const [showNav, setShowNav] = useState(images.length > 1);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const ignorePopRef = useRef(false);
  const scrollY = useRef<number>(0);
  const navTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Swipe detection
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchEndRef = useRef<{ x: number; y: number } | null>(null);
  // A stable id for this fullscreen viewer instance so ImageZoom instances
  // can include it in zoom events and other instances can reset when the
  // fullscreen viewer opens.
  const viewerIdRef = useRef<string>(Math.random().toString(36).slice(2));

  const currentImage = images[currentIndex];

  // Swipe detection functions
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = touchStartRef.current.x - currentX;
    const diffY = touchStartRef.current.y - currentY;
    
    // If vertical movement is greater than horizontal, let it pass through (for zoom)
    if (Math.abs(diffY) > Math.abs(diffX)) {
      return;
    }
    
    // Note: Removed preventDefault() to avoid passive event listener errors
    // The swipe detection will still work without preventing default scrolling
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) {
      // Not a swipe, don't handle interaction here (let click handler do it)
      return;
    }
    
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = touchStartRef.current.x - endX;
    const diffY = touchStartRef.current.y - endY;
    
    // Minimum swipe distance (50px) and horizontal movement should be greater than vertical
    const minSwipeDistance = 50;
    if (Math.abs(diffX) > minSwipeDistance && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) {
        // Swiped left - next image
        onNext();
      } else {
        // Swiped right - previous image
        onPrev();
      }
    }
    // If not a significant swipe, let the click handler handle showing navigation
    
    // Reset touch refs
    touchStartRef.current = null;
    touchEndRef.current = null;
  }, [onNext, onPrev]);

  // Show navigation arrows and set auto-hide timer
  const showNavigation = useCallback(() => {
    setShowNav(true);
    // Clear any existing timer
    if (navTimerRef.current) {
      clearTimeout(navTimerRef.current);
    }
    // Set new timer to hide after 3 seconds
    navTimerRef.current = setTimeout(() => {
      setShowNav(false);
    }, 3000);
  }, []);

  // Hide navigation arrows immediately
  const hideNavigation = useCallback(() => {
    if (navTimerRef.current) {
      clearTimeout(navTimerRef.current);
    }
    setShowNav(false);
  }, []);

  // Handle click/touch on fullscreen viewer to show navigation
  const handleViewerInteraction = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Only show nav if interacting with the viewer itself, not on buttons
    if ((e.target as HTMLElement).closest('.fv-nav, .fv-close')) {
      return;
    }
    showNavigation();
  }, [showNavigation]);

  // Start close sequence: fade out then call onClose
  const startClose = useCallback(() => {
    if (!isActive) return;
    // If we programmatically navigate back to remove the pushed history entry
    // make sure the popstate handler ignores that event.
    if (window.history && window.history.state && (window.history.state as any).fullscreenViewer) {
      ignorePopRef.current = true;
      // go back so the history entry we pushed when opening is removed
      window.history.back();
    }

    setIsActive(false);
    // Delay calling onClose to allow the fade out animation to complete
    setTimeout(() => {
      onClose();
    }, 300);
  }, [isActive, onClose]);

  // Lock scroll and add fullscreen classes
  useEffect(() => {
    scrollY.current = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY.current}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    const scrollbarGap = window.innerWidth - document.documentElement.clientWidth || 0;
    if (scrollbarGap > 0) document.body.style.paddingRight = `${scrollbarGap}px`;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('fs-open');

    // Delay setting active to allow initial render with blur effect
    setTimeout(() => {
      setIsActive(true);
    }, 10);
    
    // Notify other ImageZoom instances that fullscreen viewer is active
    // so they can reset (zoom out). Include our viewer id as origin.
    try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:zoom_start', { detail: { id: viewerIdRef.current } })); } catch (_) {}

    // Push a history entry so the browser "back" action closes fullscreen
    // instead of navigating away from the current page.
    try {
      if (window.history && window.history.pushState) {
        window.history.pushState({ fullscreenViewer: true }, '');
      }
    } catch (e) {
      // ignore possible security exceptions (e.g. in some embedded contexts)
    }

    return () => {
      document.body.classList.remove('fs-open');
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.paddingRight = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY.current);
      // Clear navigation timer
      if (navTimerRef.current) {
        clearTimeout(navTimerRef.current);
      }
      // When closing/unmounting, ensure any zoom state triggered by the
      // fullscreen viewer is cleared. Use the captured viewerId so the
      // cleanup references the same instance that opened the viewer.
      try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:zoom_end', { detail: { id: viewerIdRef.current } })); } catch (_) {}
    };
  }, []);

  // Keyboard: close on Escape, navigate with arrow keys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') startClose();
      if (e.key === 'ArrowLeft' && images.length > 1) onPrev();
      if (e.key === 'ArrowRight' && images.length > 1) onNext();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [startClose, onPrev, onNext, images.length]);

  // Intercept browser back (popstate) while fullscreen is open and close the
  // viewer instead of allowing the navigation.
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      // Ignore popstate events we triggered ourselves via history.back()
      if (ignorePopRef.current) {
        ignorePopRef.current = false;
        return;
      }

      // If viewer is active, close it. The browser already moved the history
      // pointer back (to the state before our pushed one), so we just close UI.
      if (isActive) startClose();
    };

    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      // If component unmounts while the pushed history entry still exists,
      // remove it so we don't leave a stale history entry.
      try {
        if (window.history && (window.history.state as any)?.fullscreenViewer) {
          ignorePopRef.current = true;
          window.history.back();
        }
      } catch (e) {
        // ignore
      }
    };
  }, [isActive, startClose]);

  // Ensure the viewer root can be focused for accessibility when opened
  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  // Auto-hide navigation arrows after initial display
  useEffect(() => {
    if (images.length > 1 && showNav && !navTimerRef.current) {
      navTimerRef.current = setTimeout(() => {
        setShowNav(false);
      }, 3000); // Hide after 3 seconds
    }
    return () => {
      if (navTimerRef.current) {
        clearTimeout(navTimerRef.current);
        navTimerRef.current = null;
      }
    };
  }, [images.length, showNav]);

  return (
    <Portal className="fullscreen-portal">
      <div
        ref={rootRef}
        tabIndex={-1}
        className={`fullscreen-viewer no-swipe ${isActive ? 'active' : ''}`}
        role="dialog"
        aria-modal="true"
        onClick={handleViewerInteraction}
        onTouchEnd={handleViewerInteraction}
      >
        <button className="fv-close" aria-label="Close" onClick={startClose}>✕</button>
        {images.length > 1 && (
          <>
            <button 
              className={`fv-nav fv-prev ${showNav ? 'visible' : ''}`} 
              aria-label="Previous image" 
              onClick={onPrev}
              onMouseEnter={showNavigation}
              onMouseLeave={hideNavigation}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button 
              className={`fv-nav fv-next ${showNav ? 'visible' : ''}`} 
              aria-label="Next image" 
              onClick={onNext}
              onMouseEnter={showNavigation}
              onMouseLeave={hideNavigation}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </>
        )}
        <div 
          className="fv-inner" 
          onClick={handleViewerInteraction} 
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <ImageZoom src={currentImage.src} alt={currentImage.alt} maxScale={6} isFullscreen instanceId={viewerIdRef.current} />
        </div>
      </div>
    </Portal>
  );
}
