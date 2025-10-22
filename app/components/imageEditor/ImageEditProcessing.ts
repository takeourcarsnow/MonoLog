import { FILTER_PRESETS } from './constants';
import { mapBasicAdjustments } from './filterUtils';
import { applyWebGLAdjustments } from './webglFilters';

export function applyFiltersAndDraw(
  img: HTMLImageElement,
  srcX: number,
  srcY: number,
  srcW: number,
  srcH: number,
  out: HTMLCanvasElement,
  octx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  drawSizeW: number,
  drawSizeH: number,
  angle: number,
  exposure: number,
  contrast: number,
  saturation: number,
  temperature: number,
  selectedFilter: string,
  filterStrength: number
) {
  // Apply color adjustments to exported image using the shared mapping helper
  const preset = FILTER_PRESETS[selectedFilter] || '';
  const { baseFilter: baseFilterExport, tempTint: exportTempTint } = mapBasicAdjustments({ exposure, contrast, saturation, temperature });

  // Attempt to use the GPU preview pipeline for export
  let usedGpu = false;
  try {
    // Prepare a temporary canvas containing the cropped source area at native size
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = Math.max(1, Math.round(srcW));
    srcCanvas.height = Math.max(1, Math.round(srcH));
    const sctx = srcCanvas.getContext('2d')!;
    sctx.imageSmoothingQuality = 'high';
    sctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, srcCanvas.width, srcCanvas.height);

    // Build numeric adjustments from the shared mapper
    const m = mapBasicAdjustments({ exposure, contrast, saturation, temperature }) as any;
    const brightness = m.brightness || 1;
    const cssContrast = m.finalContrast || 1;
    const cssSaturation = m.cssSaturation || 1;
    const hueDeg = m.hue || 0;
    const tempTint = m.tempTint || 0;

    // Use GPU processing to get base and preset canvases for accurate blending
    const baseCanvas = applyWebGLAdjustments(srcCanvas, srcCanvas.width, srcCanvas.height, {
      brightness,
      contrast: cssContrast,
      saturation: cssSaturation,
      hue: hueDeg,
      preset: undefined,
      presetStrength: 0,
      tempTint,
    });

    const presetCanvas = applyWebGLAdjustments(srcCanvas, srcCanvas.width, srcCanvas.height, {
      brightness,
      contrast: cssContrast,
      saturation: cssSaturation,
      hue: hueDeg,
      preset: selectedFilter || undefined,
      presetStrength: 1,
      tempTint,
    });

    // Draw processed result into the output canvas with rotation and optional blending
    if (filterStrength >= 0.999) {
      octx.save();
      octx.translate(centerX, centerY);
      octx.rotate(angle);
      octx.drawImage(presetCanvas, -drawSizeW / 2, -drawSizeH / 2, drawSizeW, drawSizeH);
      octx.restore();
    } else if (filterStrength <= 0.001) {
      octx.save();
      octx.translate(centerX, centerY);
      octx.rotate(angle);
      octx.drawImage(baseCanvas, -drawSizeW / 2, -drawSizeH / 2, drawSizeW, drawSizeH);
      octx.restore();
    } else {
      octx.save();
      octx.translate(centerX, centerY);
      octx.rotate(angle);
      octx.drawImage(baseCanvas, -drawSizeW / 2, -drawSizeH / 2, drawSizeW, drawSizeH);
      octx.globalAlpha = Math.min(1, Math.max(0, filterStrength));
      octx.drawImage(presetCanvas, -drawSizeW / 2, -drawSizeH / 2, drawSizeW, drawSizeH);
      octx.restore();
      octx.globalAlpha = 1;
    }

    usedGpu = true;
  } catch (e) {
    usedGpu = false;
  }

  // If GPU export couldn't be used, fall back to CSS filter path
  if (!usedGpu) {
    drawWithCssFilters(
      img,
      srcX,
      srcY,
      srcW,
      srcH,
      octx,
      centerX,
      centerY,
      drawSizeW,
      drawSizeH,
      angle,
      baseFilterExport,
      preset,
      filterStrength
    );
  }

  return usedGpu;
}

function drawWithCssFilters(
  img: HTMLImageElement,
  srcX: number,
  srcY: number,
  srcW: number,
  srcH: number,
  octx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  drawSizeW: number,
  drawSizeH: number,
  angle: number,
  baseFilterExport: string,
  preset: string,
  filterStrength: number
) {
  // draw with rotation: translate to center of out canvas, rotate, then draw image centered
  if (filterStrength >= 0.999) {
    octx.filter = `${baseFilterExport} ${preset}`;
    octx.save();
    octx.translate(centerX, centerY);
    octx.rotate(angle);
    octx.drawImage(img, srcX, srcY, srcW, srcH, -drawSizeW / 2, -drawSizeH / 2, drawSizeW, drawSizeH);
    octx.restore();
    octx.filter = 'none';
  } else if (filterStrength <= 0.001) {
    octx.filter = baseFilterExport;
    octx.save();
    octx.translate(centerX, centerY);
    octx.rotate(angle);
    octx.drawImage(img, srcX, srcY, srcW, srcH, -drawSizeW / 2, -drawSizeH / 2, drawSizeW, drawSizeH);
    octx.restore();
    octx.filter = 'none';
  } else {
    octx.filter = baseFilterExport;
    octx.save();
    octx.translate(centerX, centerY);
    octx.rotate(angle);
    octx.drawImage(img, srcX, srcY, srcW, srcH, -drawSizeW / 2, -drawSizeH / 2, drawSizeW, drawSizeH);
    octx.restore();
    octx.filter = `${baseFilterExport} ${preset}`;
    octx.globalAlpha = Math.min(1, Math.max(0, filterStrength));
    octx.save();
    octx.translate(centerX, centerY);
    octx.rotate(angle);
    octx.drawImage(img, srcX, srcY, srcW, srcH, -drawSizeW / 2, -drawSizeH / 2, drawSizeW, drawSizeH);
    octx.restore();
    octx.globalAlpha = 1;
    octx.filter = 'none';
  }
}