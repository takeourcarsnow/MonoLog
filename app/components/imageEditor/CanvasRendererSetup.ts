import { DrawParams, LayoutInfo, DrawOverrides } from "./CanvasRendererCore";
import { computeImageLayout } from "./CanvasRendererLayout";

export interface CanvasSetupResult {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  dpr: number;
  layout: LayoutInfo;
  img: HTMLImageElement;
}

export function setupCanvas(params: DrawParams, info?: LayoutInfo, overrides?: DrawOverrides, targetCanvas?: HTMLCanvasElement): CanvasSetupResult | null {
  const canvas = targetCanvas || params.canvasRef.current;
  const img = params.previewOriginalRef.current && params.originalImgRef.current ? params.originalImgRef.current : params.imgRef.current;
  if (!canvas || !img) return null;

  const ctx = canvas.getContext("2d")!;
  const dpr = targetCanvas ? 1 : (window.devicePixelRatio || 1);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

  let layoutInfo = info;
  if (targetCanvas && !info) {
    // For export, create full-size layout info with rotation bounding box
    const rot = params.rotationRef.current;
    const angle = (rot * Math.PI) / 180;
    const absCos = Math.abs(Math.cos(angle));
    const absSin = Math.abs(Math.sin(angle));
    const rotatedW = Math.max(1, Math.round(img.naturalWidth * absCos + img.naturalHeight * absSin));
    const rotatedH = Math.max(1, Math.round(img.naturalWidth * absSin + img.naturalHeight * absCos));
    // Set canvas size to bounding box
    targetCanvas.width = rotatedW;
    targetCanvas.height = rotatedH;
    // Center the image in the bounding box
    const centerX = rotatedW / 2;
    const centerY = rotatedH / 2;
    layoutInfo = {
      rect: { width: rotatedW, height: rotatedH, left: 0, top: 0, x: 0, y: 0, bottom: rotatedH, right: rotatedW, toJSON: () => ({}) } as DOMRect,
      baseScale: 1,
      dispW: img.naturalWidth,
      dispH: img.naturalHeight,
      left: centerX - img.naturalWidth / 2,
      top: centerY - img.naturalHeight / 2
    };
  }

  const layout = layoutInfo || computeImageLayout(params, info);
  if (!layout) return null;

  return { canvas, ctx, dpr, layout: layout as LayoutInfo, img };
}