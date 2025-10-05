import { generateNoiseCanvas } from './imageEditorHelpers';
import { FILTER_PRESETS } from './constants';
import type { EditorSettings } from './types';

export async function applyEdit(
  imgRef: React.RefObject<HTMLImageElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  offset: { x: number; y: number },
  sel: { x: number; y: number; w: number; h: number } | null,
  exposure: number,
  contrast: number,
  saturation: number,
  temperature: number,
  vignette: number,
  frameColor: 'white' | 'black',
  frameThickness: number,
  selectedFilter: string,
  filterStrength: number,
  grain: number,
  softFocus: number,
  fade: number,
  matte: number,
  rotation: number,
  rotationRef: React.MutableRefObject<number>,
  onApply: (dataUrl: string, settings: EditorSettings) => void
) {
  const img = imgRef.current; if (!img) return;
  const canvas = canvasRef.current;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const baseScale = Math.min(rect.width / img.naturalWidth, rect.height / img.naturalHeight);
  const scaleFactor = baseScale;

  let srcX = 0, srcY = 0, srcW = img.naturalWidth, srcH = img.naturalHeight;
  if (sel) {
    srcX = Math.max(0, Math.round((sel.x - offset.x) / scaleFactor));
    srcY = Math.max(0, Math.round((sel.y - offset.y) / scaleFactor));
    srcW = Math.max(1, Math.round(sel.w / scaleFactor));
    srcH = Math.max(1, Math.round(sel.h / scaleFactor));
    srcW = Math.min(srcW, img.naturalWidth - srcX);
    srcH = Math.min(srcH, img.naturalHeight - srcY);
  }

  // If frame thickness > 0 we expand the output canvas so the frame sits outside the image
  const padPx = frameThickness > 0 ? Math.max(1, Math.round(Math.min(srcW, srcH) * Math.max(0, Math.min(0.5, frameThickness)))) : 0;
  // Handle rotation: if rotation is set, output canvas needs to accommodate rotated bounds
  const rot = rotationRef.current ?? rotation;
  const angle = (rot * Math.PI) / 180;
  // compute rotated bounding box
  const absCos = Math.abs(Math.cos(angle));
  const absSin = Math.abs(Math.sin(angle));
  const rotatedW = Math.max(1, Math.round((srcW) * absCos + (srcH) * absSin));
  const rotatedH = Math.max(1, Math.round((srcW) * absSin + (srcH) * absCos));
  const out = document.createElement('canvas');
  out.width = rotatedW + padPx * 2; out.height = rotatedH + padPx * 2;
  const octx = out.getContext('2d')!;
  octx.imageSmoothingQuality = 'high';
  // Apply color adjustments to exported image
  const hue = Math.round((temperature / 100) * 30);
  const filterMap: Record<string, string> = {
    none: '',
    sepia: 'sepia(0.45)',
    mono: 'grayscale(0.95)',
    cinema: 'contrast(1.15) saturate(1.05) hue-rotate(-5deg)',
    bleach: 'saturate(1.3) contrast(0.95) brightness(1.02)'
  };
  const preset = FILTER_PRESETS[selectedFilter] || '';
  const baseFilterExport = `brightness(${exposure}) contrast(${contrast}) saturate(${saturation}) hue-rotate(${hue}deg)`;
  // draw with rotation: translate to center of out canvas, rotate, then draw image centered
  const centerX = out.width / 2;
  const centerY = out.height / 2;
  const drawExport = () => {
    if (filterStrength >= 0.999) {
      octx.filter = `${baseFilterExport} ${preset}`;
      octx.save();
      octx.translate(centerX, centerY);
      octx.rotate(angle);
      octx.drawImage(img, srcX, srcY, srcW, srcH, -srcW / 2, -srcH / 2, srcW, srcH);
      octx.restore();
      octx.filter = 'none';
    } else if (filterStrength <= 0.001) {
      octx.filter = baseFilterExport;
      octx.save();
      octx.translate(centerX, centerY);
      octx.rotate(angle);
      octx.drawImage(img, srcX, srcY, srcW, srcH, -srcW / 2, -srcH / 2, srcW, srcH);
      octx.restore();
      octx.filter = 'none';
    } else {
      octx.filter = baseFilterExport;
      octx.save();
      octx.translate(centerX, centerY);
      octx.rotate(angle);
      octx.drawImage(img, srcX, srcY, srcW, srcH, -srcW / 2, -srcH / 2, srcW, srcH);
      octx.restore();
      octx.filter = `${baseFilterExport} ${preset}`;
      octx.globalAlpha = Math.min(1, Math.max(0, filterStrength));
      octx.save();
      octx.translate(centerX, centerY);
      octx.rotate(angle);
      octx.drawImage(img, srcX, srcY, srcW, srcH, -srcW / 2, -srcH / 2, srcW, srcH);
      octx.restore();
      octx.globalAlpha = 1;
      octx.filter = 'none';
    }
  };
  drawExport();
  // image content has been drawn above with filters applied where appropriate;
  // ensure filter state is cleared before applying additional effects
  octx.filter = 'none';
  // --- Bake additional visual effects (Soft Focus / Fade / Matte) into export ---
  const curSoft = Math.min(1, Math.max(0, softFocus));
  const curFade = Math.min(1, Math.max(0, fade));
  const curMatte = Math.min(1, Math.max(0, matte));
  // Soft Focus: blurred overlay composited on top with lighten blend for dreamy glow
  if (curSoft > 0.001) {
    try {
      const tmp = document.createElement('canvas'); tmp.width = srcW; tmp.height = srcH;
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
      octx.save(); octx.globalAlpha = Math.min(0.25, curSoft * 0.3); octx.fillStyle = 'rgba(255,255,255,0.3)'; octx.fillRect(padPx, padPx, srcW, srcH); octx.restore();
    }
  }

  // Fade: washed out, lifted blacks vintage look (like sun-bleached photos)
  if (curFade > 0.001) {
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
      octx.save(); octx.globalAlpha = Math.min(0.4, curFade * 0.45); octx.fillStyle = 'rgba(245,245,240,0.3)'; octx.fillRect(padPx, padPx, srcW, srcH); octx.restore();
    }
  }
  // Matte: rich, cinematic matte look with crushed blacks and film-like tonality
  if (curMatte > 0.001) {
    try {
      octx.save();

      // Darken with multiply for crushed blacks
      octx.globalCompositeOperation = 'multiply';
      octx.globalAlpha = Math.min(0.25, curMatte * 0.3);
      octx.fillStyle = 'rgba(30, 25, 35, 0.8)';
      octx.fillRect(padPx, padPx, srcW, srcH);

      // Add warm film tone
      octx.globalCompositeOperation = 'soft-light';
      octx.globalAlpha = Math.min(0.2, curMatte * 0.25);
      octx.fillStyle = 'rgba(200, 180, 150, 0.5)';
      octx.fillRect(padPx, padPx, srcW, srcH);

      octx.restore();
    } catch (e) {
      octx.save(); octx.globalCompositeOperation = 'multiply'; octx.globalAlpha = Math.min(0.35, curMatte * 0.4); octx.fillStyle = 'rgba(25,25,25,0.3)'; octx.fillRect(padPx, padPx, srcW, srcH); octx.restore();
    }
  }
  // apply grain to exported image by compositing a noise canvas
  if (grain > 0) {
    const noise = generateNoiseCanvas(srcW, srcH, grain);
    octx.save();
    octx.globalAlpha = Math.min(0.85, grain);
    octx.globalCompositeOperation = 'overlay';
    octx.drawImage(noise, 0, 0, srcW, srcH);
    octx.restore();
  }
  // draw frame if thickness > 0
  if (frameThickness > 0) {
    octx.save();
    const thicknessPx = Math.max(1, Math.round(Math.min(srcW, srcH) * Math.max(0, Math.min(0.5, frameThickness))));
    octx.fillStyle = frameColor === 'white' ? '#ffffff' : '#000000';
    // Use integer coords and add 1px overlap to eliminate any sub-pixel gaps/seams
    const outerX = 0;
    const outerY = 0;
    const outerW = Math.ceil(srcW + padPx * 2);
    const outerH = Math.ceil(srcH + padPx * 2);
    const innerX = Math.floor(padPx);
    const innerY = Math.floor(padPx);
    const innerW = Math.ceil(srcW);
    const innerH = Math.ceil(srcH);
    const innerR = innerX + innerW;
    const innerB = innerY + innerH;

    // Draw overlapping bands to ensure no gaps
    // top band (with 1px overlap on sides)
    if (innerY > outerY) {
      octx.fillRect(outerX, outerY, outerW, innerY - outerY + 1);
    }
    // bottom band (with 1px overlap on sides)
    if (innerB < outerH) {
      octx.fillRect(outerX, innerB - 1, outerW, outerH - innerB + 1);
    }
    // left band (full height)
    if (innerX > outerX) {
      octx.fillRect(outerX, outerY, innerX - outerX + 1, outerH);
    }
    // right band (full height)
    if (innerR < outerW) {
      octx.fillRect(innerR - 1, outerY, outerW - innerR + 1, outerH);
    }
    octx.restore();
  }
  const dataUrl = out.toDataURL('image/jpeg', 0.92);
  // Return both the edited image and the current settings
  const settings: EditorSettings = {
    exposure,
    contrast,
    saturation,
    temperature,
    rotation,
    vignette,
    frameColor,
    frameThickness,
    selectedFilter,
    filterStrength,
    grain,
    softFocus,
    fade,
    matte,
  };
  onApply(dataUrl, settings);
}
