import { DrawParams } from "./CanvasRendererCore";
import { frameInnerMaskCache, frameBoundsCache } from './CanvasRendererCache';

export interface FrameOverlayResult {
  imgLeft: number;
  imgTop: number;
  imgW: number;
  imgH: number;
  innerBounds?: { minX: number; minY: number; maxX: number; maxY: number };
}

export function handleFrameOverlay(
  params: DrawParams,
  left: number,
  top: number,
  dispW: number,
  dispH: number,
  img: HTMLImageElement,
  imgLeft: number,
  imgTop: number,
  imgW: number,
  imgH: number,
  curFrameThickness: number
): FrameOverlayResult {
  let result: FrameOverlayResult = { imgLeft, imgTop, imgW, imgH };

  if (params.frameOverlayRef?.current) {
    const frameImg = params.frameOverlayRef.current.img;
    if (frameImg && frameImg.complete) {
      const frameW = frameImg.naturalWidth;
      const frameH = frameImg.naturalHeight;
      const scale = Math.min(dispW / frameW, dispH / frameH);
      const drawW = frameW * scale;
      const drawH = frameH * scale;
      const drawX = left + (dispW - drawW) / 2;
      const drawY = top + (dispH - drawH) / 2;

      // Compute inner bounds for aspect ratio preservation
      const cacheKey = frameImg.src;
      let cachedBounds = frameBoundsCache.get(cacheKey);
      if (!cachedBounds) {
        // Create frame temp canvas to get alpha data
        const frameTemp = document.createElement('canvas');
        frameTemp.width = frameW;
        frameTemp.height = frameH;
        const fctx = frameTemp.getContext('2d')!;
        fctx.drawImage(frameImg, 0, 0);
        const frameData = fctx.getImageData(0, 0, frameW, frameH);
        const data = frameData.data;

        // Flood fill to mark outside transparent areas
        const ALPHA_THRESHOLD = 16;
        const visited = new Uint8Array(frameW * frameH);
        const stack: number[] = [];
        for (let x = 0; x < frameW; x++) {
          stack.push(x, 0);
          stack.push(x, frameH - 1);
        }
        for (let y = 1; y < frameH - 1; y++) {
          stack.push(0, y);
          stack.push(frameW - 1, y);
        }
        while (stack.length > 0) {
          const y = stack.pop()!;
          const x = stack.pop()!;
          if (x < 0 || x >= frameW || y < 0 || y >= frameH) continue;
          const idx = y * frameW + x;
          if (visited[idx]) continue;
          const alpha = data[(idx * 4) + 3];
          const isTransparent = alpha <= ALPHA_THRESHOLD;
          if (isTransparent) {
            visited[idx] = 1;
            if (x > 0) stack.push(x - 1, y);
            if (x < frameW - 1) stack.push(x + 1, y);
            if (y > 0) stack.push(x, y - 1);
            if (y < frameH - 1) stack.push(x, y + 1);
          }
        }

        // Find inner bounds: min/max where alpha == 0 and not outside (inner transparent area)
        let minX = frameW, minY = frameH, maxX = -1, maxY = -1;
        for (let y = 0; y < frameH; y++) {
          for (let x = 0; x < frameW; x++) {
            const idx = y * frameW + x;
            const alpha = data[(idx * 4) + 3];
            const isOutside = visited[idx] === 1;
            if (alpha === 0 && !isOutside) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        // Now, for each pixel: set alpha for frameData
        for (let i = 0; i < data.length; i += 4) {
          const idx = i / 4;
          const alpha = data[i + 3];
          const isOutside = visited[idx] === 1;
          if (isOutside) {
            data[i + 3] = 0; // outside -> transparent
          } else if (alpha > 0) {
            // Non-outside pixels with any alpha become fully opaque (fills small gaps)
            data[i + 3] = 255;
          }
          // otherwise alpha == 0 and not outside -> inner transparent area; leave as-is
        }
        fctx.putImageData(frameData, 0, 0);

        // Create inner mask: opaque where inner transparent area is
        const innerMask = document.createElement('canvas');
        innerMask.width = frameW;
        innerMask.height = frameH;
        const imctx = innerMask.getContext('2d')!;
        const innerData = new Uint8ClampedArray(data.length);
        for (let i = 0; i < data.length; i += 4) {
          const idx = i / 4;
          const alpha = data[i + 3];
          const isOutside = visited[idx] === 1;
          if (alpha === 0 && !isOutside) {
            // inner transparent area
            innerData[i] = 255;
            innerData[i + 1] = 255;
            innerData[i + 2] = 255;
            innerData[i + 3] = 255;
          } else {
            innerData[i + 3] = 0;
          }
        }
        const innerImageData = new ImageData(innerData, frameW, frameH);
        imctx.putImageData(innerImageData, 0, 0);

        // Cache the inner mask
        frameInnerMaskCache.set(cacheKey, innerMask);

        cachedBounds = { minX, minY, maxX, maxY };
        frameBoundsCache.set(cacheKey, cachedBounds);
      }
      result.innerBounds = cachedBounds;

      // Scale photo to fill inner bounds while preserving aspect ratio (may crop)
      const innerW = cachedBounds.maxX - cachedBounds.minX + 1;
      const innerH = cachedBounds.maxY - cachedBounds.minY + 1;
      const photoAspect = img.naturalWidth / img.naturalHeight;
      const innerAspect = innerW / innerH;
      let photoScale: number;
      if (photoAspect > innerAspect) {
        // Photo is wider, fill by height
        photoScale = (innerH * scale) / img.naturalHeight;
      } else {
        // Photo is taller, fill by width
        photoScale = (innerW * scale) / img.naturalWidth;
      }
      const photoW = img.naturalWidth * photoScale;
      const photoH = img.naturalHeight * photoScale;
      const photoX = drawX + (cachedBounds.minX * scale) + ((innerW * scale) - photoW) / 2;
      const photoY = drawY + (cachedBounds.minY * scale) + ((innerH * scale) - photoH) / 2;
      result.imgLeft = photoX;
      result.imgTop = photoY;
      result.imgW = photoW;
      result.imgH = photoH;
    }
  }

  return result;
}

export function applyFrameOverlayMask(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  params: DrawParams,
  left: number,
  top: number,
  dispW: number,
  dispH: number,
  dpr: number
) {
  if (!params.frameOverlayRef?.current) return;

  const fo = params.frameOverlayRef.current;
  try {
    const frameImg = fo.img;
    if (frameImg && frameImg.complete) {
      const frameW = frameImg.naturalWidth;
      const frameH = frameImg.naturalHeight;
      // scale frame to fit inside display rect (keeps same sizing as draw)
      const scale = Math.min(dispW / frameW, dispH / frameH);
      const drawW = frameW * scale;
      const drawH = frameH * scale;
      const drawX = left + (dispW - drawW) / 2;
      const drawY = top + (dispH - drawH) / 2;

      // Copy the currently-drawn photo (and any above-photo effects) into a temp canvas
      // in device pixels so we can mask it reliably.
      const photoTmp = document.createElement('canvas');
      photoTmp.width = canvas.width; photoTmp.height = canvas.height;
      const pctx = photoTmp.getContext('2d')!;
      // draw current main canvas content into photoTmp (device pixels)
      pctx.drawImage(canvas, 0, 0);

      const cacheKey = frameImg.src;
      let innerMask = frameInnerMaskCache.get(cacheKey);
      if (!innerMask) {
        // Create a temp canvas for the frame to binarize alpha (ignore small transparencies)
        const frameTemp = document.createElement('canvas');
        frameTemp.width = frameW;
        frameTemp.height = frameH;
        const fctx = frameTemp.getContext('2d')!;
        fctx.drawImage(frameImg, 0, 0);
        const frameData = fctx.getImageData(0, 0, frameW, frameH);
        const data = frameData.data;

        // Flood fill from borders to mark outside transparent areas.
        // We treat very-low-alpha pixels as transparent for the purposes
        // of detecting 'outside' so tiny semi-transparent edge artifacts
        // don't allow the photo to leak through.
        const ALPHA_THRESHOLD = 16; // pixels with alpha <= this are treated as transparent
        const visited = new Uint8Array(frameW * frameH);
        const stack: number[] = [];
        // Add border pixels (push x then y)
        for (let x = 0; x < frameW; x++) {
          stack.push(x, 0);
          stack.push(x, frameH - 1);
        }
        for (let y = 1; y < frameH - 1; y++) {
          stack.push(0, y);
          stack.push(frameW - 1, y);
        }
        while (stack.length > 0) {
          // Pop in reverse order of push: y then x
          const y = stack.pop()!;
          const x = stack.pop()!;
          if (x === undefined || y === undefined) continue;
          if (x < 0 || x >= frameW || y < 0 || y >= frameH) continue;
          const idx = y * frameW + x;
          if (visited[idx]) continue;
          const alpha = data[(idx * 4) + 3];
          // Treat very-low alpha as transparent for flood-fill
          const isTransparent = alpha <= ALPHA_THRESHOLD;
          if (isTransparent) {
            visited[idx] = 1; // mark as outside-transparent
            // visit neighbors
            if (x > 0) stack.push(x - 1, y);
            if (x < frameW - 1) stack.push(x + 1, y);
            if (y > 0) stack.push(x, y - 1);
            if (y < frameH - 1) stack.push(x, y + 1);
          }
        }

        // Now, for each pixel:
        // - if it's outside (visited) -> ensure fully transparent (alpha = 0)
        // - else if it has any alpha > 0 -> make it fully opaque (alpha = 255)
        // - else leave it as transparent (this preserves the large inner hole for the photo)
        for (let i = 0; i < data.length; i += 4) {
          const idx = i / 4;
          const alpha = data[i + 3];
          const isOutside = visited[idx] === 1;
          if (isOutside) {
            data[i + 3] = 0; // outside -> transparent
          } else if (alpha > 0) {
            // Non-outside pixels with any alpha become fully opaque (fills small gaps)
            data[i + 3] = 255;
          }
          // otherwise alpha == 0 and not outside -> inner transparent area; leave as-is
        }
        fctx.putImageData(frameData, 0, 0);

        // Create inner mask: opaque where inner transparent area is
        innerMask = document.createElement('canvas');
        innerMask.width = frameW;
        innerMask.height = frameH;
        const imctx = innerMask.getContext('2d')!;
        const innerData = new Uint8ClampedArray(data.length);
        for (let i = 0; i < data.length; i += 4) {
          const idx = i / 4;
          const alpha = data[i + 3];
          const isOutside = visited[idx] === 1;
          if (alpha === 0 && !isOutside) {
            // inner transparent area
            innerData[i] = 255;
            innerData[i + 1] = 255;
            innerData[i + 2] = 255;
            innerData[i + 3] = 255;
          } else {
            innerData[i + 3] = 0;
          }
        }
        const innerImageData = new ImageData(innerData, frameW, frameH);
        imctx.putImageData(innerImageData, 0, 0);

        if (frameInnerMaskCache.size > 10) {
          const first = frameInnerMaskCache.keys().next().value;
          if (first) frameInnerMaskCache.delete(first);
        }
        frameInnerMaskCache.set(cacheKey, innerMask);
      }

      // Apply inner mask to photoTmp: keep only photo in the inner area
      pctx.globalCompositeOperation = 'destination-in';
      pctx.drawImage(
        innerMask,
        Math.round(drawX * dpr),
        Math.round(drawY * dpr),
        Math.max(1, Math.round(drawW * dpr)),
        Math.max(1, Math.round(drawH * dpr))
      );
      pctx.globalCompositeOperation = 'source-over';

      // Clear main canvas and draw the masked photo back (work in device pixels)
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(photoTmp, 0, 0);
      ctx.restore();
    }
  } catch (e) {
    // swallow masking errors so editor still renders
  }
}