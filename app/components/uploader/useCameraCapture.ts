import { useRef, useState } from "react";
import { useToast } from "../Toast";

export function useCameraCapture() {
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const toast = useToast();

    const openCamera = async () => {
      // Only open the modal after we have an active stream. Showing the modal
      // before getUserMedia resolves causes a brief flash on devices/browsers
      // that don't support or reject the request. Callers already fall back to
      // the file-input capture when this function throws.

      // If the browser doesn't implement getUserMedia, bail out so callers can
      // fallback to the camera-capable file input (capture attribute).
      if (!navigator?.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        const err = new Error('getUserMedia not supported');
        console.warn(err);
        throw err;
      }

      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
        // Only after we've successfully acquired the stream do we show the
        // camera modal/UI.
        setCameraOpen(true);
      } catch (e) {
        console.error(e);
        toast.show('Camera access denied or unavailable');
        // Ensure we don't leave the modal open
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
