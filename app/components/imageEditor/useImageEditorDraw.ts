import { useCallback } from 'react';
import { drawImage } from './imageEditorDrawing';

export function useImageEditorDraw(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  imgRef: React.RefObject<HTMLImageElement>,
  originalImgRef: React.RefObject<HTMLImageElement>,
  previewOriginalRef: React.MutableRefObject<boolean>,
  offset: { x: number; y: number },
  sel: { x: number; y: number; w: number; h: number },
  exposureRef: React.MutableRefObject<number>,
  contrastRef: React.MutableRefObject<number>,
  saturationRef: React.MutableRefObject<number>,
  temperatureRef: React.MutableRefObject<number>,
  vignetteRef: React.MutableRefObject<number>,
  frameColorRef: React.MutableRefObject<'white' | 'black'>,
  frameThicknessRef: React.MutableRefObject<number>,
  selectedFilterRef: React.MutableRefObject<string>,
  filterStrengthRef: React.MutableRefObject<number>,
  grainRef: React.MutableRefObject<number>,
  softFocusRef: React.MutableRefObject<number>,
  fadeRef: React.MutableRefObject<number>,
  matteRef: React.MutableRefObject<number>,
  rotationRef: React.MutableRefObject<number>,
  dashOffsetRef: React.MutableRefObject<number>,
  computeImageLayout: () => void
) {
  const draw = useCallback((info?: any, overrides?: any) => {
    drawImage(
      canvasRef,
      imgRef,
      originalImgRef,
      previewOriginalRef,
      offset,
      sel,
      exposureRef,
      contrastRef,
      saturationRef,
      temperatureRef,
      vignetteRef,
      frameColorRef,
      frameThicknessRef,
      selectedFilterRef,
      filterStrengthRef,
      grainRef,
      softFocusRef,
      fadeRef,
      matteRef,
      rotationRef,
      dashOffsetRef,
      computeImageLayout,
      info,
      overrides
    );
  }, [
    canvasRef,
    imgRef,
    originalImgRef,
    previewOriginalRef,
    offset,
    sel,
    exposureRef,
    contrastRef,
    saturationRef,
    temperatureRef,
    vignetteRef,
    frameColorRef,
    frameThicknessRef,
    selectedFilterRef,
    filterStrengthRef,
    grainRef,
    softFocusRef,
    fadeRef,
    matteRef,
    rotationRef,
    dashOffsetRef,
    computeImageLayout
  ]);

  return draw;
}
