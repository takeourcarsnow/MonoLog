import { useRef } from "react";
import { drawImage } from './imageEditorDrawing';

export function useImageEditorDraw(
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>,
  imgRef: React.MutableRefObject<HTMLImageElement | null>,
  originalImgRef: React.MutableRefObject<HTMLImageElement | null>,
  previewOriginalRef: React.MutableRefObject<boolean>,
  offset: { x: number; y: number },
  sel: any,
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
  overlayRef: React.MutableRefObject<any>,
  rotationRef: React.MutableRefObject<number>,
  dashOffsetRef: React.MutableRefObject<number>,
  computeImageLayout: () => any,
  frameOverlayRef: React.MutableRefObject<any>
) {
  const drawPendingRef = useRef(false);

  function draw(info?: any, overrides?: any, targetCanvas?: HTMLCanvasElement) {
    if (targetCanvas) {
      // synchronous for export
      return drawImage(
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
        overlayRef,
        rotationRef,
        dashOffsetRef,
        computeImageLayout,
        info,
        overrides,
        targetCanvas,
        frameOverlayRef
      );
    }
    if (drawPendingRef.current) return; // skip if already pending
    drawPendingRef.current = true;
    requestAnimationFrame(() => {
      drawPendingRef.current = false;
      return drawImage(
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
        overlayRef,
        rotationRef,
        dashOffsetRef,
        computeImageLayout,
        info,
        overrides,
        targetCanvas,
        frameOverlayRef
      );
    });
  }

  return { draw };
}