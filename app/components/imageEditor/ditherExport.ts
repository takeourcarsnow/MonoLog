import { renderProcessedForExport, clamp255 } from './exportEffectUtils';
import { getPaletteFromChoice } from './palettes';

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
  method: 'none' | 'floyd-steinberg' | 'ordered' | 'atkinson' | 'burkes',
  levels: number,
  colorMode: 'bw' | 'color' = 'bw',
  paletteName: 'auto' | 'gameboy' | 'pico8' | 'nes' | 'zx_spectrum' | 'atari_2600' | 'commodore64' | 'apple_ii' = 'auto',
  customPaletteStr: string | undefined,
  baseFilter: string,
  presetFilter: string,
  filterStrength: number
) {
  if (!method || method === 'none') return;
  const processed = renderProcessedForExport(img, srcX, srcY, srcW, srcH, baseFilter, presetFilter, filterStrength);
  // Simplify: dither at fixed width based on mode, scaled aspect
  const ditherW = 150;
  const ditherH = Math.round(ditherW * (drawH / drawW));
  const w = Math.max(1, ditherW);
  const h = Math.max(1, ditherH);
  const src = document.createElement('canvas'); src.width = w; src.height = h; const sctx = src.getContext('2d')!;
  sctx.drawImage(processed, 0, 0, processed.width, processed.height, 0, 0, w, h);
  const id = sctx.getImageData(0, 0, w, h); const data = id.data;
  const L = Math.max(2, Math.min(32, Math.round(levels || 4)));
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
    palette = getPaletteFromChoice(paletteName, customPaletteStr);
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
    } else if (method === 'ordered') {
      const mat = bayer4;
      const n = 16;
      const size = 4;
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
      const kernelMap: Record<string,{k:Array<[number,number,number]>, n:number}> = {
        'floyd-steinberg': {k:fs, n:fsNorm}, atkinson:{k:atkinson, n:atkNorm}, burkes:{k:burkes, n:burkesNorm}
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
    } else if (method === 'ordered') {
      const mat = bayer4;
      const n = 16;
      const size = 4;
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
      const kernelMap: Record<string,{k:Array<[number,number,number]>, n:number}> = {
        'floyd-steinberg': {k:fs, n:fsNorm}, atkinson:{k:atkinson, n:atkNorm}, burkes:{k:burkes, n:burkesNorm}
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