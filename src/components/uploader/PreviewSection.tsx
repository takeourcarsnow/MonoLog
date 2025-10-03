import { usePathname } from "next/navigation";
import { PreviewSectionProps } from "./types";
import { useCameraCaptureHandler } from "./useCameraCaptureHandler";
import { LoadingBadge } from "./LoadingBadge";
import { ImageEditorSection } from "./ImageEditorSection";
import { CarouselView } from "./CarouselView";
import { SingleImageView } from "./SingleImageView";
import { CameraModal } from "./CameraModal";
import { ThumbnailStrip } from "./ThumbnailStrip";

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
  handleFile
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

  return (
    <div className={`preview ${(dataUrl || dataUrls.length) ? "" : "hidden"} ${editing ? 'editing' : ''} ${(processing || !previewLoaded) ? 'processing' : ''}`}>
      <div className={`preview-inner ${editing ? 'editing' : ''}`} style={{ position: 'relative' }}>
        <LoadingBadge processing={processing} previewLoaded={previewLoaded} />

        {/* Render either the ImageEditor inline (replacing the visible photo) or the preview content. */}
        <ImageEditorSection
          editing={editing}
          editingIndex={editingIndex}
          dataUrls={dataUrls}
          dataUrl={dataUrl}
          originalDataUrls={originalDataUrls}
          editorSettings={editorSettings}
          editingAlt={editingAlt}
          setAlt={setAlt}
          setEditorSettings={setEditorSettings}
          setDataUrls={setDataUrls}
          setDataUrl={setDataUrl}
          setPreviewLoaded={setPreviewLoaded}
          setCompressedSize={setCompressedSize}
          setOriginalSize={setOriginalSize}
          setProcessing={setProcessing}
          setEditing={setEditing}
        />

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

      <ThumbnailStrip
        dataUrls={dataUrls}
        alt={alt}
        index={index}
        setIndex={setIndex}
      />
    </div>
  );
}