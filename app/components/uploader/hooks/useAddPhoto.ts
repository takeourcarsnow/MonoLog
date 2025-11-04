import { useState, useCallback } from 'react';

interface UseAddPhotoProps {
  dataUrls: string[];
  processing: boolean;
  fileActionRef: React.MutableRefObject<string>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  setLiveCameraOpen: (open: boolean) => void;
  handleFile: (file: File) => Promise<void>;
}

export function useAddPhoto({
  dataUrls,
  processing,
  fileActionRef,
  fileInputRef,
  cameraInputRef,
  setLiveCameraOpen,
  handleFile,
}: UseAddPhotoProps) {
  const [showAddPhotoMenu, setShowAddPhotoMenu] = useState(false);

  const handleAddPhotos = useCallback(() => {
    if (dataUrls.length >= 5) {
      return;
    }
    setShowAddPhotoMenu(true);
  }, [dataUrls.length]);

  const handleAddFromFile = useCallback(() => {
    setShowAddPhotoMenu(false);
    fileActionRef.current = 'append';
    try { if (fileInputRef.current) (fileInputRef.current as HTMLInputElement).value = ""; } catch (_) {}
    try { fileInputRef.current?.click(); } catch (_) {}
  }, [fileActionRef, fileInputRef]);

  const handleAddFromCamera = useCallback(() => {
    setShowAddPhotoMenu(false);
    fileActionRef.current = 'append';
    try { if (cameraInputRef.current) (cameraInputRef.current as HTMLInputElement).value = ""; } catch (_) {}
    try { cameraInputRef.current?.click(); } catch (_) {}
  }, [fileActionRef, cameraInputRef]);

  const handleAddFromCameraEffects = useCallback(() => {
    setShowAddPhotoMenu(false);
    if (navigator.mediaDevices) {
      setLiveCameraOpen(true);
    } else {
      // Fallback to file input if getUserMedia not available
      fileActionRef.current = 'append';
      try { if (cameraInputRef.current) (cameraInputRef.current as HTMLInputElement).value = ""; } catch (_) {}
      try { cameraInputRef.current?.click(); } catch (_) {}
    }
  }, [setLiveCameraOpen, fileActionRef, cameraInputRef]);

  const handleCameraCapture = useCallback(async (blob: Blob) => {
    // Keep modal open during processing - it will show loading state
    // Directly create File from Blob (no fetch of data URLs)
    const file = new File([blob], 'camera-capture.jpg', { type: blob.type || 'image/jpeg' });

    await handleFile(file);

    // Close modal after processing is complete
    setLiveCameraOpen(false);
  }, [handleFile, setLiveCameraOpen]);

  return {
    showAddPhotoMenu,
    setShowAddPhotoMenu,
    handleAddPhotos,
    handleAddFromFile,
    handleAddFromCamera,
    handleAddFromCameraEffects,
    handleCameraCapture,
  };
}