import { useCallback, useEffect, useRef } from 'react';

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
  const computeImageLayout = useCallback(() => {
    const canvas = canvasRef.current; const img = imgRef.current;
    if (!canvas || !img) return null as any;
    // Since canvas is now sized to the image, use the canvas CSS dimensions
    const cssW = canvas.clientWidth || Math.max(100, canvas.width / (window.devicePixelRatio || 1));
    const cssH = canvas.clientHeight || Math.max(100, canvas.height / (window.devicePixelRatio || 1));
    // Image fills the entire canvas since canvas is sized to image dimensions
    const dispW = cssW;
    const dispH = cssH;
    const left = 0;
    const top = 0;
    // create a small rect-like object (width/height) so callers can use info.rect.width/height
    const rect = { width: cssW, height: cssH, left: 0, top: 0 } as DOMRect;
    // return layout info; do NOT set state here (caller should set state and draw with info)
    return { rect, baseScale: 1, dispW, dispH, left, top };
  }, [canvasRef, imgRef]);

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
          const contH = Math.max(100, Math.round(cont.clientHeight - 380));
          const padRatio = 0.0;
          const availW = Math.max(1, contW * (1 - padRatio * 2));
          const availH = Math.max(1, contH * (1 - padRatio * 2));
          // Calculate displayed image dimensions (contain-style scaling)
          const baseScale = Math.min(availW / img.naturalWidth, availH / img.naturalHeight);
          const dispW = img.naturalWidth * baseScale;
          const dispH = img.naturalHeight * baseScale;
          // Size canvas to match the displayed image dimensions
          canvas.width = Math.max(100, Math.round(dispW * dpr));
          canvas.height = Math.max(100, Math.round(dispH * dpr));
          canvas.style.width = `${dispW}px`;
          canvas.style.height = `${dispH}px`;
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
      const c = canvasRef.current; const cont = containerRef.current; const img = imgRef.current;
      if (!c || !cont || !img) return;
      const dpr = window.devicePixelRatio || 1;
      // Calculate the available space for the image
      const contW = Math.max(100, Math.round(cont.clientWidth));
      const contH = Math.max(100, Math.round(cont.clientHeight - 380));
      const padRatio = 0.0;
      const availW = Math.max(1, contW * (1 - padRatio * 2));
      const availH = Math.max(1, contH * (1 - padRatio * 2));
      // Calculate displayed image dimensions (contain-style scaling)
      const baseScale = Math.min(availW / img.naturalWidth, availH / img.naturalHeight);
      const dispW = img.naturalWidth * baseScale;
      const dispH = img.naturalHeight * baseScale;
      // Size canvas to match the displayed image dimensions
      c.width = Math.max(100, Math.round(dispW * dpr));
      c.height = Math.max(100, Math.round(dispH * dpr));
      c.style.width = `${dispW}px`;
      c.style.height = `${dispH}px`;
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
