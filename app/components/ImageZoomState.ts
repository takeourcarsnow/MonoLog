"use client";

import React, { useRef, useState } from "react";

export function useImageZoomState() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const lastPan = useRef({ x: 0, y: 0 });
  const startPan = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const natural = useRef({ w: 0, h: 0 });
  const lastMoveTs = useRef<number | null>(null);
  const lastMovePos = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const flingRaf = useRef<number | null>(null);
  const pointerRaf = useRef<number | null>(null);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const txRef = useRef(0);
  const tyRef = useRef(0);
  const [isPanning, setIsPanning] = useState(false);
  const [isTile, setIsTile] = useState(false);
  const doubleTapRef = useRef<number | null>(null);
  const pointerActive = useRef(false);
  const lastDoubleTapAt = useRef<number | null>(null);
  const lastClickAt = useRef<number | null>(null);

  type Updater = number | ((prev: number) => number);
  const setTxSafe = (v: Updater) => setTx((prev) => {
    const next = typeof v === 'function' ? (v as (p: number) => number)(prev) : v;
    txRef.current = next;
    return next;
  });
  const setTySafe = (v: Updater) => setTy((prev) => {
    const next = typeof v === 'function' ? (v as (p: number) => number)(prev) : v;
    tyRef.current = next;
    return next;
  });

  // Keep a ref copy of the latest scale so event handlers (which may have
  // stale closures) can make decisions using the freshest value.
  React.useEffect(() => { scaleRef.current = scale; }, [scale]);

  return {
    containerRef,
    imgRef,
    lastPan,
    startPan,
    scaleRef,
    natural,
    lastMoveTs,
    lastMovePos,
    velocity,
    flingRaf,
    pointerRaf,
    scale,
    setScale,
    tx,
    ty,
    txRef,
    tyRef,
    setTxSafe,
    setTySafe,
    isPanning,
    setIsPanning,
    isTile,
    setIsTile,
    doubleTapRef,
    pointerActive,
    lastDoubleTapAt,
    lastClickAt,
  };
}
