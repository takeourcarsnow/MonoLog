"use client";

import { useRef, useCallback, useEffect } from "react";
import { applyCameraEffect, CameraEffectSettings } from "./cameraEffects";

export function useRenderLoop() {
  const sourceCanvasRef = useRef<HTMLCanvasElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const renderLoopRunning = useRef(false);
  
  // Frame rate limiting
  const TARGET_FPS = 30;
  const frameInterval = 1000 / TARGET_FPS;
  const lastFrameTimeRef = useRef(0);

  // Visibility change detection
  const isVisibleRef = useRef(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const renderFrame = useCallback((effectSettings: CameraEffectSettings, isCapturing: boolean, videoRef: any, streamRef: any, applyZoom?: (canvas: HTMLCanvasElement) => void) => {
    // Stop rendering if loop is disabled, capturing, camera stopped, page not visible, or no video
    if (!renderLoopRunning.current || isCapturing || !isVisibleRef.current || !streamRef.current || !videoRef.current) {
      if (renderLoopRunning.current && !isCapturing) {
        // If not capturing but loop should run, schedule next frame
        animationFrameRef.current = requestAnimationFrame(() => renderFrame(effectSettings, isCapturing, videoRef, streamRef, applyZoom));
      }
      return;
    }

    const now = performance.now();
    if (now - lastFrameTimeRef.current < frameInterval) {
      // Skip this frame to maintain target FPS
      if (renderLoopRunning.current) {
        animationFrameRef.current = requestAnimationFrame(() => renderFrame(effectSettings, isCapturing, videoRef, streamRef, applyZoom));
      }
      return;
    }
    lastFrameTimeRef.current = now;

    if (!sourceCanvasRef.current || !displayCanvasRef.current) {
      if (renderLoopRunning.current) {
        animationFrameRef.current = requestAnimationFrame(() => renderFrame(effectSettings, isCapturing, videoRef, streamRef, applyZoom));
      }
      return;
    }

    const video = videoRef.current;
    const sourceCanvas = sourceCanvasRef.current;
    const displayCanvas = displayCanvasRef.current;

    // Cache 2D contexts to avoid repeated getContext calls per-frame (expensive on some browsers)
    // store them on the canvas element so they persist across frames
    if (sourceCanvas && !(sourceCanvas as any).__ctx) {
      (sourceCanvas as any).__ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
    }
    if (displayCanvas && !(displayCanvas as any).__ctx) {
      (displayCanvas as any).__ctx = displayCanvas.getContext('2d');
    }

    const sourceCtx = sourceCanvas ? (sourceCanvas as any).__ctx as CanvasRenderingContext2D | null : null;
    const displayCtx = displayCanvas ? (displayCanvas as any).__ctx as CanvasRenderingContext2D | null : null;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      // Set canvas dimensions to match video
      if (sourceCanvas.width !== video.videoWidth || sourceCanvas.height !== video.videoHeight) {
        sourceCanvas.width = video.videoWidth;
        sourceCanvas.height = video.videoHeight;
        displayCanvas.width = video.videoWidth;
        displayCanvas.height = video.videoHeight;
      }

      // Ensure the display canvas CSS is sized so the full camera frame is
      // visible within the container (contain behavior) instead of being
      // cropped by the parent. Pick width:100%/height:auto or height:100%/
      // width:auto depending on which best fits the container while
      // preserving aspect ratio.
      try {
        const container = displayCanvas.parentElement || displayCanvas;
        const rect = container.getBoundingClientRect();
        const containerW = Math.max(1, Math.round(rect.width));
        const containerH = Math.max(1, Math.round(rect.height));
        const videoAspect = video.videoWidth / (video.videoHeight || 1);
        const containerAspect = containerW / containerH;

        // If container is wider than video, fit by height (use full height)
        // otherwise fit by width (use full width). This results in a
        // letterbox/pillarbox effect but never crops the sensor.
        if (containerAspect > videoAspect) {
          displayCanvas.style.width = 'auto';
          displayCanvas.style.height = '100%';
        } else {
          displayCanvas.style.width = '100%';
          displayCanvas.style.height = 'auto';
        }
        displayCanvas.style.display = 'block';
      } catch (e) {
        // ignore layout errors
      }

      // Draw current video frame to source canvas
      if (sourceCtx) {
        sourceCtx.drawImage(video, 0, 0, sourceCanvas.width, sourceCanvas.height);
      }

      // Apply zoom to source canvas if needed
      if (applyZoom) {
        applyZoom(sourceCanvas);
      }

      // Apply effect to display canvas
      applyCameraEffect(sourceCanvas, displayCanvas, effectSettings);
    }

    if (renderLoopRunning.current) {
      animationFrameRef.current = requestAnimationFrame(() => renderFrame(effectSettings, isCapturing, videoRef, streamRef, applyZoom));
    }
  }, []);

  const startRenderLoop = useCallback((effectSettings: CameraEffectSettings, isCapturing: boolean, videoRef: any, streamRef: any, applyZoom?: (canvas: HTMLCanvasElement) => void) => {
    renderLoopRunning.current = true;
    renderFrame(effectSettings, isCapturing, videoRef, streamRef, applyZoom);
  }, [renderFrame]);

  const stopRenderLoop = useCallback(() => {
    renderLoopRunning.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  return {
    sourceCanvasRef,
    displayCanvasRef,
    renderFrame,
    startRenderLoop,
    stopRenderLoop,
  };
}