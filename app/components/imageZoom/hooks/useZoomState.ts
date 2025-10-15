import { useRef, useState } from 'react';

export const useZoomState = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [isTile, setIsTile] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const lastDoubleTapRef = useRef<number | null>(null);
  const lastTapTimeoutRef = useRef<number | null>(null);
  const lastEventTimeRef = useRef<number | null>(null);
  const panStartRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const naturalRef = useRef({ w: 0, h: 0 });
  // Track small movements so we can distinguish taps from scroll/drags
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef<boolean>(false);
  const TAP_MOVE_THRESHOLD = 10; // pixels
  // Refs to mirror state for use in passive event handlers
  const scaleRef = useRef<number>(scale);
  const txRef = useRef<number>(tx);
  const tyRef = useRef<number>(ty);
  const pinchRef = useRef<null | { initialDistance: number; initialScale: number; midLocalX: number; midLocalY: number; startTx: number; startTy: number }>(null);
  // Whether wheel-driven zoom is allowed. It becomes true when the user
  // explicitly starts a zoom (double-click or pinch). This prevents the
  // mouse wheel from initiating zoom on accidental scrolls.
  const wheelEnabledRef = useRef<boolean>(false);
  // Unique id for this instance so we can ignore our own global events
  const instanceIdRef = useRef<string>(Math.random().toString(36).slice(2));

  return {
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
  };
};