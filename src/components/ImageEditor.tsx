"use client";

import { useEffect, useRef, useState, useMemo } from "react";

// helper: generate a small noise canvas scaled to requested size for grain effect
function generateNoiseCanvas(w: number, h: number, intensity: number) {
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

type Props = {
  initialDataUrl: string;
  onCancel: () => void;
  onApply: (dataUrl: string) => void;
};

// simple linear interpolation helper for colors (hex) — returns a CSS color string
function lerpColor(hexA: string, hexB: string, t: number) {
  const a = parseInt(hexA.replace('#',''), 16);
  const b = parseInt(hexB.replace('#',''), 16);
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `rgb(${rr}, ${rg}, ${rb})`;
}

function exposureColor(v: number) {
  // v range 0.5..1.8 -> normalize to 0..1
  const t = Math.max(0, Math.min(1, (v - 0.5) / (1.8 - 0.5)));
  return lerpColor('#fff6db', '#ffd166', t);
}

function contrastColor(v: number) {
  const t = Math.max(0, Math.min(1, (v - 0.5) / (1.8 - 0.5)));
  return lerpColor('#fff3e6', '#ff9f43', t);
}

function saturationColor(v: number) {
  const t = Math.max(0, Math.min(1, v / 2));
  return lerpColor('#ffe9e9', '#ff6b6b', t);
}

function temperatureColor(v: number) {
  // v range -100..100 -> 0..1 (cold to warm)
  const t = Math.max(0, Math.min(1, (v + 100) / 200));
  return lerpColor('#66d1ff', '#ffb86b', t);
}

// ARIA live announcer — updates a hidden live region to announce semantic direction
const ariaLiveId = 'imgedit-aria-live';
function ensureAriaLive() {
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

function announceDirection(control: string, prev: number, next: number) {
  const el = ensureAriaLive();
  if (!el) return;
  let dir = 'unchanged';
  if (next > prev) dir = 'increased';
  else if (next < prev) dir = 'decreased';
  // give a short semantic phrase
  const label = control === 'temperature' ? (next > prev ? 'warmer' : (next < prev ? 'cooler' : 'unchanged')) : (dir === 'increased' ? 'higher' : dir === 'decreased' ? 'lower' : 'unchanged');
  el.textContent = `${control} ${label}`;
}

// central filter presets map (CSS filter fragments). Add new presets here.
const FILTER_PRESETS: Record<string, string> = {
  none: '',
  sepia: 'sepia(0.45)',
  mono: 'grayscale(0.95)',
  cinema: 'contrast(1.15) saturate(1.05) hue-rotate(-5deg)',
  bleach: 'saturate(1.3) contrast(0.95) brightness(1.02)',
  vintage: 'sepia(0.35) contrast(0.95) saturate(0.9) brightness(0.98)',
  lomo: 'contrast(1.25) saturate(1.35) brightness(1.02) sepia(0.08)',
  warm: 'saturate(1.05) hue-rotate(6deg) brightness(1.01)',
  cool: 'saturate(0.95) hue-rotate(-6deg) brightness(0.99)',
  invert: 'invert(1)',
  film: 'contrast(1.08) saturate(0.92) brightness(0.98)'
};

export default function ImageEditor({ initialDataUrl, onCancel, onApply }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imageSrc, setImageSrc] = useState(initialDataUrl);
  const originalRef = useRef<string>(initialDataUrl);

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef<null | {
    startX: number;
    startY: number;
    mode: "pan" | "crop";
    action?: "move" | "draw" | "resize";
    origSel?: { x: number; y: number; w: number; h: number };
    anchorX?: number;
    anchorY?: number;
    handleIndex?: number;
  }>(null);
  const [sel, setSel] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [exposure, setExposure] = useState<number>(1);
  const [contrast, setContrast] = useState<number>(1);
  const [saturation, setSaturation] = useState<number>(1);
  const [temperature, setTemperature] = useState<number>(0); // -100..100 mapped to hue-rotate
  const [vignette, setVignette] = useState<number>(0); // 0..1
  const [frameColor, setFrameColor] = useState<'white' | 'black'>('white');
  const [frameThickness, setFrameThickness] = useState<number>(0); // fraction of min(image dim) — default disabled
  const [controlsOpen, setControlsOpen] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<'basic' | 'color' | 'effects' | 'crop'>('basic');
  const ASPECT_PRESETS = [
    { label: 'Free', v: null },
    { label: '16:9', v: 16 / 9 },
    { label: '4:3', v: 4 / 3 },
    { label: '3:2', v: 3 / 2 },
    { label: '1:1', v: 1 },
    { label: '4:5', v: 4 / 5 }
  ];
  const [presetIndex, setPresetIndex] = useState<number>(0);
  const [selectedFilter, setSelectedFilter] = useState<string>('none');
  const [filterStrength, setFilterStrength] = useState<number>(1); // 0..1
  const [grain, setGrain] = useState<number>(0); // 0..1
  const [softFocus, setSoftFocus] = useState<number>(0); // gentle blur overlay
  const [fade, setFade] = useState<number>(0); // faded matte look
  const [matte, setMatte] = useState<number>(0); // matte tone curve
  // refs mirror state for immediate reads inside draw() to avoid stale-state draws
  const exposureRef = useRef<number>(exposure);
  const contrastRef = useRef<number>(contrast);
  const saturationRef = useRef<number>(saturation);
  const temperatureRef = useRef<number>(temperature);
  const vignetteRef = useRef<number>(vignette);
  const frameColorRef = useRef<'white' | 'black'>(frameColor);
  const frameThicknessRef = useRef<number>(frameThickness);
  const selectedFilterRef = useRef<string>(selectedFilter);
  const filterStrengthRef = useRef<number>(filterStrength);
  const grainRef = useRef<number>(grain);
  const softFocusRef = useRef<number>(softFocus);
  const fadeRef = useRef<number>(fade);
  const matteRef = useRef<number>(matte);
  const filtersContainerRef = useRef<HTMLDivElement | null>(null);
  const [filterHighlight, setFilterHighlight] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const categoriesContainerRef = useRef<HTMLDivElement | null>(null);
  const [categoryHighlight, setCategoryHighlight] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  useEffect(() => {
    let alive = true;
    const compute = () => {
      const cont = categoriesContainerRef.current;
      if (!cont) { if (alive) setCategoryHighlight(null); return; }
      const selKey = selectedCategory === 'basic' ? 'basic' : selectedCategory === 'color' ? 'color' : selectedCategory === 'effects' ? 'effects' : 'crop';
      const btn = cont.querySelector<HTMLButtonElement>(`button[data-cat="${selKey}"]`);
      if (!btn) { if (alive) setCategoryHighlight(null); return; }
      const left = Math.round((btn as HTMLElement).offsetLeft - 4);
      const top = Math.round((btn as HTMLElement).offsetTop - 4);
      const width = Math.round((btn as HTMLElement).offsetWidth + 8);
      const height = Math.round((btn as HTMLElement).offsetHeight + 8);
      if (alive) setCategoryHighlight({ left, top, width, height });
    };
    const raf = requestAnimationFrame(() => setTimeout(() => compute(), 16));
    const ro = new ResizeObserver(() => compute());
    if (categoriesContainerRef.current) ro.observe(categoriesContainerRef.current);
    window.addEventListener('resize', compute);
    return () => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('resize', compute); };
  }, [selectedCategory]);

  // compute highlight pill position whenever selectedFilter, category, or layout changes
  useEffect(() => {
    let mountedFlag = true;
    const compute = () => {
      const cont = filtersContainerRef.current;
      if (!cont) { if (mountedFlag) setFilterHighlight(null); return; }
      const btn = cont.querySelector<HTMLButtonElement>(`button[data-filter="${selectedFilter}"]`);
      if (!btn) { if (mountedFlag) setFilterHighlight(null); return; }
  // prefer offset measurements (position relative to container) for stable alignment
  const left = Math.round((btn as HTMLElement).offsetLeft - 3);
  const top = Math.round((btn as HTMLElement).offsetTop - 4);
  const width = Math.round((btn as HTMLElement).offsetWidth + 6);
  const height = Math.round((btn as HTMLElement).offsetHeight + 8);
  if (mountedFlag) setFilterHighlight({ left, top, width, height });
      // also update the CSS height via style on the pill element by toggling a CSS custom property (we keep inline styles simple)
    };
    // measure on next frame to ensure layout has settled (useful when panel animates open)
    const raf = requestAnimationFrame(() => setTimeout(() => compute(), 20));
  const ro = new ResizeObserver(() => compute());
  if (filtersContainerRef.current) ro.observe(filtersContainerRef.current);
    window.addEventListener('resize', compute);
    return () => {
      mountedFlag = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, [selectedFilter, selectedCategory]);
  // animated dash offset for the selection stroke (marching ants)
  const dashOffsetRef = useRef<number>(0);
  const dashAnimRef = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);
  // default behavior: drag to create/move crop selection.
  const cropRatio = useRef<number | null>(null); // null = free

  useEffect(() => {
    // small mount animation trigger
    const t = window.setTimeout(() => setMounted(true), 20);
    const img = new Image();
    img.crossOrigin = "anonymous";
      img.onload = () => {
        imgRef.current = img;
        // schedule layout & draw on next frame so canvas sizing/resizes have applied
        requestAnimationFrame(() => {
          const info = computeImageLayout();
          if (info) {
            setOffset({ x: info.left, y: info.top });
            draw(info);
          } else {
            draw();
          }
        });
    };
    img.src = imageSrc;
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSrc]);

  function computeImageLayout() {
    const canvas = canvasRef.current; const img = imgRef.current;
    if (!canvas || !img) return null as any;
    // Use clientWidth/clientHeight (CSS pixels) rather than getBoundingClientRect which can be affected
    // by transforms (scale/translate) in the surrounding UI. Using client sizes gives a stable layout
    // for the canvas drawing coordinates.
    const cssW = canvas.clientWidth || Math.max(100, canvas.width / (window.devicePixelRatio || 1));
    const cssH = canvas.clientHeight || Math.max(100, canvas.height / (window.devicePixelRatio || 1));
    // Minimal padding so image fills most of the editor canvas
    const padRatio = 0.02; // just 2% padding for breathing room
    const availW = Math.max(1, cssW * (1 - padRatio * 2));
    const availH = Math.max(1, cssH * (1 - padRatio * 2));
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

  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current; const cont = containerRef.current;
      if (!c || !cont) return;
      const dpr = window.devicePixelRatio || 1;
      // use clientWidth/clientHeight to avoid transform/scale issues from parent modals
      const contW = Math.max(100, Math.round(cont.clientWidth));
      // Make the canvas use much more vertical space - aim for a larger editor
      // Use 70-80% of viewport height to give the image plenty of room
      const availableHeight = window.innerHeight - 200; // leave room for header + controls
      const targetHeight = Math.max(320, Math.min(availableHeight, 800));
      
      c.width = Math.max(100, Math.round(contW * dpr));
      c.height = Math.max(100, Math.round(targetHeight * dpr));
      c.style.width = `${contW}px`;
      c.style.height = `${targetHeight}px`;
      // recompute image layout after resize so image stays centered
        const info = computeImageLayout();
        if (info) {
          setOffset({ x: info.left, y: info.top });
          draw(info);
        } else {
          draw();
        }
    };
    // initial sizing + a couple of extra recomputes for animated modals / theme toggles
    resize();
    requestAnimationFrame(() => resize());
  const t = window.setTimeout(() => resize(), 120);
  const t2 = window.setTimeout(() => resize(), 340);

    // also listen to container size changes via ResizeObserver so opening animations or theme changes reflow correctly
    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(() => resize());
      if (containerRef.current) ro.observe(containerRef.current);
      if (canvasRef.current) ro.observe(canvasRef.current);
    } catch (e) {
      // ResizeObserver may not be available in some environments; fall back to window resize
      window.addEventListener("resize", resize);
    }

    return () => {
      window.clearTimeout(t);
      window.clearTimeout(t2);
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);

  function draw(info?: { rect: DOMRect; baseScale: number; dispW: number; dispH: number; left: number; top: number }, overrides?: Partial<{ exposure: number; contrast: number; saturation: number; temperature: number; vignette: number; selectedFilter: string; grain: number; softFocus: number; fade: number; matte: number; frameEnabled: boolean; frameThickness: number; frameColor: string }>) {
    const canvas = canvasRef.current; const img = imgRef.current;
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
  // temperature mapped to hue-rotate degrees (-30..30 deg)
  const curExposure = overrides?.exposure ?? exposureRef.current ?? exposure;
  const curContrast = overrides?.contrast ?? contrastRef.current ?? contrast;
  const curSaturation = overrides?.saturation ?? saturationRef.current ?? saturation;
  const curTemperature = overrides?.temperature ?? temperatureRef.current ?? temperature;
  const curVignette = overrides?.vignette ?? vignetteRef.current ?? vignette;
  const curSelectedFilter = overrides?.selectedFilter ?? selectedFilterRef.current ?? selectedFilter;
  const curFilterStrength = filterStrengthRef.current ?? filterStrength;
  const curGrain = overrides?.grain ?? grainRef.current ?? grain;
  const curSoftFocus = overrides?.softFocus ?? softFocusRef.current ?? softFocus;
  const curFade = overrides?.fade ?? fadeRef.current ?? fade;
  const curMatte = overrides?.matte ?? matteRef.current ?? matte;
  // frame is considered "on" when thickness > 0. Allow overrides to pass a thickness.
  const curFrameThickness = overrides?.frameThickness ?? frameThicknessRef.current ?? frameThickness;
  const curFrameEnabled = curFrameThickness > 0;
  const curFrameColor = overrides?.frameColor ?? frameColorRef.current ?? frameColor;
  const hue = Math.round((curTemperature / 100) * 30);
    // map selectedFilter to additional filter fragments
  const preset = FILTER_PRESETS[curSelectedFilter] || '';
  // base color adjustments (exposure/contrast/saturation) + hue
  const baseFilter = `brightness(${curExposure}) contrast(${curContrast}) saturate(${curSaturation}) hue-rotate(${hue}deg)`;
  const filter = `${baseFilter} ${preset}`;
  // If filter strength < 1, we'll composite a filtered layer on top with alpha
  let imgLeft = left; let imgTop = top; let imgW = dispW; let imgH = dispH;
  if (curFrameEnabled) {
    const pad = Math.max(1, Math.round(Math.min(dispW, dispH) * Math.max(0, Math.min(0.5, curFrameThickness))));
    imgLeft = left + pad;
    imgTop = top + pad;
    imgW = Math.max(1, dispW - pad * 2);
    imgH = Math.max(1, dispH - pad * 2);
  }
  if (curFilterStrength >= 0.999) {
    ctx.filter = filter;
    ctx.drawImage(img, imgLeft, imgTop, imgW, imgH);
    ctx.filter = 'none';
  } else if (curFilterStrength <= 0.001) {
    ctx.filter = baseFilter;
    ctx.drawImage(img, imgLeft, imgTop, imgW, imgH);
    ctx.filter = 'none';
  } else {
    // draw base with baseFilter, then composite filtered version on top with globalAlpha = strength
    ctx.filter = baseFilter;
    ctx.drawImage(img, imgLeft, imgTop, imgW, imgH);
    ctx.filter = filter;
    ctx.globalAlpha = Math.min(1, Math.max(0, curFilterStrength));
    ctx.drawImage(img, imgLeft, imgTop, imgW, imgH);
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
  }
  // Soft focus: draw a subtle blurred layer on top with low alpha
  if (curSoftFocus > 0.001) {
    try {
      ctx.save();
      // use an Offscreen canvas approach for blur if available
      const tmp = document.createElement('canvas'); tmp.width = Math.max(1, Math.round(imgW)); tmp.height = Math.max(1, Math.round(imgH));
      const tctx = tmp.getContext('2d')!;
      tctx.drawImage(img, imgLeft, imgTop, imgW, imgH, 0, 0, tmp.width, tmp.height);
      // apply CSS blur via filter on temporary context where supported
      tctx.filter = `blur(${Math.max(0.5, curSoftFocus * 6)}px)`;
      tctx.drawImage(tmp, 0, 0);
      ctx.globalAlpha = Math.min(0.65, curSoftFocus * 0.8);
      ctx.drawImage(tmp, imgLeft, imgTop, imgW, imgH);
      ctx.globalAlpha = 1;
      ctx.restore();
    } catch (e) {
      // fallback: very slight overlay with low alpha
      ctx.save(); ctx.globalAlpha = Math.min(0.4, curSoftFocus * 0.5); ctx.fillStyle = 'rgba(255,255,255,0.02)'; ctx.fillRect(imgLeft, imgTop, imgW, imgH); ctx.restore();
    }
  }
  // Fade: produce a visible faded look by compositing a lower-contrast, slightly brighter copy on top
  if (curFade > 0.001) {
    try {
      const tmpF = document.createElement('canvas'); tmpF.width = Math.max(1, Math.round(imgW)); tmpF.height = Math.max(1, Math.round(imgH));
      const fctx = tmpF.getContext('2d')!;
      // draw the source region to tmp
      fctx.drawImage(img, imgLeft, imgTop, imgW, imgH, 0, 0, tmpF.width, tmpF.height);
      // apply a reduced contrast and slight brightness to lift shadows
      const contrastFactor = 1 - Math.min(0.6, curFade * 0.6);
      const saturateFactor = 1 - Math.min(0.25, curFade * 0.25);
      const brightFactor = 1 + Math.min(0.06, curFade * 0.06);
      fctx.filter = `contrast(${contrastFactor}) saturate(${saturateFactor}) brightness(${brightFactor})`;
      // redraw onto itself to apply filter
      fctx.drawImage(tmpF, 0, 0);
      // composite the filtered layer softly on top to mix the effect
      ctx.save();
      ctx.globalAlpha = Math.min(0.85, curFade * 0.9);
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(tmpF, imgLeft, imgTop, imgW, imgH);
      ctx.restore();
    } catch (e) {
      // fallback: stronger white overlay
      ctx.save(); ctx.globalAlpha = Math.min(0.6, curFade * 0.6); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(imgLeft, imgTop, imgW, imgH); ctx.restore();
    }
  }
  // Matte: stronger matte look using a desaturated, flattened layer composited with soft-light for a filmic matte
  if (curMatte > 0.001) {
    try {
      const tmpM = document.createElement('canvas'); tmpM.width = Math.max(1, Math.round(imgW)); tmpM.height = Math.max(1, Math.round(imgH));
      const mctx = tmpM.getContext('2d')!;
      mctx.drawImage(img, imgLeft, imgTop, imgW, imgH, 0, 0, tmpM.width, tmpM.height);
      // desaturate and slightly reduce contrast to get matte base
      const sat = 1 - Math.min(0.45, curMatte * 0.45);
      const cont = 1 - Math.min(0.3, curMatte * 0.3);
      const bright = 1 + Math.min(0.02, curMatte * 0.02);
      mctx.filter = `saturate(${sat}) contrast(${cont}) brightness(${bright})`;
      mctx.drawImage(tmpM, 0, 0);
      // composite using soft-light (gives a matte film-like result)
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = Math.min(0.9, curMatte * 0.95);
      ctx.drawImage(tmpM, imgLeft, imgTop, imgW, imgH);
      ctx.restore();
    } catch (e) {
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = Math.min(0.45, curMatte * 0.45); ctx.fillStyle = 'rgba(25,25,25,0.04)'; ctx.fillRect(imgLeft, imgTop, imgW, imgH); ctx.restore();
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
      ctx.drawImage(noise, 0, 0, noiseW, noiseH, nImgLeft, nImgTop, nImgW, nImgH);
      ctx.restore();
    }

    // simple frame overlay (stroke around image)
    if (curFrameEnabled) {
      ctx.save();
      const pad = Math.max(1, Math.round(Math.min(dispW, dispH) * Math.max(0, Math.min(0.5, curFrameThickness))));
      ctx.fillStyle = curFrameColor === 'white' ? '#ffffff' : '#000000';
      // Align drawing to device pixels to avoid seams caused by fractional coordinates
      const outerXDev = Math.round(left * dpr);
      const outerYDev = Math.round(top * dpr);
      const outerWDev = Math.round(dispW * dpr);
      const outerHDev = Math.round(dispH * dpr);
      const innerXDev = Math.round(imgLeft * dpr);
      const innerYDev = Math.round(imgTop * dpr);
      const innerWDev = Math.round(imgW * dpr);
      const innerHDev = Math.round(imgH * dpr);
      // top band (device pixels) -> convert back to CSS pixels for canvas drawing
      const topH = Math.max(1, innerYDev - outerYDev);
      ctx.fillRect(outerXDev / dpr, outerYDev / dpr, outerWDev / dpr, topH / dpr);
      // bottom band
      const bottomYDev = innerYDev + innerHDev;
      const outerBottomDev = outerYDev + outerHDev;
      const bottomH = Math.max(1, outerBottomDev - bottomYDev);
      ctx.fillRect(outerXDev / dpr, bottomYDev / dpr, outerWDev / dpr, bottomH / dpr);
      // left band
      const leftW = Math.max(1, innerXDev - outerXDev);
      ctx.fillRect(outerXDev / dpr, innerYDev / dpr, leftW / dpr, innerHDev / dpr);
      // right band
      const rightXDev = innerXDev + innerWDev;
      const rightW = Math.max(1, outerXDev + outerWDev - rightXDev);
      ctx.fillRect(rightXDev / dpr, innerYDev / dpr, rightW / dpr, innerHDev / dpr);
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

  // animate dashed selection while a selection exists
  useEffect(() => {
    function step() {
      dashOffsetRef.current = (dashOffsetRef.current - 0.8) % 1000;
      // redraw only to update stroke offset (lightweight)
      draw();
      dashAnimRef.current = requestAnimationFrame(step);
    }
    if (sel) {
      if (dashAnimRef.current == null) dashAnimRef.current = requestAnimationFrame(step);
    } else {
      if (dashAnimRef.current != null) {
        cancelAnimationFrame(dashAnimRef.current);
        dashAnimRef.current = null;
        dashOffsetRef.current = 0;
        draw();
      }
    }
    return () => {
      if (dashAnimRef.current != null) cancelAnimationFrame(dashAnimRef.current);
      dashAnimRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);

  // quick derived flag: has the user made any edits (image replaced, selection or adjustments)
  const isEdited = useMemo(() => {
    if (imageSrc !== originalRef.current) return true;
    if (sel) return true;
    if (Math.abs(exposure - 1) > 0.001) return true;
    if (Math.abs(contrast - 1) > 0.001) return true;
    if (Math.abs(saturation - 1) > 0.001) return true;
    if (Math.abs(temperature) > 0.001) return true;
    if (Math.abs(vignette) > 0.001) return true;
    if (selectedFilter !== 'none') return true;
    if (Math.abs(grain) > 0.001) return true;
    if (frameThickness > 0) return true;
    return false;
  }, [imageSrc, sel, exposure, contrast, saturation, temperature, vignette, selectedFilter, grain, frameThickness]);

  // slider background helper: colored fill up to percentage
  function rangeBg(value: number, min: number, max: number, leftColor = '#1e90ff', rightColor = '#e6e6e6') {
    const pct = Math.round(((value - min) / (max - min)) * 100);
    return `linear-gradient(90deg, ${leftColor} ${pct}%, ${rightColor} ${pct}%)`;
  }

  function getPointerPos(e: PointerEvent | React.PointerEvent) {
    const canvas = canvasRef.current; if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: (e as any).clientX - rect.left, y: (e as any).clientY - rect.top };
  }

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const onPointerDown = (ev: PointerEvent) => {
      // stop propagation so AppShell swipe/mouse handlers don't react
      ev.stopPropagation?.();
      try { (ev.target as Element).setPointerCapture(ev.pointerId); } catch {}
      const p = getPointerPos(ev);
      // Check for resize handles first
      if (sel) {
        const handleSize = 8;
        const handles = [
          { x: sel.x - handleSize/2, y: sel.y - handleSize/2 },
          { x: sel.x + sel.w - handleSize/2, y: sel.y - handleSize/2 },
          { x: sel.x - handleSize/2, y: sel.y + sel.h - handleSize/2 },
          { x: sel.x + sel.w - handleSize/2, y: sel.y + sel.h - handleSize/2 },
          { x: sel.x + sel.w/2 - handleSize/2, y: sel.y - handleSize/2 },
          { x: sel.x + sel.w/2 - handleSize/2, y: sel.y + sel.h - handleSize/2 },
          { x: sel.x - handleSize/2, y: sel.y + sel.h/2 - handleSize/2 },
          { x: sel.x + sel.w - handleSize/2, y: sel.y + sel.h/2 - handleSize/2 },
        ];
        for (let i = 0; i < handles.length; i++) {
          const h = handles[i];
          if (p.x >= h.x && p.x <= h.x + handleSize && p.y >= h.y && p.y <= h.y + handleSize) {
            dragging.current = { startX: p.x, startY: p.y, mode: 'crop', action: 'resize', handleIndex: i, origSel: { ...sel } };
            return;
          }
        }
      }
      // If clicked inside selection, prepare to move; otherwise start drawing a new selection
      if (sel && p.x >= sel.x && p.x <= sel.x + sel.w && p.y >= sel.y && p.y <= sel.y + sel.h) {
        dragging.current = { startX: p.x, startY: p.y, mode: 'crop', action: 'move', origSel: { ...sel }, anchorX: p.x - sel.x, anchorY: p.y - sel.y };
      } else {
        dragging.current = { startX: p.x, startY: p.y, mode: 'crop', action: 'draw' };
        setSel({ x: p.x, y: p.y, w: 0, h: 0 });
      }
    };

    const onPointerMove = (ev: PointerEvent) => {
      // prevent parent handlers from interpreting this as a swipe/drag
      ev.stopPropagation?.();
      const p = getPointerPos(ev);
      if (!dragging.current) return;
      if (dragging.current.mode === 'pan') {
        setOffset({ x: p.x - dragging.current.startX, y: p.y - dragging.current.startY });
      } else if (dragging.current.mode === 'crop') {
        const info = computeImageLayout();
        if (!info) return;
        const { left, top, dispW, dispH } = info;
        // image displayed rect in canvas coords
        const imgRect = { x: left, y: top, w: dispW, h: dispH };

        if (dragging.current.action === 'move' && dragging.current.origSel) {
          // moving existing selection: compute new top-left constrained inside image rect
          const nx = p.x - (dragging.current.anchorX || 0);
          const ny = p.y - (dragging.current.anchorY || 0);
          // clamp
          const maxX = imgRect.x + imgRect.w - dragging.current.origSel.w;
          const maxY = imgRect.y + imgRect.h - dragging.current.origSel.h;
          const cx = Math.min(Math.max(nx, imgRect.x), Math.max(maxX, imgRect.x));
          const cy = Math.min(Math.max(ny, imgRect.y), Math.max(maxY, imgRect.y));
          setSel({ x: cx, y: cy, w: dragging.current.origSel.w, h: dragging.current.origSel.h });
        } else if (dragging.current.action === 'resize' && dragging.current.origSel && dragging.current.handleIndex !== undefined) {
          const handleIndex = dragging.current.handleIndex;
          const dx = p.x - dragging.current.startX;
          const dy = p.y - dragging.current.startY;
          let newSel = { ...dragging.current.origSel };
          if (handleIndex === 0) { // top-left
            newSel.x += dx;
            newSel.y += dy;
            newSel.w -= dx;
            newSel.h -= dy;
          } else if (handleIndex === 1) { // top-right
            newSel.y += dy;
            newSel.w += dx;
            newSel.h -= dy;
          } else if (handleIndex === 2) { // bottom-left
            newSel.x += dx;
            newSel.w -= dx;
            newSel.h += dy;
          } else if (handleIndex === 3) { // bottom-right
            newSel.w += dx;
            newSel.h += dy;
          } else if (handleIndex === 4) { // top
            newSel.y += dy;
            newSel.h -= dy;
          } else if (handleIndex === 5) { // bottom
            newSel.h += dy;
          } else if (handleIndex === 6) { // left
            newSel.x += dx;
            newSel.w -= dx;
          } else if (handleIndex === 7) { // right
            newSel.w += dx;
          }
          // Ensure w and h are positive
          if (newSel.w < 1) newSel.w = 1;
          if (newSel.h < 1) newSel.h = 1;
          // Maintain aspect ratio if set
          if (cropRatio.current) {
            const ratio = cropRatio.current;
            if (handleIndex < 4) { // corners
              const dw = Math.abs(newSel.w - dragging.current.origSel.w);
              const dh = Math.abs(newSel.h - dragging.current.origSel.h);
              if (dw > dh) {
                newSel.h = newSel.w / ratio;
              } else {
                newSel.w = newSel.h * ratio;
              }
            } else {
              // edges
              if (handleIndex === 4 || handleIndex === 5) { // top/bottom
                newSel.w = newSel.h * ratio;
              } else { // left/right
                newSel.h = newSel.w / ratio;
              }
            }
          }
          // Clamp to image rect
          newSel.x = Math.max(imgRect.x, Math.min(newSel.x, imgRect.x + imgRect.w - newSel.w));
          newSel.y = Math.max(imgRect.y, Math.min(newSel.y, imgRect.y + imgRect.h - newSel.h));
          newSel.w = Math.min(newSel.w, imgRect.x + imgRect.w - newSel.x);
          newSel.h = Math.min(newSel.h, imgRect.y + imgRect.h - newSel.y);
          setSel(newSel);
        } else {
          // drawing new selection
          const sx = dragging.current.startX; const sy = dragging.current.startY;
          let nx = Math.min(sx, p.x); let ny = Math.min(sy, p.y);
          let nw = Math.abs(p.x - sx); let nh = Math.abs(p.y - sy);
          if (cropRatio.current) {
            const fromW = Math.max(1, Math.abs(p.x - sx));
            const fromH = Math.max(1, Math.abs(p.y - sy));
            const hFromW = fromW / cropRatio.current;
            const wFromH = fromH * cropRatio.current;
            if (hFromW <= fromH) {
              nh = Math.round(hFromW);
              nw = fromW;
            } else {
              nw = Math.round(wFromH);
              nh = fromH;
            }
            if (p.x < sx) nx = sx - nw;
            if (p.y < sy) ny = sy - nh;
          }
          // clamp selection to image rect
          const selLeft = Math.max(nx, imgRect.x);
          const selTop = Math.max(ny, imgRect.y);
          const selRight = Math.min(nx + nw, imgRect.x + imgRect.w);
          const selBottom = Math.min(ny + nh, imgRect.y + imgRect.h);
          const finalW = Math.max(1, selRight - selLeft);
          const finalH = Math.max(1, selBottom - selTop);
          setSel({ x: selLeft, y: selTop, w: finalW, h: finalH });
        }
      }
      draw();
    };

    const onPointerUp = (ev: PointerEvent) => {
      // prevent parent handlers from interpreting this as a swipe/drag
      ev.stopPropagation?.();
      try { (ev.target as Element).releasePointerCapture(ev.pointerId); } catch {}
      dragging.current = null;
      draw();
    };
  canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  // no keyboard modifiers — panning is done by dragging outside/inside selection as before
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, sel]);

  // redraw whenever any adjustment state changes to avoid stale-draw races
  useEffect(() => {
    // small RAF to batch with potential layout changes
    requestAnimationFrame(() => draw());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exposure, contrast, saturation, temperature, vignette, selectedFilter, grain, softFocus, fade, matte, sel, offset]);

  async function bakeRotate90() {
    const img = imgRef.current; if (!img) return;
    const tmp = document.createElement('canvas');
    tmp.width = img.naturalHeight; tmp.height = img.naturalWidth;
    const t = tmp.getContext('2d')!;
    t.translate(tmp.width / 2, tmp.height / 2);
    t.rotate(Math.PI / 2);
    t.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    const dataUrl = tmp.toDataURL('image/png');
    setImageSrc(dataUrl);
    setSel(null);
    setOffset({ x: 0, y: 0 });
  }

  async function bakeRotateMinus90() {
    const img = imgRef.current; if (!img) return;
    const tmp = document.createElement('canvas');
    tmp.width = img.naturalHeight; tmp.height = img.naturalWidth;
    const t = tmp.getContext('2d')!;
    t.translate(tmp.width / 2, tmp.height / 2);
    t.rotate(-Math.PI / 2);
    t.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    const dataUrl = tmp.toDataURL('image/png');
    setImageSrc(dataUrl);
    setSel(null);
    setOffset({ x: 0, y: 0 });
  }

  function resetAll() {
    setImageSrc(originalRef.current);
    setSel(null); setOffset({ x: 0, y: 0 });
  }

  async function applyEdit() {
    const img = imgRef.current; if (!img) return;
  const canvas = canvasRef.current;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const baseScale = Math.min(rect.width / img.naturalWidth, rect.height / img.naturalHeight);
  const scaleFactor = baseScale;

    let srcX = 0, srcY = 0, srcW = img.naturalWidth, srcH = img.naturalHeight;
    if (sel) {
      srcX = Math.max(0, Math.round((sel.x - offset.x) / scaleFactor));
      srcY = Math.max(0, Math.round((sel.y - offset.y) / scaleFactor));
      srcW = Math.max(1, Math.round(sel.w / scaleFactor));
      srcH = Math.max(1, Math.round(sel.h / scaleFactor));
      srcW = Math.min(srcW, img.naturalWidth - srcX);
      srcH = Math.min(srcH, img.naturalHeight - srcY);
    }

  // If frame thickness > 0 we expand the output canvas so the frame sits outside the image
  const padPx = frameThickness > 0 ? Math.max(1, Math.round(Math.min(srcW, srcH) * Math.max(0, Math.min(0.5, frameThickness)))) : 0;
  const out = document.createElement('canvas');
  out.width = srcW + padPx * 2; out.height = srcH + padPx * 2;
  const octx = out.getContext('2d')!;
  octx.imageSmoothingQuality = 'high';
  // Apply color adjustments to exported image
  const hue = Math.round((temperature / 100) * 30);
  const filterMap: Record<string, string> = {
    none: '',
    sepia: 'sepia(0.45)',
    mono: 'grayscale(0.95)',
    cinema: 'contrast(1.15) saturate(1.05) hue-rotate(-5deg)',
    bleach: 'saturate(1.3) contrast(0.95) brightness(1.02)'
  };
  const preset = FILTER_PRESETS[selectedFilter] || '';
  const baseFilterExport = `brightness(${exposure}) contrast(${contrast}) saturate(${saturation}) hue-rotate(${hue}deg)`;
  if (filterStrength >= 0.999) {
    octx.filter = `${baseFilterExport} ${preset}`;
    octx.drawImage(img, srcX, srcY, srcW, srcH, padPx, padPx, srcW, srcH);
    octx.filter = 'none';
  } else if (filterStrength <= 0.001) {
    octx.filter = baseFilterExport;
    octx.drawImage(img, srcX, srcY, srcW, srcH, padPx, padPx, srcW, srcH);
    octx.filter = 'none';
  } else {
    // draw base then composite filtered with alpha
    octx.filter = baseFilterExport;
    octx.drawImage(img, srcX, srcY, srcW, srcH, padPx, padPx, srcW, srcH);
    octx.filter = `${baseFilterExport} ${preset}`;
    octx.globalAlpha = Math.min(1, Math.max(0, filterStrength));
    octx.drawImage(img, srcX, srcY, srcW, srcH, padPx, padPx, srcW, srcH);
    octx.globalAlpha = 1;
    octx.filter = 'none';
  }
  // image content has been drawn above with filters applied where appropriate;
  // ensure filter state is cleared before applying additional effects
  octx.filter = 'none';
  // --- Bake additional visual effects (Soft Focus / Fade / Matte) into export ---
  const curSoft = Math.min(1, Math.max(0, softFocus));
  const curFade = Math.min(1, Math.max(0, fade));
  const curMatte = Math.min(1, Math.max(0, matte));
  // Soft Focus: blurred overlay composited on top
  if (curSoft > 0.001) {
    try {
      const tmp = document.createElement('canvas'); tmp.width = srcW; tmp.height = srcH;
      const t = tmp.getContext('2d')!;
      t.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
      // tuned blur radius: softer to stronger (0..8px)
      const blurPx = Math.max(0.6, curSoft * 8);
      t.filter = `blur(${blurPx}px)`;
      t.drawImage(tmp, 0, 0);
      octx.save();
      octx.globalAlpha = Math.min(0.8, curSoft * 0.85);
      octx.drawImage(tmp, padPx, padPx, srcW, srcH);
      octx.restore();
    } catch (e) {
      // fallback subtle overlay
      octx.save(); octx.globalAlpha = Math.min(0.4, curSoft * 0.5); octx.fillStyle = 'rgba(255,255,255,0.02)'; octx.fillRect(padPx, padPx, srcW, srcH); octx.restore();
    }
  }
  // Fade: stronger faded look baked by compositing a lower-contrast, slightly brighter version
  if (curFade > 0.001) {
    try {
      const tmpF = document.createElement('canvas'); tmpF.width = srcW; tmpF.height = srcH;
      const fctx = tmpF.getContext('2d')!;
      fctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
      const contrastFactor = 1 - Math.min(0.7, curFade * 0.7);
      const saturateFactor = 1 - Math.min(0.35, curFade * 0.35);
      const brightFactor = 1 + Math.min(0.08, curFade * 0.08);
      fctx.filter = `contrast(${contrastFactor}) saturate(${saturateFactor}) brightness(${brightFactor})`;
      fctx.drawImage(tmpF, 0, 0);
      octx.save();
      octx.globalAlpha = Math.min(0.95, curFade * 0.95);
      octx.globalCompositeOperation = 'source-over';
      octx.drawImage(tmpF, padPx, padPx, srcW, srcH);
      octx.restore();
    } catch (e) {
      octx.save(); octx.globalAlpha = Math.min(0.7, curFade * 0.7); octx.fillStyle = 'rgba(255,255,255,0.08)'; octx.fillRect(padPx, padPx, srcW, srcH); octx.restore();
    }
  }
  // Matte: desaturate and flatten blacks, composite with soft-light/multiply for filmic look
  if (curMatte > 0.001) {
    try {
      const tmpM = document.createElement('canvas'); tmpM.width = srcW; tmpM.height = srcH;
      const mctx = tmpM.getContext('2d')!;
      mctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
      const sat = 1 - Math.min(0.6, curMatte * 0.6);
      const cont = 1 - Math.min(0.45, curMatte * 0.45);
      const bright = 1 + Math.min(0.03, curMatte * 0.03);
      mctx.filter = `saturate(${sat}) contrast(${cont}) brightness(${bright})`;
      mctx.drawImage(tmpM, 0, 0);
      octx.save();
      // prefer soft-light for filmic matte; fallback to multiply
      octx.globalCompositeOperation = 'soft-light';
      octx.globalAlpha = Math.min(0.95, curMatte * 0.9);
      octx.drawImage(tmpM, padPx, padPx, srcW, srcH);
      octx.restore();
    } catch (e) {
      octx.save(); octx.globalCompositeOperation = 'multiply'; octx.globalAlpha = Math.min(0.6, curMatte * 0.6); octx.fillStyle = 'rgba(20,20,20,0.05)'; octx.fillRect(padPx, padPx, srcW, srcH); octx.restore();
    }
  }
  // apply grain to exported image by compositing a noise canvas
  if (grain > 0) {
    const noise = generateNoiseCanvas(srcW, srcH, grain);
    octx.save();
    octx.globalAlpha = Math.min(0.85, grain);
    octx.globalCompositeOperation = 'overlay';
    octx.drawImage(noise, 0, 0, srcW, srcH);
    octx.restore();
  }
  // draw frame if thickness > 0
  if (frameThickness > 0) {
    octx.save();
    const thicknessPx = Math.max(1, Math.round(Math.min(srcW, srcH) * Math.max(0, Math.min(0.5, frameThickness))));
    octx.fillStyle = frameColor === 'white' ? '#ffffff' : '#000000';
    // integer coords to avoid seams
    const outerX = 0;
    const outerY = 0;
    const outerW = srcW + padPx * 2;
    const outerH = srcH + padPx * 2;
    const innerX = padPx;
    const innerY = padPx;
    const innerW = srcW;
    const innerH = srcH;
    // top band
    octx.fillRect(outerX, outerY, outerW, Math.max(1, innerY - outerY));
    // bottom band
    const bottomY = innerY + innerH;
    octx.fillRect(outerX, bottomY, outerW, Math.max(1, outerY + outerH - bottomY));
    // left band
    octx.fillRect(outerX, innerY, Math.max(1, innerX - outerX), innerH);
    // right band
    const rightX = innerX + innerW;
    octx.fillRect(rightX, innerY, Math.max(1, outerX + outerW - rightX), innerH);
    octx.restore();
  }
  const dataUrl = out.toDataURL('image/jpeg', 0.92);
    onApply(dataUrl);
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={(e) => {
        const k = (e as any).key;
        if (k === 'Enter') { applyEdit(); }
        if (k === 'Escape') { onCancel(); }
      }}
      className="image-editor"
      style={{
        width: '100%',
        maxWidth: 'min(92vw, 820px)',
        margin: '0 auto',
        background: 'var(--bg-elev)',
        color: 'var(--text)',
        padding: 12,
        paddingBottom: 'calc(96px + var(--safe-bottom))',
        borderRadius: 8,
        overflow: 'visible',
        // subtle mount animation
        transform: mounted ? 'translateY(0) scale(1)' : 'translateY(6px) scale(0.995)',
        opacity: mounted ? 1 : 0,
        transition: 'opacity 220ms ease, transform 260ms cubic-bezier(.2,.9,.2,1)'
      }}
      
    >
      {/* scoped styles for sliders and subtle animations */}
      <style>{`
        .imgedit-range { -webkit-appearance: none; appearance: none; height: 8px; border-radius: 999px; outline: none; transition: box-shadow .18s ease; }
        .imgedit-range:active { box-shadow: 0 6px 18px rgba(0,0,0,0.14); }
        .imgedit-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 18px; height: 18px; border-radius: 50%; background: white; border: 3px solid var(--primary); box-shadow: 0 4px 12px rgba(0,0,0,0.18); transition: transform .12s ease; }
        .imgedit-range::-webkit-slider-thumb:active { transform: scale(0.96); }
        .imgedit-range::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: white; border: 3px solid var(--primary); }
        /* custom focus ring */
        .imgedit-range:focus { box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 12%, transparent); }
        /* panels responsiveness: allow panels to grow and scroll on small viewports */
        .imgedit-panels { position: relative; max-height: calc(100vh - 180px); overflow: hidden; border-radius: 8px; }
        .imgedit-panels > div { height: 100%; }
        .imgedit-panel-inner { box-sizing: border-box; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 10px; gap: 8px; display: grid; }
        @media (min-width: 720px) { .imgedit-panels { max-height: 220px; } }
        @media (max-width: 720px) { .imgedit-panels { max-height: calc(100vh - 140px); } }
      `}</style>
      {/* slider color variables (theme-aware) */}
      <style>{`
        .image-editor {
          /* defaults; app theme can override these CSS variables */
          --slider-exposure-start: #fff6db;
          --slider-exposure-end: #ffd166;
          --slider-contrast-start: #fff3e6;
          --slider-contrast-end: #ff9f43;
          --slider-saturation-start: #ffe9e9;
          --slider-saturation-end: #ff6b6b;
          --slider-temperature-cold: #66d1ff;
          --slider-temperature-warm: #ffb86b;
        }
        /* visually-hidden helper for screen readers */
        .sr-only { position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 12, flexWrap: 'wrap' }}>
      <button type="button" className="btn ghost" onClick={onCancel} aria-label="back" style={{ color: 'var(--text)', background: 'transparent', border: 'none', fontSize: 18, padding: 8, transformOrigin: 'center', transition: 'transform 120ms ease' }} onMouseDown={(e)=> (e.currentTarget.style.transform = 'scale(0.96)')} onMouseUp={(e)=> (e.currentTarget.style.transform = '')} onMouseLeave={(e)=> (e.currentTarget.style.transform = '')}>◀</button>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Edit</div>
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" title="Rotate -90°" onClick={bakeRotateMinus90} style={{ padding: '8px 10px', borderRadius: 8, background: 'transparent', border: 'none', transition: 'transform 140ms ease' }} onMouseDown={(e)=> (e.currentTarget.style.transform = 'scale(0.96)')} onMouseUp={(e)=> (e.currentTarget.style.transform = '')} onMouseLeave={(e)=> (e.currentTarget.style.transform = '')}>⤺</button>
          <button type="button" title="Rotate +90°" onClick={bakeRotate90} style={{ padding: '8px 10px', borderRadius: 8, background: 'transparent', border: 'none', transition: 'transform 140ms ease' }} onMouseDown={(e)=> (e.currentTarget.style.transform = 'scale(0.96)')} onMouseUp={(e)=> (e.currentTarget.style.transform = '')} onMouseLeave={(e)=> (e.currentTarget.style.transform = '')}>⤾</button>
          <button type="button" className="btn ghost" onClick={onCancel} style={{ padding: '8px 12px', borderRadius: 8, transition: 'transform 120ms ease' }} onMouseDown={(e)=> (e.currentTarget.style.transform = 'scale(0.98)')} onMouseUp={(e)=> (e.currentTarget.style.transform = '')} onMouseLeave={(e)=> (e.currentTarget.style.transform = '')}>Cancel</button>
          <button type="button" className="btn primary" onClick={applyEdit} style={{ padding: '8px 14px', borderRadius: 8, background: 'var(--primary)', color: '#fff', fontWeight: 600, boxShadow: isEdited ? '0 8px 28px rgba(0,125,255,0.12)' : 'none', transition: 'transform 120ms ease, box-shadow 220ms ease, opacity 180ms ease' }} onMouseDown={(e)=> (e.currentTarget.style.transform = 'scale(0.98)')} onMouseUp={(e)=> (e.currentTarget.style.transform = '')} onMouseLeave={(e)=> (e.currentTarget.style.transform = '')} aria-pressed={isEdited}>
            Confirm
          </button>
        </div>
      </div>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', touchAction: 'none', display: 'block', transition: 'box-shadow 240ms ease', minHeight: 140 }}
        />

        {/* header rotate buttons now handle rotate; removed tiny top-right rotate button to improve discoverability */}
        {/* floating confirm removed — use the top Confirm button in the header */}
      </div>

  {/* help text removed per user request */}

      {/* Controls header with categories (emojis + slide panels) */}
  <div ref={categoriesContainerRef} style={{ position: 'relative', display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center', flexWrap: 'nowrap', overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: 820, margin: '12px auto 0', padding: '6px 8px', alignItems: 'center', whiteSpace: 'nowrap' }}>
    <div aria-hidden style={{ position: 'absolute', left: categoryHighlight?.left ?? 0, top: categoryHighlight?.top ?? 0, width: categoryHighlight?.width ?? 0, height: categoryHighlight?.height ?? 0, borderRadius: 10, background: 'color-mix(in srgb, var(--primary) 18%, transparent)', transition: 'left 220ms cubic-bezier(.2,.9,.2,1), width 220ms cubic-bezier(.2,.9,.2,1), top 220ms cubic-bezier(.2,.9,.2,1), height 220ms cubic-bezier(.2,.9,.2,1), opacity 180ms ease', pointerEvents: 'none', opacity: categoryHighlight ? 1 : 0, zIndex: 0 }} />
  <button
    data-cat="basic"
    type="button"
    aria-label="Basic"
    title="Basic"
    onClick={(e: any) => { try { e.currentTarget.animate([{ transform: 'scale(0.96)' }, { transform: 'scale(1)' }], { duration: 220, easing: 'cubic-bezier(.2,.9,.2,1)' }); } catch {} setSelectedCategory('basic'); }}
    style={{ padding: '6px 8px', borderRadius: 8, background: selectedCategory === 'basic' ? 'var(--primary)' : 'var(--bg-elev)', color: selectedCategory === 'basic' ? '#fff' : 'var(--text)', transition: 'transform 140ms ease, box-shadow 220ms ease', position: 'relative', zIndex: 1, flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}
  >
    <span aria-hidden style={{ lineHeight: 1 }}>{'🎛️'}</span>
    <span style={{ display: selectedCategory === 'basic' ? 'inline' : 'none', fontSize: 13, fontWeight: 600 }}>Basic</span>
  </button>

  <button
    data-cat="color"
    type="button"
    aria-label="Filters"
    title="Filters"
    onClick={(e: any) => { try { e.currentTarget.animate([{ transform: 'scale(0.96)' }, { transform: 'scale(1)' }], { duration: 220, easing: 'cubic-bezier(.2,.9,.2,1)' }); } catch {} setSelectedCategory('color'); }}
    style={{ padding: '6px 8px', borderRadius: 8, background: selectedCategory === 'color' ? 'var(--primary)' : 'var(--bg-elev)', color: selectedCategory === 'color' ? '#fff' : 'var(--text)', transition: 'transform 140ms ease, box-shadow 220ms ease', position: 'relative', zIndex: 1, flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}
  >
    <span aria-hidden style={{ lineHeight: 1 }}>{'🎨'}</span>
    <span style={{ display: selectedCategory === 'color' ? 'inline' : 'none', fontSize: 13, fontWeight: 600 }}>Filters</span>
  </button>

  <button
    data-cat="effects"
    type="button"
    aria-label="Effects"
    title="Effects"
    onClick={(e: any) => { try { e.currentTarget.animate([{ transform: 'scale(0.96)' }, { transform: 'scale(1)' }], { duration: 220, easing: 'cubic-bezier(.2,.9,.2,1)' }); } catch {} setSelectedCategory('effects'); }}
    style={{ padding: '6px 8px', borderRadius: 8, background: selectedCategory === 'effects' ? 'var(--primary)' : 'var(--bg-elev)', color: selectedCategory === 'effects' ? '#fff' : 'var(--text)', transition: 'transform 140ms ease, box-shadow 220ms ease', position: 'relative', zIndex: 1, flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}
  >
    <span aria-hidden style={{ lineHeight: 1 }}>{'✨'}</span>
    <span style={{ display: selectedCategory === 'effects' ? 'inline' : 'none', fontSize: 13, fontWeight: 600 }}>Effects</span>
  </button>

  <button
    data-cat="crop"
    type="button"
    aria-label="Crop & Frames"
    title="Crop & Frames"
    onClick={(e: any) => { try { e.currentTarget.animate([{ transform: 'scale(0.96)' }, { transform: 'scale(1)' }], { duration: 220, easing: 'cubic-bezier(.2,.9,.2,1)' }); } catch {} setSelectedCategory('crop'); }}
    style={{ padding: '6px 8px', borderRadius: 8, background: selectedCategory === 'crop' ? 'var(--primary)' : 'var(--bg-elev)', color: selectedCategory === 'crop' ? '#fff' : 'var(--text)', transition: 'transform 120ms ease, box-shadow 220ms ease', position: 'relative', zIndex: 1, flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}
  >
    <span aria-hidden style={{ lineHeight: 1 }}>{'✂️'}</span>
    <span style={{ display: selectedCategory === 'crop' ? 'inline' : 'none', fontSize: 13, fontWeight: 600 }}>Crop & Frames</span>
  </button>
  </div>

      {/* Sliding category panels container */}
  <div className="imgedit-panels" style={{ maxWidth: 820, margin: '12px auto 0', position: 'relative', borderRadius: 8, minHeight: 180 }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          {/* Basic panel */}
          <div className="imgedit-panel-inner" style={{ display: selectedCategory === 'basic' ? 'grid' : 'none', width: '100%' }}>
            <label style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ width: 110, display: 'flex', gap: 8, alignItems: 'center' }}>
                <span aria-hidden>☀️</span>
                <span>Exposure</span>
              </span>
              {/* animated icon that changes color with exposure */}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <circle cx="12" cy="12" r="7" style={{ fill: exposureColor(exposure) }} />
                </svg>
                <input className="imgedit-range" type="range" min={0.5} max={1.8} step={0.01} value={exposure} onInput={(e: any) => { const v = Number(e.target.value); announceDirection('exposure', exposureRef.current, v); exposureRef.current = v; setExposure(v); draw(undefined, { exposure: v }); requestAnimationFrame(() => draw()); }} style={{ flex: 1, background: rangeBg(exposure, 0.5, 1.8, 'var(--slider-exposure-start)', 'var(--slider-exposure-end)') }} />
              </span>
              <span style={{ width: 48, textAlign: 'right' }}>{exposure.toFixed(2)}</span>
            </label>
            <label style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ width: 110, display: 'flex', gap: 6, alignItems: 'center' }}>⚖️ <span>Contrast</span></span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <rect x="4" y="4" width="16" height="16" rx="3" style={{ fill: contrastColor(contrast) }} />
                </svg>
                <input className="imgedit-range" type="range" min={0.5} max={1.8} step={0.01} value={contrast} onInput={(e: any) => { const v = Number(e.target.value); announceDirection('contrast', contrastRef.current, v); contrastRef.current = v; setContrast(v); draw(undefined, { contrast: v }); requestAnimationFrame(() => draw()); }} style={{ flex: 1, background: rangeBg(contrast, 0.5, 1.8, 'var(--slider-contrast-start)', 'var(--slider-contrast-end)') }} />
              </span>
              <span style={{ width: 48, textAlign: 'right' }}>{contrast.toFixed(2)}</span>
            </label>
            <label style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ width: 110, display: 'flex', gap: 6, alignItems: 'center' }}>🌈 <span>Saturation</span></span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M12 3c1.1 0 2 .9 2 2v14a2 2 0 1 1-4 0V5c0-1.1.9-2 2-2z" style={{ fill: saturationColor(saturation) }} />
                </svg>
                <input className="imgedit-range" type="range" min={0} max={2} step={0.01} value={saturation} onInput={(e: any) => { const v = Number(e.target.value); announceDirection('saturation', saturationRef.current, v); saturationRef.current = v; setSaturation(v); draw(undefined, { saturation: v }); requestAnimationFrame(() => draw()); }} style={{ flex: 1, background: rangeBg(saturation, 0, 2, 'var(--slider-saturation-start)', 'var(--slider-saturation-end)') }} />
              </span>
              <span style={{ width: 48, textAlign: 'right' }}>{saturation.toFixed(2)}</span>
            </label>
            <label style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ width: 110, display: 'flex', gap: 6, alignItems: 'center' }}><span aria-hidden>🌡️</span><span>Temperature</span></span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <rect x="9" y="3" width="6" height="12" rx="3" style={{ fill: temperatureColor(temperature) }} />
                </svg>
                <input className="imgedit-range" type="range" min={-100} max={100} step={1} value={temperature} onInput={(e: any) => { const v = Number(e.target.value); announceDirection('temperature', temperatureRef.current, v); temperatureRef.current = v; setTemperature(v); draw(undefined, { temperature: v }); requestAnimationFrame(() => draw()); }} style={{ flex: 1, background: rangeBg(temperature, -100, 100, 'var(--slider-temperature-cold)', 'var(--slider-temperature-warm)') }} />
              </span>
              <span style={{ width: 48, textAlign: 'right' }}>{temperature}</span>
            </label>
          </div>

          {/* Color panel */}
          <div className="imgedit-panel-inner" style={{ display: selectedCategory === 'color' ? 'grid' : 'none', width: '100%' }}>
            {/* panel heading removed (tab already shows Filters) */}
            <div ref={filtersContainerRef} style={{ position: 'relative', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', padding: '6px 0' }}>
              {/* animated highlight pill sits behind buttons and moves between them */}
              <div aria-hidden style={{ position: 'absolute', left: filterHighlight?.left ?? 0, top: filterHighlight?.top ?? 0, width: filterHighlight?.width ?? 0, height: filterHighlight?.height ?? 0, borderRadius: 10, background: 'color-mix(in srgb, var(--primary) 14%, transparent)', transition: 'left 220ms cubic-bezier(.2,.9,.2,1), width 220ms cubic-bezier(.2,.9,.2,1), top 220ms cubic-bezier(.2,.9,.2,1), height 220ms cubic-bezier(.2,.9,.2,1), opacity 180ms ease', pointerEvents: 'none', opacity: filterHighlight ? 1 : 0 }} />
              {Object.keys(FILTER_PRESETS).map(f => {
                const emoji = f === 'none' ? '🔁' : f === 'sepia' ? '🟤' : f === 'mono' ? '⚪' : f === 'cinema' ? '🎥' : f === 'bleach' ? '🧼' : f === 'vintage' ? '🪶' : f === 'lomo' ? '📷' : f === 'warm' ? '🔆' : f === 'cool' ? '❄️' : '🎞️';
                return (
                  <button
                    key={f}
                    data-filter={f}
                    type="button"
                    onMouseDown={() => { selectedFilterRef.current = f; setSelectedFilter(f); draw(undefined, { selectedFilter: f }); requestAnimationFrame(() => draw()); }}
                    style={{ padding: '6px 10px', borderRadius: 8, background: selectedFilter === f ? 'var(--primary)' : 'var(--bg-elev)', color: selectedFilter === f ? '#fff' : 'var(--text)', transition: 'transform 120ms ease, box-shadow 200ms ease', display: 'inline-flex', gap: 8, alignItems: 'center', position: 'relative', zIndex: 1 }}
                    onMouseDownCapture={(e)=> (e.currentTarget.style.transform = 'scale(0.98)')}
                    onMouseUpCapture={(e)=> (e.currentTarget.style.transform = '')}
                    onMouseLeave={(e)=> (e.currentTarget.style.transform = '')}
                    onFocus={(e)=> (e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)')}
                    onBlur={(e)=> (e.currentTarget.style.boxShadow = '')}
                    aria-pressed={selectedFilter===f}
                  >
                    <span aria-hidden>{emoji}</span>
                    <span style={{ fontSize: 13 }}>{f}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <span style={{ width: 110, color: 'var(--text-muted)' }}>Strength</span>
              <input className="imgedit-range" type="range" min={0} max={1} step={0.01} value={filterStrength} onInput={(e: any) => { const v = Number(e.target.value); filterStrengthRef.current = v; setFilterStrength(v); draw(); requestAnimationFrame(() => draw()); }} style={{ flex: 1, background: rangeBg(filterStrength, 0, 1, '#2d9cff', 'rgba(255,255,255,0.06)') }} />
              <span style={{ width: 48, textAlign: 'right' }}>{Math.round(filterStrength * 100)}%</span>
            </div>
          </div>

          {/* Effects panel */}
          <div className="imgedit-panel-inner" style={{ display: selectedCategory === 'effects' ? 'grid' : 'none', width: '100%' }}>
            <label style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ width: 110, display: 'flex', gap: 6, alignItems: 'center' }}>🕶️ <span>Vignette</span></span>
              <input className="imgedit-range" type="range" min={0} max={1} step={0.01} value={vignette} onInput={(e: any) => { const v = Number(e.target.value); vignetteRef.current = v; setVignette(v); draw(undefined, { vignette: v }); requestAnimationFrame(() => draw()); }} style={{ flex: 1, background: rangeBg(vignette, 0, 1, '#2d9cff', 'rgba(255,255,255,0.06)') }} />
              <span style={{ width: 48, textAlign: 'right' }}>{vignette.toFixed(2)}</span>
            </label>
            <label style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ width: 110, display: 'flex', gap: 6, alignItems: 'center' }}>🎚️ <span>Grain</span></span>
              <input className="imgedit-range" type="range" min={0} max={1} step={0.01} value={grain} onInput={(e: any) => { const v = Number(e.target.value); grainRef.current = v; setGrain(v); draw(undefined, { grain: v }); requestAnimationFrame(() => draw()); }} style={{ flex: 1, background: rangeBg(grain, 0, 1, '#2d9cff', 'rgba(255,255,255,0.06)') }} />
              <span style={{ width: 48, textAlign: 'right' }}>{grain.toFixed(2)}</span>
            </label>

            <label style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ width: 110, display: 'flex', gap: 6, alignItems: 'center' }}>💤 <span>Soft Focus</span></span>
              <input className="imgedit-range" type="range" min={0} max={1} step={0.01} value={softFocus} onInput={(e: any) => { const v = Number(e.target.value); softFocusRef.current = v; setSoftFocus(v); draw(undefined, {  }); requestAnimationFrame(() => draw()); }} style={{ flex: 1, background: rangeBg(softFocus, 0, 1, '#2d9cff', 'rgba(255,255,255,0.06)') }} />
              <span style={{ width: 48, textAlign: 'right' }}>{softFocus.toFixed(2)}</span>
            </label>

            <label style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ width: 110, display: 'flex', gap: 6, alignItems: 'center' }}>🎞️ <span>Fade</span></span>
              <input className="imgedit-range" type="range" min={0} max={1} step={0.01} value={fade} onInput={(e: any) => { const v = Number(e.target.value); fadeRef.current = v; setFade(v); draw(undefined, {  }); requestAnimationFrame(() => draw()); }} style={{ flex: 1, background: rangeBg(fade, 0, 1, '#2d9cff', 'rgba(255,255,255,0.06)') }} />
              <span style={{ width: 48, textAlign: 'right' }}>{fade.toFixed(2)}</span>
            </label>

            <label style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ width: 110, display: 'flex', gap: 6, alignItems: 'center' }}>🪞 <span>Matte</span></span>
              <input className="imgedit-range" type="range" min={0} max={1} step={0.01} value={matte} onInput={(e: any) => { const v = Number(e.target.value); matteRef.current = v; setMatte(v); draw(undefined, {  }); requestAnimationFrame(() => draw()); }} style={{ flex: 1, background: rangeBg(matte, 0, 1, '#2d9cff', 'rgba(255,255,255,0.06)') }} />
              <span style={{ width: 48, textAlign: 'right' }}>{matte.toFixed(2)}</span>
            </label>
          </div>

          {/* Crop panel */}
          <div className="imgedit-panel-inner" style={{ display: selectedCategory === 'crop' ? 'grid' : 'none', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Crop</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn ghost" type="button" onClick={() => { setSel(null); cropRatio.current = null; }} style={{ padding: '6px 8px', fontSize: 13 }}>Reset</button>
                <button className="btn" type="button" onClick={() => { cropRatio.current = null; setSel(null); }} aria-pressed={cropRatio.current === null} style={{ padding: '6px 8px', fontSize: 13 }}>Free</button>
              </div>
            </div>

            <div style={{ marginTop: 6 }}>
              {/* compact inline frame controls placed first so they remain visible */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 0 }}>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-start' }}>
                  <button type="button" className={frameColor === 'white' ? 'btn primary' : 'btn ghost'} onClick={() => { frameColorRef.current = 'white'; setFrameColor('white'); draw(); }} style={{ padding: '6px 8px', fontSize: 13, opacity: frameThickness > 0 ? 1 : 0.45, pointerEvents: frameThickness > 0 ? 'auto' : 'none' }}>White</button>
                  <button type="button" className={frameColor === 'black' ? 'btn primary' : 'btn ghost'} onClick={() => { frameColorRef.current = 'black'; setFrameColor('black'); draw(); }} style={{ padding: '6px 8px', fontSize: 13, opacity: frameThickness > 0 ? 1 : 0.45, pointerEvents: frameThickness > 0 ? 'auto' : 'none' }}>Black</button>
                </div>
                <label style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ width: 110, display: 'flex', gap: 6, alignItems: 'center' }}>🖼️ <span>Thickness</span></span>
                  <input className="imgedit-range" type="range" min={0} max={0.2} step={0.005} value={frameThickness} onInput={(e:any) => { const v = Number(e.target.value); frameThicknessRef.current = v; setFrameThickness(v); draw(); }} style={{ flex: 1, background: rangeBg(frameThickness, 0, 0.2, '#2d9cff', 'rgba(255,255,255,0.06)') }} />
                  <span style={{ width: 48, textAlign: 'right' }}>{Math.round(frameThickness * 100)}%</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Aspect presets</div>
              </div>

              {/* Carousel-style aspect switcher */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 4 }}>
                <button type="button" aria-label="Previous preset" onClick={() => setPresetIndex((presetIndex - 1 + ASPECT_PRESETS.length) % ASPECT_PRESETS.length)} style={{ padding: 6, borderRadius: 8, border: 'none', background: 'transparent' }}>◀</button>
                <div style={{ overflow: 'hidden', width: 240, borderRadius: 10 }}>
                  <div style={{ display: 'flex', gap: 8, transition: 'transform 300ms cubic-bezier(.2,.9,.2,1)', transform: `translateX(-${presetIndex * 92}px)` }}>
                    {ASPECT_PRESETS.map((r, i) => {
                      const selected = cropRatio.current === r.v;
                      const base = 16 / 9;
                      const previewRatio = r.v ? Math.min(1.2, r.v / base) : 0.7;
                      const previewInnerWidth = Math.round(36 * previewRatio);
                      return (
                        <div key={r.label} style={{ flex: '0 0 84px' }}>
                          <button type="button" onClick={() => {
                            setPresetIndex(i);
                            cropRatio.current = r.v;
                            const canvas = canvasRef.current;
                            if (!canvas) return;
                            const info = computeImageLayout();
                            const pad = 0.08;
                            if (info) {
                              let w = info.dispW * (1 - pad * 2);
                              let h = info.dispH * (1 - pad * 2);
                              if (r.v) {
                                h = w / r.v;
                                if (h > info.dispH * (1 - pad * 2)) {
                                  h = info.dispH * (1 - pad * 2);
                                  w = h * r.v;
                                }
                              }
                              const x = info.left + (info.dispW - w) / 2;
                              const y = info.top + (info.dispH - h) / 2;
                              setSel({ x, y, w, h });
                            } else {
                              const rect = canvas.getBoundingClientRect();
                              let w = rect.width * (1 - pad * 2);
                              let h = rect.height * (1 - pad * 2);
                              if (r.v) {
                                h = w / r.v;
                                if (h > rect.height * (1 - pad * 2)) {
                                  h = rect.height * (1 - pad * 2);
                                  w = h * r.v;
                                }
                              }
                              const x = (rect.width - w) / 2;
                              const y = (rect.height - h) / 2;
                              setSel({ x, y, w, h });
                            }
                          }} aria-pressed={selected} style={{ minWidth: 64, padding: '8px 10px', borderRadius: 10, background: selected ? 'linear-gradient(135deg,var(--primary), #4aa8ff)' : 'var(--bg-elev)', color: selected ? '#fff' : 'var(--text)', border: selected ? 'none' : '1px solid rgba(255,255,255,0.04)', boxShadow: selected ? '0 8px 26px rgba(34,122,255,0.16)' : 'none', display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'flex-start', transition: 'transform 120ms ease, box-shadow 180ms ease, background 180ms ease', fontSize: 13 }}>
                            <span aria-hidden style={{ width: 52, height: 28, background: selected ? 'color-mix(in srgb, var(--primary) 6%, color-mix(in srgb, var(--bg-elev) 60%, transparent))' : 'color-mix(in srgb, var(--text) 4%, transparent)', borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative', border: selected ? '1px solid color-mix(in srgb, var(--text) 12%, transparent)' : '1px solid color-mix(in srgb, var(--text) 6%, transparent)', boxShadow: selected ? '0 6px 18px rgba(34,122,255,0.08)' : 'inset 0 1px 0 rgba(0,0,0,0.04)' }}>
                              <span style={{ width: previewInnerWidth, height: 16, background: selected ? 'color-mix(in srgb, var(--text) 82%, #fff)' : 'color-mix(in srgb, var(--text) 58%, #fff)', borderRadius: 3, display: 'block', border: '1px solid color-mix(in srgb, var(--text) 10%, transparent)', boxShadow: selected ? 'inset 0 1px 0 rgba(255,255,255,0.06)' : 'inset 0 1px 0 rgba(255,255,255,0.03)' }} />
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 600, opacity: selected ? 1 : 0.95 }}>{r.label}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <button type="button" aria-label="Next preset" onClick={() => setPresetIndex((presetIndex + 1) % ASPECT_PRESETS.length)} style={{ padding: 6, borderRadius: 8, border: 'none', background: 'transparent' }}>▶</button>
              </div>

              
            </div>
          </div>
        </div>
      </div>
      {/* Bottom controls removed per request */}
    </div>
  );
}
