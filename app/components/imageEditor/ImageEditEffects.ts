import { generateNoiseCanvas } from './imageEditorHelpers';

function clamp255(v: number) { return v < 0 ? 0 : v > 255 ? 255 : Math.round(v); }

export function applySoftFocus(
  img: HTMLImageElement,
  srcX: number,
  srcY: number,
  srcW: number,
  srcH: number,
  octx: CanvasRenderingContext2D,
  padPx: number,
  softFocus: number
) {
  const curSoft = Math.min(1, Math.max(0, softFocus));
  if (curSoft <= 0.001) return;

  try {
    const tmp = document.createElement('canvas');
    tmp.width = srcW;
    tmp.height = srcH;
    const t = tmp.getContext('2d')!;
    // Draw from source image
    t.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
    // Apply blur with slight brightness boost
    const blurPx = Math.max(3, curSoft * 12);
    t.filter = `blur(${blurPx}px) brightness(1.05)`;
    t.drawImage(tmp, 0, 0);
    t.filter = 'none';
    octx.save();
    octx.globalAlpha = Math.min(0.4, curSoft * 0.45);
    octx.globalCompositeOperation = 'lighten';
    octx.drawImage(tmp, padPx, padPx, srcW, srcH);
    octx.restore();
  } catch (e) {
    // fallback subtle overlay
    octx.save();
    octx.globalAlpha = Math.min(0.25, curSoft * 0.3);
    octx.fillStyle = 'rgba(255,255,255,0.3)';
    octx.fillRect(padPx, padPx, srcW, srcH);
    octx.restore();
  }
}

export function applyFade(
  octx: CanvasRenderingContext2D,
  padPx: number,
  srcW: number,
  srcH: number,
  fade: number
) {
  const curFade = Math.min(1, Math.max(0, fade));
  if (curFade <= 0.001) return;

  try {
    octx.save();

    // First, apply a light overlay to lift the blacks
    octx.globalAlpha = Math.min(0.35, curFade * 0.4);
    octx.globalCompositeOperation = 'lighten';
    octx.fillStyle = 'rgba(230, 230, 230, 0.5)';
    octx.fillRect(padPx, padPx, srcW, srcH);

    // Then reduce contrast with a gray overlay
    octx.globalAlpha = Math.min(0.25, curFade * 0.3);
    octx.globalCompositeOperation = 'overlay';
    octx.fillStyle = 'rgba(200, 200, 200, 0.6)';
    octx.fillRect(padPx, padPx, srcW, srcH);

    octx.restore();
  } catch (e) {
    octx.save();
    octx.globalAlpha = Math.min(0.4, curFade * 0.45);
    octx.fillStyle = 'rgba(245,245,240,0.3)';
    octx.fillRect(padPx, padPx, srcW, srcH);
    octx.restore();
  }
}

export function applyGrain(
  srcW: number,
  srcH: number,
  octx: CanvasRenderingContext2D,
  padPx: number,
  grain: number
) {
  if (grain <= 0) return;

  const noise = generateNoiseCanvas(srcW, srcH, grain);
  octx.save();
  octx.globalAlpha = Math.min(0.85, grain);
  octx.globalCompositeOperation = 'overlay';
  octx.drawImage(noise, padPx, padPx, srcW, srcH);
  octx.restore();
}

