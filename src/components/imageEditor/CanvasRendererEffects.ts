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

export function applyMatteEffect(
  ctx: CanvasRenderingContext2D,
  imgLeft: number,
  imgTop: number,
  imgW: number,
  imgH: number,
  curMatte: number
) {
  if (curMatte <= 0.001) return;

  try {
    // Rich, cinematic matte look with crushed blacks and film-like tonality
    ctx.save();

    // Darken with multiply for crushed blacks
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = Math.min(0.25, curMatte * 0.3);
    ctx.fillStyle = 'rgba(30, 25, 35, 0.8)';
    ctx.fillRect(imgLeft, imgTop, imgW, imgH);

    // Add warm film tone with color-dodge for highlights
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = Math.min(0.2, curMatte * 0.25);
    ctx.fillStyle = 'rgba(200, 180, 150, 0.5)';
    ctx.fillRect(imgLeft, imgTop, imgW, imgH);

    ctx.restore();
  } catch (e) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = Math.min(0.35, curMatte * 0.4);
    ctx.fillStyle = 'rgba(25,25,25,0.3)';
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
  const noiseW = Math.max(1, Math.round(imgW));
  const noiseH = Math.max(1, Math.round(imgH));
  const noise = generateNoiseCanvas(noiseW, noiseH, curGrain);
  ctx.save();
  ctx.globalAlpha = Math.min(0.85, curGrain);
  ctx.globalCompositeOperation = 'overlay';
  // draw the noise scaled to the image area so grain doesn't bleed outside the photo
  drawRotated(noise, nImgLeft, nImgTop, nImgW, nImgH, angleRad, ctx);
  ctx.restore();
}