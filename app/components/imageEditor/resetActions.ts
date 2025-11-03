export function resetAll(
  originalRef: React.MutableRefObject<string>,
  setImageSrc: (src: string) => void,
  setSel: (sel: null) => void,
  setOffset: (offset: { x: number; y: number }) => void
) {
  setImageSrc(originalRef.current);
  setSel(null);
  setOffset({ x: 0, y: 0 });
}

export function resetAdjustments(
  setExposure: (v: number) => void,
  exposureRef: React.MutableRefObject<number>,
  setContrast: (v: number) => void,
  contrastRef: React.MutableRefObject<number>,
  setSaturation: (v: number) => void,
  saturationRef: React.MutableRefObject<number>,
  setTemperature: (v: number) => void,
  temperatureRef: React.MutableRefObject<number>,
  setVignette: (v: number) => void,
  vignetteRef: React.MutableRefObject<number>,
  setFrameColor: (v: 'white' | 'black') => void,
  frameColorRef: React.MutableRefObject<'white' | 'black'>,
  setFrameThickness: (v: number) => void,
  frameThicknessRef: React.MutableRefObject<number>,
  setSelectedFilter: (v: string) => void,
  selectedFilterRef: React.MutableRefObject<string>,
  setFilterStrength: (v: number) => void,
  filterStrengthRef: React.MutableRefObject<number>,
  setGrain: (v: number) => void,
  grainRef: React.MutableRefObject<number>,
  setSoftFocus: (v: number) => void,
  softFocusRef: React.MutableRefObject<number>,
  setFade: (v: number) => void,
  fadeRef: React.MutableRefObject<number>,
  setOverlay: (v: { img: HTMLImageElement; blendMode: string; opacity: number } | null) => void,
  overlayRef: React.MutableRefObject<{ img: HTMLImageElement; blendMode: string; opacity: number } | null>,
  setFrameOverlay: (v: { img: HTMLImageElement; opacity: number } | null) => void,
  frameOverlayRef: React.MutableRefObject<{ img: HTMLImageElement; opacity: number } | null>,
  setRotation: (value: number) => void,
  rotationRef: React.MutableRefObject<number>,
  setSel: (sel: null) => void,
  cropRatio: React.MutableRefObject<number | null>,
  setPresetIndex: (v: number) => void,
  // special effects
  setDitherMethod?: (v: 'none' | 'floyd-steinberg' | 'ordered' | 'atkinson' | 'burkes') => void,
  ditherMethodRef?: React.MutableRefObject<'none' | 'floyd-steinberg' | 'ordered' | 'atkinson' | 'burkes'>,
  setDitherLevels?: (v: number) => void,
  ditherLevelsRef?: React.MutableRefObject<number>,
  setDitherColorMode?: (v: 'bw' | 'color') => void,
  ditherColorModeRef?: React.MutableRefObject<'bw' | 'color'>,
  setDitherPalette?: (v: 'auto' | 'gameboy' | 'pico8' | 'nes' | 'zx_spectrum' | 'atari_2600' | 'commodore64' | 'apple_ii') => void,
  ditherPaletteRef?: React.MutableRefObject<'auto' | 'gameboy' | 'pico8' | 'nes' | 'zx_spectrum' | 'atari_2600' | 'commodore64' | 'apple_ii'>,
  setDitherCustomPalette?: (v: string) => void,
  ditherCustomPaletteRef?: React.MutableRefObject<string>,
  setPixelSize?: (v: number) => void,
  pixelSizeRef?: React.MutableRefObject<number>,
  setPixelShape?: (v: 'square' | 'circle') => void,
  pixelShapeRef?: React.MutableRefObject<'square' | 'circle'>,
  setPixelSample?: (v: 'average' | 'nearest') => void,
  pixelSampleRef?: React.MutableRefObject<'average' | 'nearest'>,
  setAsciiEnabled?: (v: boolean) => void,
  asciiEnabledRef?: React.MutableRefObject<boolean>,
  setAsciiCellSize?: (v: number) => void,
  asciiCellSizeRef?: React.MutableRefObject<number>,
  setAsciiCharset?: (v: string) => void,
  asciiCharsetRef?: React.MutableRefObject<string>,
  setAsciiInvert?: (v: boolean) => void,
  asciiInvertRef?: React.MutableRefObject<boolean>,
  setAsciiColor?: (v: boolean) => void,
  asciiColorRef?: React.MutableRefObject<boolean>,
  setAsciiOpacity?: (v: number) => void,
  asciiOpacityRef?: React.MutableRefObject<number>,
  setAsciiBackground?: (v: string) => void,
  asciiBackgroundRef?: React.MutableRefObject<string>,
  setAsciiFont?: (v: string) => void,
  asciiFontRef?: React.MutableRefObject<string>,
  setAsciiGamma?: (v: number) => void,
  asciiGammaRef?: React.MutableRefObject<number>,
  setAsciiBold?: (v: boolean) => void,
  asciiBoldRef?: React.MutableRefObject<boolean>,
  setAsciiEdge?: (v: 'none' | 'stroke') => void,
  asciiEdgeRef?: React.MutableRefObject<'none' | 'stroke'>,
  setAsciiCharsetPreset?: (v: 'custom' | 'dense' | 'medium' | 'sparse' | 'blocks' | 'dots') => void
) {
  // Runtime validation: ensure refs and setters are the expected types.
  const makeType = (v: any) => {
    if (v === null) return 'null';
    if (v === undefined) return 'undefined';
    if (typeof v === 'object') return v.hasOwnProperty('current') ? `ref(${typeof v.current})` : 'object';
    return typeof v;
  };

  // Quick sanity checks for a few critical params. If these don't match,
  // log a diagnostic and bail out to avoid hard crashes while preserving app state.
  const critical = {
    setExposureType: typeof setExposure,
    exposureRefType: makeType(exposureRef),
    setContrastType: typeof setContrast,
    contrastRefType: makeType(contrastRef),
    setSelType: typeof setSel,
    cropRatioType: makeType(cropRatio),
  } as any;

  if (critical.exposureRefType !== 'ref(number)' && critical.exposureRefType !== 'ref(object)') {
    // Log detailed diagnostic to help track down incorrect caller wiring
    // eslint-disable-next-line no-console
    console.error('resetAdjustments: unexpected argument types', critical);
    return;
  }

  // Default values
  const defExposure = 0;
  const defContrast = 0;
  const defSaturation = 0;
  const defTemperature = 0;
  const defVignette = 0;
  const defFrameColor: 'white' | 'black' = 'white';
  const defFrameThickness = 0;
  const defSelectedFilter = 'none';
  const defFilterStrength = 1;
  const defGrain = 0;
  const defSoftFocus = 0;
  const defFade = 0;
  const defRotation = 0;
  const defOverlay = null;
  const defFrameOverlay = null;
  // special defaults
  const defDitherMethod: 'none' | 'floyd-steinberg' | 'ordered' | 'atkinson' | 'burkes' = 'none';
  const defDitherLevels = 8;
  const defDitherColorMode: 'bw' | 'color' = 'bw';
  const defDitherPalette: 'auto' | 'gameboy' | 'pico8' | 'nes' | 'zx_spectrum' | 'atari_2600' | 'commodore64' | 'apple_ii' = 'auto';
  const defDitherCustomPalette = '';
  const defPixelSize = 1;
  const defPixelShape: 'square' | 'circle' = 'square';
  const defPixelSample: 'average' | 'nearest' = 'average';
  const defAsciiEnabled = false;
  const defAsciiCellSize = 8;
  const defAsciiCharset = '@%#*+=-:. ';
  const defAsciiInvert = false;
  const defAsciiColor = true;
  const defAsciiOpacity = 1;
  const defAsciiBackground = '#000';
  const defAsciiFont = 'monospace';
  const defAsciiGamma = 1;
  const defAsciiBold = false;
  const defAsciiEdge: 'none' | 'stroke' = 'none';
  const defAsciiCharsetPreset: 'custom' = 'custom';

  // Update state (defensively check setters to avoid crashes if a setter is not provided)
  if (typeof setExposure === 'function') { setExposure(defExposure); } exposureRef.current = defExposure;
  if (typeof setContrast === 'function') { setContrast(defContrast); } contrastRef.current = defContrast;
  if (typeof setSaturation === 'function') { setSaturation(defSaturation); } saturationRef.current = defSaturation;
  if (typeof setTemperature === 'function') { setTemperature(defTemperature); } temperatureRef.current = defTemperature;
  if (typeof setVignette === 'function') { setVignette(defVignette); } vignetteRef.current = defVignette;
  if (typeof setFrameColor === 'function') { setFrameColor(defFrameColor); } frameColorRef.current = defFrameColor;
  if (typeof setFrameThickness === 'function') { setFrameThickness(defFrameThickness); } frameThicknessRef.current = defFrameThickness;
  if (typeof setSelectedFilter === 'function') { setSelectedFilter(defSelectedFilter); } selectedFilterRef.current = defSelectedFilter;
  if (typeof setFilterStrength === 'function') { setFilterStrength(defFilterStrength); } filterStrengthRef.current = defFilterStrength;
  if (typeof setGrain === 'function') { setGrain(defGrain); } grainRef.current = defGrain;
  if (typeof setSoftFocus === 'function') { setSoftFocus(defSoftFocus); } softFocusRef.current = defSoftFocus;
  if (typeof setFade === 'function') { setFade(defFade); } fadeRef.current = defFade;
  if (typeof setOverlay === 'function') { setOverlay(defOverlay); } overlayRef.current = defOverlay;
  if (typeof setFrameOverlay === 'function') { setFrameOverlay(defFrameOverlay); } frameOverlayRef.current = defFrameOverlay;
  if (typeof setRotation === 'function') { setRotation(defRotation); } rotationRef.current = defRotation;
  // special
  if (setDitherMethod && ditherMethodRef) { setDitherMethod(defDitherMethod); ditherMethodRef.current = defDitherMethod; }
  if (setDitherLevels && ditherLevelsRef) { setDitherLevels(defDitherLevels); ditherLevelsRef.current = defDitherLevels; }
  if (setDitherColorMode && ditherColorModeRef) { setDitherColorMode(defDitherColorMode); ditherColorModeRef.current = defDitherColorMode; }
  if (setDitherPalette && ditherPaletteRef) { setDitherPalette(defDitherPalette); ditherPaletteRef.current = defDitherPalette; }
  if (setDitherCustomPalette && ditherCustomPaletteRef) { setDitherCustomPalette(defDitherCustomPalette); ditherCustomPaletteRef.current = defDitherCustomPalette; }
  if (setPixelSize && pixelSizeRef) { setPixelSize(defPixelSize); pixelSizeRef.current = defPixelSize; }
  if (setPixelShape && pixelShapeRef) { setPixelShape(defPixelShape); pixelShapeRef.current = defPixelShape; }
  if (setPixelSample && pixelSampleRef) { setPixelSample(defPixelSample); pixelSampleRef.current = defPixelSample; }
  if (setAsciiEnabled && asciiEnabledRef) { setAsciiEnabled(defAsciiEnabled); asciiEnabledRef.current = defAsciiEnabled; }
  if (setAsciiCellSize && asciiCellSizeRef) { setAsciiCellSize(defAsciiCellSize); asciiCellSizeRef.current = defAsciiCellSize; }
  if (setAsciiCharset && asciiCharsetRef) { setAsciiCharset(defAsciiCharset); asciiCharsetRef.current = defAsciiCharset; }
  if (setAsciiInvert && asciiInvertRef) { setAsciiInvert(defAsciiInvert); asciiInvertRef.current = defAsciiInvert; }
  if (setAsciiColor && asciiColorRef) { setAsciiColor(defAsciiColor); asciiColorRef.current = defAsciiColor; }
  if (setAsciiOpacity && asciiOpacityRef) { setAsciiOpacity(defAsciiOpacity); asciiOpacityRef.current = defAsciiOpacity; }
  if (setAsciiBackground && asciiBackgroundRef) { setAsciiBackground(defAsciiBackground); asciiBackgroundRef.current = defAsciiBackground; }
  if (setAsciiFont && asciiFontRef) { setAsciiFont(defAsciiFont); asciiFontRef.current = defAsciiFont; }
  if (setAsciiGamma && asciiGammaRef) { setAsciiGamma(defAsciiGamma); asciiGammaRef.current = defAsciiGamma; }
  if (setAsciiBold && asciiBoldRef) { setAsciiBold(defAsciiBold); asciiBoldRef.current = defAsciiBold; }
  if (setAsciiEdge && asciiEdgeRef) { setAsciiEdge(defAsciiEdge); asciiEdgeRef.current = defAsciiEdge; }
  if (setAsciiCharsetPreset) { setAsciiCharsetPreset(defAsciiCharsetPreset); }

  // Also clear any crop selection/preset
  setSel(null);
  if (cropRatio) cropRatio.current = null;
  setPresetIndex(0);
}

