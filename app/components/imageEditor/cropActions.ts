export async function applyCropOnly(
  imgRef: React.RefObject<HTMLImageElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>,
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
  const rect = canvas.getBoundingClientRect();
  const baseScale = Math.min(rect.width / img.naturalWidth, rect.height / img.naturalHeight);

  if (!sel) return; // nothing to crop

  // Map selection (canvas coords) back to source image pixels
  const srcX = Math.max(0, Math.round((sel.x - offset.x) / baseScale));
  const srcY = Math.max(0, Math.round((sel.y - offset.y) / baseScale));
  const srcW = Math.max(1, Math.round(sel.w / baseScale));
  const srcH = Math.max(1, Math.round(sel.h / baseScale));

  // Handle rotation: bake rotation into the new image and then reset the rotation slider
  const rot = rotationRef.current ?? rotation;
  const angle = (rot * Math.PI) / 180;
  const absCos = Math.abs(Math.cos(angle));
  const absSin = Math.abs(Math.sin(angle));
  const outW = Math.max(1, Math.round((srcW) * absCos + (srcH) * absSin));
  const outH = Math.max(1, Math.round((srcW) * absSin + (srcH) * absCos));

  const out = document.createElement('canvas');
  out.width = outW; out.height = outH;
  const octx = out.getContext('2d')!;
  octx.imageSmoothingQuality = 'high';

  // Draw the selected source region into the center of the output canvas with rotation applied.
  octx.save();
  octx.translate(outW / 2, outH / 2);
  octx.rotate(angle);
  // draw the selected region centered
  octx.drawImage(img, srcX, srcY, srcW, srcH, -srcW / 2, -srcH / 2, srcW, srcH);
  octx.restore();

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
  setSel: (sel: null) => void,
  setOffset: (offset: { x: number; y: number }) => void,
  rotationRef: React.MutableRefObject<number>,
  setRotation: (v: number) => void,
  cropRatio: React.MutableRefObject<number | null>,
  setPresetIndex: (v: number) => void,
  dragging: React.MutableRefObject<null | any>,
  previewPointerIdRef: React.MutableRefObject<number | null>,
  previewOriginalRef: React.MutableRefObject<boolean>,
  setPreviewOriginal: (v: boolean) => void,
  computeImageLayout: () => any
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
  setSel(null);
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
