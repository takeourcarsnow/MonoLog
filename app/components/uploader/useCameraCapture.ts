import { useRef, useState } from "react";
import { useToast } from "../Toast";

export function useCameraCapture() {
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const toast = useToast();

  // Check if camera permissions are available
  const checkCameraPermission = async (): Promise<PermissionState | null> => {
    if (!navigator?.permissions || typeof navigator.permissions.query !== 'function') {
      return null; // Permissions API not supported
    }

    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return result.state;
    } catch (e) {
      console.warn('Failed to check camera permission:', e);
      return null;
    }
  };

    const openCamera = async () => {
      // Only open the modal after we have an active stream. Showing the modal
      // before getUserMedia resolves causes a brief flash on devices/browsers
      // that don't support or reject the request. Callers already fall back to
      // the file-input capture when this function throws.

      // If the browser doesn't implement getUserMedia, bail out so callers can
      // fallback to the camera-capable file input (capture attribute).
      if (!navigator?.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        const err = new Error('Camera not supported on this device');
        console.warn(err);
        toast.show('Camera is not supported on this device');
        throw err;
      }

      // Check current permission state
      const permissionState = await checkCameraPermission();
      if (permissionState === 'denied') {
        const err = new Error('Camera permission denied');
        toast.show('Camera access is blocked. Please enable camera permissions in your browser settings.');
        throw err;
      }

      // Try different camera configurations in order of preference
      const cameraConfigs = [
        // Prefer back camera
        { video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false },
        // Fallback to front camera
        { video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false },
        // Last resort: any camera available
        { video: { width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false },
        // Minimal fallback for very constrained devices
        { video: true, audio: false }
      ];

      let lastError: any = null;

      for (const config of cameraConfigs) {
        try {
          const s = await navigator.mediaDevices.getUserMedia(config);
          streamRef.current = s;
          if (videoRef.current) videoRef.current.srcObject = s;
          // Only after we've successfully acquired the stream do we show the
          // camera modal/UI.
          setCameraOpen(true);
          return; // Success, exit the loop
        } catch (e) {
          console.warn(`Camera config failed:`, config, e);
          lastError = e;
          // Continue to next config
        }
      }

      // All configs failed - provide user-friendly error messages
      console.error('All camera configurations failed:', lastError);

      let errorMessage = 'Unable to access camera';
      if (lastError?.name === 'NotAllowedError') {
        errorMessage = 'Camera access denied. Please allow camera permissions and try again.';
      } else if (lastError?.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.';
      } else if (lastError?.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application.';
      } else if (lastError?.name === 'OverconstrainedError') {
        errorMessage = 'Camera does not support the required video format.';
      } else if (lastError?.name === 'SecurityError') {
        errorMessage = 'Camera access blocked due to security restrictions. Please ensure you\'re using HTTPS.';
      }

      toast.show(errorMessage);

      // Don't show a toast here — callers will fallback to the hidden
      // camera-capable file input, which typically opens the native camera
      // chooser on mobile. Showing a toast here can be misleading if the
      // fallback succeeds, so keep the error silent and rethrow for the
      // caller to handle.
      setCameraOpen(false);
      throw lastError || new Error('Failed to access camera');
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
