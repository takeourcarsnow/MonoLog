import { drawRotated, renderProcessedSourceCanvas, clamp255 } from "./CanvasRendererUtils";
import { getTempCanvas, releaseTempCanvas } from './tempCanvasPool';
import { getPaletteFromChoice } from './palettes';

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
  opts?: { preview?: boolean; maxPreviewPixels?: number; targetLongEdge?: number }
) {
  // Respect A/B original preview: skip dithering entirely
  if (filterValues?.isPreviewOrig) return;
  if (!method || method === 'none') return;
  const L = Math.max(2, Math.min(31, Math.round(levels || 4)));
  // Ensure srcCanvas is visible to finally{} for cleanup
  let srcCanvas: HTMLCanvasElement | OffscreenCanvas | null = null;
  try {
    const processed = renderProcessedSourceCanvas(img, filterValues);
    // New: force a distinctly low-res look by dithering at a fixed, small base size
    // similar to classic 8-bit photo apps, then upscale without smoothing.
    // Use the longer image edge as the control dimension.
    const targetLong = Math.max(48, Math.min(1024, opts?.targetLongEdge ?? 150));
    const aspect = imgW / Math.max(1, imgH);
    let desiredW: number, desiredH: number;
    if (imgW >= imgH) {
      desiredW = targetLong;
      desiredH = Math.round(targetLong / Math.max(1e-6, aspect));
    } else {
      desiredH = targetLong;
      desiredW = Math.round(targetLong * aspect);
    }
    // Never upsample the tiny working canvas beyond the current draw size (no benefit)
    desiredW = Math.max(1, Math.min(Math.round(imgW), desiredW));
    desiredH = Math.max(1, Math.min(Math.round(imgH), desiredH));
    // Additionally, keep a pixel cap for interactive preview responsiveness
    const maxPreviewPixels = Math.max(16_000, Math.min(300_000, opts?.maxPreviewPixels ?? 25_000)); // ~150x150 default
    if (opts?.preview !== false && desiredW * desiredH > maxPreviewPixels) {
      const scaleDown = Math.sqrt((desiredW * desiredH) / maxPreviewPixels);
      desiredW = Math.max(1, Math.round(desiredW / scaleDown));
      desiredH = Math.max(1, Math.round(desiredH / scaleDown));
    }

    const w = desiredW;
    const h = desiredH;
    const src = getTempCanvas(w, h) as any as HTMLCanvasElement; (src as any).width = w; (src as any).height = h;
    srcCanvas = src as any;
    const sctx = (src as any).getContext('2d')!;
    // draw processed scaled to display size to keep dither density consistent
    sctx.drawImage(processed, 0, 0, processed.width, processed.height, 0, 0, w, h);
    const imgData = sctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // helpers
    const quantScalar = (v: number) => Math.round((v / 255) * (L - 1)) * (255 / (L - 1));
    let palette: number[] | null = null;
    if (colorMode === 'color') {
      palette = getPaletteFromChoice(paletteName, customPaletteStr);
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