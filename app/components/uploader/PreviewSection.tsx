import { usePathname } from "next/navigation";
import { PreviewSectionProps } from "./types";
import { useCameraCaptureHandler } from "./useCameraCaptureHandler";
import { LoadingBadge } from "./LoadingBadge";
import { CarouselView } from "./CarouselView";
import { SingleImageView } from "./SingleImageView";
import { CameraModal } from "./CameraModal";
import { ThumbnailStrip } from "./ThumbnailStrip";
import { compressImage, approxDataUrlBytes } from "@/src/lib/image";


export function PreviewSection({
  dataUrl,
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
  setDataUrl,
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
  cameraOpen,
  setCameraOpen,
  videoRef,
  streamRef,
  fileActionRef,
  replaceIndexRef,
  fileInputRef,
  cameraInputRef,
  toast,
  handleFile,
  openCamera
}: PreviewSectionProps) {
  const pathname = usePathname();

  const { onCameraCapture } = useCameraCaptureHandler({
    dataUrls,
    index,
    setDataUrls,
    setOriginalDataUrls,
    setEditorSettings,
    setDataUrl,
    setPreviewLoaded,
    setCompressedSize,
    setOriginalSize,
    setProcessing,
    fileActionRef,
    replaceIndexRef,
    videoRef,
    streamRef,
    setCameraOpen,
    toast,
    handleFile
  });

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
        if (!dataUrl) { setDataUrl(newUrls[0]); setPreviewLoaded(false); }
      }
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div
      className={`preview ${(dataUrl || dataUrls.length) ? "" : "hidden"} ${editing ? 'editing' : ''} ${(processing || !previewLoaded) ? 'processing' : ''}`}
      onDragOver={dataUrls.length <= 1 ? (e) => { e.preventDefault(); } : undefined}
      onDrop={dataUrls.length <= 1 ? onDropPreview : undefined}
    >
      <div className={`preview-inner ${editing ? 'editing' : ''}`} style={{ position: 'relative' }}>
        {/* When editing, the ImageEditor is rendered at the top level, replacing all content */}
        {!editing && (
          <>
            {dataUrls.length > 1 ? (
              <CarouselView
                dataUrls={dataUrls}
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
                setCameraOpen={setCameraOpen}
                videoRef={videoRef}
                streamRef={streamRef}
                cameraInputRef={cameraInputRef}
                  toast={toast}
                  setPreviewLoaded={setPreviewLoaded}
                  processing={processing}
                  previewLoaded={previewLoaded}
              />
            ) : (
              <SingleImageView
                dataUrl={dataUrl}
                dataUrls={dataUrls}
                alt={alt}
                setEditingIndex={setEditingIndex}
                setEditing={setEditing}
                processing={processing}
                fileActionRef={fileActionRef}
                replaceIndexRef={replaceIndexRef}
                index={index}
                setDataUrl={setDataUrl}
                setPreviewLoaded={setPreviewLoaded}
                fileInputRef={fileInputRef}
                cameraInputRef={cameraInputRef}
                openCamera={openCamera}
                previewLoaded={previewLoaded}
              />
            )}
          </>
        )}
      </div>

      <CameraModal
        cameraOpen={cameraOpen}
        setCameraOpen={setCameraOpen}
        videoRef={videoRef}
        streamRef={streamRef}
        processing={processing}
        onCapture={onCameraCapture}
      />

      {dataUrls.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8, gap: 2 }}>
          {Array.from({ length: 5 }, (_, i) => (
            <svg key={i} viewBox="0 0 24 24" width="12" height="12">
              <path d="M4 7h3l2-2h6l2 2h3v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" fill="none" stroke={i < dataUrls.length ? "#3b82f6" : "#9ca3af"} strokeWidth="1.5" />
              <circle cx="12" cy="13" r="3" fill="none" stroke={i < dataUrls.length ? "#3b82f6" : "#9ca3af"} strokeWidth="1.5" />
            </svg>
          ))}
        </div>
      )}

      <ThumbnailStrip
        dataUrls={dataUrls}
        alt={alt}
        index={index}
        setIndex={setIndex}
      />
    </div>
  );
}
