export function drawOverlay(
  octx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  angle: number,
  drawSizeW: number,
  drawSizeH: number,
  overlay: { img: HTMLImageElement; blendMode: string; opacity: number } | null
) {
  if (!overlay || !overlay.img) return;

  try {
    octx.save();
    octx.translate(centerX, centerY);
    octx.rotate(angle);
    octx.globalAlpha = Math.min(1, Math.max(0, overlay.opacity ?? 1));
    octx.globalCompositeOperation = (overlay.blendMode as GlobalCompositeOperation) || 'source-over';
    // Scale overlay to cover the photo area while preserving aspect ratio, cropping if necessary
    const ovW = overlay.img.naturalWidth;
    const ovH = overlay.img.naturalHeight;
    const scale = Math.max(drawSizeW / ovW, drawSizeH / ovH);
    const scaledW = ovW * scale;
    const scaledH = ovH * scale;
    const drawX = -scaledW / 2;
    const drawY = -scaledH / 2;
    octx.drawImage(overlay.img, drawX, drawY, scaledW, scaledH);
    octx.restore();
  } catch (e) {
    // swallow overlay errors
  }
}

export function applyFrameOverlay(
  out: HTMLCanvasElement,
  octx: CanvasRenderingContext2D,
  drawX: number,
  drawY: number,
  drawW: number,
  drawH: number,
  frameOverlay: { img: HTMLImageElement; opacity: number } | null
) {
  if (!frameOverlay || !frameOverlay.img || !frameOverlay.img.complete) return;

  try {
    const frameImg = frameOverlay.img;
    const frameW = frameImg.naturalWidth;
    const frameH = frameImg.naturalHeight;

    // Copy the currently-drawn photo into a temp canvas
    const photoTmp = document.createElement('canvas');
    photoTmp.width = out.width;
    photoTmp.height = out.height;
    const pctx = photoTmp.getContext('2d')!;
    pctx.drawImage(out, 0, 0);

    // Create inner mask
    const innerMask = createInnerMask(frameImg, frameW, frameH);

    // Apply inner mask to photoTmp: keep only photo in the inner area
    pctx.globalCompositeOperation = 'destination-in';
    pctx.drawImage(innerMask, drawX, drawY, drawW, drawH);
    pctx.globalCompositeOperation = 'source-over';

    // Clear out canvas and draw the masked photo back
    octx.clearRect(0, 0, out.width, out.height);
    octx.drawImage(photoTmp, 0, 0);
  } catch (e) {
    // swallow masking errors
  }

  // draw the frame artwork on top
  try {
    octx.save();
    octx.globalAlpha = Math.min(1, Math.max(0, frameOverlay.opacity ?? 1));
    octx.globalCompositeOperation = 'source-over';
    octx.drawImage(frameOverlay.img, drawX, drawY, drawW, drawH);
    octx.restore();
  } catch (e) {
    // swallow frame overlay errors
  }
}

function createInnerMask(frameImg: HTMLImageElement, frameW: number, frameH: number): HTMLCanvasElement {
  const innerMask = document.createElement('canvas');
  innerMask.width = frameW;
  innerMask.height = frameH;
  const imctx = innerMask.getContext('2d')!;

  const frameTemp = document.createElement('canvas');
  frameTemp.width = frameW;
  frameTemp.height = frameH;
  const fctx = frameTemp.getContext('2d')!;
  fctx.drawImage(frameImg, 0, 0);
  const frameData = fctx.getImageData(0, 0, frameW, frameH);
  const data = frameData.data;

  // Flood fill from borders to mark outside transparent areas
  const ALPHA_THRESHOLD = 16;
  const visited = new Uint8Array(frameW * frameH);
  const stack: number[] = [];
  // Add border pixels
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
      visited[idx] = 1; // mark as outside-transparent
      // visit neighbors
      if (x > 0) stack.push(x - 1, y);
      if (x < frameW - 1) stack.push(x + 1, y);
      if (y > 0) stack.push(x, y - 1);
      if (y < frameH - 1) stack.push(x, y + 1);
    }
  }

  // Create inner mask data
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

  return innerMask;
}