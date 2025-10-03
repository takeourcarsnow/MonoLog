import { FILTER_PRESETS } from "./constants";
import { generateNoiseCanvas } from "./utils";

interface DrawParams {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  imgRef: React.RefObject<HTMLImageElement>;
  originalImgRef: React.RefObject<HTMLImageElement>;
  previewOriginalRef: React.MutableRefObject<boolean>;
  offset: { x: number; y: number };
  sel: { x: number; y: number; w: number; h: number } | null;
  exposureRef: React.MutableRefObject<number>;
  contrastRef: React.MutableRefObject<number>;
  saturationRef: React.MutableRefObject<number>;
  temperatureRef: React.MutableRefObject<number>;
  vignetteRef: React.MutableRefObject<number>;
  frameColorRef: React.MutableRefObject<'white' | 'black'>;
  frameThicknessRef: React.MutableRefObject<number>;
  selectedFilterRef: React.MutableRefObject<string>;
  filterStrengthRef: React.MutableRefObject<number>;
  grainRef: React.MutableRefObject<number>;
  softFocusRef: React.MutableRefObject<number>;
  fadeRef: React.MutableRefObject<number>;
  matteRef: React.MutableRefObject<number>;
  rotationRef: React.MutableRefObject<number>;
  dashOffsetRef: React.MutableRefObject<number>;
  computeImageLayout: () => { rect: DOMRect; baseScale: number; dispW: number; dispH: number; left: number; top: number } | null;
}

