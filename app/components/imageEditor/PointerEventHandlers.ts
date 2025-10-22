import { useEffect } from 'react';
import { handlePointerDown } from './PointerDownLogic';
import { handlePointerMove } from './PointerMoveLogic';
import { handlePointerUp, handlePointerCancel } from './PointerUpLogic';

export function usePointerEvents(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  containerRef: React.RefObject<HTMLDivElement>,
  selectedCategory: 'basic' | 'color' | 'effects' | 'crop' | 'frame' | 'lightleak' | 'overlays',
  cropRatio: React.MutableRefObject<number | null>,
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
  sel: { x: number; y: number; w: number; h: number } | null,
  setSel: (sel: { x: number; y: number; w: number; h: number } | null) => void,
  offset: { x: number; y: number },
  setOffset: (offset: { x: number; y: number }) => void,
  previewPointerIdRef: React.MutableRefObject<number | null>,
  previewOriginalRef: React.MutableRefObject<boolean>,
  setPreviewOriginal: (v: boolean) => void,
  computeImageLayout: () => any,
  draw: () => void,
  setOverlay: ((v: { img: HTMLImageElement; blendMode: string; opacity: number } | null) => void) | null,
  overlayRef: React.MutableRefObject<{ img: HTMLImageElement; blendMode: string; opacity: number } | null>
) {
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const onPointerDown = (ev: PointerEvent) => {
      handlePointerDown(
        ev, canvas, sel, selectedCategory, dragging, previewPointerIdRef, previewOriginalRef, setPreviewOriginal, draw
      );
    };

    const onPointerMove = (ev: PointerEvent) => {
      handlePointerMove(
        ev, canvas, dragging, setOffset, computeImageLayout, cropRatio, setSel, draw
      );
    };

    const onPointerUp = (ev: PointerEvent) => {
      handlePointerUp(ev, dragging, previewPointerIdRef, previewOriginalRef, setPreviewOriginal, draw);
    };

    const onPointerCancel = (ev: PointerEvent) => {
      handlePointerCancel(ev, dragging, previewPointerIdRef, previewOriginalRef, setPreviewOriginal);
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
    };
  }, [selectedCategory, sel, offset, canvasRef, computeImageLayout, cropRatio, dragging, draw, previewOriginalRef, previewPointerIdRef, setOffset, setPreviewOriginal, setSel, setOverlay, overlayRef]);
}