// Helpers for export-time special effects
function renderProcessedForExport(
  img: HTMLImageElement,
  srcX: number,
  srcY: number,
  srcW: number,
  srcH: number,
  baseFilter: string,
  presetFilter: string,
  filterStrength: number
) {
  // render filtered source (no rotation) to a canvas of srcW x srcH
  const base = document.createElement('canvas'); base.width = Math.max(1, Math.round(srcW)); base.height = Math.max(1, Math.round(srcH));
  const bctx = base.getContext('2d')!;
  if (filterStrength <= 0.001) {
    bctx.filter = baseFilter;
    bctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, base.width, base.height);
    bctx.filter = 'none';
    return base;
  }
  if (filterStrength >= 0.999) {
    bctx.filter = `${baseFilter} ${presetFilter}`.trim();
    bctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, base.width, base.height);
    bctx.filter = 'none';
    return base;
  }
  // blend base + preset
  bctx.filter = baseFilter;
  bctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, base.width, base.height);
  bctx.filter = 'none';
  const filt = document.createElement('canvas'); filt.width = base.width; filt.height = base.height;
  const fctx = filt.getContext('2d')!; fctx.filter = `${baseFilter} ${presetFilter}`.trim();
  fctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, filt.width, filt.height); fctx.filter = 'none';
  bctx.globalAlpha = Math.min(1, Math.max(0, filterStrength));
  bctx.drawImage(filt, 0, 0);
  bctx.globalAlpha = 1;
  return base;
}

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

