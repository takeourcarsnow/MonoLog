import { frameBoundsCache } from './CanvasRendererCache';

// helper: generate a small noise canvas scaled to requested size for grain effect
const noiseCache = new Map<string, HTMLCanvasElement>();
export function generateNoiseCanvas(w: number, h: number, intensity: number) {
  const width = isNaN(w) || w <= 0 ? 1 : Math.max(1, Math.round(w));
  const height = isNaN(h) || h <= 0 ? 1 : Math.max(1, Math.round(h));
  const amp = Math.min(1, Math.max(0, intensity));
  const key = `${width}x${height}x${amp.toFixed(2)}`;
  if (noiseCache.has(key)) {
    return noiseCache.get(key)!;
  }
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d')!;
  const imgData = ctx.createImageData(c.width, c.height);
  const data = imgData.data;
  // intensity controls alpha-ish by choosing noise amplitude
  for (let i = 0; i < data.length; i += 4) {
    const v = Math.round((Math.random() * 255) * amp);
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
  noiseCache.set(key, c);
  return c;
}

// simple linear interpolation helper for colors (hex) — returns a CSS color string
export function lerpColor(hexA: string, hexB: string, t: number) {
  const a = parseInt(hexA.replace('#',''), 16);
  const b = parseInt(hexB.replace('#',''), 16);
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `rgb(${rr}, ${rg}, ${rb})`;
}

export function exposureColor(v: number) {
  // v range 0.2..1.8 -> normalize to 0..1 (we keep neutral=1 centered)
  const EXPOSURE_MIN = 0.2;
  const EXPOSURE_MAX = 1.8;
  const t = Math.max(0, Math.min(1, (v - EXPOSURE_MIN) / (EXPOSURE_MAX - EXPOSURE_MIN)));
  return lerpColor('#fff6db', '#ffd166', t);
}

export function contrastColor(v: number) {
  // contrast uses same numeric range as exposure so normalize against the same bounds
  const CONTRAST_MIN = 0.2;
  const CONTRAST_MAX = 1.8;
  const t = Math.max(0, Math.min(1, (v - CONTRAST_MIN) / (CONTRAST_MAX - CONTRAST_MIN)));
  return lerpColor('#fff3e6', '#ff9f43', t);
}

export function saturationColor(v: number) {
  const t = Math.max(0, Math.min(1, v / 2));
  return lerpColor('#ffe9e9', '#ff6b6b', t);
}

export function temperatureColor(v: number) {
  // v range -100..100 -> 0..1 (cold to warm)
  const t = Math.max(0, Math.min(1, (v + 100) / 200));
  return lerpColor('#66d1ff', '#ffb86b', t);
}

// ARIA live announcer — updates a hidden live region to announce semantic direction
const ariaLiveId = 'imgedit-aria-live';
export function ensureAriaLive() {
  if (typeof document === 'undefined') return null;
  let el = document.getElementById(ariaLiveId) as HTMLElement | null;
  if (!el) {
    el = document.createElement('div');
    el.id = ariaLiveId;
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'true');
    el.className = 'sr-only';
    document.body.appendChild(el);
  }
  return el;
}

export function announceDirection(control: string, prev: number, next: number) {
  const el = ensureAriaLive();
  if (!el) return;
  let dir = 'unchanged';
  if (next > prev) dir = 'increased';
  else if (next < prev) dir = 'decreased';
  // give a short semantic phrase
  const label = control === 'temperature' ? (next > prev ? 'warmer' : (next < prev ? 'cooler' : 'unchanged')) : (dir === 'increased' ? 'higher' : dir === 'decreased' ? 'lower' : 'unchanged');
  el.textContent = `${control} ${label}`;
}

// slider background helper: colored fill up to percentage
export function rangeBg(value: number, min: number, max: number, leftColor = '#1e90ff', rightColor = '#e6e6e6') {
  const pct = Math.round(((value - min) / (max - min)) * 100);
  return `linear-gradient(90deg, ${leftColor} ${pct}%, ${rightColor} ${pct}%)`;
}

// Compute the bounds of the inner transparent area in a frame image (where photo should go)
export function computeFrameBounds(img: HTMLImageElement): { minX: number; minY: number; maxX: number; maxY: number } {
  const cacheKey = img.src;
  // Check if already cached
  const cached = frameBoundsCache.get(cacheKey);
  if (cached) return cached;

  const frameW = img.naturalWidth;
  const frameH = img.naturalHeight;

  const frameTemp = document.createElement('canvas');
  frameTemp.width = frameW;
  frameTemp.height = frameH;
  const fctx = frameTemp.getContext('2d')!;
  fctx.drawImage(img, 0, 0);
  const frameData = fctx.getImageData(0, 0, frameW, frameH);
  const data = frameData.data;

  // Flood fill from borders to mark outside transparent areas
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

  const bounds = { minX, minY, maxX, maxY };
  frameBoundsCache.set(cacheKey, bounds);
  return bounds;
}
