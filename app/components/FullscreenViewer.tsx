"use client";


import { useCallback, useEffect, useRef, useState } from "react";
import Portal from "./Portal";
import dynamic from 'next/dynamic';
const ImageZoom = dynamic(() => import('./ImageZoom'), { ssr: false });


type Props = {
  src: string;
  alt?: string;
  onClose: () => void;
};


export default function FullscreenViewer({ src, alt, onClose }: Props) {
  const [isActive, setIsActive] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const ignorePopRef = useRef(false);
  const scrollY = useRef<number>(0);
  // A stable id for this fullscreen viewer instance so ImageZoom instances
  // can include it in zoom events and other instances can reset when the
  // fullscreen viewer opens.
  const viewerIdRef = useRef<string>(Math.random().toString(36).slice(2));

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
      // When closing/unmounting, ensure any zoom state triggered by the
      // fullscreen viewer is cleared. Use the captured viewerId so the
      // cleanup references the same instance that opened the viewer.
      try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:zoom_end', { detail: { id: viewerIdRef.current } })); } catch (_) {}
    };
  }, []);

  // Keyboard: close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') startClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [startClose]);

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

  return (
    <Portal className="fullscreen-portal">
      <div
        ref={rootRef}
        tabIndex={-1}
        className={`fullscreen-viewer no-swipe ${isActive ? 'active' : ''}`}
        role="dialog"
        aria-modal="true"
      >
        <button className="fv-close" aria-label="Close" onClick={startClose}>✕</button>
        <div className="fv-inner">
          <ImageZoom src={src} alt={alt || 'Photo'} maxScale={6} isFullscreen instanceId={viewerIdRef.current} />
        </div>
      </div>
    </Portal>
  );
}
