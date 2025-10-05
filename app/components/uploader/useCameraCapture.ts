import { useRef, useState } from "react";
import { useToast } from "../Toast";

export function useCameraCapture() {
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const toast = useToast();

  const openCamera = async () => {
    setCameraOpen(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = s;
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (e) {
      console.error(e);
      toast.show('Camera access denied or unavailable');
      setCameraOpen(false);
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
