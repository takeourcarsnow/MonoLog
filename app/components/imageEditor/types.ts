export type EditorSettings = {
  exposure?: number;
  contrast?: number;
  saturation?: number;
  temperature?: number;
  vignette?: number;
  rotation?: number;
  frameColor?: 'white' | 'black';
  frameThickness?: number;
  selectedFilter?: string;
  filterStrength?: number;
  grain?: number;
  softFocus?: number;
  fade?: number;
  overlay?: { img: HTMLImageElement; blendMode: string; opacity: number };
  frameOverlay?: { img: HTMLImageElement; opacity: number; bounds?: { minX: number; minY: number; maxX: number; maxY: number } };
  // Special effects
  ditherMethod?: 'none' | 'floyd-steinberg' | 'ordered' | 'bayer8' | 'atkinson' | 'burkes' | 'stucki' | 'sierra' | 'jjn';
  ditherLevels?: number; // 3..31 (default 8)
  ditherColorMode?: 'bw' | 'color';
  ditherPalette?: 'auto' | 'gameboy' | 'pico8' | 'nes' | 'zx_spectrum' | 'atari_2600' | 'commodore64' | 'apple_ii';
  ditherCustomPalette?: string; // comma-separated hex colors
  pixelSize?: number; // 1..50 (1=off)
  pixelShape?: 'square' | 'circle';
  pixelSample?: 'average' | 'nearest';
  asciiEnabled?: boolean;
  asciiCellSize?: number; // 4..20
  asciiCharset?: string;
  asciiInvert?: boolean;
  asciiColor?: boolean;
  asciiOpacity?: number; // 0..1
  asciiBackground?: string; // CSS color or 'transparent'
  asciiFont?: string; // CSS font-family
  asciiGamma?: number; // luminance mapping gamma
  asciiBold?: boolean;
  asciiEdge?: 'none' | 'stroke';
  asciiCharsetPreset?: 'custom' | 'dense' | 'medium' | 'sparse' | 'blocks' | 'dots';
};

export type ImageEditorProps = {
  initialDataUrl: string;
  initialSettings?: EditorSettings;
  onCancel: () => void;
  onApply: (dataUrl: string, settings: EditorSettings) => void;
};
