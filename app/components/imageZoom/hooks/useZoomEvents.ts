/*
  This file intentionally uses many mutable refs and manual event
  listeners. Exhaustive-deps reports many warnings here because we
  intentionally rely on stable ref objects instead of including them
  in dependency arrays. To avoid noisy warnings while preserving
  correct runtime behavior we disable the rule for this file.
*/
/* eslint-disable react-hooks/exhaustive-deps */
import React from 'react';
import { useZoomStateSync } from './useZoomStateSync';
import { useGlobalZoomEvents } from './useGlobalZoomEvents';
import { useTileDetection } from './useTileDetection';
import { useImageDimensions } from './useImageDimensions';
import { useDoubleTap } from './useDoubleTap';
import { usePointerEvents } from './usePointerEvents';
import { useTouchEvents } from './useTouchEvents';
import { useWheelEvents } from './useWheelEvents';
import { useTapRegistration } from './useTapRegistration';
import { useInactiveReset } from './useInactiveReset';

interface ZoomState {
  containerRef: React.RefObject<HTMLDivElement>;
  imgRef: React.RefObject<HTMLImageElement>;
  scale: number;
  setScale: (scale: number) => void;
  tx: number;
  setTx: (tx: number) => void;
  ty: number;
  setTy: (ty: number) => void;
  isTile: boolean;
  setIsTile: (tile: boolean) => void;
  isPanning: boolean;
  setIsPanning: (panning: boolean) => void;
  isTransitioning: boolean;
  setIsTransitioning: (transitioning: boolean) => void;
  lastDoubleTapRef: React.MutableRefObject<number | null>;
  lastTapTimeoutRef: React.MutableRefObject<number | null>;
  lastEventTimeRef: React.MutableRefObject<number | null>;
  panStartRef: React.MutableRefObject<{ x: number; y: number; tx: number; ty: number } | null>;
  naturalRef: React.MutableRefObject<{ w: number; h: number }>;
  touchStartRef: React.MutableRefObject<{ x: number; y: number } | null>;
  pointerStartRef: React.MutableRefObject<{ x: number; y: number } | null>;
  movedRef: React.MutableRefObject<boolean>;
  TAP_MOVE_THRESHOLD: number;
  scaleRef: React.MutableRefObject<number>;
  txRef: React.MutableRefObject<number>;
  tyRef: React.MutableRefObject<number>;
  pinchRef: React.MutableRefObject<
    | null
    | {
        initialDistance: number;
        initialScale: number;
        // midpoint inside the container at gesture start
        midLocalX: number;
        midLocalY: number;
        // tx/ty at gesture start (so we can compute scale-ratio-preserving translation)
        startTx: number;
        startTy: number;
      }
  >;
  wheelEnabledRef: React.MutableRefObject<boolean>;
  instanceIdRef: React.MutableRefObject<string>;
  maxScale: number;
  isFullscreen: boolean;
  isActive: boolean;
  src: string | undefined;
}

export const useZoomEvents = (state: ZoomState) => {
  const {
    containerRef,
    imgRef,
    scale,
    setScale,
    tx,
    setTx,
    ty,
    setTy,
    isTile,
    setIsTile,
    isPanning,
    setIsPanning,
    isTransitioning,
    setIsTransitioning,
    lastDoubleTapRef,
    lastTapTimeoutRef,
    lastEventTimeRef,
    panStartRef,
    naturalRef,
    touchStartRef,
    pointerStartRef,
    movedRef,
    TAP_MOVE_THRESHOLD,
    scaleRef,
    txRef,
    tyRef,
    pinchRef,
    wheelEnabledRef,
    instanceIdRef,
    maxScale,
    isFullscreen,
    isActive,
    src,
  } = state;

  // Use smaller hooks
  useZoomStateSync({
    scale,
    tx,
    ty,
    scaleRef,
    txRef,
    tyRef,
  });

  useGlobalZoomEvents({
    scaleRef,
    setScale,
    setTx,
    setTy,
    wheelEnabledRef,
    instanceIdRef,
  });

  useTileDetection({
    containerRef,
    setIsTile,
  });

  useImageDimensions({
    imgRef,
    naturalRef,
    src,
    setScale,
    setTx,
    setTy,
    instanceIdRef,
  });

  useInactiveReset({
    isActive,
    setScale,
    setTx,
    setTy,
  });

  const { handleDoubleTap } = useDoubleTap({
    containerRef,
    imgRef,
    naturalRef,
    scaleRef,
    txRef,
    tyRef,
    setScale,
    setTx,
    setTy,
    isFullscreen,
    maxScale,
    setIsTransitioning,
    wheelEnabledRef,
    instanceIdRef,
  });

  const { registerTap } = useTapRegistration({
    lastDoubleTapRef,
    lastTapTimeoutRef,
    lastEventTimeRef,
    handleDoubleTap,
  });

  const {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = usePointerEvents({
    scale,
    setIsPanning,
    setIsTransitioning,
    pointerStartRef,
    movedRef,
    panStartRef,
    txRef,
    tyRef,
    isPanning,
    setTx,
    setTy,
    containerRef,
    imgRef,
    naturalRef,
    TAP_MOVE_THRESHOLD,
    registerTap,
  });

  const {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useTouchEvents({
    scale,
    scaleRef,
    txRef,
    tyRef,
    setIsPanning,
    setIsTransitioning,
    panStartRef,
    touchStartRef,
    movedRef,
    pinchRef,
    wheelEnabledRef,
    containerRef,
    imgRef,
    naturalRef,
    maxScale,
    setScale,
    setTx,
    setTy,
    TAP_MOVE_THRESHOLD,
    isPanning,
    isFullscreen,
    lastTapTimeoutRef,
    registerTap,
  });

  useWheelEvents({
    imgRef,
    isFullscreen,
    wheelEnabledRef,
    scaleRef,
    maxScale,
    setIsTransitioning,
    containerRef,
    txRef,
    tyRef,
    naturalRef,
    setScale,
    setTx,
    setTy,
    scale,
    instanceIdRef,
  });

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    registerTap,
  };
};