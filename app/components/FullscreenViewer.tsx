"use client";


import { useEffect, useRef, useState } from "react";
import Portal from "./Portal";
import ImageZoom from "./ImageZoom";


type Props = {
  src: string;
  alt?: string;
  onClose: () => void;
};


export default function FullscreenViewer({ src, alt, onClose }: Props) {
  const [isActive, setIsActive] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const scrollY = useRef<number>(0);

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

    // Blur background after paint for smooth transition
    const raf = requestAnimationFrame(() => {
      document.body.classList.add('fs-blur');
      setIsActive(true);
    });

    return () => {
      cancelAnimationFrame(raf);
      document.body.classList.remove('fs-blur');
      document.body.classList.remove('fs-open');
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.paddingRight = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY.current);
    };
  }, []);

  // Keyboard: close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') startClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Start close sequence: fade out then call onClose
  const startClose = () => {
    if (!isActive) return;
    document.body.classList.remove('fs-blur');
    setIsActive(false);
    setTimeout(() => {
      onClose();
    }, 180);
  };

  // Ensure the viewer root can be focused for accessibility when opened
  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  return (
    <Portal>
      <div
        ref={rootRef}
        tabIndex={-1}
        className={`fullscreen-viewer${isActive ? ' fs-active' : ''}`}
        role="dialog"
        aria-modal="true"
      >
        <button className="fv-close" aria-label="Close" onClick={startClose}>✕</button>
        <div className="fv-inner">
          <ImageZoom src={src} alt={alt || 'Photo'} maxScale={6} isFullscreen />
        </div>
      </div>
    </Portal>
  );
}
