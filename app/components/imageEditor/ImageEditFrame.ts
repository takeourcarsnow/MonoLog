export function drawFrame(
  octx: CanvasRenderingContext2D,
  srcW: number,
  srcH: number,
  padPx: number,
  frameThickness: number,
  frameColor: 'white' | 'black'
) {
  if (frameThickness <= 0) return;

  octx.save();
  const thicknessPx = Math.max(1, Math.round(Math.min(srcW, srcH) * Math.max(0, Math.min(0.5, frameThickness))));
  octx.fillStyle = frameColor === 'white' ? '#ffffff' : '#000000';
  // Use integer coords and add 1px overlap to eliminate any sub-pixel gaps/seams
  const outerX = 0;
  const outerY = 0;
  const outerW = Math.ceil(srcW + padPx * 2);
  const outerH = Math.ceil(srcH + padPx * 2);
  const innerX = Math.floor(padPx);
  const innerY = Math.floor(padPx);
  const innerW = Math.ceil(srcW);
  const innerH = Math.ceil(srcH);
  const innerR = innerX + innerW;
  const innerB = innerY + innerH;

  // Draw overlapping bands to ensure no gaps
  // top band (with 1px overlap on sides)
  if (innerY > outerY) {
    octx.fillRect(outerX, outerY, outerW, innerY - outerY + 1);
  }
  // bottom band (with 1px overlap on sides)
  if (innerB < outerH) {
    octx.fillRect(outerX, innerB - 1, outerW, outerH - innerB + 1);
  }
  // left band (full height)
  if (innerX > outerX) {
    octx.fillRect(outerX, outerY, innerX - outerX + 1, outerH);
  }
  // right band (full height)
  if (innerR < outerW) {
    octx.fillRect(innerR - 1, outerY, outerW - innerR + 1, outerH);
  }
  octx.restore();
}