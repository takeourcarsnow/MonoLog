import { drawRotated, renderProcessedSourceCanvas } from "./CanvasRendererUtils";

// Pixelation: scale down then back up with image smoothing disabled
export function applyPixelateEffect(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  imgLeft: number,
  imgTop: number,
  imgW: number,
  imgH: number,
  angleRad: number,
  pixelSize: number,
  filterValues: any,
  pixelShape: 'square' | 'circle' = 'square',
  pixelSample: 'average' | 'nearest' = 'average',
  effectScale: number = 1
) {
  // Respect A/B (press-and-hold to show original): skip special effects when previewing original
  if (filterValues?.isPreviewOrig) return;
  if (!pixelSize || pixelSize <= 1) return;
  try {
    const processed = renderProcessedSourceCanvas(img, filterValues);
    // Keep pixel block size visually consistent by scaling with export ratio
    const effPixel = Math.max(1, pixelSize * Math.max(1, effectScale));
    const w = Math.max(1, Math.round(imgW / effPixel));
    const h = Math.max(1, Math.round(imgH / effPixel));
    if (pixelShape === 'square') {
      const tmp = document.createElement('canvas');
      tmp.width = w; tmp.height = h;
      const tctx = tmp.getContext('2d')!;
      tctx.imageSmoothingEnabled = pixelSample === 'average';
      // draw processed source scaled to tiny size
      tctx.drawImage(processed, 0, 0, processed.width, processed.height, 0, 0, w, h);
      // draw back upscaled with smoothing disabled
      const up = document.createElement('canvas'); up.width = Math.max(1, Math.round(imgW)); up.height = Math.max(1, Math.round(imgH));
      const uctx = up.getContext('2d')!; uctx.imageSmoothingEnabled = false;
      uctx.drawImage(tmp, 0, 0, w, h, 0, 0, up.width, up.height);
      drawRotated(up, imgLeft, imgTop, imgW, imgH, angleRad, ctx);
    } else {
      // circle pixels: sample grid and draw circles
      const cols = w, rows = h;
      const sx = processed.width / cols; const sy = processed.height / rows;
      const out = document.createElement('canvas'); out.width = Math.max(1, Math.round(imgW)); out.height = Math.max(1, Math.round(imgH));
      const octx = out.getContext('2d')!; octx.imageSmoothingEnabled = false;
      const tmp = document.createElement('canvas'); tmp.width = cols; tmp.height = rows;
      const tctx = tmp.getContext('2d')!; tctx.drawImage(processed, 0, 0, processed.width, processed.height, 0, 0, cols, rows);
      const id = tctx.getImageData(0, 0, cols, rows); const d = id.data;
      octx.clearRect(0,0,out.width,out.height);
      const cw = out.width / cols; const ch = out.height / rows; const rad = Math.min(cw, ch) * 0.5;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = (y*cols + x) * 4; const r = d[i], g = d[i+1], b = d[i+2];
          octx.fillStyle = `rgb(${r},${g},${b})`;
          octx.beginPath();
          octx.arc((x+0.5)*cw, (y+0.5)*ch, rad, 0, Math.PI*2);
          octx.fill();
        }
      }
      drawRotated(out, imgLeft, imgTop, imgW, imgH, angleRad, ctx);
    }
  } catch {}
}