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
  frameOverlayRef: React.MutableRefObject<any>,
  // special effects
  ditherMethod?: 'none' | 'floyd-steinberg' | 'ordered' | 'bayer8' | 'atkinson' | 'burkes' | 'stucki' | 'sierra' | 'jjn',
  ditherMethodRef?: React.MutableRefObject<'none' | 'floyd-steinberg' | 'ordered' | 'bayer8' | 'atkinson' | 'burkes' | 'stucki' | 'sierra' | 'jjn'>,
  ditherLevels?: number,
  ditherLevelsRef?: React.MutableRefObject<number>,
  pixelSize?: number,
  pixelSizeRef?: React.MutableRefObject<number>,
  asciiEnabled?: boolean,
  asciiEnabledRef?: React.MutableRefObject<boolean>,
  asciiCellSize?: number,
  asciiCellSizeRef?: React.MutableRefObject<number>,
  asciiCharset?: string,
  asciiCharsetRef?: React.MutableRefObject<string>,
  asciiInvert?: boolean,
  asciiInvertRef?: React.MutableRefObject<boolean>,
  asciiColor?: boolean,
  asciiColorRef?: React.MutableRefObject<boolean>,
  // new optional specials
  ditherColorMode?: 'bw' | 'color',
  ditherColorModeRef?: React.MutableRefObject<'bw' | 'color'>,
  ditherPalette?: 'auto' | 'websafe' | 'cga16' | 'ega64' | 'mac16' | 'win16',
  ditherPaletteRef?: React.MutableRefObject<'auto' | 'websafe' | 'cga16' | 'ega64' | 'mac16' | 'win16'>,
  ditherCustomPalette?: string,
  ditherCustomPaletteRef?: React.MutableRefObject<string>,
  pixelShape?: 'square' | 'circle',
  pixelShapeRef?: React.MutableRefObject<'square' | 'circle'>,
  pixelSample?: 'average' | 'nearest',
  pixelSampleRef?: React.MutableRefObject<'average' | 'nearest'>,
  asciiOpacity?: number,
  asciiOpacityRef?: React.MutableRefObject<number>,
  asciiBackground?: string,
  asciiBackgroundRef?: React.MutableRefObject<string>,
  asciiFont?: string,
  asciiFontRef?: React.MutableRefObject<string>,
  asciiGamma?: number,
  asciiGammaRef?: React.MutableRefObject<number>,
  asciiBold?: boolean,
  asciiBoldRef?: React.MutableRefObject<boolean>,
  asciiEdge?: 'none' | 'stroke',
  asciiEdgeRef?: React.MutableRefObject<'none' | 'stroke'>
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
  // special effects
  useEffect(() => { if (ditherMethodRef && typeof ditherMethod !== 'undefined') ditherMethodRef.current = ditherMethod; }, [ditherMethod, ditherMethodRef]);
  useEffect(() => { if (ditherLevelsRef && typeof ditherLevels !== 'undefined') ditherLevelsRef.current = ditherLevels; }, [ditherLevels, ditherLevelsRef]);
  useEffect(() => { if (pixelSizeRef && typeof pixelSize !== 'undefined') pixelSizeRef.current = pixelSize; }, [pixelSize, pixelSizeRef]);
  useEffect(() => { if (asciiEnabledRef && typeof asciiEnabled !== 'undefined') asciiEnabledRef.current = asciiEnabled; }, [asciiEnabled, asciiEnabledRef]);
  useEffect(() => { if (asciiCellSizeRef && typeof asciiCellSize !== 'undefined') asciiCellSizeRef.current = asciiCellSize; }, [asciiCellSize, asciiCellSizeRef]);
  useEffect(() => { if (asciiCharsetRef && typeof asciiCharset !== 'undefined') asciiCharsetRef.current = asciiCharset; }, [asciiCharset, asciiCharsetRef]);
  useEffect(() => { if (asciiInvertRef && typeof asciiInvert !== 'undefined') asciiInvertRef.current = asciiInvert; }, [asciiInvert, asciiInvertRef]);
  useEffect(() => { if (asciiColorRef && typeof asciiColor !== 'undefined') asciiColorRef.current = asciiColor; }, [asciiColor, asciiColorRef]);
  // new specials
  useEffect(() => { if (ditherColorModeRef && typeof ditherColorMode !== 'undefined') ditherColorModeRef.current = ditherColorMode; }, [ditherColorMode, ditherColorModeRef]);
  useEffect(() => { if (ditherPaletteRef && typeof ditherPalette !== 'undefined') ditherPaletteRef.current = ditherPalette; }, [ditherPalette, ditherPaletteRef]);
  useEffect(() => { if (ditherCustomPaletteRef && typeof ditherCustomPalette !== 'undefined') ditherCustomPaletteRef.current = ditherCustomPalette; }, [ditherCustomPalette, ditherCustomPaletteRef]);
  useEffect(() => { if (pixelShapeRef && typeof pixelShape !== 'undefined') pixelShapeRef.current = pixelShape; }, [pixelShape, pixelShapeRef]);
  useEffect(() => { if (pixelSampleRef && typeof pixelSample !== 'undefined') pixelSampleRef.current = pixelSample; }, [pixelSample, pixelSampleRef]);
  useEffect(() => { if (asciiOpacityRef && typeof asciiOpacity !== 'undefined') asciiOpacityRef.current = asciiOpacity; }, [asciiOpacity, asciiOpacityRef]);
  useEffect(() => { if (asciiBackgroundRef && typeof asciiBackground !== 'undefined') asciiBackgroundRef.current = asciiBackground; }, [asciiBackground, asciiBackgroundRef]);
  useEffect(() => { if (asciiFontRef && typeof asciiFont !== 'undefined') asciiFontRef.current = asciiFont; }, [asciiFont, asciiFontRef]);
  useEffect(() => { if (asciiGammaRef && typeof asciiGamma !== 'undefined') asciiGammaRef.current = asciiGamma; }, [asciiGamma, asciiGammaRef]);
  useEffect(() => { if (asciiBoldRef && typeof asciiBold !== 'undefined') asciiBoldRef.current = asciiBold; }, [asciiBold, asciiBoldRef]);
  useEffect(() => { if (asciiEdgeRef && typeof asciiEdge !== 'undefined') asciiEdgeRef.current = asciiEdge; }, [asciiEdge, asciiEdgeRef]);
}