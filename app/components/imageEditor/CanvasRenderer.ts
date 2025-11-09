import { DrawParams, LayoutInfo, DrawOverrides } from "./CanvasRendererCore";
import { computeFrameAdjustedLayout } from "./CanvasRendererLayout";
import { computeFilterValues } from "./CanvasRendererFilters";
import { applySoftFocusEffect, applyFadeEffect, applyVignetteEffect, applyGrainEffect, applyOverlayEffect, applyFrameOverlayEffect, applyPixelateEffect, applyDitherEffect, applyAsciiEffect } from "./CanvasRendererEffects";
import { drawFrame } from "./CanvasRendererFrame";
import { drawSelection } from "./CanvasRendererSelection";
import { generateNoiseCanvas } from "./utils";
import { setupCanvas } from "./CanvasRendererSetup";
import { drawImageWithFilters } from "./CanvasRendererImageDraw";
import { handleFrameOverlay, applyFrameOverlayMask } from "./CanvasRendererFrameOverlay";

export function draw(params: DrawParams, info?: LayoutInfo, overrides?: DrawOverrides, targetCanvas?: HTMLCanvasElement) {
  // Use requestAnimationFrame for non-blocking rendering when not targeting a specific canvas
  if (!targetCanvas) {
    requestAnimationFrame(() => performDraw(params, info, overrides, targetCanvas));
  } else {
    performDraw(params, info, overrides, targetCanvas);
  }
}