export function draw(params: DrawParams, info?: { rect: DOMRect; baseScale: number; dispW: number; dispH: number; left: number; top: number }, overrides?: Partial<{ exposure: number; contrast: number; saturation: number; temperature: number; vignette: number; rotation: number; selectedFilter: string; grain: number; softFocus: number; fade: number; matte: number; frameEnabled: boolean; frameThickness: number; frameColor: string }>) {
  const {
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
  } = params;

  const canvas = canvasRef.current; const img = previewOriginalRef.current && originalImgRef.current ? originalImgRef.current : imgRef.current;
  if (!canvas || !img) return;
  const ctx = canvas.getContext("2d")!;
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

  // prefer using the provided layout info to avoid state update races
  let left: number, top: number, dispW: number, dispH: number;
  if (info) {
    left = info.left; top = info.top; dispW = info.dispW; dispH = info.dispH;
  } else {
      // Try to compute current layout from the canvas to avoid using a stale `offset` value
      const computed = computeImageLayout();
      if (computed) {
        left = computed.left; top = computed.top; dispW = computed.dispW; dispH = computed.dispH;
      } else {
        const rect = canvas.getBoundingClientRect();
        const baseScale = Math.min(rect.width / img.naturalWidth, rect.height / img.naturalHeight);
        dispW = img.naturalWidth * baseScale;
        dispH = img.naturalHeight * baseScale;
        left = offset.x; top = offset.y;
      }
  }

  // Apply color adjustments via canvas filter for live preview
  // If previewOriginal is true we skip all adjustments/filters and draw the raw original image
  const isPreviewOrig = previewOriginalRef.current && originalImgRef.current;
  // temperature mapped to hue-rotate degrees (-30..30 deg)
  const curExposure = isPreviewOrig ? 1 : (overrides?.exposure ?? exposureRef.current ?? 1);
  const curContrast = overrides?.contrast ?? contrastRef.current ?? 1;
  const curSaturation = overrides?.saturation ?? saturationRef.current ?? 1;
  const curTemperature = overrides?.temperature ?? temperatureRef.current ?? 0;
  const curVignette = overrides?.vignette ?? vignetteRef.current ?? 0;
  const curSelectedFilter = overrides?.selectedFilter ?? selectedFilterRef.current ?? 'none';
  const curFilterStrength = filterStrengthRef.current ?? 1;
  const curGrain = overrides?.grain ?? grainRef.current ?? 0;
  const curSoftFocus = overrides?.softFocus ?? softFocusRef.current ?? 0;
  const curFade = overrides?.fade ?? fadeRef.current ?? 0;
  const curMatte = overrides?.matte ?? matteRef.current ?? 0;
  // frame is considered "on" when thickness > 0. Allow overrides to pass a thickness.
  const curFrameThickness = overrides?.frameThickness ?? frameThicknessRef.current ?? 0;
  const curFrameEnabled = curFrameThickness > 0;
  const curFrameColor = overrides?.frameColor ?? frameColorRef.current ?? 'white';
  const hue = Math.round((curTemperature / 100) * 30);
    // map selectedFilter to additional filter fragments
  const preset = FILTER_PRESETS[curSelectedFilter] || '';
  const angle = (overrides?.rotation ?? rotationRef.current ?? 0) || 0;
  const angleRad = (angle * Math.PI) / 180;

  // helper to draw an image/canvas with rotation around its center
  function drawRotated(source: CanvasImageSource, left: number, top: number, w: number, h: number, rad: number) {
    const cx = left + w / 2;
    const cy = top + h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rad);
    ctx.drawImage(source as any, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
  // base color adjustments (exposure/contrast/saturation) + hue
  const baseFilter = `brightness(${curExposure}) contrast(${curContrast}) saturate(${curSaturation}) hue-rotate(${hue}deg)`;
  const filter = `${baseFilter} ${preset}`;
  // If filter strength < 1, we'll composite a filtered layer on top with alpha
  // When a frame is enabled, shrink the displayed image rectangle (uniform inset)
  // so the frame occupies the outer margin. Aspect ratio is preserved by applying
  // identical padding on all sides derived from min(dispW, dispH).
  let imgLeft = left; let imgTop = top; let imgW = dispW; let imgH = dispH;
  if (curFrameEnabled) {
    // Previous approach subtracted identical absolute padding from width & height,
    // which changes aspect ratio when the image isn't square. Instead, compute a
    // desired padding based on the min dimension, derive candidate horizontal &
    // vertical scale factors, then choose a single uniform scale so the image
    // shrinks proportionally (aspect ratio preserved). The actual visual frame
    // thickness may differ slightly between axes if the image is not square.
    const minDim = Math.min(dispW, dispH);
    const padDesired = Math.min(minDim * Math.max(0, Math.min(0.5, curFrameThickness)), minDim * 0.49);
    const scaleW = (dispW - 2 * padDesired) / dispW;
    const scaleH = (dispH - 2 * padDesired) / dispH;
    const scale = Math.max(0.01, Math.min(scaleW, scaleH));
    const scaledW = dispW * scale;
    const scaledH = dispH * scale;
    imgLeft = left + (dispW - scaledW) / 2;
    imgTop = top + (dispH - scaledH) / 2;
    imgW = scaledW;
    imgH = scaledH;
  }
  if (isPreviewOrig) {
    // Draw raw original with no filters/effects
    drawRotated(img, imgLeft, imgTop, imgW, imgH, angleRad);
  } else if (curFilterStrength >= 0.999) {
    ctx.filter = filter;
    drawRotated(img, imgLeft, imgTop, imgW, imgH, angleRad);
    ctx.filter = 'none';
  } else if (curFilterStrength <= 0.001) {
    ctx.filter = baseFilter;
    drawRotated(img, imgLeft, imgTop, imgW, imgH, angleRad);
    ctx.filter = 'none';
  } else {
    // draw base with baseFilter, then composite filtered version on top with globalAlpha = strength
    ctx.filter = baseFilter;
    drawRotated(img, imgLeft, imgTop, imgW, imgH, angleRad);
    ctx.filter = filter;
    ctx.globalAlpha = Math.min(1, Math.max(0, curFilterStrength));
    drawRotated(img, imgLeft, imgTop, imgW, imgH, angleRad);
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
  }
  // Soft focus: draw a subtle blurred layer on top with low alpha
  if (curSoftFocus > 0.001) {
    try {
      // Create a dreamy, soft focus effect by layering a blurred version
      const tmp = document.createElement('canvas'); 
      tmp.width = Math.max(1, Math.round(imgW)); 
      tmp.height = Math.max(1, Math.round(imgH));
      const tctx = tmp.getContext('2d')!;
      
      // Draw from the original image source (not the processed canvas)
  tctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, tmp.width, tmp.height);
      
      // Apply blur
      const blurAmount = Math.max(3, curSoftFocus * 12);
      tctx.filter = `blur(${blurAmount}px) brightness(1.05)`;
      tctx.drawImage(tmp, 0, 0);
      tctx.filter = 'none';
      
      // Composite the blurred layer on top with lighten blend for glow
  ctx.save();
  ctx.globalAlpha = Math.min(0.4, curSoftFocus * 0.45);
  ctx.globalCompositeOperation = 'lighten';
  drawRotated(tmp, imgLeft, imgTop, imgW, imgH, angleRad);
  ctx.restore();
    } catch (e) {
      // fallback: subtle white overlay
      ctx.save(); 
      ctx.globalAlpha = Math.min(0.25, curSoftFocus * 0.3); 
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; 
      ctx.fillRect(imgLeft, imgTop, imgW, imgH); 
      ctx.restore();
    }
  }
  // Fade: produce a visible faded look by compositing a lower-contrast, slightly brighter copy on top
  if (curFade > 0.001) {
    try {
      // Create a lifted blacks, reduced contrast fade effect (washed out vintage look)
      ctx.save();
      
      // First, apply a light overlay to lift the blacks
      ctx.globalAlpha = Math.min(0.35, curFade * 0.4);
      ctx.globalCompositeOperation = 'lighten';
      ctx.fillStyle = 'rgba(230, 230, 230, 0.5)';
      ctx.fillRect(imgLeft, imgTop, imgW, imgH);
      
      // Then reduce contrast with a gray overlay
      ctx.globalAlpha = Math.min(0.25, curFade * 0.3);
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = 'rgba(200, 200, 200, 0.6)';
      ctx.fillRect(imgLeft, imgTop, imgW, imgH);
      
      ctx.restore();
    } catch (e) {
      // fallback: stronger white overlay
      ctx.save(); 
      ctx.globalAlpha = Math.min(0.4, curFade * 0.45); 
      ctx.fillStyle = 'rgba(245,245,240,0.3)'; 
      ctx.fillRect(imgLeft, imgTop, imgW, imgH); 
      ctx.restore();
    }
  }
  // Matte: stronger matte look using a desaturated, flattened layer composited with soft-light for a filmic matte
  if (curMatte > 0.001) {
    try {
      // Rich, cinematic matte look with crushed blacks and film-like tonality
      ctx.save();
      
      // Darken with multiply for crushed blacks
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = Math.min(0.25, curMatte * 0.3);
      ctx.fillStyle = 'rgba(30, 25, 35, 0.8)';
      ctx.fillRect(imgLeft, imgTop, imgW, imgH);
      
      // Add warm film tone with color-dodge for highlights
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = Math.min(0.2, curMatte * 0.25);
      ctx.fillStyle = 'rgba(200, 180, 150, 0.5)';
      ctx.fillRect(imgLeft, imgTop, imgW, imgH);
      
      ctx.restore();
    } catch (e) {
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = Math.min(0.35, curMatte * 0.4); ctx.fillStyle = 'rgba(25,25,25,0.3)'; ctx.fillRect(imgLeft, imgTop, imgW, imgH); ctx.restore();
    }
  }
    // optional vignette overlay — apply only over the displayed image area
      if (curVignette > 0) {
        try {
          // center the radial gradient on the image display area
          const cx = imgLeft + imgW / 2;
          const cy = imgTop + imgH / 2;
          const innerR = Math.min(imgW, imgH) * 0.2;
          const outerR = Math.max(imgW, imgH) * 0.8;
          const g = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
          g.addColorStop(0, 'rgba(0,0,0,0)');
          g.addColorStop(1, `rgba(0,0,0,${Math.min(0.85, curVignette)})`);
          ctx.save();
          ctx.globalCompositeOperation = 'multiply';
          // clip to the image rectangle so the vignette won't darken the surrounding UI
          ctx.beginPath();
          ctx.rect(imgLeft, imgTop, imgW, imgH);
          ctx.clip();
          ctx.fillStyle = g;
          ctx.fillRect(imgLeft, imgTop, imgW, imgH);
          ctx.restore();
        } catch (e) {
          // fallback: if anything goes wrong, apply a conservative vignette over the canvas
          const r = info?.rect || canvas.getBoundingClientRect();
          const g = ctx.createRadialGradient(r.width / 2, r.height / 2, Math.min(r.width, r.height) * 0.2, r.width / 2, r.height / 2, Math.max(r.width, r.height) * 0.8);
          g.addColorStop(0, `rgba(0,0,0,0)`);
          g.addColorStop(1, `rgba(0,0,0,${Math.min(0.85, curVignette)})`);
          ctx.save();
          ctx.globalCompositeOperation = 'multiply';
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, r.width, r.height);
          ctx.restore();
        }
      }

    // grain/noise overlay (preview)
    if (curGrain > 0) {
      // draw grain only over the displayed image area (use shrunken image rect if frame is enabled)
      const nImgLeft = imgLeft; const nImgTop = imgTop; const nImgW = imgW; const nImgH = imgH;
      const noiseW = Math.max(1, Math.round(imgW));
      const noiseH = Math.max(1, Math.round(imgH));
      const noise = generateNoiseCanvas(noiseW, noiseH, curGrain);
      ctx.save();
      ctx.globalAlpha = Math.min(0.85, curGrain);
      ctx.globalCompositeOperation = 'overlay';
      // draw the noise scaled to the image area so grain doesn't bleed outside the photo
      drawRotated(noise, nImgLeft, nImgTop, nImgW, nImgH, angleRad);
      ctx.restore();
    }

    // simple frame overlay (stroke around image)
    if (curFrameEnabled) {
      // Draw frame bands between outer disp rect and inner uniformly-scaled image.
      // If the image is rotated, draw the frame inside a rotated coordinate
      // system so the frame rotates with the photo.
      ctx.save();
      ctx.fillStyle = curFrameColor === 'white' ? '#ffffff' : '#000000';
      // When no rotation is applied we can draw axis-aligned bands (fast path)
      if (Math.abs(angleRad) < 1e-6) {
        // Round all coordinates to whole pixels to eliminate gaps
        const outerL = Math.floor(left);
        const outerT = Math.floor(top);
        const outerR = Math.ceil(left + dispW);
        const outerB = Math.ceil(top + dispH);
        const innerL = Math.floor(imgLeft);
        const innerT = Math.floor(imgTop);
        const innerR = Math.ceil(imgLeft + imgW);
        const innerB = Math.ceil(imgTop + imgH);

        // Draw frame as overlapping rectangles to ensure no gaps
        if (innerT > outerT) ctx.fillRect(outerL, outerT, outerR - outerL, innerT - outerT + 1);
        if (innerB < outerB) ctx.fillRect(outerL, innerB - 1, outerR - outerL, outerB - innerB + 1);
        if (innerL > outerL) ctx.fillRect(outerL, outerT, innerL - outerL + 1, outerB - outerT);
        if (innerR < outerR) ctx.fillRect(innerR - 1, outerT, outerR - innerR + 1, outerB - outerT);
      } else {
        // Rotated path: translate to image center and draw relative to that center
        const cx = left + dispW / 2;
        const cy = top + dispH / 2;
        ctx.translate(cx, cy);
        ctx.rotate(angleRad);

        // Outer rect relative to center
        const outerL = Math.floor(-dispW / 2);
        const outerT = Math.floor(-dispH / 2);
        const outerR = Math.ceil(dispW / 2);
        const outerB = Math.ceil(dispH / 2);

        // Inner rect relative to center
        const innerL = Math.floor(imgLeft - left - dispW / 2);
        const innerT = Math.floor(imgTop - top - dispH / 2);
        const innerR = Math.ceil(imgLeft + imgW - left - dispW / 2);
        const innerB = Math.ceil(imgTop + imgH - top - dispH / 2);

        if (innerT > outerT) ctx.fillRect(outerL, outerT, outerR - outerL, innerT - outerT + 1);
        if (innerB < outerB) ctx.fillRect(outerL, innerB - 1, outerR - outerL, outerB - innerB + 1);
        if (innerL > outerL) ctx.fillRect(outerL, outerT, innerL - outerL + 1, outerB - outerT);
        if (innerR < outerR) ctx.fillRect(innerR - 1, outerT, outerR - innerR + 1, outerB - outerT);
      }
      ctx.restore();
    }

    if (sel) {
      ctx.save();
      ctx.strokeStyle = "#00aaff";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      // animate marching-dashed selection using an offset
      ctx.lineDashOffset = dashOffsetRef.current;
      ctx.strokeRect(sel.x, sel.y, sel.w, sel.h);
      ctx.restore();
      // rule-of-thirds overlay inside the selection (double-stroke for contrast)
      try {
        ctx.save();
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        // compute thirds
        const tx1 = sel.x + sel.w / 3;
        const tx2 = sel.x + (sel.w * 2) / 3;
        const ty1 = sel.y + sel.h / 3;
        const ty2 = sel.y + (sel.h * 2) / 3;

        // draw darker base lines for contrast on light backgrounds
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0,0,0,0.32)';
        ctx.moveTo(tx1, sel.y); ctx.lineTo(tx1, sel.y + sel.h);
        ctx.moveTo(tx2, sel.y); ctx.lineTo(tx2, sel.y + sel.h);
        ctx.moveTo(sel.x, ty1); ctx.lineTo(sel.x + sel.w, ty1);
        ctx.moveTo(sel.x, ty2); ctx.lineTo(sel.x + sel.w, ty2);
        ctx.stroke();

        // subtle light lines on top for visibility on dark backgrounds
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.moveTo(tx1, sel.y); ctx.lineTo(tx1, sel.y + sel.h);
        ctx.moveTo(tx2, sel.y); ctx.lineTo(tx2, sel.y + sel.h);
        ctx.moveTo(sel.x, ty1); ctx.lineTo(sel.x + sel.w, ty1);
        ctx.moveTo(sel.x, ty2); ctx.lineTo(sel.x + sel.w, ty2);
        ctx.stroke();
        ctx.restore();
      } catch (e) {
        // drawing extras should never crash; if it does, silently continue
      }
      // dim outside selection
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.rect(0, 0, canvas.width / dpr, canvas.height / dpr);
      ctx.rect(sel.x, sel.y, sel.w, sel.h);
      // @ts-ignore
      ctx.fill("evenodd");
      ctx.restore();

      // Draw resize handles
      const handleSize = 8;
      ctx.fillStyle = "#00aaff";
      const handles = [
        { x: sel.x - handleSize/2, y: sel.y - handleSize/2 }, // top-left
        { x: sel.x + sel.w - handleSize/2, y: sel.y - handleSize/2 }, // top-right
        { x: sel.x - handleSize/2, y: sel.y + sel.h - handleSize/2 }, // bottom-left
        { x: sel.x + sel.w - handleSize/2, y: sel.y + sel.h - handleSize/2 }, // bottom-right
        { x: sel.x + sel.w/2 - handleSize/2, y: sel.y - handleSize/2 }, // top
        { x: sel.x + sel.w/2 - handleSize/2, y: sel.y + sel.h - handleSize/2 }, // bottom
        { x: sel.x - handleSize/2, y: sel.y + sel.h/2 - handleSize/2 }, // left
        { x: sel.x + sel.w - handleSize/2, y: sel.y + sel.h/2 - handleSize/2 }, // right
      ];
      handles.forEach(h => {
        ctx.fillRect(h.x, h.y, handleSize, handleSize);
      });
    }
}