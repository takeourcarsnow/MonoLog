// helper: generate a small noise canvas scaled to requested size for grain effect
export function generateNoiseCanvas(w: number, h: number, intensity: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext('2d')!;
  const imgData = ctx.createImageData(c.width, c.height);
  const data = imgData.data;
  // intensity controls alpha-ish by choosing noise amplitude
  const amp = Math.min(1, Math.max(0, intensity));
  for (let i = 0; i < data.length; i += 4) {
    const v = Math.round((Math.random() * 255) * amp);
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
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