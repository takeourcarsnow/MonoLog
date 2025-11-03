import { drawRotated, renderProcessedSourceCanvas, clamp255 } from "./CanvasRendererUtils";
import { getTempCanvas, releaseTempCanvas } from './tempCanvasPool';

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

// Dithering: grayscale or color with Floyd–Steinberg or ordered Bayer 4x4
export function applyDitherEffect(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  imgLeft: number,
  imgTop: number,
  imgW: number,
  imgH: number,
  angleRad: number,
  method: 'none' | 'floyd-steinberg' | 'ordered' | 'atkinson' | 'burkes',
  levels: number,
  filterValues: any,
  colorMode: 'bw' | 'color' = 'bw',
  paletteName: 'auto' | 'gameboy' | 'pico8' | 'nes' | 'zx_spectrum' | 'atari_2600' | 'commodore64' | 'apple_ii' = 'auto',
  customPaletteStr?: string,
  effectScale: number = 1,
  opts?: { preview?: boolean; maxPreviewPixels?: number }
) {
  // Respect A/B original preview: skip dithering entirely
  if (filterValues?.isPreviewOrig) return;
  if (!method || method === 'none') return;
  const L = Math.max(3, Math.min(31, Math.round(levels || 3)));
  // Ensure srcCanvas is visible to finally{} for cleanup
  let srcCanvas: HTMLCanvasElement | OffscreenCanvas | null = null;
  try {
    const processed = renderProcessedSourceCanvas(img, filterValues);
    // Downsample to preview-equivalent resolution so pattern density matches
    let scale = Math.max(1, effectScale);
    // Hard cap processing pixels for responsiveness in interactive previews (device-agnostic)
    // Use a unified default cap that works well across devices; callers may override via opts.maxPreviewPixels
    const maxPreviewPixels = Math.max(64_000, Math.min(600_000, opts?.maxPreviewPixels ?? 250_000));
    const estPixels = (imgW * imgH) / (scale * scale);
    if (opts?.preview !== false && estPixels > maxPreviewPixels) {
      const neededScale = Math.sqrt((imgW * imgH) / maxPreviewPixels);
      if (isFinite(neededScale) && neededScale > scale) scale = neededScale;
    }

    const w = Math.max(1, Math.round(imgW / scale));
    const h = Math.max(1, Math.round(imgH / scale));
    const src = getTempCanvas(w, h) as any as HTMLCanvasElement; (src as any).width = w; (src as any).height = h;
    srcCanvas = src as any;
    const sctx = (src as any).getContext('2d')!;
    // draw processed scaled to display size to keep dither density consistent
    sctx.drawImage(processed, 0, 0, processed.width, processed.height, 0, 0, w, h);
    const imgData = sctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // helpers
    const quantScalar = (v: number) => Math.round((v / 255) * (L - 1)) * (255 / (L - 1));
    const palettes: Record<string, number[]> = {
      gameboy: [155,188,15, 139,172,15, 48,98,48, 15,56,15],
      pico8: [
        0,0,0, 29,43,83, 126,37,83, 0,135,81, 171,82,54, 95,87,79, 194,195,199, 255,241,232,
        255,0,77, 255,163,0, 255,236,39, 0,228,54, 41,173,255, 131,118,156, 255,119,168, 255,204,170
      ],
      nes: [
        124,124,124, 0,0,252, 0,0,188, 68,40,188, 148,0,132, 168,0,32, 168,16,0, 136,20,0,
        80,48,0, 0,120,0, 0,104,0, 0,88,0, 0,64,88, 0,0,0, 0,0,0, 0,0,0,
        188,188,188, 0,120,248, 0,88,248, 104,68,252, 216,0,204, 228,0,88, 248,56,0, 228,92,16,
        172,124,0, 0,184,0, 0,168,0, 0,168,68, 0,136,136, 0,0,0, 0,0,0, 0,0,0,
        248,248,248, 60,188,252, 104,136,252, 152,120,248, 248,184,248, 248,88,152, 248,120,88, 252,160,68,
        248,184,0, 184,248,24, 88,216,84, 88,248,152, 0,232,216, 120,120,120, 0,0,0, 0,0,0,
        252,252,252, 164,228,252, 184,184,248, 216,184,248, 248,184,248, 248,164,192, 240,208,176, 252,224,168,
        248,216,120, 216,248,120, 184,248,184, 184,248,216, 0,252,252, 248,216,248, 0,0,0, 0,0,0
      ],
      zx_spectrum: [0,0,0, 0,0,215, 215,0,0, 215,0,215, 0,215,0, 0,215,215, 0,0,255, 215,215,0, 215,215,215],
      atari_2600: [0,0,0, 255,255,255, 255,0,0, 0,255,0, 0,0,255, 0,255,255, 255,0,255, 255,255,0],
      commodore64: [
        0,0,0, 255,255,255, 136,0,0, 170,255,238, 204,68,204, 0,204,85, 0,0,170, 238,238,119,
        221,136,85, 102,68,0, 255,119,119, 51,51,51, 119,119,119, 170,255,102, 0,136,255, 187,187,187
      ],
      apple_ii: [
        0,0,0, 221,0,51, 0,0,153, 170,0,204, 0,153,0, 0,153,153, 0,0,255, 170,170,255,
        153,102,51, 255,102,0, 153,153,153, 255,153,153, 102,255,102, 255,255,102, 102,255,255, 255,255,255
      ]
    };
    let palette: number[] | null = null;
    if (colorMode === 'color') {
    if (paletteName === 'gameboy') palette = palettes.gameboy;
    else if (paletteName === 'pico8') palette = palettes.pico8;
    else if (paletteName === 'nes') palette = palettes.nes;
    else if (paletteName === 'zx_spectrum') palette = palettes.zx_spectrum;
    else if (paletteName === 'atari_2600') palette = palettes.atari_2600;
    else if (paletteName === 'commodore64') palette = palettes.commodore64;
    else if (paletteName === 'apple_ii') palette = palettes.apple_ii;
      else if (customPaletteStr) {
        const parts = customPaletteStr.split(',').map(s=>s.trim()).filter(Boolean);
        const arr: number[] = [];
        for (const hex of parts) {
          const m = /^#?([0-9a-f]{6})$/i.exec(hex);
          if (!m) continue;
          const v = parseInt(m[1],16);
          arr.push((v>>16)&255, (v>>8)&255, v&255);
        }
        if (arr.length>=3) palette = arr;
      }
    }

    const diffuseWithKernelBW = (kernel: Array<[number,number,number]>, norm: number) => {
      const lum = new Float32Array(w * h);
      for (let i = 0, p = 0; i < data.length; i += 4, p++) { lum[p] = 0.2126*data[i] + 0.7152*data[i+1] + 0.0722*data[i+2]; }
      for (let y=0;y<h;y++){
        for (let x=0;x<w;x++){
          const idx=y*w+x; const old = lum[idx]; const newV = quantScalar(old); const err = old - newV; lum[idx]=newV;
          for (const [dx,dy,wgt] of kernel){ const nx=x+dx, ny=y+dy; if (nx>=0&&nx<w&&ny>=0&&ny<h){ lum[ny*w+nx]+= err * (wgt/norm); } }
        }
      }
      for (let p=0,i=0;p<lum.length;p++,i+=4){ const v=Math.max(0,Math.min(255,Math.round(lum[p]))); data[i]=data[i+1]=data[i+2]=v; data[i+3]=255; }
    };
    const diffuseWithKernelColor = (kernel: Array<[number,number,number]>, norm: number) => {
      const rbuf = new Float32Array(w*h), gbuf = new Float32Array(w*h), bbuf = new Float32Array(w*h);
      for (let i=0,p=0;i<data.length;i+=4,p++){ rbuf[p]=data[i]; gbuf[p]=data[i+1]; bbuf[p]=data[i+2]; }
      const nearestPalette = (r:number,g:number,b:number) => {
        const qr = quantScalar(r), qg = quantScalar(g), qb = quantScalar(b);
        if (!palette) return [qr, qg, qb] as [number,number,number];
        let bestI=0, bestD=Infinity; for (let i=0;i<palette.length;i+=3){ const pr=palette[i],pg=palette[i+1],pb=palette[i+2]; const dr=pr-qr,dg=pg-qg,db=pb-qb; const dist=dr*dr+dg*dg+db*db; if (dist<bestD){bestD=dist;bestI=i;} }
        return [palette[bestI], palette[bestI+1], palette[bestI+2]] as [number,number,number];
      };
      for (let y=0;y<h;y++){
        for (let x=0;x<w;x++){
          const idx=y*w+x; const [nr,ng,nb]=nearestPalette(rbuf[idx],gbuf[idx],bbuf[idx]); const er=rbuf[idx]-nr, eg=gbuf[idx]-ng, eb=bbuf[idx]-nb; rbuf[idx]=nr; gbuf[idx]=ng; bbuf[idx]=nb;
          for (const [dx,dy,wgt] of kernel){ const nx=x+dx, ny=y+dy; if (nx>=0&&nx<w&&ny>=0&&ny<h){ const ii=ny*w+nx; rbuf[ii]+=er*(wgt/norm); gbuf[ii]+=eg*(wgt/norm); bbuf[ii]+=eb*(wgt/norm); } }
        }
      }
      for (let p=0,i=0;p<w*h;p++,i+=4){ data[i]=clamp255(rbuf[p]); data[i+1]=clamp255(gbuf[p]); data[i+2]=clamp255(bbuf[p]); data[i+3]=255; }
    };

    if (colorMode === 'bw') {
      // grayscale path
      if (method === 'ordered') {
        const mat4 = [0,8,2,10, 12,4,14,6, 3,11,1,9, 15,7,13,5];
        const mat = mat4;
        const n = 16;
        const size = 4;
        for (let y=0;y<h;y++){
          for (let x=0;x<w;x++){
            const i=(y*w+x)*4; const v=0.2126*data[i]+0.7152*data[i+1]+0.0722*data[i+2];
            const threshold=((mat[(y & (size-1))* size + (x & (size-1))]+0.5)/n)*(255/(L));
            const q = quantScalar(Math.max(0,Math.min(255,v+threshold)));
            data[i]=data[i+1]=data[i+2]=q; data[i+3]=255;
          }
        }
      } else {
        // diffusion kernels
        const fs: Array<[number,number,number]> = [[1,0,7],[ -1,1,3],[0,1,5],[1,1,1]]; const fsNorm=16;
        const atkinson: Array<[number,number,number]> = [[1,0,1],[2,0,1],[-1,1,1],[0,1,1],[1,1,1],[0,2,1]]; const atkNorm=8; // classic uses 1/8
        const burkes: Array<[number,number,number]> = [[1,0,8],[2,0,4],[-2,1,2],[-1,1,4],[0,1,8],[1,1,4],[2,1,2]]; const burkesNorm=32;
        const kernelMap: Record<string,{k:Array<[number,number,number]>, n:number}> = {
          'floyd-steinberg': {k:fs, n:fsNorm},
          atkinson: {k:atkinson, n:atkNorm},
          burkes: {k:burkes, n:burkesNorm}
        };
        const entry = kernelMap[method];
        if (entry) diffuseWithKernelBW(entry.k, entry.n);
      }
    } else {
      // color path: per-channel quant or nearest palette
      const bayer4 = [0,8,2,10, 12,4,14,6, 3,11,1,9, 15,7,13,5];
      const bayer8 = [
        0,32,8,40,2,34,10,42,
        48,16,56,24,50,18,58,26,
        12,44,4,36,14,46,6,38,
        60,28,52,20,62,30,54,22,
        3,35,11,43,1,33,9,41,
        51,19,59,27,49,17,57,25,
        15,47,7,39,13,45,5,37,
        63,31,55,23,61,29,53,21
      ];
      const nearestPalette = (r:number,g:number,b:number) => {
        const qr = quantScalar(r), qg = quantScalar(g), qb = quantScalar(b);
        if (!palette) return [qr, qg, qb] as [number,number,number];
        let bestI=0, bestD=Infinity; for (let i=0;i<palette.length;i+=3){ const pr=palette[i],pg=palette[i+1],pb=palette[i+2]; const dr=pr-qr,dg=pg-qg,db=pb-qb; const dist=dr*dr+dg*dg+db*db; if (dist<bestD){bestD=dist;bestI=i;} }
        return [palette[bestI], palette[bestI+1], palette[bestI+2]] as [number,number,number];
      };
      if (method === 'ordered') {
        const mat = bayer4; const n = 16; const size = 4;
        for (let y=0;y<h;y++){
          for (let x=0;x<w;x++){
            const i=(y*w+x)*4; const t=(mat[(y & (size-1))*size + (x & (size-1))]+0.5)/n*(255/L);
            const r=clamp255(data[i]+t), g=clamp255(data[i+1]+t), b=clamp255(data[i+2]+t);
            const [nr,ng,nb]=nearestPalette(r,g,b); data[i]=nr; data[i+1]=ng; data[i+2]=nb; data[i+3]=255;
          }
        }
      } else {
        // diffusion using kernels
        const fs: Array<[number,number,number]> = [[1,0,7],[ -1,1,3],[0,1,5],[1,1,1]]; const fsNorm=16;
        const atkinson: Array<[number,number,number]> = [[1,0,1],[2,0,1],[-1,1,1],[0,1,1],[1,1,1],[0,2,1]]; const atkNorm=8;
        const burkes: Array<[number,number,number]> = [[1,0,8],[2,0,4],[-2,1,2],[-1,1,4],[0,1,8],[1,1,4],[2,1,2]]; const burkesNorm=32;
        const kernelMap: Record<string,{k:Array<[number,number,number]>, n:number}> = {
          'floyd-steinberg': {k:fs, n:fsNorm},
          atkinson: {k:atkinson, n:atkNorm},
          burkes: {k:burkes, n:burkesNorm}
        };
        const entry = kernelMap[method];
        if (entry) diffuseWithKernelColor(entry.k, entry.n);
      }
    }
    sctx.putImageData(imgData, 0, 0);
    // Draw the dithered image back without smoothing so the pattern stays crisp when upscaling
    ctx.save();
    const prevSmooth = (ctx as any).imageSmoothingEnabled;
    (ctx as any).imageSmoothingEnabled = false;
    drawRotated(src, imgLeft, imgTop, imgW, imgH, angleRad, ctx);
    (ctx as any).imageSmoothingEnabled = prevSmooth;
    ctx.restore();
    // release temp canvas back to pool
    if (srcCanvas) releaseTempCanvas(srcCanvas as any);
  } catch {
    // ensure temp canvas is released if allocated
  } finally {
    try { if (typeof (srcCanvas as any) !== 'undefined' && srcCanvas) releaseTempCanvas(srcCanvas as any); } catch {}
  }
}

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