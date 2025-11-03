import { drawRotated } from "./CanvasRendererUtils";
import { mapBasicAdjustments } from './filterUtils';

function renderProcessedSourceCanvas(
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

export function applySoftFocusEffect(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  imgLeft: number,
  imgTop: number,
  imgW: number,
  imgH: number,
  angleRad: number,
  curSoftFocus: number,
  effectScale: number = 1
) {
  if (curSoftFocus <= 0.001) return;

  try {
    // Create a dreamy, soft focus effect by layering a blurred version
    const tmp = document.createElement('canvas');
    tmp.width = Math.max(1, Math.round(imgW));
    tmp.height = Math.max(1, Math.round(imgH));
    const tctx = tmp.getContext('2d')!;

    // Draw from the original image source (not the processed canvas)
    tctx.drawImage(img, 0, 0, (img as HTMLImageElement).naturalWidth, (img as HTMLImageElement).naturalHeight, 0, 0, tmp.width, tmp.height);

    // Apply blur
    // Scale the blur in proportion to the export scale so the look matches preview
    const blurAmount = Math.max(3, curSoftFocus * 12 * Math.max(1, effectScale));
    tctx.filter = `blur(${blurAmount}px) brightness(1.05)`;
    tctx.drawImage(tmp, 0, 0);
    tctx.filter = 'none';

    // Composite the blurred layer on top with lighten blend for glow
    ctx.save();
    ctx.globalAlpha = Math.min(0.4, curSoftFocus * 0.45);
    ctx.globalCompositeOperation = 'lighten';
    drawRotated(tmp, imgLeft, imgTop, imgW, imgH, angleRad, ctx);
    ctx.restore();
  } catch (e) {
    // fallback: subtle white overlay
    ctx.save();
    ctx.globalAlpha = Math.min(0.25, curSoftFocus * 0.3);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(imgLeft, imgTop, imgW, imgH);
    ctx.restore();
  }
}

export function applyFadeEffect(
  ctx: CanvasRenderingContext2D,
  imgLeft: number,
  imgTop: number,
  imgW: number,
  imgH: number,
  curFade: number
) {
  if (curFade <= 0.001) return;

  try {
    // Create a lifted blacks, reduced contrast fade effect (washed out vintage look)
    ctx.save();

    // First, apply a light overlay to lift the blacks
    ctx.globalAlpha = Math.min(0.35, curFade * 0.4);
    ctx.globalCompositeOperation = 'lighten';
    ctx.fillStyle = 'rgba(230, 230, 230, 0.5)';
    ctx.fillRect(imgLeft, imgTop, imgW, imgH);

    // Then reduce contrast with a gray overlay
    ctx.globalAlpha = Math.min(0.25, curFade * 0.3);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgba(200, 200, 200, 0.6)';
    ctx.fillRect(imgLeft, imgTop, imgW, imgH);

    ctx.restore();
  } catch (e) {
    // fallback: stronger white overlay
    ctx.save();
    ctx.globalAlpha = Math.min(0.4, curFade * 0.45);
    ctx.fillStyle = 'rgba(245,245,240,0.3)';
    ctx.fillRect(imgLeft, imgTop, imgW, imgH);
    ctx.restore();
  }
}

export function applyVignetteEffect(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  imgLeft: number,
  imgTop: number,
  imgW: number,
  imgH: number,
  curVignette: number,
  info?: { rect: DOMRect }
) {
  if (curVignette <= 0) return;

  try {
    // center the radial gradient on the image display area
    const cx = imgLeft + imgW / 2;
    const cy = imgTop + imgH / 2;
    const innerR = Math.min(imgW, imgH) * 0.2;
    const outerR = Math.max(imgW, imgH) * 0.8;
    const g = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${Math.min(0.85, curVignette)})`);
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    // clip to the image rectangle so the vignette won't darken the surrounding UI
    ctx.beginPath();
    ctx.rect(imgLeft, imgTop, imgW, imgH);
    ctx.clip();
    ctx.fillStyle = g;
    ctx.fillRect(imgLeft, imgTop, imgW, imgH);
    ctx.restore();
  } catch (e) {
    // fallback: if anything goes wrong, apply a conservative vignette over the canvas
    const r = info?.rect || canvas.getBoundingClientRect();
    const g = ctx.createRadialGradient(r.width / 2, r.height / 2, Math.min(r.width, r.height) * 0.2, r.width / 2, r.height / 2, Math.max(r.width, r.height) * 0.8);
    g.addColorStop(0, `rgba(0,0,0,0)`);
    g.addColorStop(1, `rgba(0,0,0,${Math.min(0.85, curVignette)})`);
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, r.width, r.height);
    ctx.restore();
  }
}

export function applyGrainEffect(
  ctx: CanvasRenderingContext2D,
  imgLeft: number,
  imgTop: number,
  imgW: number,
  imgH: number,
  angleRad: number,
  curGrain: number,
  generateNoiseCanvas: (width: number, height: number, intensity: number) => HTMLCanvasElement
) {
  if (curGrain <= 0) return;

  // draw grain only over the displayed image area (use shrunken image rect if frame is enabled)
  const nImgLeft = imgLeft;
  const nImgTop = imgTop;
  const nImgW = imgW;
  const nImgH = imgH;
  const noiseW = isNaN(imgW) || imgW <= 0 ? 1 : Math.max(1, Math.round(imgW));
  const noiseH = isNaN(imgH) || imgH <= 0 ? 1 : Math.max(1, Math.round(imgH));
  const noise = generateNoiseCanvas(noiseW, noiseH, curGrain);
  ctx.save();
  ctx.globalAlpha = Math.min(0.85, curGrain);
  ctx.globalCompositeOperation = 'overlay';
  // draw the noise scaled to the image area so grain doesn't bleed outside the photo
  drawRotated(noise, nImgLeft, nImgTop, nImgW, nImgH, angleRad, ctx);
  ctx.restore();
}

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
  method: 'none' | 'floyd-steinberg' | 'ordered' | 'bayer8' | 'atkinson' | 'burkes' | 'stucki' | 'sierra' | 'jjn',
  levels: number,
  filterValues: any,
  colorMode: 'bw' | 'color' = 'bw',
  paletteName: 'auto' | 'websafe' | 'cga16' | 'ega64' | 'mac16' | 'win16' = 'auto',
  customPaletteStr?: string,
  effectScale: number = 1
) {
  if (!method || method === 'none') return;
  const L = Math.max(2, Math.min(32, Math.round(levels || 2)));
  try {
    const processed = renderProcessedSourceCanvas(img, filterValues);
    // Downsample to preview-equivalent resolution so pattern density matches
    const scale = Math.max(1, effectScale);
    const w = Math.max(1, Math.round(imgW / scale));
    const h = Math.max(1, Math.round(imgH / scale));
    const src = document.createElement('canvas'); src.width = w; src.height = h;
    const sctx = src.getContext('2d')!;
    // draw processed scaled to display size to keep dither density consistent
    sctx.drawImage(processed, 0, 0, processed.width, processed.height, 0, 0, w, h);
    const imgData = sctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // helpers
    const quantScalar = (v: number) => Math.round((v / 255) * (L - 1)) * (255 / (L - 1));
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
    let palette: number[] | null = null;
    if (colorMode === 'color') {
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
      if (method === 'ordered' || method === 'bayer8') {
        const mat4 = [0,8,2,10, 12,4,14,6, 3,11,1,9, 15,7,13,5];
        const mat8 = [
          0,32,8,40,2,34,10,42,
          48,16,56,24,50,18,58,26,
          12,44,4,36,14,46,6,38,
          60,28,52,20,62,30,54,22,
          3,35,11,43,1,33,9,41,
          51,19,59,27,49,17,57,25,
          15,47,7,39,13,45,5,37,
          63,31,55,23,61,29,53,21
        ];
        const mat = method === 'bayer8' ? mat8 : mat4;
        const n = method === 'bayer8' ? 64 : 16;
        for (let y=0;y<h;y++){
          for (let x=0;x<w;x++){
            const i=(y*w+x)*4; const v=0.2126*data[i]+0.7152*data[i+1]+0.0722*data[i+2];
            const threshold=((mat[(y & (method==='bayer8'?7:3))* (method==='bayer8'?8:4) + (x & (method==='bayer8'?7:3))]+0.5)/n)*(255/(L));
            const q = quantScalar(Math.max(0,Math.min(255,v+threshold)));
            data[i]=data[i+1]=data[i+2]=q; data[i+3]=255;
          }
        }
      } else {
        // diffusion kernels
        const fs: Array<[number,number,number]> = [[1,0,7],[ -1,1,3],[0,1,5],[1,1,1]]; const fsNorm=16;
        const atkinson: Array<[number,number,number]> = [[1,0,1],[2,0,1],[-1,1,1],[0,1,1],[1,1,1],[0,2,1]]; const atkNorm=8; // classic uses 1/8
        const burkes: Array<[number,number,number]> = [[1,0,8],[2,0,4],[-2,1,2],[-1,1,4],[0,1,8],[1,1,4],[2,1,2]]; const burkesNorm=32;
        const stucki: Array<[number,number,number]> = [[1,0,8],[2,0,4],[-2,1,2],[-1,1,4],[0,1,8],[1,1,4],[2,1,2],[-2,2,1],[-1,2,2],[0,2,4],[1,2,2],[2,2,1]]; const stuckiNorm=42;
        const sierra: Array<[number,number,number]> = [[1,0,5],[2,0,3],[-2,1,2],[-1,1,4],[0,1,5],[1,1,4],[2,1,2],[-1,2,2],[0,2,3],[1,2,2]]; const sierraNorm=32;
        const jjn: Array<[number,number,number]> = [[1,0,7],[2,0,5],[-2,1,3],[-1,1,5],[0,1,7],[1,1,5],[2,1,3],[-2,2,1],[-1,2,3],[0,2,5],[1,2,3],[2,2,1]]; const jjnNorm=48;
        const kernelMap: Record<string,{k:Array<[number,number,number]>, n:number}> = {
          'floyd-steinberg': {k:fs, n:fsNorm},
          atkinson: {k:atkinson, n:atkNorm},
          burkes: {k:burkes, n:burkesNorm},
          stucki: {k:stucki, n:stuckiNorm},
          sierra: {k:sierra, n:sierraNorm},
          jjn: {k:jjn, n:jjnNorm},
        };
        const entry = kernelMap[method];
        diffuseWithKernelBW(entry.k, entry.n);
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
      if (method === 'ordered' || method === 'bayer8') {
        const mat = method === 'bayer8' ? bayer8 : bayer4; const n = method === 'bayer8' ? 64 : 16; const size = method === 'bayer8' ? 8 : 4;
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
        const stucki: Array<[number,number,number]> = [[1,0,8],[2,0,4],[-2,1,2],[-1,1,4],[0,1,8],[1,1,4],[2,1,2],[-2,2,1],[-1,2,2],[0,2,4],[1,2,2],[2,2,1]]; const stuckiNorm=42;
        const sierra: Array<[number,number,number]> = [[1,0,5],[2,0,3],[-2,1,2],[-1,1,4],[0,1,5],[1,1,4],[2,1,2],[-1,2,2],[0,2,3],[1,2,2]]; const sierraNorm=32;
        const jjn: Array<[number,number,number]> = [[1,0,7],[2,0,5],[-2,1,3],[-1,1,5],[0,1,7],[1,1,5],[2,1,3],[-2,2,1],[-1,2,3],[0,2,5],[1,2,3],[2,2,1]]; const jjnNorm=48;
        const kernelMap: Record<string,{k:Array<[number,number,number]>, n:number}> = {
          'floyd-steinberg': {k:fs, n:fsNorm},
          atkinson: {k:atkinson, n:atkNorm},
          burkes: {k:burkes, n:burkesNorm},
          stucki: {k:stucki, n:stuckiNorm},
          sierra: {k:sierra, n:sierraNorm},
          jjn: {k:jjn, n:jjnNorm},
        };
        diffuseWithKernelColor(kernelMap[method].k, kernelMap[method].n);
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
  } catch {}
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

function clamp255(v:number){ return v<0?0:v>255?255:Math.round(v); }

export function applyLightLeakEffect(
  ctx: CanvasRenderingContext2D,
  imgLeft: number,
  imgTop: number,
  imgW: number,
  imgH: number,
  curLightLeak: { preset: string; intensity: number }
) {
  if (curLightLeak.preset === 'none' || !curLightLeak.preset) return;

  try {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = curLightLeak.intensity;

    let cx: number, cy: number, radius: number, gradient: CanvasGradient;

    switch (curLightLeak.preset) {
      case 'warm-top-right':
        cx = imgLeft + imgW * 0.8;
        cy = imgTop + imgH * 0.2;
        radius = Math.max(imgW, imgH) * 0.5;
        gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, 'rgba(255, 255, 200, 0.8)');
        gradient.addColorStop(0.3, 'rgba(255, 220, 150, 0.6)');
        gradient.addColorStop(0.6, 'rgba(255, 180, 100, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 150, 50, 0)');
        break;

      case 'cool-bottom-left':
        cx = imgLeft + imgW * 0.2;
        cy = imgTop + imgH * 0.8;
        radius = Math.max(imgW, imgH) * 0.5;
        gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, 'rgba(200, 220, 255, 0.8)');
        gradient.addColorStop(0.3, 'rgba(150, 180, 255, 0.6)');
        gradient.addColorStop(0.6, 'rgba(100, 140, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(50, 100, 255, 0)');
        break;

      case 'magenta-center':
        cx = imgLeft + imgW * 0.5;
        cy = imgTop + imgH * 0.5;
        radius = Math.max(imgW, imgH) * 0.4;
        gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, 'rgba(255, 200, 255, 0.8)');
        gradient.addColorStop(0.3, 'rgba(255, 150, 220, 0.6)');
        gradient.addColorStop(0.6, 'rgba(255, 100, 180, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 50, 150, 0)');
        break;

      case 'blue-side':
        cx = imgLeft + imgW * 0.9;
        cy = imgTop + imgH * 0.5;
        radius = Math.max(imgW, imgH) * 0.6;
        gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, 'rgba(150, 200, 255, 0.7)');
        gradient.addColorStop(0.4, 'rgba(100, 150, 255, 0.5)');
        gradient.addColorStop(0.7, 'rgba(50, 100, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 50, 200, 0)');
        break;

      case 'golden-hour':
        cx = imgLeft + imgW * 0.7;
        cy = imgTop + imgH * 0.3;
        radius = Math.max(imgW, imgH) * 0.7;
        gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, 'rgba(255, 220, 150, 0.9)');
        gradient.addColorStop(0.2, 'rgba(255, 200, 120, 0.7)');
        gradient.addColorStop(0.5, 'rgba(255, 180, 80, 0.5)');
        gradient.addColorStop(0.8, 'rgba(255, 150, 50, 0.2)');
        gradient.addColorStop(1, 'rgba(255, 120, 20, 0)');
        break;

      case 'warm-bottom-left':
        cx = imgLeft + imgW * 0.2;
        cy = imgTop + imgH * 0.8;
        radius = Math.max(imgW, imgH) * 0.6;
        gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, 'rgba(255, 200, 120, 0.8)');
        gradient.addColorStop(0.3, 'rgba(255, 180, 80, 0.6)');
        gradient.addColorStop(0.6, 'rgba(255, 140, 40, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
        break;

      case 'cool-top-right':
        cx = imgLeft + imgW * 0.8;
        cy = imgTop + imgH * 0.2;
        radius = Math.max(imgW, imgH) * 0.6;
        gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, 'rgba(180, 220, 255, 0.8)');
        gradient.addColorStop(0.3, 'rgba(120, 180, 255, 0.6)');
        gradient.addColorStop(0.6, 'rgba(80, 140, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(40, 100, 255, 0)');
        break;

      case 'red-corner':
        cx = imgLeft + imgW * 0.15;
        cy = imgTop + imgH * 0.15;
        radius = Math.max(imgW, imgH) * 0.5;
        gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, 'rgba(255, 100, 100, 0.8)');
        gradient.addColorStop(0.3, 'rgba(255, 80, 80, 0.6)');
        gradient.addColorStop(0.6, 'rgba(255, 60, 60, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 40, 40, 0)');
        break;

      case 'purple-glow':
        cx = imgLeft + imgW * 0.5;
        cy = imgTop + imgH * 0.5;
        radius = Math.max(imgW, imgH) * 0.8;
        gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, 'rgba(200, 100, 255, 0.7)');
        gradient.addColorStop(0.3, 'rgba(180, 80, 255, 0.5)');
        gradient.addColorStop(0.6, 'rgba(150, 60, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(120, 40, 255, 0)');
        break;

      case 'sunset':
        cx = imgLeft + imgW * 0.6;
        cy = imgTop + imgH * 0.4;
        radius = Math.max(imgW, imgH) * 0.9;
        gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, 'rgba(255, 150, 80, 0.9)');
        gradient.addColorStop(0.2, 'rgba(255, 120, 60, 0.7)');
        gradient.addColorStop(0.5, 'rgba(255, 90, 40, 0.5)');
        gradient.addColorStop(0.8, 'rgba(255, 60, 20, 0.2)');
        gradient.addColorStop(1, 'rgba(255, 30, 0, 0)');
        break;

      case 'moonlight':
        cx = imgLeft + imgW * 0.3;
        cy = imgTop + imgH * 0.7;
        radius = Math.max(imgW, imgH) * 0.4;
        gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, 'rgba(220, 240, 255, 0.6)');
        gradient.addColorStop(0.4, 'rgba(200, 220, 255, 0.4)');
        gradient.addColorStop(0.7, 'rgba(180, 200, 255, 0.2)');
        gradient.addColorStop(1, 'rgba(160, 180, 255, 0)');
        break;

      default:
        return;
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(imgLeft, imgTop, imgW, imgH);
    ctx.restore();
  } catch (e) {
    // fallback: simple bright overlay
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(255, 255, 200, 0.5)';
    ctx.fillRect(imgLeft, imgTop, imgW, imgH);
    ctx.restore();
  }
}

export function applyOverlayEffect(
  ctx: CanvasRenderingContext2D,
  overlay: { img: HTMLImageElement; blendMode: string; opacity: number },
  imgLeft: number,
  imgTop: number,
  imgW: number,
  imgH: number
) {
  if (!overlay) return;

  const drawNow = (ovImg: HTMLImageElement) => {
    try {
      ctx.save();
      ctx.globalAlpha = overlay.opacity;
      ctx.globalCompositeOperation = overlay.blendMode as GlobalCompositeOperation;
      // Scale overlay to cover the image area while preserving aspect ratio, cropping if necessary
      const ovW = ovImg.naturalWidth;
      const ovH = ovImg.naturalHeight;
      const scale = Math.max(imgW / ovW, imgH / ovH);
      const drawW = ovW * scale;
      const drawH = ovH * scale;
      const drawX = imgLeft + (imgW - drawW) / 2;
      const drawY = imgTop + (imgH - drawH) / 2;
      ctx.drawImage(ovImg, drawX, drawY, drawW, drawH);
      ctx.restore();
    } catch (e) {
      // swallow drawing errors
    }
  };

  // If the provided image is already loaded, draw immediately.
  if (overlay.img && overlay.img.complete) {
    drawNow(overlay.img);
    return;
  }

  // Otherwise attempt to load the image and draw when ready. This is a
  // fallback so selecting overlays (which sets src async) still results in
  // the overlay appearing once the resource finishes loading.
  try {
    const temp = new Image();
    temp.crossOrigin = 'anonymous';
    // reuse src if available
    temp.src = overlay.img?.src || '';
    temp.onload = () => drawNow(temp);
  } catch (e) {
    // no-op if loading fails
  }
}

export function applyFrameOverlayEffect(
  ctx: CanvasRenderingContext2D,
  frameOverlay: { img: HTMLImageElement; opacity: number },
  dispLeft: number,
  dispTop: number,
  dispW: number,
  dispH: number
) {
  if (!frameOverlay) return;

  const drawNow = (frameImg: HTMLImageElement) => {
    try {
      ctx.save();
      ctx.globalAlpha = frameOverlay.opacity;
      ctx.globalCompositeOperation = 'source-over'; // normal blending for frames
      // Scale frame to fit entirely within the display area while preserving aspect ratio
      const frameW = frameImg.naturalWidth;
      const frameH = frameImg.naturalHeight;
      const scale = Math.min(dispW / frameW, dispH / frameH);
      const drawW = frameW * scale;
      const drawH = frameH * scale;
      const drawX = dispLeft + (dispW - drawW) / 2;
      const drawY = dispTop + (dispH - drawH) / 2;
      ctx.drawImage(frameImg, drawX, drawY, drawW, drawH);
      ctx.restore();
    } catch (e) {
      // swallow drawing errors
    }
  };

  // If the provided image is already loaded, draw immediately.
  if (frameOverlay.img && frameOverlay.img.complete) {
    drawNow(frameOverlay.img);
    return;
  }

  // Otherwise attempt to load the image and draw when ready.
  try {
    const temp = new Image();
    temp.crossOrigin = 'anonymous';
    temp.src = frameOverlay.img?.src || '';
    temp.onload = () => drawNow(temp);
  } catch (e) {
    // no-op if loading fails
  }
}
