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

  const renderFrame = useCallback((effectSettings: CameraEffectSettings, isCapturing: boolean, videoRef: React.RefObject<HTMLVideoElement | null>, streamRef: React.RefObject<MediaStream | null>, applyZoom?: (canvas: HTMLCanvasElement) => void) => {
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

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      // Set canvas dimensions to match video
      if (sourceCanvas.width !== video.videoWidth || sourceCanvas.height !== video.videoHeight) {
        sourceCanvas.width = video.videoWidth;
        sourceCanvas.height = video.videoHeight;
        displayCanvas.width = video.videoWidth;
        displayCanvas.height = video.videoHeight;
      }

      // Draw current video frame to source canvas
      const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
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

  const startRenderLoop = useCallback((effectSettings: CameraEffectSettings, isCapturing: boolean, videoRef: React.RefObject<HTMLVideoElement | null>, streamRef: React.RefObject<MediaStream | null>, applyZoom?: (canvas: HTMLCanvasElement) => void) => {
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