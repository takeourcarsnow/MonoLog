export function handlePointerUp(
  ev: PointerEvent,
  dragging: React.MutableRefObject<null | {
    startX: number;
    startY: number;
    mode: "pan" | "crop";
    action?: "move" | "draw" | "resize";
    origSel?: { x: number; y: number; w: number; h: number };
    anchorX?: number;
    anchorY?: number;
    handleIndex?: number;
    moved?: boolean;
  }>,
  previewPointerIdRef: React.MutableRefObject<number | null>,
  previewOriginalRef: React.MutableRefObject<boolean>,
  setPreviewOriginal: (v: boolean) => void,
  draw: () => void
) {
  // prevent parent handlers from interpreting this as a swipe/drag
  ev.stopPropagation?.();
  try { (ev.target as Element).releasePointerCapture(ev.pointerId); } catch {}
  const wasDragging = dragging.current !== null;
  dragging.current = null;
  // Only clear the preview if this pointer matches the one that started it
  if (previewPointerIdRef.current == null || previewPointerIdRef.current === ev.pointerId) {
    previewOriginalRef.current = false;
    setPreviewOriginal(false);
    previewPointerIdRef.current = null;
  }
  draw();
}

export function handlePointerCancel(
  ev: PointerEvent,
  dragging: React.MutableRefObject<null | {
    startX: number;
    startY: number;
    mode: "pan" | "crop";
    action?: "move" | "draw" | "resize";
    origSel?: { x: number; y: number; w: number; h: number };
    anchorX?: number;
    anchorY?: number;
    handleIndex?: number;
    moved?: boolean;
  }>,
  previewPointerIdRef: React.MutableRefObject<number | null>,
  previewOriginalRef: React.MutableRefObject<boolean>,
  setPreviewOriginal: (v: boolean) => void
) {
  if (previewPointerIdRef.current == null || previewPointerIdRef.current === ev.pointerId) {
    setPreviewOriginal(false);
    previewPointerIdRef.current = null;
  }
  dragging.current = null;
}