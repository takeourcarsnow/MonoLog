import { DrawParams, LayoutInfo, DrawOverrides } from "./CanvasRendererCore";
import { computeFrameAdjustedLayout } from "./CanvasRendererLayout";
import { computeFilterValues } from "./CanvasRendererFilters";
import { applySoftFocusEffect, applyFadeEffect, applyVignetteEffect, applyGrainEffect, applyOverlayEffect, applyFrameOverlayEffect } from "./CanvasRendererEffects";
import { drawFrame } from "./CanvasRendererFrame";
import { drawSelection } from "./CanvasRendererSelection";
import { generateNoiseCanvas } from "./utils";
import { setupCanvas } from "./CanvasRendererSetup";
import { drawImageWithFilters } from "./CanvasRendererImageDraw";
import { handleFrameOverlay, applyFrameOverlayMask } from "./CanvasRendererFrameOverlay";

export function draw(params: DrawParams, info?: LayoutInfo, overrides?: DrawOverrides, targetCanvas?: HTMLCanvasElement) {
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

  // Apply special effects (only when not at neutral)
  if (filterValues.curSoftFocus > 0.001) {
    applySoftFocusEffect(ctx, img, imgLeft, imgTop, imgW, imgH, angleRad, filterValues.curSoftFocus);
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
