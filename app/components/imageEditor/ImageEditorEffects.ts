import { useEffect } from "react";
import { preloadOverlayThumbnails } from './overlaysPreload';
import { preloadFrameThumbnails } from './framesPreload';

export function useImageEditorEffects() {
  // While the image editor is mounted we want to make the bottom navbar non-interactive.
  useEffect(() => {
    const bar = document.querySelector('.tabbar') as HTMLElement | null;
    // Add a body class which CSS can target immediately to disable pointer-events
    // on the tabbar and its children. This is more reliable than depending on
    // runtime JS-style changes to every child and works even before the inert
    // polyfill finishes loading.
    const body = document.body;
    body.classList.add('imgedit-open');

    let hadInert = false;
    let prevPointer = '';
    if (bar) {
      hadInert = bar.hasAttribute('inert');
      prevPointer = bar.style.pointerEvents || '';
      if (!hadInert) bar.setAttribute('inert', '');
      // also attempt to set style on the bar itself as a fallback
      bar.style.pointerEvents = 'none';
    }

    return () => {
      body.classList.remove('imgedit-open');
      if (bar) {
        if (!hadInert) bar.removeAttribute('inert');
        bar.style.pointerEvents = prevPointer;
      }
    };
  }, []);

  // Start preloading overlay thumbnails as soon as the editor mounts so the
  // OverlaysPanel can show thumbnails instantly.
  useEffect(() => {
    // Fire-and-forget: preloadOverlayThumbnails populates a shared cache used
    // by the OverlaysPanel and avoids duplicate re-fetches.
    preloadOverlayThumbnails().catch(() => {});
  }, []);

  // Start preloading frame thumbnails
  useEffect(() => {
    preloadFrameThumbnails().catch(() => {});
  }, []);
}