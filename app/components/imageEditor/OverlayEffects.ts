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