// Minimal WebGL shader-based filter to perform per-pixel exposure/contrast/saturation/temperature
// adjustments. This is a lightweight implementation intended for previews where per-pixel
// accuracy and speed are preferred over canvas 2D filter chains.

import { initShared, shared, texCache } from './WebGLContext';
import { getPresetCSSFilter, getPresetId } from './WebGLPresets';
import { getTempCanvas, releaseTempCanvas } from './tempCanvasPool';

// Exposed function: renders a processed canvas sized (w,h) with given adjustments.
// texture cache keyed by source image element to avoid re-uploads

export let enableGPU = true;
export function setEnableGPU(v: boolean) { enableGPU = !!v; }

// Exposed function: renders a processed canvas sized (w,h) with given adjustments and optional preset
export function applyWebGLAdjustments(
  img: CanvasImageSource,
  w: number,
  h: number,
  adjustments: { brightness: number; contrast: number; saturation: number; hue: number; preset?: string; presetStrength?: number; tempTint?: number }
) {
  initShared(w, h);

  // Build a fallback 2D processed canvas if GPU not available or disabled
  if (!shared.gl || !shared.canvas || !enableGPU) {
    // reuse temp canvas to avoid frequent allocations
    const out = getTempCanvas(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
    out.width = Math.max(1, Math.round(w));
    out.height = Math.max(1, Math.round(h));
    const ctx = (out as HTMLCanvasElement).getContext('2d')!;
    // build CSS filter string matching numeric adjustments
  // Apply a subtle color tint for temperature using a tiny hue-rotate fallback
  const tempTint = adjustments.tempTint || 0;
  const tintHue = tempTint * 6.0; // small hue offset (degrees)
  const bf = `brightness(${adjustments.brightness}) contrast(${adjustments.contrast}) saturate(${adjustments.saturation}) hue-rotate(${adjustments.hue + tintHue}deg)`;
    const presetStr = getPresetCSSFilter(adjustments.preset);
    // draw base
    ctx.save();
    ctx.filter = `${bf}`;
    ctx.drawImage(img as any, 0, 0, (img as HTMLImageElement).naturalWidth, (img as HTMLImageElement).naturalHeight, 0, 0, out.width, out.height);
    ctx.restore();

    // overlay preset according to presetStrength
    const ps = Math.max(0, Math.min(1, adjustments.presetStrength ?? 1));
    if (presetStr && ps > 0) {
      ctx.save();
      ctx.globalAlpha = ps;
      ctx.filter = presetStr;
      ctx.drawImage(img as any, 0, 0, (img as HTMLImageElement).naturalWidth, (img as HTMLImageElement).naturalHeight, 0, 0, out.width, out.height);
      ctx.restore();
    }

    // Clone into a fresh canvas to avoid returning a pooled canvas that might be
    // reused later (which would corrupt cached snapshots). This keeps callers safe
    // while still reducing temporary allocations during intermediate processing.
    const final = document.createElement('canvas');
    final.width = out.width;
    final.height = out.height;
    const fctx = final.getContext('2d')!;
    fctx.drawImage(out as any, 0, 0);
    // release pooled canvas back to pool
    releaseTempCanvas(out as any);
    return final as any;
  }

  const gl = shared.gl;

  // bind shared texture; reuse cached texture where possible
  const key = img as object;
  let tex = texCache.get(key) || null;
  gl.bindTexture(gl.TEXTURE_2D, tex || shared.tex);
  try {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img as any);
    if (!tex) {
      tex = shared.tex!;
      texCache.set(key, tex);
    }
  } catch (e) {
    const tmp = document.createElement('canvas'); tmp.width = (img as HTMLImageElement).naturalWidth || shared.canvas.width; tmp.height = (img as HTMLImageElement).naturalHeight || shared.canvas.height;
    const tctx = tmp.getContext('2d')!;
    tctx.drawImage(img as any, 0, 0, tmp.width, tmp.height);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tmp);
  }

  // set uniforms
  gl.useProgram(shared.prog as WebGLProgram);
  if (shared.u_brightness) gl.uniform1f(shared.u_brightness, adjustments.brightness);
  if (shared.u_contrast) gl.uniform1f(shared.u_contrast, adjustments.contrast);
  if (shared.u_saturation) gl.uniform1f(shared.u_saturation, adjustments.saturation);
  if (shared.u_hue) gl.uniform1f(shared.u_hue, adjustments.hue);
  // tempTint: subtle warm/cool tint - shader will use this if available
  // @ts-ignore (uniform may not exist in older builds)
  if ((shared as any).u_tempTint) gl.uniform1f((shared as any).u_tempTint, adjustments.tempTint || 0);
  // preset mapping to numeric id
  const presetName = adjustments.preset || '';
  const presetId = getPresetId(presetName);
  // @ts-ignore
  if (shared['u_presetId']) gl.uniform1f(shared['u_presetId'], presetId);
  // @ts-ignore
  if (shared['u_presetStrength']) gl.uniform1f(shared['u_presetStrength'], Math.max(0, Math.min(1, adjustments.presetStrength ?? 1)));

  gl.viewport(0, 0, shared.canvas.width, shared.canvas.height);
  gl.clearColor(0,0,0,0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  // return a snapshot canvas so callers can keep the output
  const out = document.createElement('canvas');
  out.width = shared.canvas.width;
  out.height = shared.canvas.height;
  const octx = out.getContext('2d')!;
  try {
    // if shared.canvas is an OffscreenCanvas, try transferToImageBitmap
    if ((shared.canvas as any).transferToImageBitmap) {
      const ib = (shared.canvas as any).transferToImageBitmap();
      octx.drawImage(ib, 0, 0);
    } else {
      octx.drawImage(shared.canvas as any, 0, 0);
    }
  } catch (e) {
    // fallback: try to use as-is
    try { octx.drawImage(shared.canvas as any, 0, 0); } catch (e) {}
  }

  return out;
}
