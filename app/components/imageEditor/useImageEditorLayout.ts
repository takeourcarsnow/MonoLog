import { useEffect, useRef } from 'react';

export function useImageEditorLayout(
  imageSrc: string,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  containerRef: React.RefObject<HTMLDivElement>,
  imgRef: React.MutableRefObject<HTMLImageElement | null>,
  originalImgRef: React.MutableRefObject<HTMLImageElement | null>,
  originalRef: React.MutableRefObject<string>,
  setOffset: (offset: { x: number; y: number }) => void,
  setMounted: (mounted: boolean) => void,
  draw: (info?: any) => void
) {
  // Compute image layout within canvas
  function computeImageLayout() {
    const canvas = canvasRef.current; const img = imgRef.current;
    if (!canvas || !img) return null as any;
    // Use clientWidth/clientHeight (CSS pixels) rather than getBoundingClientRect which can be affected
    // by transforms (scale/translate) in the surrounding UI. Using client sizes gives a stable layout
    // for the canvas drawing coordinates.
    const cssW = canvas.clientWidth || Math.max(100, canvas.width / (window.devicePixelRatio || 1));
    const cssH = canvas.clientHeight || Math.max(100, canvas.height / (window.devicePixelRatio || 1));
    // Minimal padding so image fills most of the editor canvas
    // Use zero padding so the image tightly fills the canvas and avoids visible empty space
    const padRatio = 0.0;
    const availW = Math.max(1, cssW * (1 - padRatio * 2));
    const availH = Math.max(1, cssH * (1 - padRatio * 2));
    // Use contain-style scaling so the whole image is visible inside the editor canvas.
    // This prevents tall (or very wide) images from being cropped in the preview.
    // It will letterbox (show empty space) when the image aspect doesn't match the canvas,
    // but that's preferable for editing so users can reach all image pixels.
    const baseScale = Math.min(availW / img.naturalWidth, availH / img.naturalHeight);
    const dispW = img.naturalWidth * baseScale;
    const dispH = img.naturalHeight * baseScale;
    const left = (cssW - dispW) / 2;
    const top = (cssH - dispH) / 2;
    // create a small rect-like object (width/height) so callers can use info.rect.width/height
    const rect = { width: cssW, height: cssH, left: 0, top: 0 } as DOMRect;
    // return layout info; do NOT set state here (caller should set state and draw with info)
    return { rect, baseScale, dispW, dispH, left, top };
  }

  // Handle image loading and initial layout
  useEffect(() => {
    // Load the image and defer showing the editor until the initial layout
    // and draw have completed. This prevents a visible "jump" where the
    // canvas/image resizes after the editor is already visible.
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      imgRef.current = img;
      // Attempt to size the canvas to the final layout immediately so
      // computeImageLayout has stable dimensions to work with. This mirrors
      // the logic in the resize effect so we avoid a visible resize after
      // the editor becomes visible.
      try {
        const canvas = canvasRef.current;
        const cont = containerRef.current;
        if (canvas && cont) {
          const dpr = window.devicePixelRatio || 1;
          const contW = Math.max(100, Math.round(cont.clientWidth));
          // Prefer a canvas height that fits comfortably in the viewport.
          // Use a fraction of the viewport height but clamp to sensible min/max.
          const contH = Math.max(100, Math.round(cont.clientHeight - 380));
          canvas.width = Math.max(100, Math.round(contW * dpr));
          canvas.height = Math.max(100, Math.round(contH * dpr));
          canvas.style.width = '100%';
          canvas.style.height = '100%';
        }
      } catch (e) {
        // ignore sizing errors and fall back to computeImageLayout
      }

      // Small RAFs to ensure browser applied style changes before measuring/drawing
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const info = computeImageLayout();
          if (info) {
            setOffset({ x: info.left, y: info.top });
            draw(info);
          } else {
            draw();
          }
          // Trigger the mount animation / visibility only after the
          // initial draw has completed.
          setMounted(true);
        });
      });
    };
    img.src = imageSrc;
    // preload original (unedited) image for instant preview when pressed
    try {
      const oimg = new Image();
      oimg.crossOrigin = 'anonymous';
      oimg.onload = () => { originalImgRef.current = oimg; };
      oimg.src = originalRef.current;
    } catch (e) {
      // ignore preload errors
    }
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSrc]);

  // Handle canvas resizing
  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current; const cont = containerRef.current;
      if (!c || !cont) return;
      const dpr = window.devicePixelRatio || 1;
      // use clientWidth to derive canvas size (avoid transform/scale issues from parent modals)
      const contW = Math.max(100, Math.round(cont.clientWidth));
      // Prefer canvas height derived from the container so the editor fits.
      const contH = Math.max(100, Math.round(cont.clientHeight - 380));
      c.style.width = '100%';
      c.style.height = '100%';
      c.width = Math.max(100, Math.round(contW * dpr));
      c.height = Math.max(100, Math.round(contH * dpr));
      // recompute image layout after resize so image stays centered
      const info = computeImageLayout();
      if (info) {
        setOffset({ x: info.left, y: info.top });
        draw(info);
      } else {
        draw();
      }
    };
    // initial sizing + a couple of extra recomputes for animated modals / theme toggles
    resize();
    requestAnimationFrame(() => resize());
    const t = window.setTimeout(() => resize(), 120);
    const t2 = window.setTimeout(() => resize(), 340);

    // also listen to container size changes via ResizeObserver so opening animations or theme changes reflow correctly
    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(() => resize());
      if (containerRef.current) ro.observe(containerRef.current);
      if (canvasRef.current) ro.observe(canvasRef.current);
    } catch (e) {
      // ResizeObserver may not be available in some environments; fall back to window resize
      window.addEventListener("resize", resize);
    }

    return () => {
      window.clearTimeout(t);
      window.clearTimeout(t2);
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { computeImageLayout };
}
