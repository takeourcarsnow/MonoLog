"use client";

import React from "react";
import { RefreshCw, ZoomIn, ZoomOut, X, Camera as CameraIcon, ImagePlus } from 'lucide-react';
import LogoLoader from "./LogoLoader";

interface CameraControlsProps {
  disabled: boolean;
  cameraReady: boolean;
  isCapturing: boolean;
  processing: boolean;
  zoom: number;
  overlayVisible: boolean;
  switchCamera: () => void;
  openFilePicker: () => void;
  setZoom: (zoom: (prev: number) => number) => void;
  handleCapture: () => void;
  handleClose: () => void;
  // preview mode: when true, show Confirm/Retake instead of capture
  isPreviewing?: boolean;
  confirmCapture?: () => void;
  retakeCapture?: () => void;
}

export function CameraControls({
  disabled,
  cameraReady,
  isCapturing,
  processing,
  zoom,
  overlayVisible,
  switchCamera,
  openFilePicker,
  setZoom,
  handleCapture,
  handleClose,
  isPreviewing,
  confirmCapture,
  retakeCapture,
}: CameraControlsProps) {
  if (!cameraReady || !overlayVisible) return null;

  return (
    <div style={{
      position: 'absolute',
      bottom: 8,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      zIndex: 3,
      background: 'rgba(0,0,0,0.18)',
      padding: '6px 8px',
      borderRadius: 12,
    }}>
      {/* Switch camera (left) */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
            onClick={switchCamera}
            disabled={disabled || !!isPreviewing}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: 'transparent',
              border: 'none',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              cursor: 'pointer'
            }}
            aria-label="Switch camera"
            title="Switch between front and back camera"
          >
            <RefreshCw size={14} />
          </button>
      </div>

      {/* Add-from-files button */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          onClick={openFilePicker}
          disabled={disabled || !!isPreviewing}
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: 'transparent',
            border: 'none',
            color: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            cursor: 'pointer'
          }}
          aria-label="Add from files"
          title="Add image from files"
        >
          <ImagePlus size={14} />
        </button>
      </div>

      {/* Center group: zoom out, capture, zoom in */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {isPreviewing ? (
          <>
            <button
              onClick={() => { if (retakeCapture) retakeCapture(); }}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              Retake
            </button>

            <button
              onClick={() => { if (confirmCapture) confirmCapture(); }}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                background: '#0b84ff',
                border: 'none',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              Confirm
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setZoom(prev => Math.max(1, prev - 0.5))}
              disabled={disabled || zoom <= 1}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: 'transparent',
                border: 'none',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                cursor: 'pointer'
              }}
              aria-label="Zoom out"
              title="Zoom out"
            >
              <ZoomOut size={14} />
            </button>

            <button
              onClick={handleCapture}
              disabled={!cameraReady || disabled}
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                background: 'transparent',
                border: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: !cameraReady || disabled ? 'not-allowed' : 'pointer'
              }}
              aria-label="Capture photo"
              title="Capture"
            >
              {isCapturing || processing ? (
                <LogoLoader size={16} variant="other" />
              ) : (
                <CameraIcon size={16} color="#ff3b30" />
              )}
            </button>

            <button
              onClick={() => setZoom(prev => Math.min(5, prev + 0.5))}
              disabled={disabled || zoom >= 5}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: 'transparent',
                border: 'none',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                cursor: 'pointer'
              }}
              aria-label="Zoom in"
              title="Zoom in"
            >
              <ZoomIn size={14} />
            </button>
          </>
        )}
      </div>

      {/* Close (right) */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          onClick={handleClose}
          disabled={disabled || !!isPreviewing}
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: 'transparent',
            border: 'none',
            color: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            cursor: 'pointer'
          }}
          aria-label="Close camera"
          title="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}