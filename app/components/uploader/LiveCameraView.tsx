"use client";

/**
 * LiveCameraView - Real-time camera with visual effects
 * 
 * Provides a live camera view with real-time effect overlays (dithering, pixelation, ASCII).
 * Uses getUserMedia API for camera access and dual canvas system for efficient processing:
 * - Source canvas: captures raw video frames
 * - Display canvas: shows processed frames with effects
 * 
 * Effects are applied in real-time using requestAnimationFrame loop.
 * Falls back to traditional file input on browsers without getUserMedia support.
 */

import React, { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "../Button";
import Portal from "../Portal";
import LogoLoader from "./LogoLoader";
import { applyCameraEffect, CameraEffectSettings, CameraEffectType } from "./cameraEffects";
import { Sparkles, Grid3x3, Type, X, Frame, Layers } from "lucide-react";
import { getFrameFiles } from "@/app/components/imageEditor/framesPreload";
import { getOverlayFiles } from "@/app/components/imageEditor/overlaysPreload";

interface LiveCameraViewProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (blob: Blob) => void;
  processing: boolean;
}

export function LiveCameraView({ isOpen, onClose, onCapture, processing }: LiveCameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sourceCanvasRef = useRef<HTMLCanvasElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [effectSettings, setEffectSettings] = useState<CameraEffectSettings>({
    type: 'none',
    pixelSize: 8,
    pixelShape: 'square',
    ditherMethod: 'ordered',
    ditherLevels: 3,
    ditherColorMode: 'bw',
    ditherPalette: 'auto',
    asciiCellSize: 10,
    asciiCharset: ' .:-=+*#%@',
    asciiInvert: false,
    asciiCharsetPreset: 'custom',
    frameOverlay: null,
    overlay: null,
  });

  const [showSettings, setShowSettings] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showProcessingOverlay, setShowProcessingOverlay] = useState(false);

  // Frame and overlay state
  const [frameFiles, setFrameFiles] = useState<string[]>([]);
  const [overlayFiles, setOverlayFiles] = useState<string[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null);
  const [selectedOverlay, setSelectedOverlay] = useState<string | null>(null);

  // Start camera and video stream
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraReady(true);
        };
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Could not access camera. Please grant camera permissions.');
      onClose();
    }
  }, [onClose]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setCameraReady(false);
  }, []);

  // Render loop: draw video frame with effects
  const renderFrame = useCallback(() => {
    // Stop rendering when capturing to freeze the view
    if (isCapturing) {
      return;
    }

    if (!videoRef.current || !sourceCanvasRef.current || !displayCanvasRef.current) {
      animationFrameRef.current = requestAnimationFrame(renderFrame);
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

      // Apply effect to display canvas
      applyCameraEffect(sourceCanvas, displayCanvas, effectSettings);
    }

    animationFrameRef.current = requestAnimationFrame(renderFrame);
  }, [effectSettings, isCapturing]);

  // Handle capture
  const handleCapture = useCallback(() => {
    // Prevent multiple captures
    if (isCapturing || processing) return;

    const sourceCanvas = sourceCanvasRef.current;
    const displayCanvas = displayCanvasRef.current;
    if (!sourceCanvas || !displayCanvas) return;

    // Set capturing state FIRST to stop render loop immediately
    setIsCapturing(true);
    setShowProcessingOverlay(true);
    
    // Stop the render loop to freeze the view - this happens in useEffect
    // when isCapturing changes, but also cancel here for immediate effect
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

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
          const settingsWithoutFrame = { ...effectSettings, frameOverlay: null };
          console.log('[Camera Capture] Applying effects without frame');
          applyCameraEffect(tempSourceCanvas, finalCanvas, settingsWithoutFrame);
          
          // Now create a new canvas that includes the frame
          const frameW = frameImg.naturalWidth || frameImg.width;
          const frameH = frameImg.naturalHeight || frameImg.height;
          
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

    // Prefer toBlob to avoid data: URL fetch issues
    if (finalCanvas.toBlob) {
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
            setIsCapturing(false);
            setShowProcessingOverlay(false);
          }
        }
      }, 'image/jpeg', 0.95);
    } else {
      // Very old browsers: fallback to dataURL conversion
      try {
        const dataUrl = finalCanvas.toDataURL('image/jpeg', 0.95);
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
        console.error('Legacy capture failed', e);
        setIsCapturing(false);
        setShowProcessingOverlay(false);
      }
    }
  }, [isCapturing, processing, onCapture, effectSettings]);

  // Handle close
  const handleClose = useCallback(() => {
    stopCamera();
    setIsCapturing(false);
    setShowProcessingOverlay(false);
    onClose();
  }, [stopCamera, onClose]);

  // Handle frame selection
  const handleSelectFrame = useCallback((file: string) => {
    const url = `/frames/${file}`;
    if (selectedFrame === file) {
      // Toggle off
      setSelectedFrame(null);
      setEffectSettings(prev => ({ ...prev, frameOverlay: null }));
      return;
    }

    setSelectedFrame(file);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => {
      // Compute bounds using the same logic as cameraEffects.ts
      const frameW = img.naturalWidth || img.width;
      const frameH = img.naturalHeight || img.height;

      const frameTemp = document.createElement('canvas');
      frameTemp.width = frameW;
      frameTemp.height = frameH;
      const fctx = frameTemp.getContext('2d')!;
      fctx.drawImage(img, 0, 0);
      const frameData = fctx.getImageData(0, 0, frameW, frameH);
      const data = frameData.data;

      const ALPHA_THRESHOLD = 16;
      const visited = new Uint8Array(frameW * frameH);
      const stack: number[] = [];
      
      // Start flood fill from borders
      for (let x = 0; x < frameW; x++) {
        stack.push(x, 0);
        stack.push(x, frameH - 1);
      }
      for (let y = 1; y < frameH - 1; y++) {
        stack.push(0, y);
        stack.push(frameW - 1, y);
      }
      
      while (stack.length > 0) {
        const y = stack.pop()!;
        const x = stack.pop()!;
        if (x < 0 || x >= frameW || y < 0 || y >= frameH) continue;
        const idx = y * frameW + x;
        if (visited[idx]) continue;
        const alpha = data[(idx * 4) + 3];
        if (alpha <= ALPHA_THRESHOLD) {
          visited[idx] = 1;
          if (x > 0) stack.push(x - 1, y);
          if (x < frameW - 1) stack.push(x + 1, y);
          if (y > 0) stack.push(x, y - 1);
          if (y < frameH - 1) stack.push(x, y + 1);
        }
      }

      let minX = frameW, minY = frameH, maxX = -1, maxY = -1;
      for (let y = 0; y < frameH; y++) {
        for (let x = 0; x < frameW; x++) {
          const idx = y * frameW + x;
          const alpha = data[(idx * 4) + 3];
          const isOutside = visited[idx] === 1;
          if (alpha === 0 && !isOutside) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      const bounds = { minX, minY, maxX, maxY };
      console.log('[Frame Selection] Computed bounds:', bounds);
      
      setEffectSettings(prev => ({
        ...prev,
        frameOverlay: { img, opacity: 1, bounds }
      }));
    };
  }, [selectedFrame]);

  // Handle overlay selection
  const handleSelectOverlay = useCallback((file: string) => {
    const url = `/overlays/${file}`;
    if (selectedOverlay === file) {
      // Toggle off
      setSelectedOverlay(null);
      setEffectSettings(prev => ({ ...prev, overlay: null }));
      return;
    }

    setSelectedOverlay(file);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => {
      setEffectSettings(prev => ({
        ...prev,
        overlay: { img, blendMode: 'screen', opacity: 0.85 }
      }));
    };
  }, [selectedOverlay]);

  // Setup camera when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsCapturing(false); // Reset capturing state when modal opens
      setShowProcessingOverlay(false);
      startCamera();
      // Load frames and overlays
      getFrameFiles().then(setFrameFiles).catch(() => setFrameFiles([]));
      getOverlayFiles().then(setOverlayFiles).catch(() => setOverlayFiles([]));
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Start render loop when camera is ready and not capturing
  useEffect(() => {
    if (cameraReady && !isCapturing) {
      renderFrame();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cameraReady, isCapturing, renderFrame]);

  // Add modal blur effect
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-blur');
    } else {
      document.body.classList.remove('modal-blur');
    }

    return () => {
      document.body.classList.remove('modal-blur');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        role="dialog"
        aria-modal={true}
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 12,
          zIndex: 20,
          background: 'rgba(0,0,0,0.85)',
          overflowY: 'auto',
        }}
        onClick={handleClose}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 720,
            maxHeight: 'calc(100vh - 24px)',
            background: 'var(--bg)',
            borderRadius: 8,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            margin: 'auto',
            overflowY: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Video and canvas container */}
          <div style={{ position: 'relative', width: '100%', borderRadius: 6, overflow: 'hidden', background: '#000' }}>
            {/* Hidden video element */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ display: 'none' }}
            />

            {/* Hidden source canvas (for capturing raw frames) */}
            <canvas ref={sourceCanvasRef} style={{ display: 'none' }} />

            {/* Display canvas (shows effects) */}
            <canvas
              ref={displayCanvasRef}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                borderRadius: 6,
                filter: showProcessingOverlay ? 'blur(8px) brightness(0.7)' : 'none',
                transition: 'filter 0.2s ease',
              }}
            />

            {!cameraReady && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: '#fff',
                  zIndex: 2,
                }}
              >
                <LogoLoader size={40} variant="other" />
              </div>
            )}

            {showProcessingOverlay && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(4px)',
                  borderRadius: 6,
                  zIndex: 1,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <LogoLoader size={48} variant="other" />
                  <span style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 500 }}>Processing...</span>
                </div>
              </div>
            )}
          </div>

          {/* Effect selection buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              className={`btn mini ${effectSettings.type === 'none' ? 'active' : ''}`}
              onClick={() => setEffectSettings({ ...effectSettings, type: 'none' })}
              title="No effect"
              disabled={isCapturing || processing}
            >
              <X size={16} />
            </button>
            <button
              type="button"
              className={`btn mini ${effectSettings.type === 'pixelate' ? 'active' : ''}`}
              onClick={() => setEffectSettings({ ...effectSettings, type: 'pixelate' })}
              title="Pixelate"
              disabled={isCapturing || processing}
            >
              <Grid3x3 size={16} />
            </button>
            <button
              type="button"
              className={`btn mini ${effectSettings.type === 'dither' ? 'active' : ''}`}
              onClick={() => setEffectSettings({ ...effectSettings, type: 'dither' })}
              title="Dither"
              disabled={isCapturing || processing}
            >
              <Sparkles size={16} />
            </button>
            <button
              type="button"
              className={`btn mini ${effectSettings.type === 'ascii' ? 'active' : ''}`}
              onClick={() => setEffectSettings({ ...effectSettings, type: 'ascii' })}
              title="ASCII"
              disabled={isCapturing || processing}
            >
              <Type size={16} />
            </button>
            <button
              type="button"
              className={`btn mini ${effectSettings.type === 'frame' ? 'active' : ''}`}
              onClick={() => setEffectSettings({ ...effectSettings, type: 'frame' })}
              title="Frame"
              disabled={isCapturing || processing}
            >
              <Frame size={16} />
            </button>
            <button
              type="button"
              className={`btn mini ${effectSettings.type === 'overlay' ? 'active' : ''}`}
              onClick={() => setEffectSettings({ ...effectSettings, type: 'overlay' })}
              title="Overlay"
              disabled={isCapturing || processing}
            >
              <Layers size={16} />
            </button>
          </div>

          {/* Effect-specific controls */}
          {effectSettings.type === 'pixelate' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
              <label style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ minWidth: 80 }}>Pixel Size:</span>
                <input
                  type="range"
                  min="2"
                  max="32"
                  value={effectSettings.pixelSize || 8}
                  onChange={(e) => setEffectSettings({ ...effectSettings, pixelSize: parseInt(e.target.value) })}
                  style={{ flex: 1 }}
                  disabled={isCapturing || processing}
                />
                <span style={{ minWidth: 30, textAlign: 'right' }}>{effectSettings.pixelSize}</span>
              </label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button
                  type="button"
                  className={`btn mini ${effectSettings.pixelShape === 'square' ? 'active' : ''}`}
                  onClick={() => setEffectSettings({ ...effectSettings, pixelShape: 'square' })}
                  disabled={isCapturing || processing}
                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                >
                  Square
                </button>
                <button
                  type="button"
                  className={`btn mini ${effectSettings.pixelShape === 'circle' ? 'active' : ''}`}
                  onClick={() => setEffectSettings({ ...effectSettings, pixelShape: 'circle' })}
                  disabled={isCapturing || processing}
                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                >
                  Circle
                </button>
              </div>
            </div>
          )}

          {effectSettings.type === 'dither' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0', alignItems: 'center' }}>
              <label style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8, width: '100%', maxWidth: 400 }}>
                <span style={{ minWidth: 80 }}>Levels:</span>
                <input
                  type="range"
                  min={effectSettings.ditherMethod === 'ordered' ? "2" : "3"}
                  max="8"
                  value={effectSettings.ditherLevels || 3}
                  onChange={(e) => {
                    const newLevels = parseInt(e.target.value);
                    setEffectSettings({ ...effectSettings, ditherLevels: newLevels });
                  }}
                  style={{ flex: 1 }}
                  disabled={isCapturing || processing}
                />
                <span style={{ minWidth: 30, textAlign: 'right' }}>{effectSettings.ditherLevels}</span>
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  type="button"
                  className={`btn mini ${effectSettings.ditherColorMode === 'bw' ? 'active' : ''}`}
                  onClick={() => setEffectSettings({ ...effectSettings, ditherColorMode: 'bw' })}
                  disabled={isCapturing || processing}
                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                >
                  B&W
                </button>
                <button
                  type="button"
                  className={`btn mini ${effectSettings.ditherColorMode === 'color' ? 'active' : ''}`}
                  onClick={() => setEffectSettings({ ...effectSettings, ditherColorMode: 'color' })}
                  disabled={isCapturing || processing}
                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                >
                  Color
                </button>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  type="button"
                  className={`btn mini ${effectSettings.ditherMethod === 'floyd-steinberg' ? 'active' : ''}`}
                  onClick={() => {
                    const newSettings = { ...effectSettings, ditherMethod: 'floyd-steinberg' as const };
                    if ((effectSettings.ditherLevels || 3) < 3) {
                      newSettings.ditherLevels = 3;
                    }
                    setEffectSettings(newSettings);
                  }}
                  disabled={isCapturing || processing || effectSettings.ditherPalette === 'gameboy'}
                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                >
                  Floyd
                </button>
                <button
                  type="button"
                  className={`btn mini ${effectSettings.ditherMethod === 'ordered' ? 'active' : ''}`}
                  onClick={() => setEffectSettings({ ...effectSettings, ditherMethod: 'ordered' })}
                  disabled={isCapturing || processing}
                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                >
                  Ordered
                </button>
                <button
                  type="button"
                  className={`btn mini ${effectSettings.ditherMethod === 'atkinson' ? 'active' : ''}`}
                  onClick={() => {
                    const newSettings = { ...effectSettings, ditherMethod: 'atkinson' as const };
                    if ((effectSettings.ditherLevels || 3) < 3) {
                      newSettings.ditherLevels = 3;
                    }
                    setEffectSettings(newSettings);
                  }}
                  disabled={isCapturing || processing}
                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                >
                  Atkinson
                </button>
                <button
                  type="button"
                  className={`btn mini ${effectSettings.ditherMethod === 'burkes' ? 'active' : ''}`}
                  onClick={() => {
                    const newSettings = { ...effectSettings, ditherMethod: 'burkes' as const };
                    if ((effectSettings.ditherLevels || 3) < 3) {
                      newSettings.ditherLevels = 3;
                    }
                    setEffectSettings(newSettings);
                  }}
                  disabled={isCapturing || processing || effectSettings.ditherPalette === 'gameboy'}
                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                >
                  Burkes
                </button>
              </div>
              {effectSettings.ditherColorMode === 'color' && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className={`btn mini ${effectSettings.ditherPalette === 'auto' ? 'active' : ''}`}
                    onClick={() => setEffectSettings({ ...effectSettings, ditherPalette: 'auto' })}
                    disabled={isCapturing || processing}
                    style={{ fontSize: '0.7rem', padding: '3px 6px' }}
                  >
                    Auto
                  </button>
                  <button
                    type="button"
                    className={`btn mini ${effectSettings.ditherPalette === 'gameboy' ? 'active' : ''}`}
                    onClick={() => {
                      const newSettings = { ...effectSettings, ditherPalette: 'gameboy' as const };
                      if (!['ordered', 'atkinson'].includes(effectSettings.ditherMethod || 'ordered')) {
                        newSettings.ditherMethod = 'ordered';
                      }
                      setEffectSettings(newSettings);
                    }}
                    disabled={isCapturing || processing}
                    style={{ fontSize: '0.7rem', padding: '3px 6px' }}
                  >
                    Game Boy
                  </button>
                  <button
                    type="button"
                    className={`btn mini ${effectSettings.ditherPalette === 'pico8' ? 'active' : ''}`}
                    onClick={() => setEffectSettings({ ...effectSettings, ditherPalette: 'pico8' })}
                    disabled={isCapturing || processing}
                    style={{ fontSize: '0.7rem', padding: '3px 6px' }}
                  >
                    PICO-8
                  </button>
                  <button
                    type="button"
                    className={`btn mini ${effectSettings.ditherPalette === 'nes' ? 'active' : ''}`}
                    onClick={() => setEffectSettings({ ...effectSettings, ditherPalette: 'nes' })}
                    disabled={isCapturing || processing}
                    style={{ fontSize: '0.7rem', padding: '3px 6px' }}
                  >
                    NES
                  </button>
                  <button
                    type="button"
                    className={`btn mini ${effectSettings.ditherPalette === 'zx_spectrum' ? 'active' : ''}`}
                    onClick={() => setEffectSettings({ ...effectSettings, ditherPalette: 'zx_spectrum' })}
                    disabled={isCapturing || processing}
                    style={{ fontSize: '0.7rem', padding: '3px 6px' }}
                  >
                    ZX
                  </button>
                  <button
                    type="button"
                    className={`btn mini ${effectSettings.ditherPalette === 'atari_2600' ? 'active' : ''}`}
                    onClick={() => setEffectSettings({ ...effectSettings, ditherPalette: 'atari_2600' })}
                    disabled={isCapturing || processing}
                    style={{ fontSize: '0.7rem', padding: '3px 6px' }}
                  >
                    Atari
                  </button>
                  <button
                    type="button"
                    className={`btn mini ${effectSettings.ditherPalette === 'commodore64' ? 'active' : ''}`}
                    onClick={() => setEffectSettings({ ...effectSettings, ditherPalette: 'commodore64' })}
                    disabled={isCapturing || processing}
                    style={{ fontSize: '0.7rem', padding: '3px 6px' }}
                  >
                    C64
                  </button>
                  <button
                    type="button"
                    className={`btn mini ${effectSettings.ditherPalette === 'apple_ii' ? 'active' : ''}`}
                    onClick={() => setEffectSettings({ ...effectSettings, ditherPalette: 'apple_ii' })}
                    disabled={isCapturing || processing}
                    style={{ fontSize: '0.7rem', padding: '3px 6px' }}
                  >
                    Apple II
                  </button>
                </div>
              )}
            </div>
          )}

          {effectSettings.type === 'ascii' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0', alignItems: 'center' }}>
              <label style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8, width: '100%', maxWidth: 400 }}>
                <span style={{ minWidth: 80 }}>Cell Size:</span>
                <input
                  type="range"
                  min="10"
                  max="50"
                  value={effectSettings.asciiCellSize || 10}
                  onChange={(e) => setEffectSettings({ ...effectSettings, asciiCellSize: parseInt(e.target.value) })}
                  style={{ flex: 1 }}
                  disabled={isCapturing || processing}
                />
                <span style={{ minWidth: 30, textAlign: 'right' }}>{effectSettings.asciiCellSize}</span>
              </label>
              <input
                type="text"
                value={effectSettings.asciiCharset}
                onChange={(e) => setEffectSettings({ ...effectSettings, asciiCharset: e.target.value, asciiCharsetPreset: 'custom' })}
                placeholder="Charset e.g. @%#*+=-:. "
                style={{ 
                  maxWidth: 300, 
                  width: '100%',
                  padding: '6px 8px', 
                  borderRadius: 6, 
                  border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)', 
                  background: 'var(--bg-elev)', 
                  color: 'var(--text)', 
                  fontSize: 12 
                }}
                disabled={isCapturing || processing}
              />
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  type="button"
                  className={`btn mini ${effectSettings.asciiCharsetPreset === 'custom' ? 'active' : ''}`}
                  onClick={() => setEffectSettings({ ...effectSettings, asciiCharset: ' .:-=+*#%@', asciiCharsetPreset: 'custom' })}
                  disabled={isCapturing || processing}
                  style={{ fontSize: '0.7rem', padding: '3px 6px' }}
                >
                  Custom
                </button>
                <button
                  type="button"
                  className={`btn mini ${effectSettings.asciiCharsetPreset === 'dense' ? 'active' : ''}`}
                  onClick={() => setEffectSettings({ ...effectSettings, asciiCharset: '@%#*+=-:.ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', asciiCharsetPreset: 'dense' })}
                  disabled={isCapturing || processing}
                  style={{ fontSize: '0.7rem', padding: '3px 6px' }}
                >
                  Dense
                </button>
                <button
                  type="button"
                  className={`btn mini ${effectSettings.asciiCharsetPreset === 'sparse' ? 'active' : ''}`}
                  onClick={() => setEffectSettings({ ...effectSettings, asciiCharset: '@%#*:. ', asciiCharsetPreset: 'sparse' })}
                  disabled={isCapturing || processing}
                  style={{ fontSize: '0.7rem', padding: '3px 6px' }}
                >
                  Sparse
                </button>
                <button
                  type="button"
                  className={`btn mini ${effectSettings.asciiCharsetPreset === 'blocks' ? 'active' : ''}`}
                  onClick={() => setEffectSettings({ ...effectSettings, asciiCharset: '█▓▒░ ', asciiCharsetPreset: 'blocks' })}
                  disabled={isCapturing || processing}
                  style={{ fontSize: '0.7rem', padding: '3px 6px' }}
                >
                  Blocks
                </button>
                <button
                  type="button"
                  className={`btn mini ${effectSettings.asciiCharsetPreset === 'dots' ? 'active' : ''}`}
                  onClick={() => setEffectSettings({ ...effectSettings, asciiCharset: '●◉○· ', asciiCharsetPreset: 'dots' })}
                  disabled={isCapturing || processing}
                  style={{ fontSize: '0.7rem', padding: '3px 6px' }}
                >
                  Dots
                </button>
                <button
                  type="button"
                  className={`btn mini ${effectSettings.asciiCharsetPreset === 'lines' ? 'active' : ''}`}
                  onClick={() => setEffectSettings({ ...effectSettings, asciiCharset: '│─┼┌┐└┘', asciiCharsetPreset: 'lines' })}
                  disabled={isCapturing || processing}
                  style={{ fontSize: '0.7rem', padding: '3px 6px' }}
                >
                  Lines
                </button>
                <button
                  type="button"
                  className={`btn mini ${effectSettings.asciiCharsetPreset === 'numbers' ? 'active' : ''}`}
                  onClick={() => setEffectSettings({ ...effectSettings, asciiCharset: '0123456789', asciiCharsetPreset: 'numbers' })}
                  disabled={isCapturing || processing}
                  style={{ fontSize: '0.7rem', padding: '3px 6px' }}
                >
                  Numbers
                </button>
                <button
                  type="button"
                  className={`btn mini ${effectSettings.asciiCharsetPreset === 'letters' ? 'active' : ''}`}
                  onClick={() => setEffectSettings({ ...effectSettings, asciiCharset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', asciiCharsetPreset: 'letters' })}
                  disabled={isCapturing || processing}
                  style={{ fontSize: '0.7rem', padding: '3px 6px' }}
                >
                  Letters
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button
                  type="button"
                  className={`btn mini ${!effectSettings.asciiInvert ? 'active' : ''}`}
                  onClick={() => setEffectSettings({ ...effectSettings, asciiInvert: false })}
                  disabled={isCapturing || processing}
                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                >
                  Normal
                </button>
                <button
                  type="button"
                  className={`btn mini ${effectSettings.asciiInvert ? 'active' : ''}`}
                  onClick={() => setEffectSettings({ ...effectSettings, asciiInvert: true })}
                  disabled={isCapturing || processing}
                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                >
                  Inverted
                </button>
              </div>
            </div>
          )}

          {/* Frame selection panel */}
          {effectSettings.type === 'frame' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: 8 }}>
                {frameFiles.map((file) => {
                  const thumbUrl = `/frames/${file}`;
                  return (
                    <button
                      key={file}
                      type="button"
                      onClick={() => handleSelectFrame(file)}
                      disabled={isCapturing || processing}
                      style={{
                        width: 60,
                        height: 60,
                        border: 'none',
                        borderRadius: 8,
                        backgroundImage: `url("${thumbUrl}")`,
                        backgroundPosition: 'center',
                        backgroundSize: 'cover',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'var(--muted-bg)',
                        boxShadow: selectedFrame === file ? '0 0 0 2px var(--primary)' : 'none',
                        opacity: (isCapturing || processing) ? 0.5 : 1,
                      }}
                      title={file}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Overlay selection panel */}
          {effectSettings.type === 'overlay' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: 8 }}>
                {overlayFiles.map((file) => {
                  const thumbUrl = `/overlays/thumbs/${file}`;
                  return (
                    <button
                      key={file}
                      type="button"
                      onClick={() => handleSelectOverlay(file)}
                      disabled={isCapturing || processing}
                      style={{
                        width: 60,
                        height: 60,
                        border: 'none',
                        borderRadius: 8,
                        backgroundImage: `url("${thumbUrl}")`,
                        backgroundPosition: 'center',
                        backgroundSize: 'cover',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'var(--muted-bg)',
                        boxShadow: selectedOverlay === file ? '0 0 0 2px var(--primary)' : 'none',
                        opacity: (isCapturing || processing) ? 0.5 : 1,
                      }}
                      title={file}
                    />
                  );
                })}
              </div>
              {effectSettings.overlay && (
                <>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
                    {['multiply', 'screen', 'overlay', 'soft-light'].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        className={`btn mini ${effectSettings.overlay?.blendMode === mode ? 'active' : ''}`}
                        onClick={() => {
                          if (effectSettings.overlay) {
                            setEffectSettings({
                              ...effectSettings,
                              overlay: { ...effectSettings.overlay, blendMode: mode }
                            });
                          }
                        }}
                        disabled={isCapturing || processing}
                        style={{ fontSize: '0.7rem', padding: '3px 6px', textTransform: 'capitalize' }}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                  <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ minWidth: 60 }}>Opacity:</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={effectSettings.overlay?.opacity || 0.85}
                      onChange={(e) => {
                        if (effectSettings.overlay) {
                          setEffectSettings({
                            ...effectSettings,
                            overlay: { ...effectSettings.overlay, opacity: parseFloat(e.target.value) }
                          });
                        }
                      }}
                      style={{ flex: 1 }}
                      disabled={isCapturing || processing}
                    />
                    <span style={{ minWidth: 30, textAlign: 'right' }}>{Math.round((effectSettings.overlay?.opacity || 0.85) * 100)}%</span>
                  </label>
                </>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <Button onClick={handleCapture} disabled={!cameraReady || isCapturing || processing}>
              {(isCapturing || processing) ? (
                <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                  <LogoLoader size={20} variant="other" />
                  <span>Processing</span>
                </span>
              ) : (
                'Capture'
              )}
            </Button>
            <Button variant="ghost" onClick={handleClose} disabled={isCapturing || processing}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
