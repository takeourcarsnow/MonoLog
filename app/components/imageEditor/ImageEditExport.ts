import type { EditorSettings } from './types';

export function generateDataUrl(
  out: HTMLCanvasElement,
  hasFrameOverlay: boolean,
  drawX: number,
  drawY: number,
  drawW: number,
  drawH: number
): string {
  if (hasFrameOverlay) {
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = drawW;
    finalCanvas.height = drawH;
    const fctx = finalCanvas.getContext('2d')!;
    fctx.drawImage(out, drawX, drawY, drawW, drawH, 0, 0, drawW, drawH);
    return finalCanvas.toDataURL('image/jpeg', 0.92);
  } else {
    return out.toDataURL('image/jpeg', 0.92);
  }
}

export function createSettings(
  exposure: number,
  contrast: number,
  saturation: number,
  temperature: number,
  rotation: number,
  vignette: number,
  frameColor: 'white' | 'black',
  frameThickness: number,
  selectedFilter: string,
  filterStrength: number,
  grain: number,
  softFocus: number,
  fade: number,
  overlay: { img: HTMLImageElement; blendMode: string; opacity: number } | null,
  frameOverlay: { img: HTMLImageElement; opacity: number } | null
): EditorSettings {
  return {
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
    overlay: overlay ?? undefined,
    frameOverlay: frameOverlay ?? undefined,
  };
}