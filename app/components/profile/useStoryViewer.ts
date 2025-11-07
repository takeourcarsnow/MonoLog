import { useEffect } from "react";
import type { Story } from "@/lib/types";

export function useStoryViewerEffects(
  viewerOpen: boolean,
  viewerIdx: number,
  ownStories: Story[],
  setViewerIdx: React.Dispatch<React.SetStateAction<number>>,
  setViewerOpen: (open: boolean) => void,
  setDeleteArmed: (armed: boolean) => void
) {
  // Auto advance stories
  useEffect(() => {
    if (!viewerOpen || !ownStories.length) return;
    const cur = ownStories[viewerIdx];
    const dur = cur?.mediaType === 'video' ? Math.min(Math.max(cur.durationSeconds || 6, 3), 15) : 6;
    const t = setTimeout(() => {
      setViewerIdx(v => (v + 1) >= ownStories.length ? 0 : v + 1); // loop for own stories
    }, dur * 1000);
    return () => clearTimeout(t);
  }, [viewerOpen, viewerIdx, ownStories]);

  useEffect(() => {
    if (!viewerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewerOpen(false);
      else if (e.key === 'ArrowLeft') setViewerIdx(v => v === 0 ? ownStories.length - 1 : v - 1);
      else if (e.key === 'ArrowRight') setViewerIdx(v => (v + 1) % ownStories.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewerOpen, viewerIdx, ownStories.length, setViewerIdx, setViewerOpen]);

  // Prevent body scroll and scroll to top when viewer opens
  useEffect(() => {
    if (viewerOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('story-modal-open');
      window.scrollTo(0, 0);
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('story-modal-open');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('story-modal-open');
    };
  }, [viewerOpen]);

  useEffect(() => {
    if (!viewerOpen) {
      setDeleteArmed(false);
    }
  }, [viewerOpen, setDeleteArmed]);

  useEffect(() => {
    setDeleteArmed(false);
  }, [viewerIdx, setDeleteArmed]);
}

// Backwards-compatible alias used by ProfileAvatar import
export const useStoryViewer = useStoryViewerEffects;