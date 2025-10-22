import { useState, useRef, useCallback } from "react";

export function useImageEditorFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const handleToggleFullscreen = useCallback(() => {
    const el = editorContainerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  return {
    isFullscreen,
    editorContainerRef,
    handleToggleFullscreen,
  };
}