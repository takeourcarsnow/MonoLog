"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

export function useImageEditorFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const handleToggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        // Enter fullscreen
        await document.documentElement.requestFullscreen();
        document.body.classList.add('fs-open');
        document.documentElement.classList.add('fs-open');
        setIsFullscreen(true);
      } else {
        // Exit fullscreen
        await document.exitFullscreen();
        document.body.classList.remove('fs-open');
        document.documentElement.classList.remove('fs-open');
        setIsFullscreen(false);
      }
    } catch (error) {
      console.warn('Fullscreen toggle failed:', error);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      if (isCurrentlyFullscreen) {
        document.body.classList.add('fs-open');
        document.documentElement.classList.add('fs-open');
      } else {
        document.body.classList.remove('fs-open');
        document.documentElement.classList.remove('fs-open');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return {
    isFullscreen,
    editorContainerRef,
    handleToggleFullscreen,
  };
}