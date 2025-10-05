"use client";

import { useEffect } from "react";
import Portal from "./Portal";
import ImageZoom from "./ImageZoom";

type Props = {
  src: string;
  alt?: string;
  onClose: () => void;
};

export default function FullscreenViewer({ src, alt, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <Portal>
      <div className="fullscreen-viewer" role="dialog" aria-modal="true">
        <button className="fv-close" aria-label="Close" onClick={onClose}>✕</button>
        <div className="fv-inner">
          <ImageZoom src={src} alt={alt || 'Photo'} maxScale={6} />
        </div>
      </div>
      {/* Styles moved to app/styles/overlays.css */}
    </Portal>
  );
}
