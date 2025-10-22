export function calculateCropArea(
  img: HTMLImageElement,
  sel: { x: number; y: number; w: number; h: number } | null,
  offset: { x: number; y: number },
  rect: DOMRect,
  baseScale: number
) {
  let srcX = 0, srcY = 0, srcW = img.naturalWidth, srcH = img.naturalHeight;
  if (sel) {
    srcX = Math.max(0, Math.round((sel.x - offset.x) / baseScale));
    srcY = Math.max(0, Math.round((sel.y - offset.y) / baseScale));
    srcW = Math.max(1, Math.round(sel.w / baseScale));
    srcH = Math.max(1, Math.round(sel.h / baseScale));
    srcW = Math.min(srcW, img.naturalWidth - srcX);
    srcH = Math.min(srcH, img.naturalHeight - srcY);
  }
  return { srcX, srcY, srcW, srcH };
}

export function calculateCanvasSize(
  srcW: number,
  srcH: number,
  frameThickness: number,
  rotation: number
) {
  // If frame thickness > 0 we expand the output canvas so the frame sits outside the image
  const padPx = frameThickness > 0 ? Math.max(1, Math.round(Math.min(srcW, srcH) * Math.max(0, Math.min(0.5, frameThickness)))) : 0;

  // Handle rotation: if rotation is set, output canvas needs to accommodate rotated bounds
  const angle = (rotation * Math.PI) / 180;
  // compute rotated bounding box
  const absCos = Math.abs(Math.cos(angle));
  const absSin = Math.abs(Math.sin(angle));
  const rotatedW = Math.max(1, Math.round((srcW) * absCos + (srcH) * absSin));
  const rotatedH = Math.max(1, Math.round((srcW) * absSin + (srcH) * absCos));

  const outWidth = rotatedW + padPx * 2;
  const outHeight = rotatedH + padPx * 2;

  return { outWidth, outHeight, padPx, rotatedW, rotatedH };
}

export function calculateFrameOverlaySize(
  outWidth: number,
  outHeight: number,
  srcW: number,
  srcH: number,
  frameOverlay: { img: HTMLImageElement; opacity: number } | null
) {
  const hasFrameOverlay = !!frameOverlay;
  let drawW = outWidth;
  let drawH = outHeight;
  let drawX = 0;
  let drawY = 0;
  if (hasFrameOverlay) {
    const frameW = frameOverlay!.img.naturalWidth;
    const frameH = frameOverlay!.img.naturalHeight;
    const scale = Math.min(outWidth / frameW, outHeight / frameH);
    drawW = frameW * scale;
    drawH = frameH * scale;
    drawX = (outWidth - drawW) / 2;
    drawY = (outHeight - drawH) / 2;
  }
  const drawSizeW = hasFrameOverlay ? drawW : srcW;
  const drawSizeH = hasFrameOverlay ? drawH : srcH;
  return { hasFrameOverlay, drawW, drawH, drawX, drawY, drawSizeW, drawSizeH };
}