function performDraw(params: DrawParams, info?: LayoutInfo, overrides?: DrawOverrides, targetCanvas?: HTMLCanvasElement) {
  const setupResult = setupCanvas(params, info, overrides, targetCanvas);
  if (!setupResult) return;

  const { canvas, ctx, dpr, layout, img } = setupResult;
  const { left, top, dispW, dispH } = layout;
  const filterValues = computeFilterValues(params, overrides);

  const {
    curFrameThickness,
    angleRad,
  } = filterValues;

  // Calculate frame-adjusted layout
  let { imgLeft, imgTop, imgW, imgH } = computeFrameAdjustedLayout(
    left,
    top,
    dispW,
    dispH,
    curFrameThickness
  );

  // Handle frame overlay adjustments
  const frameOverlayResult = handleFrameOverlay(params, left, top, dispW, dispH, img, imgLeft, imgTop, imgW, imgH, curFrameThickness);
  imgLeft = frameOverlayResult.imgLeft;
  imgTop = frameOverlayResult.imgTop;
  imgW = frameOverlayResult.imgW;
  imgH = frameOverlayResult.imgH;

  // Draw the main image with filters
  drawImageWithFilters(ctx, params, img, imgLeft, imgTop, imgW, imgH, angleRad, filterValues);

  // Determine an effect scale so export matches on-screen preview density.
  // We compute how much larger the current draw area is compared to the live preview display area.
  let effectScale = 1;
  try {
    const previewLayout = typeof params.computeImageLayout === 'function' ? params.computeImageLayout() : null;
    if (previewLayout && previewLayout.dispW && dispW) {
      // Use width ratio; height would be equivalent for uniform scaling
      const ratio = dispW / previewLayout.dispW;
      if (isFinite(ratio) && ratio > 0) effectScale = ratio;
    }
  } catch (e) {
    effectScale = 1;
  }

  // Apply special effects (only when not at neutral)
  if (filterValues.curSoftFocus > 0.001) {
    applySoftFocusEffect(ctx, img, imgLeft, imgTop, imgW, imgH, angleRad, filterValues.curSoftFocus, effectScale);
  }
  if (filterValues.curFade > 0.001) {
    applyFadeEffect(ctx, imgLeft, imgTop, imgW, imgH, filterValues.curFade);
  }
  if (filterValues.curVignette > 0.001) {
    applyVignetteEffect(ctx, canvas, imgLeft, imgTop, imgW, imgH, filterValues.curVignette, info);
  }
  if (filterValues.curGrain > 0.001) {
    applyGrainEffect(ctx, imgLeft, imgTop, imgW, imgH, angleRad, filterValues.curGrain, generateNoiseCanvas);
  }

  // Early return if no special effects are enabled
  const hasSpecialEffects = (params.pixelSizeRef?.current ?? 1) > 1 ||
                           (params.ditherMethodRef?.current || 'none') !== 'none' ||
                           (params.asciiEnabledRef?.current ?? false) ||
                           params.overlayRef.current ||
                           params.frameOverlayRef?.current ||
                           filterValues.curFrameEnabled ||
                           params.sel;

  if (!hasSpecialEffects) {
    return; // Skip expensive operations if no effects are applied
  }

  // New: Special Effects category
  const pixelSize = params.pixelSizeRef?.current ?? 1;
  if (pixelSize && pixelSize > 1) {
    applyPixelateEffect(
      ctx,
      img as HTMLImageElement,
      imgLeft,
      imgTop,
      imgW,
      imgH,
      angleRad,
      pixelSize,
      filterValues,
      params.pixelShapeRef?.current ?? 'square',
      params.pixelSampleRef?.current ?? 'average',
      effectScale
    );
  }
  const ditherMethod = params.ditherMethodRef?.current || 'none';
  const ditherLevels = params.ditherLevelsRef?.current || 2;
  if (ditherMethod !== 'none') {
    applyDitherEffect(
      ctx,
      img as HTMLImageElement,
      imgLeft,
      imgTop,
      imgW,
      imgH,
      angleRad,
      ditherMethod as any,
      ditherLevels,
      filterValues,
      params.ditherColorModeRef?.current ?? 'bw',
      params.ditherPaletteRef?.current ?? 'auto',
      params.ditherCustomPaletteRef?.current ?? '',
      effectScale,
      { preview: !targetCanvas, maxPreviewPixels: undefined, targetLongEdge: params.targetLongEdgeRef?.current ?? 150 }
    );
  }
  const asciiEnabled = params.asciiEnabledRef?.current ?? false;
  if (asciiEnabled) {
    applyAsciiEffect(
      ctx,
      img as HTMLImageElement,
      imgLeft,
      imgTop,
      imgW,
      imgH,
      angleRad,
      true,
      params.asciiCellSizeRef?.current ?? 8,
      params.asciiCharsetRef?.current ?? "@%#*+=-:. ",
      params.asciiInvertRef?.current ?? false,
      params.asciiColorRef?.current ?? false,
      filterValues,
      {
        opacity: params.asciiOpacityRef?.current ?? 1,
        background: params.asciiBackgroundRef?.current ?? 'transparent',
        font: params.asciiFontRef?.current ?? 'monospace',
        gamma: params.asciiGammaRef?.current ?? 1,
        bold: params.asciiBoldRef?.current ?? false,
        edge: params.asciiEdgeRef?.current ?? 'none'
      },
      effectScale
    );
  }
  if (params.overlayRef.current) {
    applyOverlayEffect(ctx, params.overlayRef.current, imgLeft, imgTop, imgW, imgH);
  }

  // Apply frame overlay masking
  applyFrameOverlayMask(ctx, canvas, params, left, top, dispW, dispH, dpr);

  // Draw frame overlay artwork
  if (params.frameOverlayRef?.current) {
    applyFrameOverlayEffect(ctx, params.frameOverlayRef.current, left, top, dispW, dispH);
  }

  // Draw frame if enabled
  if (filterValues.curFrameEnabled) {
    drawFrame(ctx, left, top, dispW, dispH, imgLeft, imgTop, imgW, imgH, angleRad, filterValues.curFrameColor);
  }

  // Draw selection if present
  if (params.sel) {
    drawSelection(ctx, canvas, params.sel, params.dashOffsetRef.current, dpr);
  }
}
