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
  setLightLeak: (v: { preset: string; intensity: number }) => void,
  lightLeakRef: React.MutableRefObject<{ preset: string; intensity: number }>,
  setRotation: (v: number) => void,
  rotationRef: React.MutableRefObject<number>,
  setSel: (sel: null) => void,
  cropRatio: React.MutableRefObject<number | null>,
  setPresetIndex: (v: number) => void
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
  const defLightLeak = { preset: 'none', intensity: 0.6 };
  const defRotation = 0;

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
  if (typeof setLightLeak === 'function') { setLightLeak(defLightLeak); } lightLeakRef.current = defLightLeak;
  if (typeof setRotation === 'function') { setRotation(defRotation); } rotationRef.current = defRotation;

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
  setLightLeak: (v: { preset: string; intensity: number }) => void,
  lightLeakRef: React.MutableRefObject<{ preset: string; intensity: number }>,
  setRotation: (v: number) => void,
  rotationRef: React.MutableRefObject<number>,
  frameThicknessRef: React.MutableRefObject<number>,
  setFrameThickness: (v: number) => void,
  draw: () => void
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
    case 'lightLeak': {
      const v = { preset: 'none', intensity: 0.6 };
      lightLeakRef.current = v; if (typeof setLightLeak === 'function') setLightLeak(v); draw(); requestAnimationFrame(() => draw());
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
    default:
      break;
  }
}
