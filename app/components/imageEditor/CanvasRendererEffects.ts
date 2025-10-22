import { drawRotated } from "./CanvasRendererUtils";

export function applySoftFocusEffect(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  imgLeft: number,
  imgTop: number,
  imgW: number,
  imgH: number,
  angleRad: number,
  curSoftFocus: number
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
    const blurAmount = Math.max(3, curSoftFocus * 12);
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