export function resetControlToDefault(
  control: string,
  exposureRef: React.MutableRefObject<number>,
  setExposure: (v: number) => void,
  contrastRef: React.MutableRefObject<number>,
  setContrast: (v: number) => void,
  saturationRef: React.MutableRefObject<number>,
  setSaturation: (v: number) => void,
  temperatureRef: React.MutableRefObject<number>,
  setTemperature: (v: number) => void,
  filterStrengthRef: React.MutableRefObject<number>,
  setFilterStrength: (v: number) => void,
  vignetteRef: React.MutableRefObject<number>,
  setVignette: (v: number) => void,
  grainRef: React.MutableRefObject<number>,
  setGrain: (v: number) => void,
  softFocusRef: React.MutableRefObject<number>,
  setSoftFocus: (v: number) => void,
  fadeRef: React.MutableRefObject<number>,
  setFade: (v: number) => void,
  setRotation: (v: number) => void,
  rotationRef: React.MutableRefObject<number>,
  frameThicknessRef: React.MutableRefObject<number>,
  setFrameThickness: (v: number) => void,
  draw: () => void,
  // special effects
  ditherMethodRef?: React.MutableRefObject<'none' | 'floyd-steinberg' | 'ordered' | 'atkinson' | 'burkes'>,
  setDitherMethod?: (v: 'none' | 'floyd-steinberg' | 'ordered') => void,
  ditherLevelsRef?: React.MutableRefObject<number>,
  setDitherLevels?: (v: number) => void,
  pixelSizeRef?: React.MutableRefObject<number>,
  setPixelSize?: (v: number) => void,
  asciiEnabledRef?: React.MutableRefObject<boolean>,
  setAsciiEnabled?: (v: boolean) => void,
  asciiCellSizeRef?: React.MutableRefObject<number>,
  setAsciiCellSize?: (v: number) => void,
  asciiCharsetRef?: React.MutableRefObject<string>,
  setAsciiCharset?: (v: string) => void,
  asciiInvertRef?: React.MutableRefObject<boolean>,
  setAsciiInvert?: (v: boolean) => void,
  asciiColorRef?: React.MutableRefObject<boolean>,
  setAsciiColor?: (v: boolean) => void
) {
  switch (control) {
    case 'exposure': {
      const v = 0;
      exposureRef.current = v; if (typeof setExposure === 'function') setExposure(v); draw(); requestAnimationFrame(() => draw());
      break;
    }
    case 'contrast': {
      const v = 0;
      contrastRef.current = v; if (typeof setContrast === 'function') setContrast(v); draw(); requestAnimationFrame(() => draw());
      break;
    }
    case 'saturation': {
      const v = 0;
      saturationRef.current = v; setSaturation(v); draw(); requestAnimationFrame(() => draw());
      break;
    }
    case 'temperature': {
      const v = 0;
      temperatureRef.current = v; setTemperature(v); draw(); requestAnimationFrame(() => draw());
      break;
    }
    case 'filterStrength': {
      const v = 1;
      filterStrengthRef.current = v; if (typeof setFilterStrength === 'function') setFilterStrength(v); draw(); requestAnimationFrame(() => draw());
      break;
    }
    case 'vignette': {
      const v = 0;
      vignetteRef.current = v; if (typeof setVignette === 'function') setVignette(v); draw(); requestAnimationFrame(() => draw());
      break;
    }
    case 'grain': {
      const v = 0;
      grainRef.current = v; if (typeof setGrain === 'function') setGrain(v); draw(); requestAnimationFrame(() => draw());
      break;
    }
    case 'softFocus': {
      const v = 0;
      softFocusRef.current = v; if (typeof setSoftFocus === 'function') setSoftFocus(v); draw(); requestAnimationFrame(() => draw());
      break;
    }
    case 'fade': {
      const v = 0;
      fadeRef.current = v; if (typeof setFade === 'function') setFade(v); draw(); requestAnimationFrame(() => draw());
      break;
    }
    case 'rotation': {
      const v = 0;
      rotationRef.current = v; if (typeof setRotation === 'function') setRotation(v); draw(); requestAnimationFrame(() => draw());
      break;
    }
    case 'frameThickness': {
      const v = 0;
      frameThicknessRef.current = v; if (typeof setFrameThickness === 'function') setFrameThickness(v); draw(); requestAnimationFrame(() => draw());
      break;
    }
    case 'pixelSize': {
      const v = 1; if (pixelSizeRef && setPixelSize) { pixelSizeRef.current = v; setPixelSize(v); } draw(); requestAnimationFrame(() => draw());
      break;
    }
    case 'ditherMethod': {
      const v: 'none' | 'floyd-steinberg' | 'ordered' = 'none'; if (ditherMethodRef && setDitherMethod) { ditherMethodRef.current = v; setDitherMethod(v); } draw(); requestAnimationFrame(() => draw());
      break;
    }
    case 'ditherLevels': {
      const v = 8; if (ditherLevelsRef && setDitherLevels) { ditherLevelsRef.current = v; setDitherLevels(v); } draw(); requestAnimationFrame(() => draw());
      break;
    }
    case 'asciiEnabled': {
      const v = false; if (asciiEnabledRef && setAsciiEnabled) { asciiEnabledRef.current = v; setAsciiEnabled(v); } draw(); requestAnimationFrame(() => draw());
      break;
    }
    case 'asciiCellSize': {
      const v = 8; if (asciiCellSizeRef && setAsciiCellSize) { asciiCellSizeRef.current = v; setAsciiCellSize(v); } draw(); requestAnimationFrame(() => draw());
      break;
    }
    case 'asciiCharset': {
      const v = '@%#*+=-:. '; if (asciiCharsetRef && setAsciiCharset) { asciiCharsetRef.current = v; setAsciiCharset(v); } draw(); requestAnimationFrame(() => draw());
      break;
    }
    case 'asciiInvert': {
      const v = false; if (asciiInvertRef && setAsciiInvert) { asciiInvertRef.current = v; setAsciiInvert(v); } draw(); requestAnimationFrame(() => draw());
      break;
    }
    case 'asciiColor': {
      const v = true; if (asciiColorRef && setAsciiColor) { asciiColorRef.current = v; setAsciiColor(v); } draw(); requestAnimationFrame(() => draw());
      break;
    }
    default:
      break;
  }
}
