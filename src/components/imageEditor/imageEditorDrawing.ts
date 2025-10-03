import { draw as canvasDraw } from './CanvasRenderer';

export function computeImageLayout(canvas: HTMLCanvasElement | null, img: HTMLImageElement | null) {
  if (!canvas || !img) return null as any;
  // Use clientWidth/clientHeight (CSS pixels) rather than getBoundingClientRect which can be affected
  // by transforms (scale/translate) in the surrounding UI. Using client sizes gives a stable layout
  // for the canvas drawing coordinates.
  const cssW = canvas.clientWidth || Math.max(100, canvas.width / (window.devicePixelRatio || 1));
  const cssH = canvas.clientHeight || Math.max(100, canvas.height / (window.devicePixelRatio || 1));
  // Minimal padding so image fills most of the editor canvas
  // Use zero padding so the image tightly fills the canvas and avoids visible empty space
  const padRatio = 0.0;
  const availW = Math.max(1, cssW * (1 - padRatio * 2));
  const availH = Math.max(1, cssH * (1 - padRatio * 2));
  // Use contain-style scaling so the whole image is visible inside the editor canvas.
  // This prevents tall (or very wide) images from being cropped in the preview.
  // It will letterbox (show empty space) when the image aspect doesn't match the canvas,
  // but that's preferable for editing so users can reach all image pixels.
  const baseScale = Math.min(availW / img.naturalWidth, availH / img.naturalHeight);
  const dispW = img.naturalWidth * baseScale;
  const dispH = img.naturalHeight * baseScale;
  const left = (cssW - dispW) / 2;
  const top = (cssH - dispH) / 2;
  // create a small rect-like object (width/height) so callers can use info.rect.width/height
  const rect = { width: cssW, height: cssH, left: 0, top: 0 } as DOMRect;
  // return layout info; do NOT set state here (caller should set state and draw with info)
  return { rect, baseScale, dispW, dispH, left, top };
}

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
  matteRef: React.MutableRefObject<number>,
  rotationRef: React.MutableRefObject<number>,
  dashOffsetRef: React.MutableRefObject<number>,
  computeImageLayout: () => any,
  info?: { rect: DOMRect; baseScale: number; dispW: number; dispH: number; left: number; top: number },
  overrides?: Partial<{ exposure: number; contrast: number; saturation: number; temperature: number; vignette: number; rotation: number; selectedFilter: string; grain: number; softFocus: number; fade: number; matte: number; frameEnabled: boolean; frameThickness: number; frameColor: string }>
) {
  const canvas = canvasRef.current;
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
    matteRef,
    rotationRef,
    dashOffsetRef,
    computeImageLayout
  }, info, overrides);
}