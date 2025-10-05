import { DrawParams, LayoutInfo } from "./CanvasRendererCore";

export function computeImageLayout(params: DrawParams, info?: LayoutInfo) {
  const { canvasRef, imgRef, offset, computeImageLayout } = params;

  const canvas = canvasRef.current;
  const img = imgRef.current;
  if (!canvas || !img) return null;

  // prefer using the provided layout info to avoid state update races
  let left: number, top: number, dispW: number, dispH: number;
  if (info) {
    left = info.left;
    top = info.top;
    dispW = info.dispW;
    dispH = info.dispH;
  } else {
    // Try to compute current layout from the canvas to avoid using a stale `offset` value
    const computed = computeImageLayout();
    if (computed) {
      left = computed.left;
      top = computed.top;
      dispW = computed.dispW;
      dispH = computed.dispH;
    } else {
      const rect = canvas.getBoundingClientRect();
      const baseScale = Math.min(rect.width / img.naturalWidth, rect.height / img.naturalHeight);
      dispW = img.naturalWidth * baseScale;
      dispH = img.naturalHeight * baseScale;
      left = offset.x;
      top = offset.y;
    }
  }

  return { left, top, dispW, dispH };
}

export function computeFrameAdjustedLayout(
  left: number,
  top: number,
  dispW: number,
  dispH: number,
  frameThickness: number
) {
  // When a frame is enabled, shrink the displayed image rectangle (uniform inset)
  // so the frame occupies the outer margin. Aspect ratio is preserved by applying
  // identical padding on all sides derived from min(dispW, dispH).
  let imgLeft = left;
  let imgTop = top;
  let imgW = dispW;
  let imgH = dispH;

  if (frameThickness > 0) {
    // Previous approach subtracted identical absolute padding from width & height,
    // which changes aspect ratio when the image isn't square. Instead, compute a
    // desired padding based on the min dimension, derive candidate horizontal &
    // vertical scale factors, then choose a single uniform scale so the image
    // shrinks proportionally (aspect ratio preserved). The actual visual frame
    // thickness may differ slightly between axes if the image is not square.
    const minDim = Math.min(dispW, dispH);
    const padDesired = Math.min(minDim * Math.max(0, Math.min(0.5, frameThickness)), minDim * 0.49);
    const scaleW = (dispW - 2 * padDesired) / dispW;
    const scaleH = (dispH - 2 * padDesired) / dispH;
    const scale = Math.max(0.01, Math.min(scaleW, scaleH));
    const scaledW = dispW * scale;
    const scaledH = dispH * scale;
    imgLeft = left + (dispW - scaledW) / 2;
    imgTop = top + (dispH - scaledH) / 2;
    imgW = scaledW;
    imgH = scaledH;
  }

  return { imgLeft, imgTop, imgW, imgH };
}
