import { FILTER_PRESETS } from "./constants";
import { generateNoiseCanvas } from "./utils";

export interface DrawParams {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  imgRef: React.RefObject<HTMLImageElement>;
  originalImgRef: React.RefObject<HTMLImageElement>;
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
  lightLeakRef: React.MutableRefObject<{ preset: string; intensity: number }>;
  overlayRef: React.MutableRefObject<{ img: HTMLImageElement; blendMode: string; opacity: number } | null>;
  rotationRef: React.MutableRefObject<number>;
  dashOffsetRef: React.MutableRefObject<number>;
  computeImageLayout: () => { rect: DOMRect; baseScale: number; dispW: number; dispH: number; left: number; top: number } | null;
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
  lightLeak?: { preset: string; intensity: number };
  frameEnabled?: boolean;
  frameThickness?: number;
  frameColor?: string;
}
