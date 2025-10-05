// helper to draw an image/canvas with rotation around its center
export function drawRotated(
  source: CanvasImageSource,
  left: number,
  top: number,
  w: number,
  h: number,
  rad: number,
  ctx: CanvasRenderingContext2D
) {
  const cx = left + w / 2;
  const cy = top + h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rad);
  ctx.drawImage(source as any, -w / 2, -h / 2, w, h);
  ctx.restore();
}
