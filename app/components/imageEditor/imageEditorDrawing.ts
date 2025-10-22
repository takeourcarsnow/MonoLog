import { draw as canvasDraw } from './CanvasRenderer';

export function drawImage(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  imgRef: React.RefObject<HTMLImageElement>,
  originalImgRef: React.RefObject<HTMLImageElement>,
  previewOriginalRef: React.MutableRefObject<boolean>,
  offset: { x: number; y: number },
  sel: { x: number; y: number; w: number; h: number } | null,
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
  overlayRef: React.MutableRefObject<{ img: HTMLImageElement; blendMode: string; opacity: number } | null>,
  rotationRef: React.MutableRefObject<number>,
  dashOffsetRef: React.MutableRefObject<number>,
  computeImageLayout: () => any,
  info?: { rect: DOMRect; baseScale: number; dispW: number; dispH: number; left: number; top: number },
  overrides?: Partial<{ exposure: number; contrast: number; saturation: number; temperature: number; vignette: number; rotation: number; selectedFilter: string; grain: number; softFocus: number; fade: number; frameEnabled: boolean; frameThickness: number; frameColor: string }>,
  targetCanvas?: HTMLCanvasElement,
  frameOverlayRef?: React.MutableRefObject<{ img: HTMLImageElement; opacity: number } | null>
) {
  const canvas = targetCanvas || canvasRef.current;
  const img = previewOriginalRef.current && originalImgRef.current ? originalImgRef.current : imgRef.current;
  if (!canvas || !img) return;
  canvasDraw({
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
    frameOverlayRef
  }, info, overrides, targetCanvas);
}
