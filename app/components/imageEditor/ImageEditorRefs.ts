import { useEffect } from "react";

export function useImageEditorRefs(
  rotation: number,
  rotationRef: React.MutableRefObject<number>,
  exposure: number,
  exposureRef: React.MutableRefObject<number>,
  contrast: number,
  contrastRef: React.MutableRefObject<number>,
  saturation: number,
  saturationRef: React.MutableRefObject<number>,
  temperature: number,
  temperatureRef: React.MutableRefObject<number>,
  vignette: number,
  vignetteRef: React.MutableRefObject<number>,
  frameColor: string,
  frameColorRef: React.MutableRefObject<string>,
  frameThickness: number,
  frameThicknessRef: React.MutableRefObject<number>,
  selectedFilter: string,
  selectedFilterRef: React.MutableRefObject<string>,
  filterStrength: number,
  filterStrengthRef: React.MutableRefObject<number>,
  grain: number,
  grainRef: React.MutableRefObject<number>,
  softFocus: number,
  softFocusRef: React.MutableRefObject<number>,
  overlay: any,
  overlayRef: React.MutableRefObject<any>,
  frameOverlay: any,
  frameOverlayRef: React.MutableRefObject<any>
) {
  useEffect(() => { rotationRef.current = rotation; }, [rotation, rotationRef]);
  useEffect(() => { exposureRef.current = exposure; }, [exposure, exposureRef]);
  useEffect(() => { contrastRef.current = contrast; }, [contrast, contrastRef]);
  useEffect(() => { saturationRef.current = saturation; }, [saturation, saturationRef]);
  useEffect(() => { temperatureRef.current = temperature; }, [temperature, temperatureRef]);
  useEffect(() => { vignetteRef.current = vignette; }, [vignette, vignetteRef]);
  useEffect(() => { frameColorRef.current = frameColor; }, [frameColor, frameColorRef]);
  useEffect(() => { frameThicknessRef.current = frameThickness; }, [frameThickness, frameThicknessRef]);
  useEffect(() => { selectedFilterRef.current = selectedFilter; }, [selectedFilter, selectedFilterRef]);
  useEffect(() => { filterStrengthRef.current = filterStrength; }, [filterStrength, filterStrengthRef]);
  useEffect(() => { grainRef.current = grain; }, [grain, grainRef]);
  useEffect(() => { softFocusRef.current = softFocus; }, [softFocus, softFocusRef]);
  useEffect(() => { overlayRef.current = overlay; }, [overlay, overlayRef]);
  useEffect(() => { frameOverlayRef.current = frameOverlay; }, [frameOverlay, frameOverlayRef]);
}