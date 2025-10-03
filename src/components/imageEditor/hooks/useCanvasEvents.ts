import { useEffect } from "react";
import { draw } from "../CanvasRenderer";

interface UseCanvasEventsParams {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  imgRef: React.RefObject<HTMLImageElement>;
  originalImgRef: React.RefObject<HTMLImageElement>;
  previewOriginalRef: React.MutableRefObject<boolean>;
  offset: { x: number; y: number };
  setOffset: (offset: { x: number; y: number }) => void;
  sel: { x: number; y: number; w: number; h: number } | null;
  setSel: (sel: { x: number; y: number; w: number; h: number } | null) => void;
  dragging: React.MutableRefObject<null | {
    startX: number;
    startY: number;
    mode: "pan" | "crop";
    action?: "move" | "draw" | "resize";
    origSel?: { x: number; y: number; w: number; h: number };
    anchorX?: number;
    anchorY?: number;
    handleIndex?: number;
  }>;
  selectedCategory: 'basic' | 'color' | 'effects' | 'crop' | 'frame';
  cropRatio: React.MutableRefObject<number | null>;
  previewPointerIdRef: React.MutableRefObject<number | null>;
  setPreviewOriginal: (preview: boolean) => void;
  computeImageLayout: () => { rect: DOMRect; baseScale: number; dispW: number; dispH: number; left: number; top: number } | null;
  exposureRef: React.MutableRefObject<number>;
  contrastRef: React.MutableRefObject<number>;
  saturationRef: React.MutableRefObject<number>;
  temperatureRef: React.MutableRefObject<number>;
  vignetteRef: React.MutableRefObject<number>;
  frameColorRef: React.MutableRefObject<'white' | 'black'>;
  frameThicknessRef: React.MutableRefObject<number>;
  selectedFilterRef: React.MutableRefObject<string>;
  filterStrengthRef: React.MutableRefObject<number>;
  grainRef: React.MutableRefObject<number>;
  softFocusRef: React.MutableRefObject<number>;
  fadeRef: React.MutableRefObject<number>;
  matteRef: React.MutableRefObject<number>;
  rotationRef: React.MutableRefObject<number>;
  dashOffsetRef: React.MutableRefObject<number>;
}

