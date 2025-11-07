/**
 * Camera Effects Types and Constants
 *
 * Shared types and constants for camera effects
 */

export type CameraEffectType = 'none' | 'dither' | 'pixelate' | 'ascii' | 'frame' | 'overlay';

export interface CameraEffectSettings {
  type: CameraEffectType;
  // Pixelate settings
  pixelSize?: number;
  pixelShape?: 'square' | 'circle';
  // Dither settings
  ditherMethod?: 'floyd-steinberg' | 'ordered' | 'atkinson' | 'burkes';
  ditherLevels?: number;
  ditherColorMode?: 'bw' | 'color';
  ditherPalette?: 'auto' | 'gameboy' | 'pico8' | 'nes' | 'zx_spectrum' | 'atari_2600' | 'commodore64' | 'apple_ii';
  targetLongEdge?: number; // Resolution for dither effect (smaller = chunkier pixels)
  // ASCII settings
  asciiCellSize?: number;
  asciiCharset?: string;
  asciiInvert?: boolean;
  asciiColor?: boolean;
  asciiCharsetPreset?: 'custom' | 'dense' | 'medium' | 'sparse' | 'blocks' | 'dots' | 'lines' | 'numbers' | 'letters';
  // Frame settings
  frameOverlay?: { img: HTMLImageElement; opacity: number; bounds?: { minX: number; minY: number; maxX: number; maxY: number } } | null;
  // Overlay settings
  overlay?: { img: HTMLImageElement; blendMode: string; opacity: number } | null;
}

export const DEFAULT_ASCII_CHARSET = ' .:-=+*#%@';

// Color palettes for dithering
export const COLOR_PALETTES: Record<string, number[][]> = {
  gameboy: [[15, 56, 15], [48, 98, 48], [139, 172, 15], [155, 188, 15]],
  pico8: [[0,0,0],[29,43,83],[126,37,83],[0,135,81],[171,82,54],[95,87,79],[194,195,199],[255,241,232],[255,0,77],[255,163,0],[255,236,39],[0,228,54],[41,173,255],[131,118,156],[255,119,168],[255,204,170]],
  nes: [[124,124,124],[0,0,252],[0,0,188],[68,40,188],[148,0,132],[168,0,32],[168,16,0],[136,20,0],[80,48,0],[0,120,0],[0,104,0],[0,88,0],[0,64,88],[0,0,0],[188,188,188],[0,120,248],[0,88,248],[104,68,252],[216,0,204],[228,0,88],[248,56,0],[228,92,16],[172,124,0],[0,184,0],[0,168,0],[0,168,68],[0,136,136],[0,0,0],[248,248,248],[60,188,252],[104,136,252],[152,120,248],[248,120,248],[248,88,152],[248,120,88],[252,160,68],[248,184,0],[184,248,24],[88,216,84],[88,248,152],[0,232,216],[120,120,120],[252,252,252],[164,228,252],[184,184,248],[216,184,248],[248,184,248],[248,164,192],[240,208,176],[252,224,168],[248,216,120],[216,248,120],[184,248,184],[184,248,216],[0,252,252],[216,216,216]],
  zx_spectrum: [[0,0,0],[0,0,192],[192,0,0],[192,0,192],[0,192,0],[0,192,192],[192,192,0],[192,192,192],[0,0,0],[0,0,255],[255,0,0],[255,0,255],[0,255,0],[0,255,255],[255,255,0],[255,255,255]],
  atari_2600: [[0,0,0],[68,68,0],[112,40,0],[132,24,0],[136,0,0],[120,0,92],[72,0,120],[20,0,132],[0,0,136],[0,24,124],[0,44,92],[0,60,44],[0,60,0],[20,56,0],[44,48,0],[68,40,0]],
  commodore64: [[0,0,0],[255,255,255],[136,0,0],[170,255,238],[204,68,204],[0,204,85],[0,0,170],[238,238,119],[221,136,85],[102,68,0],[255,119,119],[51,51,51],[119,119,119],[170,255,102],[0,136,255],[187,187,187]],
  apple_ii: [[0,0,0],[114,38,64],[64,51,127],[228,52,254],[14,89,64],[128,128,128],[27,154,254],[191,179,255],[64,76,0],[241,106,0],[128,128,128],[255,129,236],[27,203,1],[191,204,136],[141,217,191],[255,255,255]],
};