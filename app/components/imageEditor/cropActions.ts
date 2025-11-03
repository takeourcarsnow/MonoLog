export async function applyCropOnly(
  imgRef: React.RefObject<HTMLImageElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  sel: { x: number; y: number; w: number; h: number } | null,
  offset: { x: number; y: number },
  rotation: number,
  rotationRef: React.MutableRefObject<number>,
  setImageSrc: (src: string) => void,
  setSel: (sel: null) => void,
  setOffset: (offset: { x: number; y: number }) => void,
  setRotation: (v: number) => void,
  computeImageLayout: () => any
) {
  const img = imgRef.current; if (!img) return;
  const canvas = canvasRef.current; if (!canvas) return;
  // Use current layout for precise mapping between canvas CSS px and natural pixels
  const layout = typeof computeImageLayout === 'function' ? computeImageLayout() : null;
  const rect = canvas.getBoundingClientRect();
  const baseScale = layout ? (layout.dispW / img.naturalWidth) : Math.min(rect.width / img.naturalWidth, rect.height / img.naturalHeight);

  if (!sel) return; // nothing to crop

  // Handle rotation by first rendering the full image rotated at 1:1 natural pixel scale,
  // then cutting the axis-aligned crop rectangle from that rotated canvas. This matches
  // what the user sees in the crop preview and avoids internal empty triangles.
  const rot = rotationRef.current ?? rotation;
  const angle = (rot * Math.PI) / 180;
  const absCos = Math.abs(Math.cos(angle));
  const absSin = Math.abs(Math.sin(angle));
  const rotW = Math.max(1, Math.round(img.naturalWidth * absCos + img.naturalHeight * absSin));
  const rotH = Math.max(1, Math.round(img.naturalWidth * absSin + img.naturalHeight * absCos));

  // 1) Render full rotated image at natural resolution
  const rotCanvas = document.createElement('canvas');
  rotCanvas.width = rotW; rotCanvas.height = rotH;
  const rctx = rotCanvas.getContext('2d')!;
  rctx.imageSmoothingEnabled = true;
  rctx.imageSmoothingQuality = 'high';
  rctx.save();
  rctx.translate(rotW / 2, rotH / 2);
  rctx.rotate(angle);
  rctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  rctx.restore();

  // 2) Compute crop rect in the rotated canvas' coordinate space (natural pixels)
  // Map canvas CSS-px selection to rotated-1x coordinates using centers and baseScale.
  // Canvas preview center of the drawn image:
  const dispLeft = layout ? layout.left : offset.x;
  const dispTop = layout ? layout.top : offset.y;
  const dispW = layout ? layout.dispW : img.naturalWidth * baseScale;
  const dispH = layout ? layout.dispH : img.naturalHeight * baseScale;
  const CcX = dispLeft + dispW / 2;
  const CcY = dispTop + dispH / 2;
  const CrX = rotW / 2;
  const CrY = rotH / 2;

  // Since (Q - Cc) = Rθ(v * s), the rotated-1x coordinate is simply Cr + (Q - Cc)/s
  let cropX = CrX + (sel.x - CcX) / baseScale;
  let cropY = CrY + (sel.y - CcY) / baseScale;
  let cropW = sel.w / baseScale;
  let cropH = sel.h / baseScale;

  // Clamp crop rectangle to rotated canvas bounds
  cropX = Math.max(0, Math.min(rotW - 1, cropX));
  cropY = Math.max(0, Math.min(rotH - 1, cropY));
  cropW = Math.max(1, Math.min(rotW - cropX, cropW));
  cropH = Math.max(1, Math.min(rotH - cropY, cropH));

  // 3) Extract that region without any rotation — axis-aligned result matching the preview selection
  const out = document.createElement('canvas');
  out.width = Math.round(cropW);
  out.height = Math.round(cropH);
  const octx = out.getContext('2d')!;
  octx.imageSmoothingEnabled = true; octx.imageSmoothingQuality = 'high';
  octx.drawImage(
    rotCanvas,
    Math.floor(cropX), Math.floor(cropY), Math.round(cropW), Math.round(cropH),
    0, 0, Math.round(cropW), Math.round(cropH)
  );

  // Replace working image with the cropped version (keep adjustments intact)
  const dataUrl = out.toDataURL('image/png');
  setImageSrc(dataUrl);
  // Clear selection and reset pan/rotation since geometry is baked
  setSel(null);
  setOffset({ x: 0, y: 0 });
  rotationRef.current = 0; setRotation(0);
  // allow the new image to load and then redraw
  requestAnimationFrame(() => {
    const info = computeImageLayout();
    if (info) { setOffset({ x: info.left, y: info.top }); }
  });
}

export function resetCrop(
  imageSrc: string,
  originalRef: React.MutableRefObject<string>,
  setImageSrc: (src: string) => void,
  setSel: (sel: { x: number; y: number; w: number; h: number } | null) => void,
  setOffset: (offset: { x: number; y: number }) => void,
  rotationRef: React.MutableRefObject<number>,
  setRotation: (v: number) => void,
  cropRatio: React.MutableRefObject<number | null>,
  setPresetIndex: (v: number) => void,
  dragging: React.MutableRefObject<null | any>,
  previewPointerIdRef: React.MutableRefObject<number | null>,
  previewOriginalRef: React.MutableRefObject<boolean>,
  setPreviewOriginal: (v: boolean) => void,
  computeImageLayout: () => any,
  canvasRef: React.RefObject<HTMLCanvasElement | null>
) {
  // If the underlying working image was replaced by a baked crop, restore
  // the original (uncropped) image. Do not reset color adjustments — only
  // undo geometry (crop/rotation/preset/selection).
  if (imageSrc !== originalRef.current) {
    setImageSrc(originalRef.current);
    // Clear any baked rotation as well so the photo returns to its original geometry
    rotationRef.current = 0; setRotation(0);
  }

  cropRatio.current = null;
  // Instead of clearing selection, set it to the full display area to keep overlay but not crop
  const info = computeImageLayout();
  if (info) {
    setSel({ x: info.left, y: info.top, w: info.dispW, h: info.dispH });
  } else {
    // fallback
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      setSel({ x: 0, y: 0, w: rect.width, h: rect.height });
    } else {
      setSel(null); // last resort
    }
  }
  setPresetIndex(0);
  // clear any active drag state and A/B preview
  if (dragging.current) dragging.current = null;
  previewPointerIdRef.current = null;
  previewOriginalRef.current = false;
  setPreviewOriginal(false);
  // recentre image in canvas and redraw
  requestAnimationFrame(() => {
    const info = computeImageLayout();
    if (info) { setOffset({ x: info.left, y: info.top }); }
  });
}
