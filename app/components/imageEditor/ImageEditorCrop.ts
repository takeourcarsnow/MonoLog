import { useEffect, useCallback } from "react";

export function useImageEditorCrop(
  selectedCategory: string,
  cropRatio: React.MutableRefObject<number | null>,
  sel: any,
  setSel: (sel: any) => void,
  computeImageLayout: () => any,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  draw: () => void,
  dragging: React.MutableRefObject<any>,
  previewPointerIdRef: React.MutableRefObject<number | null>,
  previewOriginalRef: React.MutableRefObject<boolean>,
  setPreviewOriginal: (val: boolean) => void,
  setSelectedCategory: (cat: any) => void
) {
  // When entering the Crop category, automatically create an initial
  // crop selection if none exists.
  useEffect(() => {
    if (selectedCategory !== 'crop') return;
    if (sel) return; // already have a selection
    const pad = 0.08;
    const info = computeImageLayout();
    const createFromInfo = (info: any) => {
      let w = info.dispW * (1 - pad * 2);
      let h = info.dispH * (1 - pad * 2);
      const ratio = cropRatio.current;
      if (ratio) {
        h = w / ratio;
        if (h > info.dispH * (1 - pad * 2)) {
          h = info.dispH * (1 - pad * 2);
          w = h * ratio;
        }
      }
      const x = info.left + (info.dispW - w) / 2;
      const y = info.top + (info.dispH - h) / 2;
      setSel({ x, y, w, h });
      // ensure canvas redraw to show overlay immediately
      requestAnimationFrame(() => draw());
    };
    if (info) {
      createFromInfo(info);
      return;
    }
    // fallback: use canvas bounding rect
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    let w = rect.width * (1 - pad * 2);
    let h = rect.height * (1 - pad * 2);
    const ratio = cropRatio.current;
    if (ratio) {
      h = w / ratio;
      if (h > rect.height * (1 - pad * 2)) {
        h = rect.height * (1 - pad * 2);
        w = h * ratio;
      }
    }
    const x = (rect.width - w) / 2;
    const y = (rect.height - h) / 2;
    setSel({ x, y, w, h });
    requestAnimationFrame(() => draw());
  }, [selectedCategory, computeImageLayout, cropRatio, canvasRef, setSel]);

  const cancelCrop = useCallback(() => {
    // Clear any active crop selection and related transient state so the
    // overlay is removed immediately when cancelling crop mode.
    setSel(null);
    // clear any active drag state and preview flags used by pointer events
    if (dragging.current) dragging.current = null;
    if (previewPointerIdRef) previewPointerIdRef.current = null;
    if (previewOriginalRef) previewOriginalRef.current = false;
    setPreviewOriginal(false);
    // reset crop ratio to free
    if (cropRatio) cropRatio.current = null;
    // switch back to a sane category
    setSelectedCategory('basic');
    // ensure canvas redraw to remove overlay visuals
    requestAnimationFrame(() => draw());
  }, [setSel, dragging, previewPointerIdRef, previewOriginalRef, setPreviewOriginal, cropRatio, setSelectedCategory, draw]);

  // Ensure canvas redraws when leaving crop mode to remove overlay
  useEffect(() => {
    if (selectedCategory !== 'crop') {
      requestAnimationFrame(() => draw());
    }
  }, [selectedCategory, draw]);

  return { cancelCrop };
}