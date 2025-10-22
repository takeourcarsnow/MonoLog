import { getPointerPos } from './pointerUtils';
import { handleCropResize } from './CropResizeLogic';

export function handlePointerMove(
  ev: PointerEvent,
  canvas: HTMLCanvasElement,
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
  setOffset: (offset: { x: number; y: number }) => void,
  computeImageLayout: () => any,
  cropRatio: React.MutableRefObject<number | null>,
  setSel: (sel: { x: number; y: number; w: number; h: number } | null) => void,
  draw: () => void
) {
  // prevent parent handlers from interpreting this as a swipe/drag
  ev.stopPropagation?.();
  const p = getPointerPos(ev, canvas);
  if (!dragging.current) return;
  if (dragging.current.mode === 'pan') {
    setOffset({ x: p.x - dragging.current.startX, y: p.y - dragging.current.startY });
  } else if (dragging.current.mode === 'crop') {
    const info = computeImageLayout();
    if (!info) return;
    const { left, top, dispW, dispH } = info;
    // image displayed rect in canvas coords
    const imgRect = { x: left, y: top, w: dispW, h: dispH };

    if (dragging.current.action === 'move' && dragging.current.origSel) {
      // moving existing selection: compute new top-left constrained inside image rect
      const nx = p.x - (dragging.current.anchorX || 0);
      const ny = p.y - (dragging.current.anchorY || 0);
      // clamp
      const maxX = imgRect.x + imgRect.w - dragging.current.origSel.w;
      const maxY = imgRect.y + imgRect.h - dragging.current.origSel.h;
      const cx = Math.min(Math.max(nx, imgRect.x), Math.max(maxX, imgRect.x));
      const cy = Math.min(Math.max(ny, imgRect.y), Math.max(maxY, imgRect.y));
      setSel({ x: cx, y: cy, w: dragging.current.origSel.w, h: dragging.current.origSel.h });
    } else if (dragging.current.action === 'resize' && dragging.current.origSel && dragging.current.handleIndex !== undefined) {
      handleCropResize(dragging.current, p, imgRect, cropRatio, setSel);
    } else {
      // drawing new selection
      if (!dragging.current.moved) {
        const dx = p.x - dragging.current.startX;
        const dy = p.y - dragging.current.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 5) { // threshold to avoid small jitters
          dragging.current.moved = true;
          setSel({ x: dragging.current.startX, y: dragging.current.startY, w: 0, h: 0 });
        }
      }
      if (dragging.current.moved) {
        const sx = dragging.current.startX; const sy = dragging.current.startY;
        let nx = Math.min(sx, p.x); let ny = Math.min(sy, p.y);
        let nw = Math.abs(p.x - sx); let nh = Math.abs(p.y - sy);
        if (cropRatio.current) {
          const fromW = Math.max(1, Math.abs(p.x - sx));
          const fromH = Math.max(1, Math.abs(p.y - sy));
          const hFromW = fromW / cropRatio.current;
          const wFromH = fromH * cropRatio.current;
          if (hFromW <= fromH) {
            nh = Math.round(hFromW);
            nw = fromW;
          } else {
            nw = Math.round(wFromH);
            nh = fromH;
          }
          if (p.x < sx) nx = sx - nw;
          if (p.y < sy) ny = sy - nh;
        }
        // clamp selection to image rect
        const selLeft = Math.max(nx, imgRect.x);
        const selTop = Math.max(ny, imgRect.y);
        const selRight = Math.min(nx + nw, imgRect.x + imgRect.w);
        const selBottom = Math.min(ny + nh, imgRect.y + imgRect.h);
        const finalW = Math.max(1, selRight - selLeft);
        const finalH = Math.max(1, selBottom - selTop);
        setSel({ x: selLeft, y: selTop, w: finalW, h: finalH });
      }
    }
  }
  draw();
}