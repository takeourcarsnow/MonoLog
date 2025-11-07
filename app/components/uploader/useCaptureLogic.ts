"use client";

import { useCallback } from "react";

interface UseCaptureLogicProps {
  isCapturing: boolean;
  processing: boolean;
  onCapture: (blob: Blob) => void;
  effectSettings: any;
  sourceCanvasRef: React.RefObject<HTMLCanvasElement>;
  displayCanvasRef: React.RefObject<HTMLCanvasElement>;
  stopCamera: () => void;
  stopRenderLoop: () => void;
  performCapture: (isCapturing: boolean, processing: boolean, callback: (blob: Blob) => void, effectSettings: any, sourceCanvasRef: React.RefObject<HTMLCanvasElement>, displayCanvasRef: React.RefObject<HTMLCanvasElement>, stopCamera: () => void) => void;
  onClose: () => void;
}

export function useCaptureLogic({
  isCapturing,
  processing,
  onCapture,
  effectSettings,
  sourceCanvasRef,
  displayCanvasRef,
  stopCamera,
  stopRenderLoop,
  performCapture,
  onClose,
}: UseCaptureLogicProps) {
  // Handle capture
  const handleCapture = useCallback(() => {
    // Prevent multiple captures
    if (isCapturing || processing) return;

    // Stop the camera stream immediately to freeze the view
    stopCamera();

    // Stop the render loop to freeze the view
    stopRenderLoop();

    performCapture(
      isCapturing,
      processing,
      (blob) => {
        onCapture(blob);
        // Close modal instantly after capture
        onClose();
      },
      effectSettings,
      sourceCanvasRef,
      displayCanvasRef,
      stopCamera
    );
  }, [isCapturing, processing, onCapture, effectSettings, sourceCanvasRef, displayCanvasRef, stopCamera, stopRenderLoop, performCapture, onClose]);

  return {
    handleCapture,
  };
}