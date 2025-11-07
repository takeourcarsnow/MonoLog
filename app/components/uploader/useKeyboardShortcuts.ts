"use client";

import { useEffect } from "react";

interface UseKeyboardShortcutsProps {
  isOpen: boolean;
  cameraReady: boolean;
  isCapturing: boolean;
  processing: boolean;
  handleCapture: () => void;
  handleClose: () => void;
  switchCamera: () => void;
  toggleTorch: () => void;
  toggleOverlay: () => void;
  setZoom: (zoom: (prev: number) => number) => void;
}

export function useKeyboardShortcuts({
  isOpen,
  cameraReady,
  isCapturing,
  processing,
  handleCapture,
  handleClose,
  switchCamera,
  toggleTorch,
  toggleOverlay,
  setZoom,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();
          if (cameraReady && !isCapturing && !processing) {
            handleCapture();
          }
          break;
        case 'Escape':
          e.preventDefault();
          handleClose();
          break;
        case 'c':
        case 'C':
          e.preventDefault();
          switchCamera();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleTorch();
          break;
        case 'o':
        case 'O':
          e.preventDefault();
          toggleOverlay();
          break;
        case '+':
        case '=':
          e.preventDefault();
          setZoom(prev => Math.min(5, prev + 0.5));
          break;
        case '-':
        case '_':
          e.preventDefault();
          setZoom(prev => Math.max(1, prev - 0.5));
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, cameraReady, isCapturing, processing, handleCapture, handleClose, switchCamera, toggleTorch, toggleOverlay, setZoom]);
}