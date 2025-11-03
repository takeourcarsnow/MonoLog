import { generateNoiseCanvas } from './imageEditorHelpers';

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