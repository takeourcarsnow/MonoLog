import { drawRotated, renderProcessedSourceCanvas } from "./CanvasRendererUtils";

// ASCII art: draw text cells over image
export function applyAsciiEffect(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  imgLeft: number,
  imgTop: number,
  imgW: number,
  imgH: number,
  angleRad: number,
  enabled: boolean,
  cellSize: number,
  charset: string,
  invert: boolean,
  colorize: boolean,
  filterValues: any,
  options?: {
    opacity?: number;
    background?: string;
    font?: string;
    gamma?: number;
    bold?: boolean;
    edge?: 'none'|'stroke';
  },
  effectScale: number = 1
) {
  // Respect A/B original preview: skip ASCII overlay entirely
  if (filterValues?.isPreviewOrig) return;
  if (!enabled) return;
  try {
    const processed = renderProcessedSourceCanvas(img, filterValues);
    const w = Math.max(1, Math.round(imgW));
    const h = Math.max(1, Math.round(imgH));
    // Scale the ASCII cell size so the number of cells matches preview
    const effCell = Math.max(2, (cellSize || 8) * Math.max(1, effectScale));
    const cols = Math.max(1, Math.floor(w / effCell));
    const rows = Math.max(1, Math.floor(h / effCell));
    const sx = processed.width / cols;
    const sy = processed.height / rows;
    const out = document.createElement('canvas'); out.width = w; out.height = h;
    const octx = out.getContext('2d')!;
    const bg = options?.background ?? 'transparent';
    if (bg !== 'transparent') { octx.fillStyle = bg; octx.fillRect(0, 0, w, h); } else { octx.clearRect(0,0,w,h); }
    const fontFam = options?.font || 'monospace';
    const bold = options?.bold ? 'bold ' : '';
    octx.font = `${bold}${Math.max(4, Math.floor(effCell))}px ${fontFam}`;
    octx.textBaseline = 'middle'; octx.textAlign = 'center';
    const tmp = document.createElement('canvas'); tmp.width = cols; tmp.height = rows;
    const tctx = tmp.getContext('2d')!;
    tctx.drawImage(processed, 0, 0, processed.width, processed.height, 0, 0, cols, rows);
    const id = tctx.getImageData(0, 0, cols, rows);
    const data = id.data;
    const chars = (charset && charset.length ? charset : '@%#*+=-:. ').split('');
    const gamma = options?.gamma ?? 1;
    const pickChar = (v: number) => {
      const nv = Math.pow(v/255, 1/gamma) * 255;
      const idx = Math.max(0, Math.min(chars.length - 1, Math.round((invert ? nv : (255 - nv)) / 255 * (chars.length - 1))));
      return chars[idx];
    };
    const cw = w / cols, ch = h / rows;
    const prevAlpha = octx.globalAlpha;
    octx.globalAlpha = Math.max(0, Math.min(1, options?.opacity ?? 1));
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const r = data[i], g = data[i+1], b = data[i+2];
        const v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const chStr = pickChar(v);
        if (colorize) octx.fillStyle = `rgb(${r},${g},${b})`; else octx.fillStyle = invert ? '#fff' : '#000';
        if (options?.edge === 'stroke') {
          octx.lineWidth = 1; octx.strokeStyle = invert ? '#fff' : '#000';
          octx.strokeText(chStr, (x + 0.5) * cw, (y + 0.5) * ch);
        }
        octx.fillText(chStr, (x + 0.5) * cw, (y + 0.5) * ch);
      }
    }
    octx.globalAlpha = prevAlpha;
    // Clear underlying photo region so ASCII replaces the image
    const clear = document.createElement('canvas'); clear.width = w; clear.height = h; const cctx = clear.getContext('2d')!; cctx.fillStyle = '#000'; cctx.fillRect(0,0,w,h);
    ctx.save(); ctx.globalCompositeOperation = 'destination-out';
    drawRotated(clear, imgLeft, imgTop, imgW, imgH, angleRad, ctx);
    ctx.restore();
    drawRotated(out, imgLeft, imgTop, imgW, imgH, angleRad, ctx);
  } catch {}
}