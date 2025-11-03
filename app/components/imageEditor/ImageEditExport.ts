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
  frameOverlay: { img: HTMLImageElement; opacity: number; bounds?: { minX: number; minY: number; maxX: number; maxY: number } } | null,
  // special effects
  ditherMethod: 'none' | 'floyd-steinberg' | 'ordered' | 'atkinson' | 'burkes',
  ditherLevels: number,
  ditherColorMode: 'bw' | 'color',
  ditherPalette: 'auto' | 'gameboy' | 'pico8' | 'nes' | 'zx_spectrum' | 'atari_2600' | 'commodore64' | 'apple_ii',
  ditherCustomPalette: string | undefined,
  pixelSize: number,
  pixelShape: 'square' | 'circle',
  pixelSample: 'average' | 'nearest',
  asciiEnabled: boolean,
  asciiCellSize: number,
  asciiCharset: string,
  asciiInvert: boolean,
  asciiColor: boolean,
  asciiOpacity: number | undefined,
  asciiBackground: string | undefined,
  asciiFont: string | undefined,
  asciiGamma: number | undefined,
  asciiBold: boolean | undefined,
  asciiEdge: 'none' | 'stroke' | undefined,
  asciiCharsetPreset?: 'custom' | 'dense' | 'medium' | 'sparse' | 'blocks' | 'dots'
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
    ditherMethod,
    ditherLevels,
    ditherColorMode,
    ditherPalette,
    ditherCustomPalette,
    pixelSize,
    pixelShape,
    pixelSample,
    asciiEnabled,
    asciiCellSize,
    asciiCharset,
    asciiInvert,
    asciiColor,
    asciiOpacity,
    asciiBackground,
    asciiFont,
    asciiGamma,
    asciiBold,
    asciiEdge,
    asciiCharsetPreset,
  };
}