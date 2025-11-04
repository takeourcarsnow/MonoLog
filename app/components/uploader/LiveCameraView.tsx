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
import { Sparkles, Grid3x3, Type, X } from "lucide-react";

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
    asciiCellSize: 8,
    asciiCharset: ' .:-=+*#%@',
    asciiInvert: false,
    asciiCharsetPreset: 'custom',
  });

  const [showSettings, setShowSettings] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

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

    const canvas = displayCanvasRef.current;
    if (!canvas) return;

    // Stop the render loop immediately to freeze the view
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Set capturing state immediately to disable button and show loading
    setIsCapturing(true);

    // Prefer toBlob to avoid data: URL fetch issues
    if (canvas.toBlob) {
      canvas.toBlob((blob) => {
        if (blob) {
          onCapture(blob);
        } else {
          // Fallback: use dataURL conversion if toBlob returned null
          try {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
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
          }
        }
      }, 'image/jpeg', 0.95);
    } else {
      // Very old browsers: fallback to dataURL conversion
      try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
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
      }
    }
  }, [isCapturing, processing, onCapture]);

  // Handle close
  const handleClose = useCallback(() => {
    stopCamera();
    setIsCapturing(false);
    onClose();
  }, [stopCamera, onClose]);

  // Setup camera when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsCapturing(false); // Reset capturing state when modal opens
      startCamera();
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
        }}
        onClick={handleClose}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 720,
            background: 'var(--bg)',
            borderRadius: 8,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
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
                }}
              >
                <LogoLoader size={40} variant="other" />
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
                  min="4"
                  max="20"
                  value={effectSettings.asciiCellSize || 8}
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

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <Button onClick={handleCapture} loading={isCapturing || processing} disabled={!cameraReady || isCapturing}>
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
