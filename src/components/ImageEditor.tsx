"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { RotateCcw, Circle, Film, Droplet, Feather, Camera, Sun, Snowflake, Clapperboard, Sliders, Palette, Sparkles, Image as ImageIcon, Scissors, SunDim, Scale, Rainbow, Thermometer, Aperture, Layers, ZapOff, Square, Ruler } from "lucide-react";

// Filter icon mapping
const FILTER_ICONS: Record<string, React.ComponentType<any>> = {
  none: RotateCcw,
  sepia: Circle,
  mono: Circle,
  cinema: Clapperboard,
  bleach: Droplet,
  vintage: Feather,
  lomo: Camera,
  warm: Sun,
  cool: Snowflake,
  default: Film
};

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

export type EditorSettings = {
  exposure?: number;
  contrast?: number;
  saturation?: number;
  temperature?: number;
  vignette?: number;
  frameColor?: 'white' | 'black';
  frameThickness?: number;
  selectedFilter?: string;
  filterStrength?: number;
  grain?: number;
  softFocus?: number;
  fade?: number;
  matte?: number;
};

type Props = {
  initialDataUrl: string;
  initialSettings?: EditorSettings;
  onCancel: () => void;
  onApply: (dataUrl: string, settings: EditorSettings) => void;
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

export default function ImageEditor({ initialDataUrl, initialSettings, onCancel, onApply }: Props) {
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
  const [exposure, setExposure] = useState<number>(initialSettings?.exposure ?? 1);
  const [contrast, setContrast] = useState<number>(initialSettings?.contrast ?? 1);
  const [saturation, setSaturation] = useState<number>(initialSettings?.saturation ?? 1);
  const [temperature, setTemperature] = useState<number>(initialSettings?.temperature ?? 0); // -100..100 mapped to hue-rotate
  const [vignette, setVignette] = useState<number>(initialSettings?.vignette ?? 0); // 0..1
  const [frameColor, setFrameColor] = useState<'white' | 'black'>(initialSettings?.frameColor ?? 'white');
  const [frameThickness, setFrameThickness] = useState<number>(initialSettings?.frameThickness ?? 0); // fraction of min(image dim) — default disabled
  const [controlsOpen, setControlsOpen] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<'basic' | 'color' | 'effects' | 'crop' | 'frame'>('basic');
  const ASPECT_PRESETS = [
    { label: 'Free', v: null },
    { label: '16:9', v: 16 / 9 },
    { label: '4:3', v: 4 / 3 },
    { label: '3:2', v: 3 / 2 },
    { label: '1:1', v: 1 },
    { label: '4:5', v: 4 / 5 }
  ];
  const [presetIndex, setPresetIndex] = useState<number>(0);
  const [selectedFilter, setSelectedFilter] = useState<string>(initialSettings?.selectedFilter ?? 'none');
  const [filterStrength, setFilterStrength] = useState<number>(initialSettings?.filterStrength ?? 1); // 0..1
  const [grain, setGrain] = useState<number>(initialSettings?.grain ?? 0); // 0..1
  const [softFocus, setSoftFocus] = useState<number>(initialSettings?.softFocus ?? 0); // gentle blur overlay
  const [fade, setFade] = useState<number>(initialSettings?.fade ?? 0); // faded matte look
  const [matte, setMatte] = useState<number>(initialSettings?.matte ?? 0); // matte tone curve
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
      const selKey = selectedCategory === 'basic' ? 'basic' : selectedCategory === 'color' ? 'color' : selectedCategory === 'effects' ? 'effects' : selectedCategory === 'crop' ? 'crop' : 'frame';
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
    if (categoriesContainerRef.current) {
      ro.observe(categoriesContainerRef.current);
      // Also observe all category buttons for size changes (hover effects)
      const buttons = categoriesContainerRef.current.querySelectorAll('.cat-btn');
      buttons.forEach(btn => ro.observe(btn as Element));
    }
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
      // Make the canvas more compact to reduce scrolling
      const targetHeight = Math.min(400, Math.max(280, contW * 0.75)); // Use aspect-based height, max 400px
      
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
      ctx.drawImage(tmp, imgLeft, imgTop, imgW, imgH);
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
      ctx.drawImage(noise, 0, 0, noiseW, noiseH, nImgLeft, nImgTop, nImgW, nImgH);
      ctx.restore();
    }

    // simple frame overlay (stroke around image)
    if (curFrameEnabled) {
      // Draw frame bands between outer disp rect and inner uniformly-scaled image.
      // Use integer coordinates to avoid sub-pixel rendering gaps/seams.
      ctx.save();
      ctx.fillStyle = curFrameColor === 'white' ? '#ffffff' : '#000000';
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
      // top band
      if (innerT > outerT) {
        ctx.fillRect(outerL, outerT, outerR - outerL, innerT - outerT + 1);
      }
      // bottom band
      if (innerB < outerB) {
        ctx.fillRect(outerL, innerB - 1, outerR - outerL, outerB - innerB + 1);
      }
      // left band (full height to cover any gaps)
      if (innerL > outerL) {
        ctx.fillRect(outerL, outerT, innerL - outerL + 1, outerB - outerT);
      }
      // right band (full height to cover any gaps)
      if (innerR < outerR) {
        ctx.fillRect(innerR - 1, outerT, outerR - innerR + 1, outerB - outerT);
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
  // Soft Focus: blurred overlay composited on top with lighten blend for dreamy glow
  if (curSoft > 0.001) {
    try {
      const tmp = document.createElement('canvas'); tmp.width = srcW; tmp.height = srcH;
      const t = tmp.getContext('2d')!;
      // Draw from source image
      t.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
      // Apply blur with slight brightness boost
      const blurPx = Math.max(3, curSoft * 12);
      t.filter = `blur(${blurPx}px) brightness(1.05)`;
      t.drawImage(tmp, 0, 0);
      t.filter = 'none';
      octx.save();
      octx.globalAlpha = Math.min(0.4, curSoft * 0.45);
      octx.globalCompositeOperation = 'lighten';
      octx.drawImage(tmp, padPx, padPx, srcW, srcH);
      octx.restore();
    } catch (e) {
      // fallback subtle overlay
      octx.save(); octx.globalAlpha = Math.min(0.25, curSoft * 0.3); octx.fillStyle = 'rgba(255,255,255,0.3)'; octx.fillRect(padPx, padPx, srcW, srcH); octx.restore();
    }
  }
  // Fade: washed out, lifted blacks vintage look (like sun-bleached photos)
  if (curFade > 0.001) {
    try {
      octx.save();
      
      // First, apply a light overlay to lift the blacks
      octx.globalAlpha = Math.min(0.35, curFade * 0.4);
      octx.globalCompositeOperation = 'lighten';
      octx.fillStyle = 'rgba(230, 230, 230, 0.5)';
      octx.fillRect(padPx, padPx, srcW, srcH);
      
      // Then reduce contrast with a gray overlay
      octx.globalAlpha = Math.min(0.25, curFade * 0.3);
      octx.globalCompositeOperation = 'overlay';
      octx.fillStyle = 'rgba(200, 200, 200, 0.6)';
      octx.fillRect(padPx, padPx, srcW, srcH);
      
      octx.restore();
    } catch (e) {
      octx.save(); octx.globalAlpha = Math.min(0.4, curFade * 0.45); octx.fillStyle = 'rgba(245,245,240,0.3)'; octx.fillRect(padPx, padPx, srcW, srcH); octx.restore();
    }
  }
  // Matte: rich, cinematic matte look with crushed blacks and film-like tonality
  if (curMatte > 0.001) {
    try {
      octx.save();
      
      // Darken with multiply for crushed blacks
      octx.globalCompositeOperation = 'multiply';
      octx.globalAlpha = Math.min(0.25, curMatte * 0.3);
      octx.fillStyle = 'rgba(30, 25, 35, 0.8)';
      octx.fillRect(padPx, padPx, srcW, srcH);
      
      // Add warm film tone
      octx.globalCompositeOperation = 'soft-light';
      octx.globalAlpha = Math.min(0.2, curMatte * 0.25);
      octx.fillStyle = 'rgba(200, 180, 150, 0.5)';
      octx.fillRect(padPx, padPx, srcW, srcH);
      
      octx.restore();
    } catch (e) {
      octx.save(); octx.globalCompositeOperation = 'multiply'; octx.globalAlpha = Math.min(0.35, curMatte * 0.4); octx.fillStyle = 'rgba(25,25,25,0.3)'; octx.fillRect(padPx, padPx, srcW, srcH); octx.restore();
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
    // Use integer coords and add 1px overlap to eliminate any sub-pixel gaps/seams
    const outerX = 0;
    const outerY = 0;
    const outerW = Math.ceil(srcW + padPx * 2);
    const outerH = Math.ceil(srcH + padPx * 2);
    const innerX = Math.floor(padPx);
    const innerY = Math.floor(padPx);
    const innerW = Math.ceil(srcW);
    const innerH = Math.ceil(srcH);
    const innerR = innerX + innerW;
    const innerB = innerY + innerH;
    
    // Draw overlapping bands to ensure no gaps
    // top band (with 1px overlap on sides)
    if (innerY > outerY) {
      octx.fillRect(outerX, outerY, outerW, innerY - outerY + 1);
    }
    // bottom band (with 1px overlap on sides)
    if (innerB < outerH) {
      octx.fillRect(outerX, innerB - 1, outerW, outerH - innerB + 1);
    }
    // left band (full height)
    if (innerX > outerX) {
      octx.fillRect(outerX, outerY, innerX - outerX + 1, outerH);
    }
    // right band (full height)
    if (innerR < outerW) {
      octx.fillRect(innerR - 1, outerY, outerW - innerR + 1, outerH);
    }
    octx.restore();
  }
  const dataUrl = out.toDataURL('image/jpeg', 0.92);
    // Return both the edited image and the current settings
    const settings: EditorSettings = {
      exposure,
      contrast,
      saturation,
      temperature,
      vignette,
      frameColor,
      frameThickness,
      selectedFilter,
      filterStrength,
      grain,
      softFocus,
      fade,
      matte,
    };
    onApply(dataUrl, settings);
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
        paddingBottom: 16,
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
        /* Category button hover effects */
        .cat-btn .cat-label {
          max-width: 0;
          opacity: 0;
          transition: max-width 200ms ease, opacity 180ms ease, margin 180ms ease;
          margin-left: 0;
        }
        .cat-btn:hover .cat-label {
          max-width: 80px;
          opacity: 1;
          margin-left: 8px;
        }
        .imgedit-range { 
          -webkit-appearance: none; 
          appearance: none; 
          height: 10px; 
          border-radius: 999px; 
          outline: none; 
          transition: box-shadow .2s ease, transform .2s ease; 
          cursor: pointer;
        }
        .imgedit-range:hover { transform: scaleY(1.1); }
        .imgedit-range:active { box-shadow: 0 8px 24px rgba(0,0,0,0.16); }
        .imgedit-range::-webkit-slider-thumb { 
          -webkit-appearance: none; 
          appearance: none; 
          width: 22px; 
          height: 22px; 
          border-radius: 50%; 
          background: white; 
          border: 3px solid var(--primary); 
          box-shadow: 0 4px 14px rgba(0,0,0,0.2), 0 2px 6px rgba(0,0,0,0.1); 
          transition: transform .15s cubic-bezier(.2,.9,.2,1), box-shadow .15s ease;
          cursor: grab;
        }
        .imgedit-range::-webkit-slider-thumb:hover { 
          transform: scale(1.15); 
          box-shadow: 0 6px 20px rgba(0,0,0,0.25);
        }
        .imgedit-range::-webkit-slider-thumb:active { 
          transform: scale(1.05); 
          cursor: grabbing;
        }
        .imgedit-range::-moz-range-thumb { 
          width: 22px; 
          height: 22px; 
          border-radius: 50%; 
          background: white; 
          border: 3px solid var(--primary); 
          box-shadow: 0 4px 14px rgba(0,0,0,0.2);
          cursor: grab;
        }
        .imgedit-range::-moz-range-thumb:hover { transform: scale(1.15); }
        .imgedit-range::-moz-range-thumb:active { transform: scale(1.05); cursor: grabbing; }
        /* custom focus ring */
        .imgedit-range:focus { box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 15%, transparent); }
        .imgedit-range:focus::-webkit-slider-thumb { box-shadow: 0 0 0 6px color-mix(in srgb, var(--primary) 25%, transparent), 0 4px 14px rgba(0,0,0,0.2); }
        /* panels responsiveness: allow panels to grow and scroll on small viewports */
        .imgedit-panels { 
          position: relative; 
          max-height: calc(100vh - 180px); 
          overflow: hidden; 
          border-radius: 12px;
          background: color-mix(in srgb, var(--bg-elev) 95%, var(--primary) 5%);
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.06);
        }
        .imgedit-panels > div { height: 100%; }
        .imgedit-panel-inner { 
          box-sizing: border-box; 
          overflow-y: auto; 
          -webkit-overflow-scrolling: touch; 
          padding: 16px; 
          gap: 14px; 
          display: grid; 
        }
        @media (min-width: 720px) { .imgedit-panels { max-height: 280px; } }
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12, flexWrap: 'wrap', padding: '4px 0' }}>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>Edit Photo</div>
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" title="Rotate -90°" onClick={bakeRotateMinus90} style={{ padding: '10px 12px', borderRadius: 10, background: 'color-mix(in srgb, var(--bg-elev) 80%, transparent)', border: '1px solid var(--border)', transition: 'transform 140ms ease, box-shadow 180ms ease', fontSize: 18, boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }} onMouseDown={(e)=> (e.currentTarget.style.transform = 'scale(0.96)')} onMouseUp={(e)=> (e.currentTarget.style.transform = '')} onMouseLeave={(e)=> (e.currentTarget.style.transform = '')} onMouseEnter={(e)=> (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)')}>⤺</button>
          <button type="button" title="Rotate +90°" onClick={bakeRotate90} style={{ padding: '10px 12px', borderRadius: 10, background: 'color-mix(in srgb, var(--bg-elev) 80%, transparent)', border: '1px solid var(--border)', transition: 'transform 140ms ease, box-shadow 180ms ease', fontSize: 18, boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }} onMouseDown={(e)=> (e.currentTarget.style.transform = 'scale(0.96)')} onMouseUp={(e)=> (e.currentTarget.style.transform = '')} onMouseLeave={(e)=> (e.currentTarget.style.transform = '')} onMouseEnter={(e)=> (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)')}>⤾</button>
          <button type="button" className="btn ghost" onClick={onCancel} style={{ padding: '10px 14px', borderRadius: 10, transition: 'transform 120ms ease, box-shadow 180ms ease' }} onMouseDown={(e)=> (e.currentTarget.style.transform = 'scale(0.98)')} onMouseUp={(e)=> (e.currentTarget.style.transform = '')} onMouseLeave={(e)=> (e.currentTarget.style.transform = '')} onMouseEnter={(e)=> (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)')}>Cancel</button>
          <button type="button" className="btn primary" onClick={applyEdit} style={{ padding: '10px 18px', borderRadius: 10, background: isEdited ? 'linear-gradient(135deg, var(--primary), #60a5fa)' : 'var(--primary)', color: '#fff', fontWeight: 700, boxShadow: isEdited ? '0 8px 32px rgba(0,125,255,0.2), 0 2px 8px rgba(0,0,0,0.1)' : '0 4px 12px rgba(0,0,0,0.1)', transition: 'transform 120ms ease, box-shadow 220ms ease, opacity 180ms ease, background 220ms ease', position: 'relative', overflow: 'hidden' }} onMouseDown={(e)=> (e.currentTarget.style.transform = 'scale(0.98)')} onMouseUp={(e)=> (e.currentTarget.style.transform = '')} onMouseLeave={(e)=> (e.currentTarget.style.transform = '')} aria-pressed={isEdited}>
            <span style={{ position: 'relative', zIndex: 1 }}>Confirm</span>
          </button>
        </div>
      </div>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <canvas
          ref={canvasRef}
          style={{ 
            width: '100%', 
            touchAction: 'none', 
            display: 'block', 
            transition: 'box-shadow 240ms ease', 
            minHeight: 140,
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 2px rgba(255,255,255,0.05)',
            border: '1px solid color-mix(in srgb, var(--border) 80%, transparent)'
          }}
        />

        {/* header rotate buttons now handle rotate; removed tiny top-right rotate button to improve discoverability */}
        {/* floating confirm removed — use the top Confirm button in the header */}
      </div>

  {/* help text removed per user request */}

      {/* Controls header with categories (emojis + slide panels) */}
  <div ref={categoriesContainerRef} style={{ position: 'relative', display: 'flex', gap: 10, marginTop: 16, justifyContent: 'center', flexWrap: 'nowrap', overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: 820, margin: '16px auto 0', padding: '8px 10px', alignItems: 'center', whiteSpace: 'nowrap', background: 'color-mix(in srgb, var(--bg-elev) 70%, transparent)', borderRadius: 12, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)' }}>
    <div aria-hidden style={{ position: 'absolute', left: categoryHighlight?.left ?? 0, top: categoryHighlight?.top ?? 0, width: categoryHighlight?.width ?? 0, height: categoryHighlight?.height ?? 0, borderRadius: 11, background: 'linear-gradient(135deg, var(--primary), #60a5fa)', transition: 'left 260ms cubic-bezier(.2,.9,.2,1), width 260ms cubic-bezier(.2,.9,.2,1), top 260ms cubic-bezier(.2,.9,.2,1), height 260ms cubic-bezier(.2,.9,.2,1), opacity 200ms ease', pointerEvents: 'none', opacity: categoryHighlight ? 1 : 0, zIndex: 0, boxShadow: '0 4px 16px rgba(0,125,255,0.25)' }} />
  <button
    data-cat="basic"
    type="button"
    aria-label="Basic"
    title="Basic"
    className="cat-btn"
    onClick={(e: any) => { try { e.currentTarget.animate([{ transform: 'scale(0.94)' }, { transform: 'scale(1)' }], { duration: 240, easing: 'cubic-bezier(.2,.9,.2,1)' }); } catch {} setSelectedCategory('basic'); }}
    style={{ padding: '10px 12px', borderRadius: 10, background: selectedCategory === 'basic' ? 'transparent' : 'transparent', color: selectedCategory === 'basic' ? '#fff' : 'var(--text)', transition: 'transform 140ms ease, box-shadow 220ms ease, color 220ms ease, width 200ms ease', position: 'relative', zIndex: 1, flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', fontWeight: selectedCategory === 'basic' ? 700 : 500, overflow: 'hidden' }}
  >
    <Sliders size={20} strokeWidth={2} aria-hidden style={{ flexShrink: 0 }} />
    <span className="cat-label" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>Basic</span>
  </button>

  <button
    data-cat="color"
    type="button"
    aria-label="Filters"
    title="Filters"
    className="cat-btn"
    onClick={(e: any) => { try { e.currentTarget.animate([{ transform: 'scale(0.94)' }, { transform: 'scale(1)' }], { duration: 240, easing: 'cubic-bezier(.2,.9,.2,1)' }); } catch {} setSelectedCategory('color'); }}
    style={{ padding: '10px 12px', borderRadius: 10, background: selectedCategory === 'color' ? 'transparent' : 'transparent', color: selectedCategory === 'color' ? '#fff' : 'var(--text)', transition: 'transform 140ms ease, box-shadow 220ms ease, color 220ms ease, width 200ms ease', position: 'relative', zIndex: 1, flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', fontWeight: selectedCategory === 'color' ? 700 : 500, overflow: 'hidden' }}
  >
    <Palette size={20} strokeWidth={2} aria-hidden style={{ flexShrink: 0 }} />
    <span className="cat-label" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>Filters</span>
  </button>

  <button
    data-cat="effects"
    type="button"
    aria-label="Effects"
    title="Effects"
    className="cat-btn"
    onClick={(e: any) => { try { e.currentTarget.animate([{ transform: 'scale(0.94)' }, { transform: 'scale(1)' }], { duration: 240, easing: 'cubic-bezier(.2,.9,.2,1)' }); } catch {} setSelectedCategory('effects'); }}
    style={{ padding: '10px 12px', borderRadius: 10, background: selectedCategory === 'effects' ? 'transparent' : 'transparent', color: selectedCategory === 'effects' ? '#fff' : 'var(--text)', transition: 'transform 140ms ease, box-shadow 220ms ease, color 220ms ease, width 200ms ease', position: 'relative', zIndex: 1, flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', fontWeight: selectedCategory === 'effects' ? 700 : 500, overflow: 'hidden' }}
  >
    <Sparkles size={20} strokeWidth={2} aria-hidden style={{ flexShrink: 0 }} />
    <span className="cat-label" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>Effects</span>
  </button>

  <button
    data-cat="crop"
    type="button"
    aria-label="Crop"
    title="Crop"
    className="cat-btn"
    onClick={(e: any) => { try { e.currentTarget.animate([{ transform: 'scale(0.94)' }, { transform: 'scale(1)' }], { duration: 240, easing: 'cubic-bezier(.2,.9,.2,1)' }); } catch {} setSelectedCategory('crop'); }}
    style={{ padding: '10px 12px', borderRadius: 10, background: selectedCategory === 'crop' ? 'transparent' : 'transparent', color: selectedCategory === 'crop' ? '#fff' : 'var(--text)', transition: 'transform 120ms ease, box-shadow 220ms ease, color 220ms ease, width 200ms ease', position: 'relative', zIndex: 1, flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', fontWeight: selectedCategory === 'crop' ? 700 : 500, overflow: 'hidden' }}
  >
    <Scissors size={20} strokeWidth={2} aria-hidden style={{ flexShrink: 0 }} />
    <span className="cat-label" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>Crop</span>
  </button>

  <button
    data-cat="frame"
    type="button"
    aria-label="Frame"
    title="Frame"
    className="cat-btn"
    onClick={(e: any) => { try { e.currentTarget.animate([{ transform: 'scale(0.94)' }, { transform: 'scale(1)' }], { duration: 240, easing: 'cubic-bezier(.2,.9,.2,1)' }); } catch {} setSelectedCategory('frame'); }}
    style={{ padding: '10px 12px', borderRadius: 10, background: selectedCategory === 'frame' ? 'transparent' : 'transparent', color: selectedCategory === 'frame' ? '#fff' : 'var(--text)', transition: 'transform 120ms ease, box-shadow 220ms ease, color 220ms ease, width 200ms ease', position: 'relative', zIndex: 1, flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', fontWeight: selectedCategory === 'frame' ? 700 : 500, overflow: 'hidden' }}
  >
    <ImageIcon size={20} strokeWidth={2} aria-hidden style={{ flexShrink: 0 }} />
    <span className="cat-label" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>Frame</span>
  </button>
  </div>

      {/* Sliding category panels container */}
  <div className="imgedit-panels" style={{ maxWidth: 820, margin: '16px auto 0', position: 'relative', borderRadius: 12, minHeight: 200 }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          {/* Basic panel */}
          <div className="imgedit-panel-inner" style={{ display: selectedCategory === 'basic' ? 'grid' : 'none', width: '100%' }}>
            <label style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span style={{ width: 120, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
                <SunDim size={18} strokeWidth={2} aria-hidden />
                <span>Exposure</span>
              </span>
              {/* animated icon that changes color with exposure */}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <circle cx="12" cy="12" r="8" style={{ fill: exposureColor(exposure), transition: 'fill 0.2s ease' }} />
                </svg>
                <input className="imgedit-range" type="range" min={0.5} max={1.8} step={0.01} value={exposure} onInput={(e: any) => { const v = Number(e.target.value); announceDirection('exposure', exposureRef.current, v); exposureRef.current = v; setExposure(v); draw(undefined, { exposure: v }); requestAnimationFrame(() => draw()); }} style={{ flex: 1, background: rangeBg(exposure, 0.5, 1.8, 'var(--slider-exposure-start)', 'var(--slider-exposure-end)') }} />
              </span>
              <span style={{ width: 52, textAlign: 'right', fontWeight: 600, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{exposure.toFixed(2)}</span>
            </label>
            <label style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span style={{ width: 120, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
                <Scale size={18} strokeWidth={2} aria-hidden />
                <span>Contrast</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <rect x="4" y="4" width="16" height="16" rx="3" style={{ fill: contrastColor(contrast), transition: 'fill 0.2s ease' }} />
                </svg>
                <input className="imgedit-range" type="range" min={0.5} max={1.8} step={0.01} value={contrast} onInput={(e: any) => { const v = Number(e.target.value); announceDirection('contrast', contrastRef.current, v); contrastRef.current = v; setContrast(v); draw(undefined, { contrast: v }); requestAnimationFrame(() => draw()); }} style={{ flex: 1, background: rangeBg(contrast, 0.5, 1.8, 'var(--slider-contrast-start)', 'var(--slider-contrast-end)') }} />
              </span>
              <span style={{ width: 52, textAlign: 'right', fontWeight: 600, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{contrast.toFixed(2)}</span>
            </label>
            <label style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span style={{ width: 120, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
                <Rainbow size={18} strokeWidth={2} aria-hidden />
                <span>Saturation</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M12 3c1.1 0 2 .9 2 2v14a2 2 0 1 1-4 0V5c0-1.1.9-2 2-2z" style={{ fill: saturationColor(saturation), transition: 'fill 0.2s ease' }} />
                </svg>
                <input className="imgedit-range" type="range" min={0} max={2} step={0.01} value={saturation} onInput={(e: any) => { const v = Number(e.target.value); announceDirection('saturation', saturationRef.current, v); saturationRef.current = v; setSaturation(v); draw(undefined, { saturation: v }); requestAnimationFrame(() => draw()); }} style={{ flex: 1, background: rangeBg(saturation, 0, 2, 'var(--slider-saturation-start)', 'var(--slider-saturation-end)') }} />
              </span>
              <span style={{ width: 52, textAlign: 'right', fontWeight: 600, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{saturation.toFixed(2)}</span>
            </label>
            <label style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span style={{ width: 120, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
                <Thermometer size={18} strokeWidth={2} aria-hidden />
                <span>Temperature</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <rect x="9" y="3" width="6" height="12" rx="3" style={{ fill: temperatureColor(temperature), transition: 'fill 0.2s ease' }} />
                </svg>
                <input className="imgedit-range" type="range" min={-100} max={100} step={1} value={temperature} onInput={(e: any) => { const v = Number(e.target.value); announceDirection('temperature', temperatureRef.current, v); temperatureRef.current = v; setTemperature(v); draw(undefined, { temperature: v }); requestAnimationFrame(() => draw()); }} style={{ flex: 1, background: rangeBg(temperature, -100, 100, 'var(--slider-temperature-cold)', 'var(--slider-temperature-warm)') }} />
              </span>
              <span style={{ width: 52, textAlign: 'right', fontWeight: 600, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{temperature}</span>
            </label>
          </div>

          {/* Color panel */}
          <div className="imgedit-panel-inner" style={{ display: selectedCategory === 'color' ? 'grid' : 'none', width: '100%' }}>
            {/* panel heading removed (tab already shows Filters) */}
            <div ref={filtersContainerRef} style={{ position: 'relative', display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', padding: '8px 0' }}>
              {/* animated highlight pill sits behind buttons and moves between them */}
              <div aria-hidden style={{ position: 'absolute', left: filterHighlight?.left ?? 0, top: filterHighlight?.top ?? 0, width: filterHighlight?.width ?? 0, height: filterHighlight?.height ?? 0, borderRadius: 11, background: 'linear-gradient(135deg, var(--primary), #60a5fa)', transition: 'left 260ms cubic-bezier(.2,.9,.2,1), width 260ms cubic-bezier(.2,.9,.2,1), top 260ms cubic-bezier(.2,.9,.2,1), height 260ms cubic-bezier(.2,.9,.2,1), opacity 200ms ease', pointerEvents: 'none', opacity: filterHighlight ? 1 : 0, boxShadow: '0 4px 16px rgba(0,125,255,0.3)' }} />
              {Object.keys(FILTER_PRESETS).map(f => {
                const Icon = FILTER_ICONS[f] || FILTER_ICONS.default;
                return (
                  <button
                    key={f}
                    data-filter={f}
                    type="button"
                    onMouseDown={() => { selectedFilterRef.current = f; setSelectedFilter(f); draw(undefined, { selectedFilter: f }); requestAnimationFrame(() => draw()); }}
                    style={{ padding: '8px 12px', borderRadius: 10, background: 'transparent', color: selectedFilter === f ? '#fff' : 'var(--text)', transition: 'transform 120ms ease, box-shadow 200ms ease, color 200ms ease', display: 'inline-flex', gap: 8, alignItems: 'center', position: 'relative', zIndex: 1, border: 'none', fontWeight: selectedFilter === f ? 700 : 500 }}
                    onMouseDownCapture={(e)=> (e.currentTarget.style.transform = 'scale(0.96)')}
                    onMouseUpCapture={(e)=> (e.currentTarget.style.transform = '')}
                    onMouseLeave={(e)=> (e.currentTarget.style.transform = '')}
                    onFocus={(e)=> (e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)')}
                    onBlur={(e)=> (e.currentTarget.style.boxShadow = '')}
                    aria-pressed={selectedFilter===f}
                  >
                    <Icon size={18} strokeWidth={2} aria-hidden />
                    <span style={{ fontSize: 13 }}>{f}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8 }}>
              <span style={{ width: 120, color: 'var(--text)', fontWeight: 600, fontSize: 14 }}>Strength</span>
              <input className="imgedit-range" type="range" min={0} max={1} step={0.01} value={filterStrength} onInput={(e: any) => { const v = Number(e.target.value); filterStrengthRef.current = v; setFilterStrength(v); draw(); requestAnimationFrame(() => draw()); }} style={{ flex: 1, background: rangeBg(filterStrength, 0, 1, '#2d9cff', 'rgba(255,255,255,0.08)') }} />
              <span style={{ width: 52, textAlign: 'right', fontWeight: 600, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{Math.round(filterStrength * 100)}%</span>
            </div>
          </div>

          {/* Effects panel */}
          <div className="imgedit-panel-inner" style={{ display: selectedCategory === 'effects' ? 'grid' : 'none', width: '100%' }}>
            <label style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span style={{ width: 120, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
                <Aperture size={18} strokeWidth={2} aria-hidden />
                <span>Vignette</span>
              </span>
              <input className="imgedit-range" type="range" min={0} max={1} step={0.01} value={vignette} onInput={(e: any) => { const v = Number(e.target.value); vignetteRef.current = v; setVignette(v); draw(undefined, { vignette: v }); requestAnimationFrame(() => draw()); }} style={{ flex: 1, background: rangeBg(vignette, 0, 1, '#1a1a1a', '#000000') }} />
              <span style={{ width: 52, textAlign: 'right', fontWeight: 600, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{vignette.toFixed(2)}</span>
            </label>
            <label style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span style={{ width: 120, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
                <Layers size={18} strokeWidth={2} aria-hidden />
                <span>Grain</span>
              </span>
              <input className="imgedit-range" type="range" min={0} max={1} step={0.01} value={grain} onInput={(e: any) => { const v = Number(e.target.value); grainRef.current = v; setGrain(v); draw(undefined, { grain: v }); requestAnimationFrame(() => draw()); }} style={{ flex: 1, background: rangeBg(grain, 0, 1, '#e8d5b7', '#8b7355') }} />
              <span style={{ width: 52, textAlign: 'right', fontWeight: 600, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{grain.toFixed(2)}</span>
            </label>

            <label style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span style={{ width: 120, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
                <ZapOff size={18} strokeWidth={2} aria-hidden />
                <span>Soft Focus</span>
              </span>
              <input className="imgedit-range" type="range" min={0} max={1} step={0.01} value={softFocus} onInput={(e: any) => { const v = Number(e.target.value); softFocusRef.current = v; setSoftFocus(v); draw(undefined, {  }); requestAnimationFrame(() => draw()); }} style={{ flex: 1, background: rangeBg(softFocus, 0, 1, '#f0e6ff', '#c8a2ff') }} />
              <span style={{ width: 52, textAlign: 'right', fontWeight: 600, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{softFocus.toFixed(2)}</span>
            </label>

            <label style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span style={{ width: 120, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
                <Film size={18} strokeWidth={2} aria-hidden />
                <span>Fade</span>
              </span>
              <input className="imgedit-range" type="range" min={0} max={1} step={0.01} value={fade} onInput={(e: any) => { const v = Number(e.target.value); fadeRef.current = v; setFade(v); draw(undefined, {  }); requestAnimationFrame(() => draw()); }} style={{ flex: 1, background: rangeBg(fade, 0, 1, '#fff9e6', '#ffdc99') }} />
              <span style={{ width: 52, textAlign: 'right', fontWeight: 600, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{fade.toFixed(2)}</span>
            </label>

            <label style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span style={{ width: 120, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
                <Square size={18} strokeWidth={2} aria-hidden />
                <span>Matte</span>
              </span>
              <input className="imgedit-range" type="range" min={0} max={1} step={0.01} value={matte} onInput={(e: any) => { const v = Number(e.target.value); matteRef.current = v; setMatte(v); draw(undefined, {  }); requestAnimationFrame(() => draw()); }} style={{ flex: 1, background: rangeBg(matte, 0, 1, '#e6ddd5', '#8b6f5c') }} />
              <span style={{ width: 52, textAlign: 'right', fontWeight: 600, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{matte.toFixed(2)}</span>
            </label>
          </div>

          {/* Crop panel */}
          <div className="imgedit-panel-inner" style={{ display: selectedCategory === 'crop' ? 'grid' : 'none', width: '100%' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Crop Aspect Ratio</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn ghost" type="button" onClick={() => { setSel(null); cropRatio.current = null; }} style={{ padding: '6px 10px', fontSize: 12 }}>Clear</button>
                </div>
              </div>

              {/* Responsive aspect switcher: grid on desktop, carousel on mobile */}
              <div className="aspect-presets-container">
                {/* Desktop: Show all presets in a grid */}
                <div className="aspect-presets-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, paddingBottom: 4 }}>
                  {ASPECT_PRESETS.map((r, i) => {
                    const selected = cropRatio.current === r.v;
                    const base = 16 / 9;
                    const previewRatio = r.v ? Math.min(1.2, r.v / base) : 0.7;
                    const previewInnerWidth = Math.round(36 * previewRatio);
                    return (
                      <button key={r.label} type="button" onClick={() => {
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
                      }} aria-pressed={selected} style={{ 
                        padding: '12px 8px', 
                        borderRadius: 10, 
                        background: selected ? 'linear-gradient(135deg,var(--primary), #60a5fa)' : 'var(--bg-elev)', 
                        color: selected ? '#fff' : 'var(--text)', 
                        border: selected ? 'none' : '1px solid rgba(255,255,255,0.04)', 
                        boxShadow: selected ? '0 6px 20px rgba(34,122,255,0.2)' : '0 2px 6px rgba(0,0,0,0.04)', 
                        display: 'flex', 
                        flexDirection: 'column',
                        gap: 10, 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        transition: 'transform 120ms ease, box-shadow 180ms ease, background 180ms ease', 
                        fontSize: 13,
                        fontWeight: selected ? 700 : 600,
                        cursor: 'pointer',
                        minHeight: 80
                      }}
                      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
                      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)'; }}
                      >
                        <span aria-hidden style={{ 
                          width: 52, 
                          height: 28, 
                          background: selected ? 'color-mix(in srgb, var(--primary) 6%, color-mix(in srgb, var(--bg-elev) 60%, transparent))' : 'color-mix(in srgb, var(--text) 4%, transparent)', 
                          borderRadius: 6, 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          position: 'relative', 
                          border: selected ? '1px solid color-mix(in srgb, var(--text) 12%, transparent)' : '1px solid color-mix(in srgb, var(--text) 6%, transparent)', 
                          boxShadow: selected ? '0 4px 12px rgba(34,122,255,0.12)' : 'inset 0 1px 0 rgba(0,0,0,0.04)',
                          flexShrink: 0
                        }}>
                          <span style={{ 
                            width: previewInnerWidth, 
                            height: 16, 
                            background: selected ? 'color-mix(in srgb, var(--text) 82%, #fff)' : 'color-mix(in srgb, var(--text) 58%, #fff)', 
                            borderRadius: 3, 
                            display: 'block', 
                            border: '1px solid color-mix(in srgb, var(--text) 10%, transparent)', 
                            boxShadow: selected ? 'inset 0 1px 0 rgba(255,255,255,0.06)' : 'inset 0 1px 0 rgba(255,255,255,0.03)' 
                          }} />
                        </span>
                        <span style={{ fontSize: 13, fontWeight: selected ? 700 : 600, opacity: selected ? 1 : 0.85, lineHeight: 1.2 }}>{r.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Mobile: Carousel with arrows */}
                <div className="aspect-presets-carousel" style={{ display: 'none', alignItems: 'center', gap: 8, paddingBottom: 4 }}>
                  <button type="button" aria-label="Previous preset" onClick={() => setPresetIndex((presetIndex - 1 + ASPECT_PRESETS.length) % ASPECT_PRESETS.length)} style={{ padding: 6, borderRadius: 8, border: 'none', background: 'transparent', fontSize: 18 }}>◀</button>
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
                  <button type="button" aria-label="Next preset" onClick={() => setPresetIndex((presetIndex + 1) % ASPECT_PRESETS.length)} style={{ padding: 6, borderRadius: 8, border: 'none', background: 'transparent', fontSize: 18 }}>▶</button>
                </div>

                <style>{`
                  /* Desktop: show grid, hide carousel */
                  @media (min-width: 640px) {
                    .aspect-presets-grid { display: grid !important; }
                    .aspect-presets-carousel { display: none !important; }
                  }
                  /* Mobile: hide grid, show carousel */
                  @media (max-width: 639px) {
                    .aspect-presets-grid { display: none !important; }
                    .aspect-presets-carousel { display: flex !important; }
                  }
                  /* Ensure aspect buttons don't wrap text */
                  .aspect-presets-grid button {
                    white-space: nowrap;
                    overflow: visible;
                  }
                `}</style>
              </div>
            </div>
          </div>

          {/* Frame panel */}
          <div className="imgedit-panel-inner" style={{ display: selectedCategory === 'frame' ? 'grid' : 'none', width: '100%' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Photo Frame</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <label style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ width: 100, display: 'flex', gap: 6, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
                    <Ruler size={18} strokeWidth={2} aria-hidden />
                    <span>Thickness</span>
                  </span>
                  <input className="imgedit-range" type="range" min={0} max={0.2} step={0.005} value={frameThickness} onInput={(e:any) => { const v = Number(e.target.value); frameThicknessRef.current = v; setFrameThickness(v); draw(); }} style={{ flex: 1, background: rangeBg(frameThickness, 0, 0.2, '#d4c5b9', '#8b7355') }} />
                  <span style={{ width: 48, textAlign: 'right', fontWeight: 600, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{Math.round(frameThickness * 100)}%</span>
                </label>

                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Frame Color</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button 
                      type="button" 
                      className={frameColor === 'white' ? 'btn primary' : 'btn ghost'} 
                      onClick={() => { frameColorRef.current = 'white'; setFrameColor('white'); draw(); }} 
                      style={{ 
                        padding: '10px 20px', 
                        fontSize: 14, 
                        flex: 1,
                        opacity: frameThickness > 0 ? 1 : 0.5, 
                        pointerEvents: frameThickness > 0 ? 'auto' : 'none',
                        transition: 'all 200ms ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8
                      }}
                    >
                      <span style={{ fontSize: 18 }}>⚪</span>
                      <span>White</span>
                    </button>
                    <button 
                      type="button" 
                      className={frameColor === 'black' ? 'btn primary' : 'btn ghost'} 
                      onClick={() => { frameColorRef.current = 'black'; setFrameColor('black'); draw(); }} 
                      style={{ 
                        padding: '10px 20px', 
                        fontSize: 14, 
                        flex: 1,
                        opacity: frameThickness > 0 ? 1 : 0.5, 
                        pointerEvents: frameThickness > 0 ? 'auto' : 'none',
                        transition: 'all 200ms ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8
                      }}
                    >
                      <span style={{ fontSize: 18 }}>⚫</span>
                      <span>Black</span>
                    </button>
                  </div>
                </div>

                {/* hint removed as requested */}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Bottom controls removed per request */}
    </div>
  );
}
