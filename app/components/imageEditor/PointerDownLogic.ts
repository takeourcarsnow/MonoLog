import { getPointerPos } from './pointerUtils';

export function handlePointerDown(
  ev: PointerEvent,
  canvas: HTMLCanvasElement,
  sel: { x: number; y: number; w: number; h: number } | null,
  selectedCategory: 'basic' | 'color' | 'effects' | 'crop' | 'frame' | 'lightleak' | 'overlays',
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
  // stop propagation so AppShell swipe/mouse handlers don't react
  ev.stopPropagation?.();
  try { (ev.target as Element).setPointerCapture(ev.pointerId); } catch {}
  const p = getPointerPos(ev, canvas);

  // Check for resize handles first
  if (sel) {
    const handleSize = 8;
    const touchExtra = 6; // Make touch area 20x20 while visual is 8x8
    const handles = [
      { x: sel.x - handleSize/2, y: sel.y - handleSize/2 },
      { x: sel.x + sel.w - handleSize/2, y: sel.y - handleSize/2 },
      { x: sel.x - handleSize/2, y: sel.y + sel.h - handleSize/2 },
      { x: sel.x + sel.w - handleSize/2, y: sel.y + sel.h - handleSize/2 },
      { x: sel.x + sel.w/2 - handleSize/2, y: sel.y - handleSize/2 },
      { x: sel.x + sel.w/2 - handleSize/2, y: sel.y + sel.h - handleSize/2 },
      { x: sel.x - handleSize/2, y: sel.y + sel.h/2 - handleSize/2 },
      { x: sel.x + sel.w - handleSize/2, y: sel.y + sel.h/2 - handleSize/2 },
    ];
    for (let i = 0; i < handles.length; i++) {
      const h = handles[i];
      if (p.x >= h.x - touchExtra && p.x <= h.x + handleSize + touchExtra && p.y >= h.y - touchExtra && p.y <= h.y + handleSize + touchExtra) {
        dragging.current = { startX: p.x, startY: p.y, mode: 'crop', action: 'resize', handleIndex: i, origSel: { ...sel } };
        return;
      }
    }
  }

  // If clicked inside existing selection, prepare to move
  if (sel && p.x >= sel.x && p.x <= sel.x + sel.w && p.y >= sel.y && p.y <= sel.y + sel.h) {
    dragging.current = { startX: p.x, startY: p.y, mode: 'crop', action: 'move', origSel: { ...sel }, anchorX: p.x - sel.x, anchorY: p.y - sel.y };
    return;
  }

  // Default: start panning
  dragging.current = { startX: p.x, startY: p.y, mode: 'pan' };
  // Enable A/B preview for pan interactions only when not in crop mode
  if (selectedCategory !== 'crop') {
    previewPointerIdRef.current = ev.pointerId ?? null;
    previewOriginalRef.current = true;
    setPreviewOriginal(true);
    // Ensure the canvas repaints to show the unedited original immediately
    requestAnimationFrame(() => draw());
  }
}