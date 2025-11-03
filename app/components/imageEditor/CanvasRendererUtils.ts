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

export function renderProcessedSourceCanvas(
  img: HTMLImageElement,
  filterValues: any
): HTMLCanvasElement {
  const srcW = Math.max(1, img.naturalWidth);
  const srcH = Math.max(1, img.naturalHeight);
  const out = document.createElement('canvas');
  out.width = srcW; out.height = srcH;
  const octx = out.getContext('2d')!;
  const {
    isPreviewOrig,
    curFilterStrength,
    baseFilter,
    filter,
  } = filterValues;
  if (isPreviewOrig) {
    octx.drawImage(img, 0, 0);
    return out;
  }
  if (curFilterStrength >= 0.999) {
    octx.filter = filter;
    octx.drawImage(img, 0, 0);
    octx.filter = 'none';
  } else if (curFilterStrength <= 0.001) {
    octx.filter = baseFilter;
    octx.drawImage(img, 0, 0);
    octx.filter = 'none';
  } else {
    // blend base and preset
    const base = document.createElement('canvas'); base.width = srcW; base.height = srcH;
    const bctx = base.getContext('2d')!; bctx.filter = baseFilter; bctx.drawImage(img, 0, 0); bctx.filter = 'none';
    const filt = document.createElement('canvas'); filt.width = srcW; filt.height = srcH;
    const fctx = filt.getContext('2d')!; fctx.filter = filter; fctx.drawImage(img, 0, 0); fctx.filter = 'none';
    octx.drawImage(base, 0, 0);
    octx.globalAlpha = Math.min(1, Math.max(0, filterValues.curFilterStrength));
    octx.drawImage(filt, 0, 0);
    octx.globalAlpha = 1;
  }
  return out;
}

export function clamp255(v:number){ return v<0?0:v>255?255:Math.round(v); }
