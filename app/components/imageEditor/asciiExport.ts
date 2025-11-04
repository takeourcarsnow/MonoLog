import { renderProcessedForExport } from './exportEffectUtils';

export function applyAsciiExport(
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
  enabled: boolean,
  cellSize: number,
  charset: string,
  invert: boolean,
  colorize: boolean,
  options: {
    opacity?: number;
    background?: string;
    font?: string;
    gamma?: number;
    bold?: boolean;
    edge?: 'none'|'stroke';
  } | undefined,
  baseFilter: string,
  presetFilter: string,
  filterStrength: number
) {
  if (!enabled) return;
  const processed = renderProcessedForExport(img, srcX, srcY, srcW, srcH, baseFilter, presetFilter, filterStrength);
  const w = Math.max(1, Math.round(drawW)); const h = Math.max(1, Math.round(drawH));
  // Scale cell size to match preview density
  const scaleFactor = 6;
  const effCell = Math.max(2, (cellSize || 8) * scaleFactor);
  const cols = Math.max(1, Math.floor(w / effCell)); const rows = Math.max(1, Math.floor(h / effCell));
  const out = document.createElement('canvas'); out.width = w; out.height = h; const ctx = out.getContext('2d')!;
  const bg = options?.background ?? 'transparent';
  if (bg !== 'transparent') { ctx.fillStyle = bg; ctx.fillRect(0,0,w,h); } else { ctx.clearRect(0,0,w,h); }
  const bold = options?.bold ? 'bold ' : '';
  const fontFam = options?.font || 'monospace';
  ctx.font = `${bold}${Math.max(4, Math.floor(effCell))}px ${fontFam}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  const tmp = document.createElement('canvas'); tmp.width = cols; tmp.height = rows; const tctx = tmp.getContext('2d')!;
  tctx.drawImage(processed, 0, 0, processed.width, processed.height, 0, 0, cols, rows);
  const id = tctx.getImageData(0,0,cols,rows); const data = id.data;
  const chars = (charset && charset.length ? charset : '@%#*+=-:. ').split('');
  const gamma = options?.gamma ?? 1;
  const pick = (v: number) => {
    const nv = Math.pow(v/255, 1/gamma) * 255;
    const idx = Math.max(0, Math.min(chars.length-1, Math.round((invert ? nv : (255 - nv)) / 255 * (chars.length - 1))));
    return chars[idx];
  };
  const cw = w / cols, ch = h / rows;
  const prevAlpha = ctx.globalAlpha;
  ctx.globalAlpha = Math.max(0, Math.min(1, options?.opacity ?? 1));
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4; const r = data[i], g = data[i+1], b = data[i+2];
      const v = 0.2126*r + 0.7152*g + 0.0722*b; const chStr = pick(v);
      ctx.fillStyle = colorize ? `rgb(${r},${g},${b})` : invert ? '#fff' : '#000';
      if (options?.edge === 'stroke') {
        ctx.lineWidth = 1; ctx.strokeStyle = invert ? '#fff' : '#000';
        ctx.strokeText(chStr, (x + 0.5) * cw, (y + 0.5) * ch);
      }
      ctx.fillText(chStr, (x + 0.5) * cw, (y + 0.5) * ch);
    }
  }
  ctx.globalAlpha = prevAlpha;
  octx.save(); octx.translate(centerX, centerY); octx.rotate(angle);
  // clear the underlying photo region so ASCII fully replaces the image
  octx.clearRect(-drawW/2, -drawH/2, drawW, drawH);
  octx.drawImage(out, -drawW/2, -drawH/2, drawW, drawH);
  octx.restore();
}