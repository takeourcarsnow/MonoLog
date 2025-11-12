"use client";

import { useCallback } from "react";
import { CameraEffectSettings } from "./cameraEffects";

export function useCapture(streamRef?: React.RefObject<MediaStream | null>) {
  const handleCapture = useCallback(async (
    isCapturing: boolean,
    processing: boolean,
    onCapture: (blob: Blob) => void,
    effectSettings: CameraEffectSettings,
    sourceCanvasRef: React.RefObject<HTMLCanvasElement | null>,
    displayCanvasRef: React.RefObject<HTMLCanvasElement | null>,
    stopCamera: () => void
  ) => {
    // Prevent multiple captures
    if (isCapturing || processing) return;

    const sourceCanvas = sourceCanvasRef.current;
    const displayCanvas = displayCanvasRef.current;
    if (!sourceCanvas || !displayCanvas) return;

    // Set capturing state FIRST to stop render loop immediately
    // Note: This will be handled by the parent component

    // Try to obtain a full-resolution photo from the camera track using
    // the ImageCapture API where available. This usually produces a
    // higher-resolution Blob than the canvas/video frame and matches the
    // behaviour of selecting an image file from the device.
    try {
      const stream = streamRef?.current;
      const track = stream?.getVideoTracks && stream.getVideoTracks()[0];
      if (track && (window as any).ImageCapture) {
        try {
          const ImageCaptureCtor = (window as any).ImageCapture;
          const ic = new ImageCaptureCtor(track);
          // takePhoto returns a Promise<Blob> when supported
          const photoBlob: Blob = await ic.takePhoto();
          if (photoBlob) {
            onCapture(photoBlob);
            return;
          }
        } catch (e) {
          // Not fatal — fall back to canvas-based capture below
          // Some browsers throw for takePhoto even when ImageCapture exists.
          console.warn('[useCapture] ImageCapture.takePhoto failed, falling back to canvas capture', e);
        }
      }
    } catch (e) {
      // ignore and continue with canvas capture
    }

    // Stop the camera stream immediately to freeze the view
    stopCamera();

    // If frame is selected, we need to reprocess with proper cropping
    let finalCanvas: HTMLCanvasElement;

    if (effectSettings.frameOverlay?.bounds) {
      console.log('[Camera Capture] Frame detected, cropping to bounds:', effectSettings.frameOverlay.bounds);

      const bounds = effectSettings.frameOverlay.bounds;
      const frameImg = effectSettings.frameOverlay.img;
      const frameW = frameImg.naturalWidth || frameImg.width;
      const frameH = frameImg.naturalHeight || frameImg.height;

      // Calculate the aspect ratio of the inner transparent area
      const innerW = bounds.maxX - bounds.minX;
      const innerH = bounds.maxY - bounds.minY;
      const innerAspectRatio = innerW / innerH;

      console.log('[Camera Capture] Frame inner dimensions:', { innerW, innerH, innerAspectRatio });

      // Calculate video aspect ratio
      const videoW = sourceCanvas.width;
      const videoH = sourceCanvas.height;
      const videoAspectRatio = videoW / videoH;

      // Determine how to fit the video into the inner area
      let srcX = 0, srcY = 0, srcW = videoW, srcH = videoH;

      if (videoAspectRatio > innerAspectRatio) {
        // Video is wider - crop sides
        srcW = videoH * innerAspectRatio;
        srcX = (videoW - srcW) / 2;
      } else {
        // Video is taller - crop top/bottom
        srcH = videoW / innerAspectRatio;
        srcY = (videoH - srcH) / 2;
      }

      console.log('[Camera Capture] Video crop region:', { srcX, srcY, srcW, srcH });

      // Create output canvas with inner dimensions
      finalCanvas = document.createElement('canvas');
      finalCanvas.width = Math.round(innerW);
      finalCanvas.height = Math.round(innerH);
      const finalCtx = finalCanvas.getContext('2d', { willReadFrequently: true });

      console.log('[Camera Capture] Final canvas size:', finalCanvas.width, 'x', finalCanvas.height);

      if (finalCtx) {
        // Create a temporary canvas for the cropped source
        const tempSourceCanvas = document.createElement('canvas');
        tempSourceCanvas.width = Math.round(innerW);
        tempSourceCanvas.height = Math.round(innerH);
        const tempSourceCtx = tempSourceCanvas.getContext('2d', { willReadFrequently: true });

        if (tempSourceCtx) {
          // Draw cropped video to temp source
          tempSourceCtx.drawImage(
            sourceCanvas,
            Math.round(srcX),
            Math.round(srcY),
            Math.round(srcW),
            Math.round(srcH),
            0,
            0,
            Math.round(innerW),
            Math.round(innerH)
          );

          // Apply effects to the cropped area (without frame overlay to avoid duplication)
          const { applyCameraEffect } = require('./cameraEffects');
          const settingsWithoutFrame = { ...effectSettings, frameOverlay: null };
          console.log('[Camera Capture] Applying effects without frame');
          applyCameraEffect(tempSourceCanvas, finalCanvas, settingsWithoutFrame);

          // Now create a new canvas that includes the frame
          const outputCanvas = document.createElement('canvas');
          outputCanvas.width = frameW;
          outputCanvas.height = frameH;
          const outputCtx = outputCanvas.getContext('2d');

          if (outputCtx) {
            // Draw the processed photo in the inner area
            outputCtx.drawImage(
              finalCanvas,
              bounds.minX,
              bounds.minY,
              innerW,
              innerH
            );

            // Draw the frame on top
            outputCtx.globalAlpha = effectSettings.frameOverlay.opacity || 1;
            outputCtx.drawImage(frameImg, 0, 0, frameW, frameH);

            console.log('[Camera Capture] Final output with frame:', outputCanvas.width, 'x', outputCanvas.height);
            finalCanvas = outputCanvas;
          }
        }
      }
    } else {
      console.log('[Camera Capture] No frame, using display canvas');
      // No frame - use the display canvas as-is
      finalCanvas = displayCanvas;
    }

    // Convert canvas to blob
    finalCanvas.toBlob((blob) => {
      if (blob) {
        onCapture(blob);
      } else {
        // Fallback: use dataURL conversion if toBlob returned null
        try {
          const dataUrl = finalCanvas.toDataURL('image/jpeg', 0.95);
          // Convert dataURL to Blob without fetch
          const arr = dataUrl.split(',');
          const mimeMatch = arr[0].match(/:(.*?);/);
          const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          onCapture(new Blob([u8arr], { type: mime }));
        } catch (e) {
          console.error('Capture fallback failed', e);
        }
      }
    }, 'image/jpeg', 0.95);
  }, [streamRef]);

  return { handleCapture };
}