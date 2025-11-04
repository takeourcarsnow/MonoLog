import { renderProcessedForExport } from './exportEffectUtils';

export function applyPixelateExport(
  img: HTMLImageElement,
  srcX: number,
  srcY: number,
  srcW: number,
  srcH: number,
  octx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  drawW: number,
  drawH: number,
  angle: number,
  pixelSize: number,
  pixelShape: 'square' | 'circle' = 'square',
  pixelSample: 'average' | 'nearest' = 'average',
  baseFilter: string,
  presetFilter: string,
  filterStrength: number
) {
  if (!pixelSize || pixelSize <= 1) return;
  const processed = renderProcessedForExport(img, srcX, srcY, srcW, srcH, baseFilter, presetFilter, filterStrength);
  // Scale pixel size to match preview density
  const effPixelSize = pixelSize * 6;
  const w = Math.max(1, Math.round(drawW / effPixelSize));
  const h = Math.max(1, Math.round(drawH / effPixelSize));
  if (pixelShape === 'square') {
    const tiny = document.createElement('canvas'); tiny.width = w; tiny.height = h;
    const tctx = tiny.getContext('2d')!; tctx.imageSmoothingEnabled = (pixelSample === 'average');
    tctx.drawImage(processed, 0, 0, processed.width, processed.height, 0, 0, w, h);
    const up = document.createElement('canvas'); up.width = Math.max(1, Math.round(drawW)); up.height = Math.max(1, Math.round(drawH));
    const uctx = up.getContext('2d')!; uctx.imageSmoothingEnabled = false;
    uctx.drawImage(tiny, 0, 0, w, h, 0, 0, up.width, up.height);
    octx.save();
    octx.translate(centerX, centerY);
    octx.rotate(angle);
    octx.drawImage(up, -drawW / 2, -drawH / 2, drawW, drawH);
    octx.restore();
  } else {
    // circle pixels path
    const cols = w, rows = h;
    const out = document.createElement('canvas'); out.width = Math.max(1, Math.round(drawW)); out.height = Math.max(1, Math.round(drawH));
    const o = out.getContext('2d')!; o.imageSmoothingEnabled = false;
    const tmp = document.createElement('canvas'); tmp.width = cols; tmp.height = rows;
    const tctx = tmp.getContext('2d')!; tctx.imageSmoothingEnabled = (pixelSample === 'average');
    tctx.drawImage(processed, 0, 0, processed.width, processed.height, 0, 0, cols, rows);
    const id = tctx.getImageData(0, 0, cols, rows); const d = id.data;
    o.clearRect(0,0,out.width,out.height);
    const cw = out.width / cols; const ch = out.height / rows; const rad = Math.min(cw, ch) * 0.5;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y*cols + x) * 4; const r = d[i], g = d[i+1], b = d[i+2];
        o.fillStyle = `rgb(${r},${g},${b})`;
        o.beginPath();
        o.arc((x+0.5)*cw, (y+0.5)*ch, rad, 0, Math.PI*2);
        o.fill();
      }
    }
    octx.save(); octx.translate(centerX, centerY); octx.rotate(angle); octx.drawImage(out, -drawW/2, -drawH/2, drawW, drawH); octx.restore();
  }
}