import { generateNoiseCanvas } from "./utils";
import { FILTER_PRESETS } from "./constants";
import type { EditorSettings } from "./types";

interface ApplyEditParams {
  imgRef: React.RefObject<HTMLImageElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  sel: { x: number; y: number; w: number; h: number } | null;
  offset: { x: number; y: number };
  exposure: number;
  contrast: number;
  saturation: number;
  temperature: number;
  vignette: number;
  frameColor: 'white' | 'black';
  frameThickness: number;
  selectedFilter: string;
  filterStrength: number;
  grain: number;
  softFocus: number;
  fade: number;
  matte: number;
  rotation: number;
  rotationRef: React.MutableRefObject<number>;
  onApply: (dataUrl: string, settings: EditorSettings) => void;
}

export async function applyEdit({
  imgRef,
  canvasRef,
  sel,
  offset,
  exposure,
  contrast,
  saturation,
  temperature,
  vignette,
  frameColor,
  frameThickness,
  selectedFilter,
  filterStrength,
  grain,
  softFocus,
  fade,
  matte,
  rotation,
  rotationRef,
  onApply,
}: ApplyEditParams) {
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

interface ApplyCropOnlyParams {
  imgRef: React.RefObject<HTMLImageElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  sel: { x: number; y: number; w: number; h: number } | null;
  offset: { x: number; y: number };
  setImageSrc: (src: string) => void;
  setSel: (sel: { x: number; y: number; w: number; h: number } | null) => void;
  setOffset: (offset: { x: number; y: number }) => void;
  rotationRef: React.MutableRefObject<number>;
  setRotation: (rotation: number) => void;
  computeImageLayout: () => { rect: DOMRect; baseScale: number; dispW: number; dispH: number; left: number; top: number } | null;
  draw: (info?: { rect: DOMRect; baseScale: number; dispW: number; dispH: number; left: number; top: number }) => void;
}

export async function applyCropOnly({
  imgRef,
  canvasRef,
  sel,
  offset,
  setImageSrc,
  setSel,
  setOffset,
  rotationRef,
  setRotation,
  computeImageLayout,
  draw,
}: ApplyCropOnlyParams) {
  const img = imgRef.current; if (!img) return;
  const canvas = canvasRef.current; if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const baseScale = Math.min(rect.width / img.naturalWidth, rect.height / img.naturalHeight);

  if (!sel) return; // nothing to crop

  // Map selection (canvas coords) back to source image pixels
  const srcX = Math.max(0, Math.round((sel.x - offset.x) / baseScale));
  const srcY = Math.max(0, Math.round((sel.y - offset.y) / baseScale));
  const srcW = Math.max(1, Math.round(sel.w / baseScale));
  const srcH = Math.max(1, Math.round(sel.h / baseScale));

  // Handle rotation: bake rotation into the new image and then reset the rotation slider
  const rot = rotationRef.current ?? 0;
  const angle = (rot * Math.PI) / 180;
  const absCos = Math.abs(Math.cos(angle));
  const absSin = Math.abs(Math.sin(angle));
  const outW = Math.max(1, Math.round((srcW) * absCos + (srcH) * absSin));
  const outH = Math.max(1, Math.round((srcW) * absSin + (srcH) * absCos));

  const out = document.createElement('canvas');
  out.width = outW; out.height = outH;
  const octx = out.getContext('2d')!;
  octx.imageSmoothingQuality = 'high';

  // Draw the selected source region into the center of the output canvas with rotation applied.
  octx.save();
  octx.translate(outW / 2, outH / 2);
  octx.rotate(angle);
  // draw the selected region centered
  octx.drawImage(img, srcX, srcY, srcW, srcH, -srcW / 2, -srcH / 2, srcW, srcH);
  octx.restore();

  // Replace working image with the cropped version (keep adjustments intact)
  const dataUrl = out.toDataURL('image/png');
  setImageSrc(dataUrl);
  // Clear selection and reset pan/rotation since geometry is baked
  setSel(null);
  setOffset({ x: 0, y: 0 });
  rotationRef.current = 0; setRotation(0);
  // allow the new image to load and then redraw
  requestAnimationFrame(() => {
    const info = computeImageLayout();
    if (info) { setOffset({ x: info.left, y: info.top }); draw(info); }
    else draw();
  });
}

interface ResetFunctionsParams {
  setImageSrc: (src: string) => void;
  originalRef: React.MutableRefObject<string>;
  setSel: (sel: { x: number; y: number; w: number; h: number } | null) => void;
  setOffset: (offset: { x: number; y: number }) => void;
  setExposure: (v: number) => void;
  exposureRef: React.MutableRefObject<number>;
  setContrast: (v: number) => void;
  contrastRef: React.MutableRefObject<number>;
  setSaturation: (v: number) => void;
  saturationRef: React.MutableRefObject<number>;
  setTemperature: (v: number) => void;
  temperatureRef: React.MutableRefObject<number>;
  setVignette: (v: number) => void;
  vignetteRef: React.MutableRefObject<number>;
  setFrameColor: (v: 'white' | 'black') => void;
  frameColorRef: React.MutableRefObject<'white' | 'black'>;
  setFrameThickness: (v: number) => void;
  frameThicknessRef: React.MutableRefObject<number>;
  setSelectedFilter: (v: string) => void;
  selectedFilterRef: React.MutableRefObject<string>;
  setFilterStrength: (v: number) => void;
  filterStrengthRef: React.MutableRefObject<number>;
  setGrain: (v: number) => void;
  grainRef: React.MutableRefObject<number>;
  setSoftFocus: (v: number) => void;
  softFocusRef: React.MutableRefObject<number>;
  setFade: (v: number) => void;
  fadeRef: React.MutableRefObject<number>;
  setMatte: (v: number) => void;
  matteRef: React.MutableRefObject<number>;
  rotationRef: React.MutableRefObject<number>;
  setRotation: (v: number) => void;
  cropRatio: React.MutableRefObject<number | null>;
  setPresetIndex: (v: number) => void;
  computeImageLayout: () => { rect: DOMRect; baseScale: number; dispW: number; dispH: number; left: number; top: number } | null;
  draw: () => void;
}

export function resetAll({
  setImageSrc,
  originalRef,
  setSel,
  setOffset,
  setExposure,
  exposureRef,
  setContrast,
  contrastRef,
  setSaturation,
  saturationRef,
  setTemperature,
  temperatureRef,
  setVignette,
  vignetteRef,
  setFrameColor,
  frameColorRef,
  setFrameThickness,
  frameThicknessRef,
  setSelectedFilter,
  selectedFilterRef,
  setFilterStrength,
  filterStrengthRef,
  setGrain,
  grainRef,
  setSoftFocus,
  softFocusRef,
  setFade,
  fadeRef,
  setMatte,
  matteRef,
  rotationRef,
  setRotation,
  cropRatio,
  setPresetIndex,
  computeImageLayout,
  draw,
}: ResetFunctionsParams) {
  setImageSrc(originalRef.current);
  setSel(null); setOffset({ x: 0, y: 0 });
  setExposure(1); exposureRef.current = 1;
  setContrast(1); contrastRef.current = 1;
  setSaturation(1); saturationRef.current = 1;
  setTemperature(0); temperatureRef.current = 0;
  setVignette(0); vignetteRef.current = 0;
  setFrameColor('white'); frameColorRef.current = 'white';
  setFrameThickness(0); frameThicknessRef.current = 0;
  setSelectedFilter('none'); selectedFilterRef.current = 'none';
  setFilterStrength(1); filterStrengthRef.current = 1;
  setGrain(0); grainRef.current = 0;
  setSoftFocus(0); softFocusRef.current = 0;
  setFade(0); fadeRef.current = 0;
  setMatte(0); matteRef.current = 0;
  rotationRef.current = 0; setRotation(0);
  cropRatio.current = null;
  setPresetIndex(0);
  requestAnimationFrame(() => {
    const info = computeImageLayout();
    if (info) { setOffset({ x: info.left, y: info.top }); draw(); }
    else draw();
  });
}

export function resetAdjustments({
  setExposure,
  exposureRef,
  setContrast,
  contrastRef,
  setSaturation,
  saturationRef,
  setTemperature,
  temperatureRef,
  setVignette,
  vignetteRef,
  setFrameColor,
  frameColorRef,
  setFrameThickness,
  frameThicknessRef,
  setSelectedFilter,
  selectedFilterRef,
  setFilterStrength,
  filterStrengthRef,
  setGrain,
  grainRef,
  setSoftFocus,
  softFocusRef,
  setFade,
  fadeRef,
  setMatte,
  matteRef,
  rotationRef,
  setRotation,
  setSel,
  cropRatio,
  setPresetIndex,
  draw,
}: Omit<ResetFunctionsParams, 'setImageSrc' | 'originalRef' | 'setOffset' | 'computeImageLayout'>) {
  // Default values
  const defExposure = 1;
  const defContrast = 1;
  const defSaturation = 1;
  const defTemperature = 0;
  const defVignette = 0;
  const defFrameColor: 'white' | 'black' = 'white';
  const defFrameThickness = 0;
  const defSelectedFilter = 'none';
  const defFilterStrength = 1;
  const defGrain = 0;
  const defSoftFocus = 0;
  const defFade = 0;
  const defMatte = 0;
  const defRotation = 0;

  // Update state
  setExposure(defExposure); exposureRef.current = defExposure;
  setContrast(defContrast); contrastRef.current = defContrast;
  setSaturation(defSaturation); saturationRef.current = defSaturation;
  setTemperature(defTemperature); temperatureRef.current = defTemperature;
  setVignette(defVignette); vignetteRef.current = defVignette;
  setFrameColor(defFrameColor); frameColorRef.current = defFrameColor;
  setFrameThickness(defFrameThickness); frameThicknessRef.current = defFrameThickness;
  setSelectedFilter(defSelectedFilter); selectedFilterRef.current = defSelectedFilter;
  setFilterStrength(defFilterStrength); filterStrengthRef.current = defFilterStrength;
  setGrain(defGrain); grainRef.current = defGrain;
  setSoftFocus(defSoftFocus); softFocusRef.current = defSoftFocus;
  setFade(defFade); fadeRef.current = defFade;
  setMatte(defMatte); matteRef.current = defMatte;
  setRotation(defRotation); rotationRef.current = defRotation;

  // Also clear any crop selection/preset
  setSel(null);
  if (cropRatio) cropRatio.current = null;
  setPresetIndex(0);

  // Redraw with defaults
  requestAnimationFrame(() => draw());
}

export function resetCrop({
  setImageSrc,
  originalRef,
  imageSrc,
  setSel,
  setOffset,
  rotationRef,
  setRotation,
  cropRatio,
  setPresetIndex,
  computeImageLayout,
  draw,
}: Pick<ResetFunctionsParams, 'setImageSrc' | 'originalRef' | 'setSel' | 'setOffset' | 'rotationRef' | 'setRotation' | 'cropRatio' | 'setPresetIndex' | 'computeImageLayout' | 'draw'> & { imageSrc: string }) {
  // If the underlying working image was replaced by a baked crop, restore
  // the original (uncropped) image. Do not reset color adjustments — only
  // undo geometry (crop/rotation/preset/selection).
  if (imageSrc !== originalRef.current) {
    setImageSrc(originalRef.current);
    // Clear any baked rotation as well so the photo returns to its original geometry
    rotationRef.current = 0; setRotation(0);
  }

  cropRatio.current = null;
  setSel(null);
  setPresetIndex(0);
  // recentre image in canvas and redraw
  requestAnimationFrame(() => {
    const info = computeImageLayout();
    if (info) { setOffset({ x: info.left, y: info.top }); draw(); }
    else draw();
  });
}

export function resetControlToDefault(
  control: string,
  setters: {
    exposureRef: React.MutableRefObject<number>;
    setExposure: (v: number) => void;
    contrastRef: React.MutableRefObject<number>;
    setContrast: (v: number) => void;
    saturationRef: React.MutableRefObject<number>;
    setSaturation: (v: number) => void;
    temperatureRef: React.MutableRefObject<number>;
    setTemperature: (v: number) => void;
    filterStrengthRef: React.MutableRefObject<number>;
    setFilterStrength: (v: number) => void;
    vignetteRef: React.MutableRefObject<number>;
    setVignette: (v: number) => void;
    grainRef: React.MutableRefObject<number>;
    setGrain: (v: number) => void;
    softFocusRef: React.MutableRefObject<number>;
    setSoftFocus: (v: number) => void;
    fadeRef: React.MutableRefObject<number>;
    setFade: (v: number) => void;
    matteRef: React.MutableRefObject<number>;
    setMatte: (v: number) => void;
    rotationRef: React.MutableRefObject<number>;
    setRotation: (v: number) => void;
    frameThicknessRef: React.MutableRefObject<number>;
    setFrameThickness: (v: number) => void;
  },
  draw: () => void
) {
  switch (control) {
    case 'exposure': {
      const v = 1;
      setters.exposureRef.current = v; setters.setExposure(v); requestAnimationFrame(() => draw());
      break;
    }
    case 'contrast': {
      const v = 1;
      setters.contrastRef.current = v; setters.setContrast(v); requestAnimationFrame(() => draw());
      break;
    }
    case 'saturation': {
      const v = 1;
      setters.saturationRef.current = v; setters.setSaturation(v); requestAnimationFrame(() => draw());
      break;
    }
    case 'temperature': {
      const v = 0;
      setters.temperatureRef.current = v; setters.setTemperature(v); requestAnimationFrame(() => draw());
      break;
    }
    case 'filterStrength': {
      const v = 1;
      setters.filterStrengthRef.current = v; setters.setFilterStrength(v); requestAnimationFrame(() => draw());
      break;
    }
    case 'vignette': {
      const v = 0;
      setters.vignetteRef.current = v; setters.setVignette(v); requestAnimationFrame(() => draw());
      break;
    }
    case 'grain': {
      const v = 0;
      setters.grainRef.current = v; setters.setGrain(v); requestAnimationFrame(() => draw());
      break;
    }
    case 'softFocus': {
      const v = 0;
      setters.softFocusRef.current = v; setters.setSoftFocus(v); requestAnimationFrame(() => draw());
      break;
    }
    case 'fade': {
      const v = 0;
      setters.fadeRef.current = v; setters.setFade(v); requestAnimationFrame(() => draw());
      break;
    }
    case 'matte': {
      const v = 0;
      setters.matteRef.current = v; setters.setMatte(v); requestAnimationFrame(() => draw());
      break;
    }
    case 'rotation': {
      const v = 0;
      setters.rotationRef.current = v; setters.setRotation(v); requestAnimationFrame(() => draw());
      break;
    }
    case 'frameThickness': {
      const v = 0;
      setters.frameThicknessRef.current = v; setters.setFrameThickness(v); requestAnimationFrame(() => draw());
      break;
    }
    default:
      break;
  }
}

export function bakeRotate90({
  imgRef,
  setImageSrc,
  setSel,
  setOffset,
}: {
  imgRef: React.RefObject<HTMLImageElement>;
  setImageSrc: (src: string) => void;
  setSel: (sel: { x: number; y: number; w: number; h: number } | null) => void;
  setOffset: (offset: { x: number; y: number }) => void;
}) {
  const img = imgRef.current; if (!img) return;
  const tmp = document.createElement('canvas');
  tmp.width = img.naturalHeight; tmp.height = img.naturalWidth;
  const t = tmp.getContext('2d')!;
  t.translate(tmp.width / 2, tmp.height / 2);
  t.rotate(Math.PI / 2);
  t.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  const dataUrl = tmp.toDataURL('image/png');
  setImageSrc(dataUrl);
  setSel(null);
  setOffset({ x: 0, y: 0 });
}

export function bakeRotateMinus90({
  imgRef,
  setImageSrc,
  setSel,
  setOffset,
}: {
  imgRef: React.RefObject<HTMLImageElement>;
  setImageSrc: (src: string) => void;
  setSel: (sel: { x: number; y: number; w: number; h: number } | null) => void;
  setOffset: (offset: { x: number; y: number }) => void;
}) {
  const img = imgRef.current; if (!img) return;
  const tmp = document.createElement('canvas');
  tmp.width = img.naturalHeight; tmp.height = img.naturalWidth;
  const t = tmp.getContext('2d')!;
  t.translate(tmp.width / 2, tmp.height / 2);
  t.rotate(-Math.PI / 2);
  t.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  const dataUrl = tmp.toDataURL('image/png');
  setImageSrc(dataUrl);
  setSel(null);
  setOffset({ x: 0, y: 0 });
}