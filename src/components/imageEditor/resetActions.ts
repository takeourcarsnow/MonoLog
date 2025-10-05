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
  setMatte: (v: number) => void,
  matteRef: React.MutableRefObject<number>,
  setRotation: (v: number) => void,
  rotationRef: React.MutableRefObject<number>,
  setSel: (sel: null) => void,
  cropRatio: React.MutableRefObject<number | null>,
  setPresetIndex: (v: number) => void
) {
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
  matteRef: React.MutableRefObject<number>,
  setMatte: (v: number) => void,
  rotationRef: React.MutableRefObject<number>,
  setRotation: (v: number) => void,
  frameThicknessRef: React.MutableRefObject<number>,
  setFrameThickness: (v: number) => void,
  draw: () => void
) {
  switch (control) {
    case 'exposure': {
      const v = 1;
      exposureRef.current = v; setExposure(v); draw(); requestAnimationFrame(() => draw());
      break;
    }
    case 'contrast': {
      const v = 1;
      contrastRef.current = v; setContrast(v); draw(); requestAnimationFrame(() => draw());
      break;
    }
    case 'saturation': {
      const v = 1;
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
      filterStrengthRef.current = v; setFilterStrength(v); draw(); requestAnimationFrame(() => draw());
      break;
    }
    case 'vignette': {
      const v = 0;
      vignetteRef.current = v; setVignette(v); draw(); requestAnimationFrame(() => draw());
      break;
    }
    case 'grain': {
      const v = 0;
      grainRef.current = v; setGrain(v); draw(); requestAnimationFrame(() => draw());
      break;
    }
    case 'softFocus': {
      const v = 0;
      softFocusRef.current = v; setSoftFocus(v); draw(); requestAnimationFrame(() => draw());
      break;
    }
    case 'fade': {
      const v = 0;
      fadeRef.current = v; setFade(v); draw(); requestAnimationFrame(() => draw());
      break;
    }
    case 'matte': {
      const v = 0;
      matteRef.current = v; setMatte(v); draw(); requestAnimationFrame(() => draw());
      break;
    }
    case 'rotation': {
      const v = 0;
      rotationRef.current = v; setRotation(v); draw(); requestAnimationFrame(() => draw());
      break;
    }
    case 'frameThickness': {
      const v = 0;
      frameThicknessRef.current = v; setFrameThickness(v); draw(); requestAnimationFrame(() => draw());
      break;
    }
    default:
      break;
  }
}