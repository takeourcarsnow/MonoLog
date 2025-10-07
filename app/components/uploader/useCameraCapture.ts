import { useRef, useState } from "react";
import { useToast } from "../Toast";

export function useCameraCapture() {
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const toast = useToast();

  const openCamera = async () => {
    // Show modal immediately so the UI can present a loading state while
    // requesting camera permission. If getUserMedia fails we rethrow the
    // error so callers (e.g. the uploader) can fall back to the hidden
    // file input with capture attribute.
    setCameraOpen(true);
    // If the browser doesn't implement getUserMedia, bail out so callers can
    // fallback to the camera-capable file input (capture attribute).
    if (!navigator?.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      const err = new Error('getUserMedia not supported');
      console.warn(err);
      setCameraOpen(false);
      throw err;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = s;
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (e) {
      console.error(e);
      toast.show('Camera access denied or unavailable');
      setCameraOpen(false);
      // Re-throw so higher-level code can try the file-input fallback.
      throw e;
    }
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOpen(false);
  };

  return { cameraOpen, setCameraOpen, videoRef, streamRef, openCamera, closeCamera };
}
