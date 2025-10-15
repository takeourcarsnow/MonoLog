import React from "react";
import { usePathname } from "next/navigation";
import { PreviewSectionProps } from "./types";
import { LoadingBadge } from "./LoadingBadge";
import { CarouselView } from "./CarouselView";
import { compressImage, approxDataUrlBytes } from "@/src/lib/image";


export function PreviewSection({
  dataUrls,
  originalDataUrls,
  editorSettings,
  alt,
  editing,
  editingIndex,
  setEditingIndex,
  editingAlt,
  setAlt,
  setEditorSettings,
  setDataUrls,
  setOriginalDataUrls,
  setPreviewLoaded,
  setCompressedSize,
  setOriginalSize,
  setProcessing,
  setEditing,
  processing,
  previewLoaded,
  index,
  setIndex,
  trackRef,
  touchStartX,
  touchDeltaX,
  fileActionRef,
  replaceIndexRef,
  fileInputRef,
  cameraInputRef,
  toast,
  handleFile
}: PreviewSectionProps) {
  const pathname = usePathname();

  // Ensure we always have an array to render in the carousel. If the
  // `dataUrls` array is empty but `dataUrl` is set (single-image case),
  // treat it as a one-element array so the CarouselView is used.
  const previewUrls = dataUrls.length ? dataUrls : [];

  // Clamp the index to the available previewUrls length so the carousel
  // doesn't try to render an out-of-range slide.
  React.useEffect(() => {
    if (previewUrls.length === 0) return;
    if (index >= previewUrls.length) {
      setIndex(previewUrls.length - 1);
    }
  }, [previewUrls.length, index, setIndex]);

  async function onDropPreview(e: React.DragEvent) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/')).slice(0, 5);
    if (!files.length) return;
    // If there are multiple files, batch-process and append via setDataUrls
    setProcessing(true);
    setPreviewLoaded(false);
    try {
      const newUrls: string[] = [];
      for (const f of files) {
        try {
          const url = await compressImage(f);
          newUrls.push(url);
        } catch (e) { console.error('Failed to process dropped file', e); }
      }
        if (newUrls.length) {
        setDataUrls(d => {
          const next = [...d, ...newUrls].slice(0, 5);
          return next;
        });
        setOriginalDataUrls(d => {
          const next = [...d, ...newUrls].slice(0, 5);
          return next;
        });
        setEditorSettings(s => {
          const next = [...s, ...newUrls.map(() => ({}))].slice(0, 5);
          return next;
        });
        setPreviewLoaded(false);
      }
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div
      className={`preview ${(dataUrls.length) ? "" : "hidden"} ${(processing || !previewLoaded) ? 'processing' : ''}`}
      onDragOver={dataUrls.length < 5 ? (e) => { e.preventDefault(); } : undefined}
      onDrop={dataUrls.length < 5 ? onDropPreview : undefined}
    >
      <div className="preview-inner" style={{ position: 'relative' }}>
        {/* When editing, the ImageEditor is rendered at the top level, replacing all content */}
        {previewUrls.length > 0 && !editing && (
          <CarouselView
            dataUrls={previewUrls}
            alt={alt}
            index={index}
            setIndex={setIndex}
            trackRef={trackRef}
            touchStartX={touchStartX}
            touchDeltaX={touchDeltaX}
            setEditingIndex={setEditingIndex}
            setEditing={setEditing}
            fileActionRef={fileActionRef}
            replaceIndexRef={replaceIndexRef}
            toast={toast}
            setPreviewLoaded={setPreviewLoaded}
            processing={processing}
            previewLoaded={previewLoaded}
            editing={editing}
          />
        )}
      </div>

      {dataUrls.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 2, gap: 2 }}>
          <div className="camera-indicators" role="tablist" aria-label="Photo slots">
            {Array.from({ length: 5 }, (_, i) => {
              const occupied = i < dataUrls.length;
              const isActive = index === i;
              return (
                <button
                  key={i}
                  type="button"
                  className={`camera-indicator-btn ${isActive ? 'active' : ''}`}
                  onClick={() => occupied && setIndex(i)}
                  aria-pressed={isActive}
                  aria-label={occupied ? `Select photo ${i + 1}` : `Empty slot ${i + 1}`}
                  title={occupied ? `Select photo ${i + 1}` : `Empty slot`}
                  disabled={!occupied}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
                    <path d="M4 7h3l2-2h6l2 2h3v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="12" cy="13" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Thumbnails removed per request */}
    </div>
  );
}
