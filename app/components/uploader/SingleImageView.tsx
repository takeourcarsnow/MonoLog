import Image from "next/image";
import { LoadingBadge } from "./LoadingBadge";

interface SingleImageViewProps {
  dataUrl: string | null;
  dataUrls: string[];
  alt: string | string[];
  setEditingIndex: React.Dispatch<React.SetStateAction<number>>;
  setEditing: React.Dispatch<React.SetStateAction<boolean>>;
  processing: boolean;
  fileActionRef: React.MutableRefObject<'append' | 'replace'>;
  replaceIndexRef: React.MutableRefObject<number | null>;
  index: number;
  setDataUrl: React.Dispatch<React.SetStateAction<string | null>>;
  setPreviewLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  cameraInputRef: React.RefObject<HTMLInputElement>;
  openCamera: () => Promise<void>;
  previewLoaded: boolean;
}

export function SingleImageView({
  dataUrl,
  dataUrls,
  alt,
  setEditingIndex,
  setEditing,
  processing,
  fileActionRef,
  replaceIndexRef,
  index,
  setDataUrl,
  setPreviewLoaded,
  fileInputRef,
  cameraInputRef,
  openCamera,
  previewLoaded
}: SingleImageViewProps) {
  const onTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
  };

  const onTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="single-image-container no-swipe"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Give the image wrapper a definite size so Next/Image with `fill` can render. */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', minHeight: 220 }}>
        <LoadingBadge processing={processing} previewLoaded={previewLoaded} />
        <img
          className="no-swipe"
          alt={Array.isArray(alt) ? (alt[index] || 'Preview') : (alt || 'Preview')}
          src={(dataUrls.length ? dataUrls[index] : dataUrl) || "/logo.svg"}
          style={{ objectFit: 'contain', width: '100%', height: '100%', display: 'block' }}
          onLoad={() => setPreviewLoaded(true)}
          onError={() => setPreviewLoaded(true)}
        />
      </div>
    </div>
  );
}
