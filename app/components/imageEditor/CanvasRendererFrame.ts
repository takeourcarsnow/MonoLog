export function drawFrame(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  dispW: number,
  dispH: number,
  imgLeft: number,
  imgTop: number,
  imgW: number,
  imgH: number,
  angleRad: number,
  curFrameColor: string
) {
  // Draw frame bands between outer disp rect and inner uniformly-scaled image.
  // If the image is rotated, draw the frame inside a rotated coordinate
  // system so the frame rotates with the photo.
  ctx.save();
  ctx.fillStyle = curFrameColor === 'white' ? '#ffffff' : '#000000';

  // When no rotation is applied we can draw axis-aligned bands (fast path)
  if (Math.abs(angleRad) < 1e-6) {
    // Round all coordinates to whole pixels to eliminate gaps
    const outerL = Math.floor(left);
    const outerT = Math.floor(top);
    const outerR = Math.ceil(left + dispW);
    const outerB = Math.ceil(top + dispH);
    const innerL = Math.floor(imgLeft);
    const innerT = Math.floor(imgTop);
    const innerR = Math.ceil(imgLeft + imgW);
    const innerB = Math.ceil(imgTop + imgH);

    // Draw frame as overlapping rectangles to ensure no gaps
    if (innerT > outerT) ctx.fillRect(outerL, outerT, outerR - outerL, innerT - outerT + 1);
    if (innerB < outerB) ctx.fillRect(outerL, innerB - 1, outerR - outerL, outerB - innerB + 1);
    if (innerL > outerL) ctx.fillRect(outerL, outerT, innerL - outerL + 1, outerB - outerT);
    if (innerR < outerR) ctx.fillRect(innerR - 1, outerT, outerR - innerR + 1, outerB - outerT);
  } else {
    // Rotated path: translate to image center and draw relative to that center
    const cx = left + dispW / 2;
    const cy = top + dispH / 2;
    ctx.translate(cx, cy);
    ctx.rotate(angleRad);

    // Outer rect relative to center
    const outerL = Math.floor(-dispW / 2);
    const outerT = Math.floor(-dispH / 2);
    const outerR = Math.ceil(dispW / 2);
    const outerB = Math.ceil(dispH / 2);

    // Inner rect relative to center
    const innerL = Math.floor(imgLeft - left - dispW / 2);
    const innerT = Math.floor(imgTop - top - dispH / 2);
    const innerR = Math.ceil(imgLeft + imgW - left - dispW / 2);
    const innerB = Math.ceil(imgTop + imgH - top - dispH / 2);

    if (innerT > outerT) ctx.fillRect(outerL, outerT, outerR - outerL, innerT - outerT + 1);
    if (innerB < outerB) ctx.fillRect(outerL, innerB - 1, outerR - outerL, outerB - innerB + 1);
    if (innerL > outerL) ctx.fillRect(outerL, outerT, innerL - outerL + 1, outerB - outerT);
    if (innerR < outerR) ctx.fillRect(innerR - 1, outerT, outerR - innerR + 1, outerB - outerT);
  }
  ctx.restore();
}
