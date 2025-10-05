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
      <style>{`
        .fullscreen-viewer{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.92);}
        .fv-close{position:absolute;right:18px;top:18px;background:transparent;border:none;color:#fff;font-size:20px;padding:8px;cursor:pointer}
        .fv-inner{max-width:100%;max-height:100%;width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:20px}
        .fv-inner img{max-width:100%;max-height:100%;}
      `}</style>
    </Portal>
  );
}