export function applyDitherExport(
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
  method: 'none' | 'floyd-steinberg' | 'ordered' | 'bayer8' | 'atkinson' | 'burkes' | 'stucki' | 'sierra' | 'jjn',
  levels: number,
  colorMode: 'bw' | 'color' = 'bw',
  paletteName: 'auto' | 'websafe' | 'cga16' | 'ega64' | 'mac16' | 'win16' = 'auto',
  customPaletteStr: string | undefined,
  baseFilter: string,
  presetFilter: string,
  filterStrength: number
) {
  if (!method || method === 'none') return;
  const processed = renderProcessedForExport(img, srcX, srcY, srcW, srcH, baseFilter, presetFilter, filterStrength);
  // Simplify: dither at fixed width based on mode, scaled aspect
  const ditherW = 300;
  const ditherH = Math.round(ditherW * (drawH / drawW));
  const w = Math.max(1, ditherW);
  const h = Math.max(1, ditherH);
  const src = document.createElement('canvas'); src.width = w; src.height = h; const sctx = src.getContext('2d')!;
  sctx.drawImage(processed, 0, 0, processed.width, processed.height, 0, 0, w, h);
  const id = sctx.getImageData(0, 0, w, h); const data = id.data;
  const L = Math.max(2, Math.min(32, Math.round(levels || 2)));
  const quantScalar = (v: number) => Math.round((v / 255) * (L - 1)) * (255 / (L - 1));
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

  // palette for color mode
  let palette: number[] | null = null;
  if (colorMode === 'color') {
    const palettes: Record<string, number[]> = {
      websafe: Array.from({length:6},(_,i)=>i*51).flatMap(r=>Array.from({length:6},(_,j)=>j*51).flatMap(g=>Array.from({length:6},(_,k)=>[r,g,k*51]).flat())),
      cga16: [
        0x00,0x00,0x00, 0x00,0xAA,0xAA, 0xAA,0x00,0xAA, 0xAA,0x55,0x00,
        0x00,0xAA,0x00, 0x00,0x00,0xAA, 0xAA,0xAA,0x00, 0xAA,0x55,0x55,
        0x55,0x55,0x55, 0x55,0xFF,0xFF, 0xFF,0x55,0xFF, 0xFF,0xFF,0x55,
        0x55,0xFF,0x55, 0x55,0x55,0xFF, 0xFF,0xFF,0xFF
      ],
      ega64: Array.from({length:4},(_,i)=>i*85).flatMap(r=>Array.from({length:4},(_,j)=>j*85).flatMap(g=>Array.from({length:4},(_,k)=>[r,g,k*85]).flat())),
      mac16: [
        0,0,0, 255,255,255, 255,0,0, 0,255,0, 0,0,255, 255,255,0, 0,255,255, 255,0,255,
        128,128,128, 192,192,192, 255,128,128, 128,255,128, 128,128,255, 255,255,128, 128,255,255, 255,128,255
      ],
      win16: [
        0,0,0, 128,0,0, 0,128,0, 128,128,0, 0,0,128, 128,0,128, 0,128,128, 192,192,192,
        128,128,128, 255,0,0, 0,255,0, 255,255,0, 0,0,255, 255,0,255, 0,255,255, 255,255,255
      ]
    };
    if (paletteName === 'websafe') palette = palettes.websafe;
    else if (paletteName === 'cga16') palette = palettes.cga16;
    else if (paletteName === 'ega64') palette = palettes.ega64;
    else if (paletteName === 'mac16') palette = palettes.mac16;
    else if (paletteName === 'win16') palette = palettes.win16;
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

  if (colorMode === 'bw') {
    const lum = new Float32Array(w * h);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const r = data[i], g = data[i+1], b = data[i+2]; lum[p] = 0.2126*r + 0.7152*g + 0.0722*b;
    }
    if (method === 'floyd-steinberg') {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = y * w + x; const old = lum[idx]; const newV = quantScalar(old); const err = old - newV; lum[idx] = newV;
          if (x + 1 < w) lum[idx + 1] += err * 7/16;
          if (y + 1 < h) {
            if (x > 0) lum[idx + w - 1] += err * 3/16;
            lum[idx + w] += err * 5/16;
            if (x + 1 < w) lum[idx + w + 1] += err * 1/16;
          }
        }
      }
    } else if (method === 'ordered' || method === 'bayer8') {
      const mat = method === 'bayer8' ? bayer8 : bayer4;
      const n = method === 'bayer8' ? 64 : 16;
      const size = method === 'bayer8' ? 8 : 4;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = y * w + x; const threshold = (mat[(y & (size - 1)) * size + (x & (size - 1))] + 0.5) / n * (255 / (L));
          const v = lum[idx] + threshold; lum[idx] = quantScalar(Math.max(0, Math.min(255, v)));
        }
      }
    } else {
      // diffusion kernels for other methods
      const diffuse = (kernel: Array<[number,number,number]>, norm: number) => {
        const buf = lum;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = y * w + x; const old = buf[idx]; const newV = quantScalar(old); const err = old - newV; buf[idx] = newV;
            for (const [dx,dy,wgt] of kernel) {
              const nx = x + dx, ny = y + dy; if (nx >= 0 && nx < w && ny >= 0 && ny < h) buf[ny*w + nx] += err * (wgt / norm);
            }
          }
        }
      };
      const fs: Array<[number,number,number]> = [[1,0,7],[-1,1,3],[0,1,5],[1,1,1]]; const fsNorm = 16;
      const atkinson: Array<[number,number,number]> = [[1,0,1],[2,0,1],[-1,1,1],[0,1,1],[1,1,1],[0,2,1]]; const atkNorm = 8;
      const burkes: Array<[number,number,number]> = [[1,0,8],[2,0,4],[-2,1,2],[-1,1,4],[0,1,8],[1,1,4],[2,1,2]]; const burkesNorm = 32;
      const stucki: Array<[number,number,number]> = [[1,0,8],[2,0,4],[-2,1,2],[-1,1,4],[0,1,8],[1,1,4],[2,1,2],[-2,2,1],[-1,2,2],[0,2,4],[1,2,2],[2,2,1]]; const stuckiNorm = 42;
      const sierra: Array<[number,number,number]> = [[1,0,5],[2,0,3],[-2,1,2],[-1,1,4],[0,1,5],[1,1,4],[2,1,2],[-1,2,2],[0,2,3],[1,2,2]]; const sierraNorm = 32;
      const jjn: Array<[number,number,number]> = [[1,0,7],[2,0,5],[-2,1,3],[-1,1,5],[0,1,7],[1,1,5],[2,1,3],[-2,2,1],[-1,2,3],[0,2,5],[1,2,3],[2,2,1]]; const jjnNorm = 48;
      const kernelMap: Record<string,{k:Array<[number,number,number]>, n:number}> = {
        'floyd-steinberg': {k:fs, n:fsNorm}, atkinson:{k:atkinson, n:atkNorm}, burkes:{k:burkes, n:burkesNorm}, stucki:{k:stucki, n:stuckiNorm}, sierra:{k:sierra, n:sierraNorm}, jjn:{k:jjn, n:jjnNorm}
      };
      const km = kernelMap[method]; if (km) diffuse(km.k, km.n);
    }
    for (let p = 0, i = 0; p < lum.length; p++, i += 4) { const v = Math.max(0, Math.min(255, Math.round(lum[p]))); data[i]=data[i+1]=data[i+2]=v; data[i+3]=255; }
  } else {
    const quantCh = (v:number)=>quantScalar(v);
    const nearestPalette = (r:number,g:number,b:number) => {
      const qr = quantCh(r), qg = quantCh(g), qb = quantCh(b);
      if (!palette) return [qr, qg, qb] as [number,number,number];
      let bestI = 0; let bestD = Infinity;
      for (let i = 0; i < palette.length; i += 3) {
        const pr = palette[i], pg = palette[i+1], pb = palette[i+2];
        const dr = pr - qr, dg = pg - qg, db = pb - qb; const dist = dr*dr + dg*dg + db*db;
        if (dist < bestD) { bestD = dist; bestI = i; }
      }
      return [palette[bestI], palette[bestI+1], palette[bestI+2]] as [number,number,number];
    };
    if (method === 'floyd-steinberg') {
      const rbuf = new Float32Array(w*h), gbuf = new Float32Array(w*h), bbuf = new Float32Array(w*h);
      for (let i = 0, p = 0; i < data.length; i += 4, p++) { rbuf[p]=data[i]; gbuf[p]=data[i+1]; bbuf[p]=data[i+2]; }
      for (let y=0;y<h;y++){
        for (let x=0;x<w;x++){
          const idx=y*w+x; const oldR=rbuf[idx], oldG=gbuf[idx], oldB=bbuf[idx];
          const [nr,ng,nb] = nearestPalette(oldR,oldG,oldB);
          const er=oldR-nr, eg=oldG-ng, eb=oldB-nb;
          rbuf[idx]=nr; gbuf[idx]=ng; bbuf[idx]=nb;
          if (x+1<w){ rbuf[idx+1]+=er*7/16; gbuf[idx+1]+=eg*7/16; bbuf[idx+1]+=eb*7/16; }
          if (y+1<h){
            if (x>0){ rbuf[idx+w-1]+=er*3/16; gbuf[idx+w-1]+=eg*3/16; bbuf[idx+w-1]+=eb*3/16; }
            rbuf[idx+w]+=er*5/16; gbuf[idx+w]+=eg*5/16; bbuf[idx+w]+=eb*5/16;
            if (x+1<w){ rbuf[idx+w+1]+=er*1/16; gbuf[idx+w+1]+=eg*1/16; bbuf[idx+w+1]+=eb*1/16; }
          }
        }
      }
      for (let p=0,i=0;p<w*h;p++,i+=4){ data[i]=clamp255(rbuf[p]); data[i+1]=clamp255(gbuf[p]); data[i+2]=clamp255(bbuf[p]); data[i+3]=255; }
    } else if (method === 'ordered' || method === 'bayer8') {
      const mat = method === 'bayer8' ? bayer8 : bayer4;
      const n = method === 'bayer8' ? 64 : 16;
      const size = method === 'bayer8' ? 8 : 4;
      for (let y=0;y<h;y++){
        for (let x=0;x<w;x++){
          const i=(y*w+x)*4; const t=(mat[(y & (size-1))*size + (x & (size-1))]+0.5)/n*(255/L);
          const r = clamp255(data[i] + t), g = clamp255(data[i+1] + t), b = clamp255(data[i+2] + t);
          const [nr,ng,nb]= nearestPalette(r,g,b);
          data[i]=nr; data[i+1]=ng; data[i+2]=nb; data[i+3]=255;
        }
      }
    } else {
      // color diffusion
      const diffuseColor = (kernel: Array<[number,number,number]>, norm: number) => {
        const rbuf=new Float32Array(w*h), gbuf=new Float32Array(w*h), bbuf=new Float32Array(w*h);
        for (let i=0,p=0;i<data.length;i+=4,p++){ rbuf[p]=data[i]; gbuf[p]=data[i+1]; bbuf[p]=data[i+2]; }
        for (let y=0;y<h;y++){
          for (let x=0;x<w;x++){
            const idx=y*w+x; const [nr,ng,nb]=nearestPalette(rbuf[idx],gbuf[idx],bbuf[idx]); const er=rbuf[idx]-nr, eg=gbuf[idx]-ng, eb=bbuf[idx]-nb; rbuf[idx]=nr; gbuf[idx]=ng; bbuf[idx]=nb;
            for (const [dx,dy,wgt] of kernel){ const nx=x+dx, ny=y+dy; if (nx>=0&&nx<w&&ny>=0&&ny<h){ const ii=ny*w+nx; rbuf[ii]+=er*(wgt/norm); gbuf[ii]+=eg*(wgt/norm); bbuf[ii]+=eb*(wgt/norm); } }
          }
        }
        for (let p=0,i=0;p<w*h;p++,i+=4){ data[i]=clamp255(rbuf[p]); data[i+1]=clamp255(gbuf[p]); data[i+2]=clamp255(bbuf[p]); data[i+3]=255; }
      };
      const fs: Array<[number,number,number]> = [[1,0,7],[ -1,1,3],[0,1,5],[1,1,1]]; const fsNorm=16;
      const atkinson: Array<[number,number,number]> = [[1,0,1],[2,0,1],[-1,1,1],[0,1,1],[1,1,1],[0,2,1]]; const atkNorm=8;
      const burkes: Array<[number,number,number]> = [[1,0,8],[2,0,4],[-2,1,2],[-1,1,4],[0,1,8],[1,1,4],[2,1,2]]; const burkesNorm=32;
      const stucki: Array<[number,number,number]> = [[1,0,8],[2,0,4],[-2,1,2],[-1,1,4],[0,1,8],[1,1,4],[2,1,2],[-2,2,1],[-1,2,2],[0,2,4],[1,2,2],[2,2,1]]; const stuckiNorm=42;
      const sierra: Array<[number,number,number]> = [[1,0,5],[2,0,3],[-2,1,2],[-1,1,4],[0,1,5],[1,1,4],[2,1,2],[-1,2,2],[0,2,3],[1,2,2]]; const sierraNorm=32;
      const jjn: Array<[number,number,number]> = [[1,0,7],[2,0,5],[-2,1,3],[-1,1,5],[0,1,7],[1,1,5],[2,1,3],[-2,2,1],[-1,2,3],[0,2,5],[1,2,3],[2,2,1]]; const jjnNorm=48;
      const kernelMap: Record<string,{k:Array<[number,number,number]>, n:number}> = {
        'floyd-steinberg': {k:fs, n:fsNorm}, atkinson:{k:atkinson, n:atkNorm}, burkes:{k:burkes, n:burkesNorm}, stucki:{k:stucki, n:stuckiNorm}, sierra:{k:sierra, n:sierraNorm}, jjn:{k:jjn, n:jjnNorm}
      };
      const km = kernelMap[method]; if (km) diffuseColor(km.k, km.n);
    }
  }
  sctx.putImageData(id, 0, 0);
  octx.save(); 
  const prevSmoothing = (octx as any).imageSmoothingEnabled;
  (octx as any).imageSmoothingEnabled = false;
  octx.translate(centerX, centerY); octx.rotate(angle); octx.drawImage(src, -drawW / 2, -drawH / 2, drawW, drawH); 
  (octx as any).imageSmoothingEnabled = prevSmoothing;
  octx.restore();
}

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