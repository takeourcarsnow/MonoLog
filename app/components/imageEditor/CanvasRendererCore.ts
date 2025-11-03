import { FILTER_PRESETS } from "./constants";
import { generateNoiseCanvas } from "./utils";

export interface DrawParams {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  imgRef: React.RefObject<HTMLImageElement | null>;
  originalImgRef: React.RefObject<HTMLImageElement | null>;
  previewOriginalRef: React.MutableRefObject<boolean>;
  offset: { x: number; y: number };
  sel: { x: number; y: number; w: number; h: number } | null;
  exposureRef: React.MutableRefObject<number>;
  contrastRef: React.MutableRefObject<number>;
  saturationRef: React.MutableRefObject<number>;
  temperatureRef: React.MutableRefObject<number>;
  vignetteRef: React.MutableRefObject<number>;
  frameColorRef: React.MutableRefObject<'white' | 'black'>;
  frameThicknessRef: React.MutableRefObject<number>;
  selectedFilterRef: React.MutableRefObject<string>;
  filterStrengthRef: React.MutableRefObject<number>;
  grainRef: React.MutableRefObject<number>;
  softFocusRef: React.MutableRefObject<number>;
  fadeRef: React.MutableRefObject<number>;
  overlayRef: React.MutableRefObject<{ img: HTMLImageElement; blendMode: string; opacity: number } | null>;
  frameOverlayRef?: React.MutableRefObject<{ img: HTMLImageElement; opacity: number } | null>;
  rotationRef: React.MutableRefObject<number>;
  dashOffsetRef: React.MutableRefObject<number>;
  computeImageLayout: () => { rect: DOMRect; baseScale: number; dispW: number; dispH: number; left: number; top: number } | null;
  // Special effects refs
  ditherMethodRef?: React.MutableRefObject<'none' | 'floyd-steinberg' | 'ordered' | 'bayer8' | 'atkinson' | 'burkes' | 'stucki' | 'sierra' | 'jjn'>;
  ditherLevelsRef?: React.MutableRefObject<number>;
  ditherColorModeRef?: React.MutableRefObject<'bw' | 'color'>;
  ditherPaletteRef?: React.MutableRefObject<'auto' | 'gameboy' | 'pico8' | 'nes' | 'zx_spectrum' | 'atari_2600' | 'commodore64' | 'apple_ii'>;
  ditherCustomPaletteRef?: React.MutableRefObject<string>;
  pixelSizeRef?: React.MutableRefObject<number>;
  pixelShapeRef?: React.MutableRefObject<'square' | 'circle'>;
  pixelSampleRef?: React.MutableRefObject<'average' | 'nearest'>;
  asciiEnabledRef?: React.MutableRefObject<boolean>;
  asciiCellSizeRef?: React.MutableRefObject<number>;
  asciiCharsetRef?: React.MutableRefObject<string>;
  asciiInvertRef?: React.MutableRefObject<boolean>;
  asciiColorRef?: React.MutableRefObject<boolean>;
  asciiOpacityRef?: React.MutableRefObject<number>;
  asciiBackgroundRef?: React.MutableRefObject<string>;
  asciiFontRef?: React.MutableRefObject<string>;
  asciiGammaRef?: React.MutableRefObject<number>;
  asciiBoldRef?: React.MutableRefObject<boolean>;
  asciiEdgeRef?: React.MutableRefObject<'none' | 'stroke'>;
}

export interface LayoutInfo {
  rect: DOMRect;
  baseScale: number;
  dispW: number;
  dispH: number;
  left: number;
  top: number;
}

export interface DrawOverrides {
  exposure?: number;
  contrast?: number;
  saturation?: number;
  temperature?: number;
  vignette?: number;
  rotation?: number;
  selectedFilter?: string;
  grain?: number;
  softFocus?: number;
  fade?: number;
  frameEnabled?: boolean;
  frameThickness?: number;
  frameColor?: string;
}