export function useCanvasEvents({
  canvasRef,
  containerRef,
  imgRef,
  originalImgRef,
  previewOriginalRef,
  offset,
  setOffset,
  sel,
  setSel,
  dragging,
  selectedCategory,
  cropRatio,
  previewPointerIdRef,
  setPreviewOriginal,
  computeImageLayout,
  exposureRef,
  contrastRef,
  saturationRef,
  temperatureRef,
  vignetteRef,
  frameColorRef,
  frameThicknessRef,
  selectedFilterRef,
  filterStrengthRef,
  grainRef,
  softFocusRef,
  fadeRef,
  matteRef,
  rotationRef,
  dashOffsetRef,
}: UseCanvasEventsParams) {
  function getPointerPos(e: PointerEvent | React.PointerEvent) {
    const canvas = canvasRef.current; if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: (e as any).clientX - rect.left, y: (e as any).clientY - rect.top };
  }

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;

    const onPointerDown = (ev: PointerEvent) => {
      // stop propagation so AppShell swipe/mouse handlers don't react
      ev.stopPropagation?.();
      try { (ev.target as Element).setPointerCapture(ev.pointerId); } catch {}
      const p = getPointerPos(ev);
      // We'll only enable the A/B preview for pan interactions. For crop-related
      // interactions (draw/resize/move) we should NOT show the original preview while dragging.
      // So defer setting previewOriginal until we've determined the action below.
      // Check for resize handles first
      if (sel) {
        const handleSize = 8;
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
          if (p.x >= h.x && p.x <= h.x + handleSize && p.y >= h.y && p.y <= h.y + handleSize) {
            dragging.current = { startX: p.x, startY: p.y, mode: 'crop', action: 'resize', handleIndex: i, origSel: { ...sel } };
            return;
          }
        }
      }

      // If clicked inside existing selection, prepare to move (do NOT enable preview)
      if (sel && p.x >= sel.x && p.x <= sel.x + sel.w && p.y >= sel.y && p.y <= sel.y + sel.h) {
        dragging.current = { startX: p.x, startY: p.y, mode: 'crop', action: 'move', origSel: { ...sel }, anchorX: p.x - sel.x, anchorY: p.y - sel.y };
        return;
      }

      // Only start drawing a new crop if Crop category is active AND an aspect preset is selected.
      // If no aspect ratio is selected (free mode), treat the click as a pan so the user still gets the
      // A/B preview on press instead of immediately creating a selection.
      if (selectedCategory === 'crop' && cropRatio.current != null) {
        dragging.current = { startX: p.x, startY: p.y, mode: 'crop', action: 'draw' };
        setSel({ x: p.x, y: p.y, w: 0, h: 0 });
        return;
      }

      // Default: start panning (click on image should not create a new crop when not in crop mode)
      dragging.current = { startX: p.x, startY: p.y, mode: 'pan' };
      // Enable A/B preview for pan interactions only
      previewPointerIdRef.current = ev.pointerId ?? null;
      previewOriginalRef.current = true;
      setPreviewOriginal(true);
      // Ensure the canvas repaints to show the unedited original immediately
      requestAnimationFrame(() => draw({
        canvasRef,
        imgRef,
        originalImgRef,
        previewOriginalRef,
        offset,
        sel,
        exposureRef,
        contrastRef,
        saturationRef,
        temperatureRef,
        vignetteRef,
        frameColorRef,
        frameThicknessRef,
        selectedFilterRef,
        filterStrengthRef,
        grainRef,
        softFocusRef,
        fadeRef,
        matteRef,
        rotationRef,
        dashOffsetRef,
        computeImageLayout
      }));
    };

    const onPointerMove = (ev: PointerEvent) => {
      // prevent parent handlers from interpreting this as a swipe/drag
      ev.stopPropagation?.();
      const p = getPointerPos(ev);
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
          const handleIndex = dragging.current.handleIndex;
          const dx = p.x - dragging.current.startX;
          const dy = p.y - dragging.current.startY;
          let newSel = { ...dragging.current.origSel };
          if (handleIndex === 0) { // top-left
            newSel.x += dx;
            newSel.y += dy;
            newSel.w -= dx;
            newSel.h -= dy;
          } else if (handleIndex === 1) { // top-right
            newSel.y += dy;
            newSel.w += dx;
            newSel.h -= dy;
          } else if (handleIndex === 2) { // bottom-left
            newSel.x += dx;
            newSel.w -= dx;
            newSel.h += dy;
          } else if (handleIndex === 3) { // bottom-right
            newSel.w += dx;
            newSel.h += dy;
          } else if (handleIndex === 4) { // top
            newSel.y += dy;
            newSel.h -= dy;
          } else if (handleIndex === 5) { // bottom
            newSel.h += dy;
          } else if (handleIndex === 6) { // left
            newSel.x += dx;
            newSel.w -= dx;
          } else if (handleIndex === 7) { // right
            newSel.w += dx;
          }
          // Ensure w and h are positive
          if (newSel.w < 1) newSel.w = 1;
          if (newSel.h < 1) newSel.h = 1;
          // Maintain aspect ratio if set: enforce exact ratio and keep the handle anchor fixed
          if (cropRatio.current) {
            const ratio = cropRatio.current; // width / height
            // determine new width/height based on handle type
            let adjW = newSel.w;
            let adjH = newSel.h;
            if (handleIndex < 4) {
              // corners: base on the larger change to feel natural
              const dw = Math.abs(newSel.w - dragging.current.origSel.w);
              const dh = Math.abs(newSel.h - dragging.current.origSel.h);
              if (dw > dh) {
                adjH = Math.max(1, adjW / ratio);
              } else {
                adjW = Math.max(1, adjH * ratio);
              }
            } else if (handleIndex === 4 || handleIndex === 5) {
              // top/bottom edges: base on height
              adjH = Math.max(1, adjH);
              adjW = Math.max(1, adjH * ratio);
            } else {
              // left/right edges: base on width
              adjW = Math.max(1, adjW);
              adjH = Math.max(1, adjW / ratio);
            }

            // recompute x/y so the opposite edge stays anchored
            const orig = dragging.current.origSel;
            // compute anchor (the fixed point) based on which handle is dragged
            let anchorX = orig.x; let anchorY = orig.y;
            if (handleIndex === 0) { anchorX = orig.x + orig.w; anchorY = orig.y + orig.h; }
            else if (handleIndex === 1) { anchorX = orig.x; anchorY = orig.y + orig.h; }
            else if (handleIndex === 2) { anchorX = orig.x + orig.w; anchorY = orig.y; }
            else if (handleIndex === 3) { anchorX = orig.x; anchorY = orig.y; }
            else if (handleIndex === 4) { anchorX = orig.x + orig.w / 2; anchorY = orig.y + orig.h; }
            else if (handleIndex === 5) { anchorX = orig.x + orig.w / 2; anchorY = orig.y; }
            else if (handleIndex === 6) { anchorX = orig.x + orig.w; anchorY = orig.y + orig.h / 2; }
            else if (handleIndex === 7) { anchorX = orig.x; anchorY = orig.y + orig.h / 2; }

            // available space from the anchor to image rect edges
            const availLeft = anchorX - imgRect.x;
            const availRight = imgRect.x + imgRect.w - anchorX;
            const availTop = anchorY - imgRect.y;
            const availBottom = imgRect.y + imgRect.h - anchorY;
            // choose horizontal/vertical available depending on which side the anchor is on
            const availableW = (anchorX > orig.x) ? availLeft : availRight;
            const availableH = (anchorY > orig.y) ? availTop : availBottom;
            // Ensure adjW/adjH fit within available area while preserving ratio
            // Compute max width allowed by availableH and ratio
            const maxWFromH = Math.max(1, availableH * ratio);
            const maxAllowedW = Math.max(1, Math.min(availableW, maxWFromH));
            if (adjW > maxAllowedW) {
              adjW = maxAllowedW;
              adjH = Math.max(1, adjW / ratio);
            }
            // Also ensure adjH fits availableH (in case horizontal wasn't limiting)
            const maxHFromW = Math.max(1, availableW / ratio);
            const maxAllowedH = Math.max(1, Math.min(availableH, maxHFromW));
            if (adjH > maxAllowedH) {
              adjH = maxAllowedH;
              adjW = Math.max(1, adjH * ratio);
            }
            switch (handleIndex) {
              case 0: // top-left - anchor bottom-right
                newSel.x = orig.x + orig.w - adjW;
                newSel.y = orig.y + orig.h - adjH;
                newSel.w = adjW; newSel.h = adjH;
                break;
              case 1: // top-right - anchor bottom-left
                newSel.x = orig.x;
                newSel.y = orig.y + orig.h - adjH;
                newSel.w = adjW; newSel.h = adjH;
                break;
              case 2: // bottom-left - anchor top-right
                newSel.x = orig.x + orig.w - adjW;
                newSel.y = orig.y;
                newSel.w = adjW; newSel.h = adjH;
                break;
              case 3: // bottom-right - anchor top-left
                newSel.x = orig.x;
                newSel.y = orig.y;
                newSel.w = adjW; newSel.h = adjH;
                break;
              case 4: // top edge - anchor bottom
                newSel.x = orig.x + (orig.w - adjW) / 2;
                newSel.y = orig.y + orig.h - adjH;
                newSel.w = adjW; newSel.h = adjH;
                break;
              case 5: // bottom edge - anchor top
                newSel.x = orig.x + (orig.w - adjW) / 2;
                newSel.y = orig.y;
                newSel.w = adjW; newSel.h = adjH;
                break;
              case 6: // left edge - anchor right
                newSel.x = orig.x + orig.w - adjW;
                newSel.y = orig.y + (orig.h - adjH) / 2;
                newSel.w = adjW; newSel.h = adjH;
                break;
              case 7: // right edge - anchor left
                newSel.x = orig.x;
                newSel.y = orig.y + (orig.h - adjH) / 2;
                newSel.w = adjW; newSel.h = adjH;
                break;
            }
          }
          // Clamp to image rect (ensure selection stays inside image)
          newSel.x = Math.max(imgRect.x, Math.min(newSel.x, imgRect.x + imgRect.w - newSel.w));
          newSel.y = Math.max(imgRect.y, Math.min(newSel.y, imgRect.y + imgRect.h - newSel.h));
          newSel.w = Math.min(newSel.w, Math.max(1, imgRect.x + imgRect.w - newSel.x));
          newSel.h = Math.min(newSel.h, Math.max(1, imgRect.y + imgRect.h - newSel.y));
          setSel(newSel);
        } else {
          // drawing new selection
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
      draw({
        canvasRef,
        imgRef,
        originalImgRef,
        previewOriginalRef,
        offset,
        sel,
        exposureRef,
        contrastRef,
        saturationRef,
        temperatureRef,
        vignetteRef,
        frameColorRef,
        frameThicknessRef,
        selectedFilterRef,
        filterStrengthRef,
        grainRef,
        softFocusRef,
        fadeRef,
        matteRef,
        rotationRef,
        dashOffsetRef,
        computeImageLayout
      });
    };

    const onPointerUp = (ev: PointerEvent) => {
      // prevent parent handlers from interpreting this as a swipe/drag
      ev.stopPropagation?.();
      try { (ev.target as Element).releasePointerCapture(ev.pointerId); } catch {}
      dragging.current = null;
      // Only clear the preview if this pointer matches the one that started it
      if (previewPointerIdRef.current == null || previewPointerIdRef.current === ev.pointerId) {
        previewOriginalRef.current = false;
        setPreviewOriginal(false);
        previewPointerIdRef.current = null;
      }
      draw({
        canvasRef,
        imgRef,
        originalImgRef,
        previewOriginalRef,
        offset,
        sel,
        exposureRef,
        contrastRef,
        saturationRef,
        temperatureRef,
        vignetteRef,
        frameColorRef,
        frameThicknessRef,
        selectedFilterRef,
        filterStrengthRef,
        grainRef,
        softFocusRef,
        fadeRef,
        matteRef,
        rotationRef,
        dashOffsetRef,
        computeImageLayout
      });
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    const onPointerCancel = (ev: PointerEvent) => {
      if (previewPointerIdRef.current == null || previewPointerIdRef.current === ev.pointerId) {
        setPreviewOriginal(false);
        previewPointerIdRef.current = null;
      }
      dragging.current = null;
    };
    window.addEventListener('pointercancel', onPointerCancel);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
    };
  }, [offset, sel, selectedCategory]);
}