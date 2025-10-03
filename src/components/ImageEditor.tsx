"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { RotateCcw, RotateCw, RefreshCw, X, Check, Circle, Film, Droplet, Feather, Camera, Sun, Snowflake, Clapperboard, Sliders, Palette, Sparkles, Image as ImageIcon, Scissors, SunDim, Scale, Rainbow, Thermometer, Aperture, Layers, ZapOff, Square, Ruler } from "lucide-react";

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
  rotation?: number;
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

// unique colors for each category button when selected
const CATEGORY_COLORS: Record<string, string> = {
  basic: '#2d9cff',    // blue
  color: '#ff6b6b',    // red/pink
  effects: '#9b5cff',  // purple
  crop: '#00c48c',     // green
  frame: '#ffb703'     // warm yellow
};

// unique colors for each filter button when selected
const FILTER_COLORS: Record<string, string> = {
  none: '#94a3b8',    // neutral
  sepia: '#d97706',   // amber
  mono: '#374151',    // slate
  cinema: '#0ea5a5',  // teal
  bleach: '#ef4444',  // red
  vintage: '#8b5cf6', // violet
  lomo: '#fb923c',    // orange
  warm: '#ffb86b',    // warm
  cool: '#60a5fa',    // cool blue
  invert: '#64748b',  // gray-blue
  film: '#16a34a'     // green
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
    // 4:5 removed per request
  ];
  const [presetIndex, setPresetIndex] = useState<number>(0);
  const [selectedFilter, setSelectedFilter] = useState<string>(initialSettings?.selectedFilter ?? 'none');
  const [filterStrength, setFilterStrength] = useState<number>(initialSettings?.filterStrength ?? 1); // 0..1
  const [rotation, setRotation] = useState<number>(initialSettings?.rotation ?? 0); // degrees, -180..180
  const [grain, setGrain] = useState<number>(initialSettings?.grain ?? 0); // 0..1
  const rotationRef = useRef<number>(rotation);
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
  useEffect(() => { rotationRef.current = rotation; }, [rotation]);
  // keep rotationRef available for draw/export
  const softFocusRef = useRef<number>(softFocus);
  const fadeRef = useRef<number>(fade);
  const matteRef = useRef<number>(matte);
  const filtersContainerRef = useRef<HTMLDivElement | null>(null);
  const [filterHighlight, setFilterHighlight] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const suppressFilterTransitionRef = useRef<boolean>(false);
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
  // default behavior: drag to create/move crop selection.

  // when opening the Filters category, suppress the highlight transition for the initial placement
  useEffect(() => {
    if (selectedCategory === 'color') {
      suppressFilterTransitionRef.current = true;
      // re-enable transitions after the initial layout settles
      const t = window.setTimeout(() => { suppressFilterTransitionRef.current = false; }, 220);
      return () => window.clearTimeout(t);
    }
    // ensure flag is off when leaving
    suppressFilterTransitionRef.current = false;
  }, [selectedCategory]);

  useEffect(() => {
    // Load the image and defer showing the editor until the initial layout
    // and draw have completed. This prevents a visible "jump" where the
    // canvas/image resizes after the editor is already visible.
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      imgRef.current = img;
      // Attempt to size the canvas to the final layout immediately so
      // computeImageLayout has stable dimensions to work with. This mirrors
      // the logic in the resize effect so we avoid a visible resize after
      // the editor becomes visible.
      try {
        const canvas = canvasRef.current;
        const cont = containerRef.current;
        if (canvas && cont) {
          const dpr = window.devicePixelRatio || 1;
          const contW = Math.max(100, Math.round(cont.clientWidth));
          // Prefer a canvas height that fits comfortably in the viewport.
          // Use a fraction of the viewport height but clamp to sensible min/max.
          const viewportH = (typeof window !== 'undefined' && window.innerHeight) ? window.innerHeight : 800;
          const VIEWPORT_BASE = Math.max(140, Math.round(viewportH * 0.5));
          const MAX_HEIGHT = Math.min(520, VIEWPORT_BASE);
          const MIN_HEIGHT = 140;
          let targetHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(contW * 0.8)));
          if (img && img.naturalWidth && img.naturalHeight) {
            const imgHeight = Math.round((img.naturalHeight / img.naturalWidth) * contW);
            targetHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, imgHeight));
          }
          canvas.width = Math.max(100, Math.round(contW * dpr));
          canvas.height = Math.max(100, Math.round(targetHeight * dpr));
          canvas.style.width = `${contW}px`;
          canvas.style.height = `${targetHeight}px`;
        }
      } catch (e) {
        // ignore sizing errors and fall back to computeImageLayout
      }

      // Small RAFs to ensure browser applied style changes before measuring/drawing
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const info = computeImageLayout();
          if (info) {
            setOffset({ x: info.left, y: info.top });
            draw(info);
          } else {
            draw();
          }
          // Trigger the mount animation / visibility only after the
          // initial draw has completed.
          setMounted(true);
        });
      });
    };
    img.src = imageSrc;
    return () => { cancelled = true; };
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
  // Use zero padding so the image tightly fills the canvas and avoids visible empty space
  const padRatio = 0.0;
    const availW = Math.max(1, cssW * (1 - padRatio * 2));
    const availH = Math.max(1, cssH * (1 - padRatio * 2));
  // Use contain-style scaling so the whole image is visible inside the editor canvas.
  // This prevents tall (or very wide) images from being cropped in the preview.
  // It will letterbox (show empty space) when the image aspect doesn't match the canvas,
  // but that's preferable for editing so users can reach all image pixels.
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
  // use clientWidth to derive canvas size (avoid transform/scale issues from parent modals)
  const contW = Math.max(100, Math.round(cont.clientWidth));
  // Prefer canvas height derived from the viewport so the editor never grows larger than the screen.
  const viewportH = (typeof window !== 'undefined' && window.innerHeight) ? window.innerHeight : 800;
  const VIEWPORT_BASE = Math.max(140, Math.round(viewportH * 0.5));
  const MAX_HEIGHT = Math.min(520, VIEWPORT_BASE);
  const MIN_HEIGHT = 140;
  let targetHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(contW * 0.8)));
      const img = imgRef.current;
      if (img && img.naturalWidth && img.naturalHeight) {
        // Compute height that matches the image aspect ratio at the current container width
        const imgHeight = Math.round((img.naturalHeight / img.naturalWidth) * contW);
        // Clamp to sensible bounds so the editor never becomes too tall or too small
        targetHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, imgHeight));
      }

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

  function draw(info?: { rect: DOMRect; baseScale: number; dispW: number; dispH: number; left: number; top: number }, overrides?: Partial<{ exposure: number; contrast: number; saturation: number; temperature: number; vignette: number; rotation: number; selectedFilter: string; grain: number; softFocus: number; fade: number; matte: number; frameEnabled: boolean; frameThickness: number; frameColor: string }>) {
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
  const angle = (overrides?.rotation ?? rotationRef.current ?? rotation) || 0;
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
  if (curFilterStrength >= 0.999) {
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
    if (Math.abs(rotation) > 0.001) return true;
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

  // Ensure slider interactions don't cause the outer app swiper to change slides.
  // Dispatch global events that AppShell listens to so it can temporarily disable
  // outer swipe handling while the user is moving a slider.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === 'undefined') return;

    const start = () => {
      try { window.dispatchEvent(new CustomEvent('monolog:carousel_drag_start')); } catch (_) {}
  // ensure we always end when pointer/touch/mouse is released anywhere
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
  window.addEventListener('touchend', end);
  window.addEventListener('touchcancel', end);
  window.addEventListener('mouseup', end);
    };

    const end = () => {
      try { window.dispatchEvent(new CustomEvent('monolog:carousel_drag_end')); } catch (_) {}
      window.removeEventListener('pointerup', end);
      window.removeEventListener('touchend', end);
      window.removeEventListener('mouseup', end);
    };

    const inputs = Array.from(container.querySelectorAll<HTMLInputElement>('.imgedit-range'));
    inputs.forEach(inp => {
      inp.addEventListener('pointerdown', start);
      inp.addEventListener('touchstart', start, { passive: true } as any);
      inp.addEventListener('mousedown', start);
    });

    return () => {
      inputs.forEach(inp => {
        inp.removeEventListener('pointerdown', start);
        inp.removeEventListener('touchstart', start as any);
        inp.removeEventListener('mousedown', start);
      });
  // ensure cleanup of window listeners
  window.removeEventListener('pointerup', end);
  window.removeEventListener('pointercancel', end);
  window.removeEventListener('touchend', end);
  window.removeEventListener('touchcancel', end);
  window.removeEventListener('mouseup', end);
    };
    // run once on mount when containerRef is available
  }, []);

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
          // Maintain aspect ratio if set: enforce exact ratio and keep the handle anchor fixed
          if (cropRatio.current) {
            const ratio = cropRatio.current; // width / height
            // determine new width/height based on handle type
            let adjW = newSel.w;
            let adjH = newSel.h;
            if (handleIndex < 4) {
              // corners: base on the larger change to feel natural
              const dw = Math.abs(newSel.w - dragging.current.origSel.w);
              const dh = Math.abs(newSel.h - dragging.current.origSel.h);
              if (dw > dh) {
                adjH = Math.max(1, adjW / ratio);
              } else {
                adjW = Math.max(1, adjH * ratio);
              }
            } else if (handleIndex === 4 || handleIndex === 5) {
              // top/bottom edges: base on height
              adjH = Math.max(1, adjH);
              adjW = Math.max(1, adjH * ratio);
            } else {
              // left/right edges: base on width
              adjW = Math.max(1, adjW);
              adjH = Math.max(1, adjW / ratio);
            }

            // recompute x/y so the opposite edge stays anchored
            const orig = dragging.current.origSel;
            // compute anchor (the fixed point) based on which handle is dragged
            let anchorX = orig.x; let anchorY = orig.y;
            if (handleIndex === 0) { anchorX = orig.x + orig.w; anchorY = orig.y + orig.h; }
            else if (handleIndex === 1) { anchorX = orig.x; anchorY = orig.y + orig.h; }
            else if (handleIndex === 2) { anchorX = orig.x + orig.w; anchorY = orig.y; }
            else if (handleIndex === 3) { anchorX = orig.x; anchorY = orig.y; }
            else if (handleIndex === 4) { anchorX = orig.x + orig.w / 2; anchorY = orig.y + orig.h; }
            else if (handleIndex === 5) { anchorX = orig.x + orig.w / 2; anchorY = orig.y; }
            else if (handleIndex === 6) { anchorX = orig.x + orig.w; anchorY = orig.y + orig.h / 2; }
            else if (handleIndex === 7) { anchorX = orig.x; anchorY = orig.y + orig.h / 2; }

            // available space from the anchor to image rect edges
            const availLeft = anchorX - imgRect.x;
            const availRight = imgRect.x + imgRect.w - anchorX;
            const availTop = anchorY - imgRect.y;
            const availBottom = imgRect.y + imgRect.h - anchorY;
            // choose horizontal/vertical available depending on which side the anchor is on
            const availableW = (anchorX > orig.x) ? availLeft : availRight;
            const availableH = (anchorY > orig.y) ? availTop : availBottom;
            // Ensure adjW/adjH fit within available area while preserving ratio
            // Compute max width allowed by availableH and ratio
            const maxWFromH = Math.max(1, availableH * ratio);
            const maxAllowedW = Math.max(1, Math.min(availableW, maxWFromH));
            if (adjW > maxAllowedW) {
              adjW = maxAllowedW;
              adjH = Math.max(1, adjW / ratio);
            }
            // Also ensure adjH fits availableH (in case horizontal wasn't limiting)
            const maxHFromW = Math.max(1, availableW / ratio);
            const maxAllowedH = Math.max(1, Math.min(availableH, maxHFromW));
            if (adjH > maxAllowedH) {
              adjH = maxAllowedH;
              adjW = Math.max(1, adjH * ratio);
            }
            switch (handleIndex) {
              case 0: // top-left - anchor bottom-right
                newSel.x = orig.x + orig.w - adjW;
                newSel.y = orig.y + orig.h - adjH;
                newSel.w = adjW; newSel.h = adjH;
                break;
              case 1: // top-right - anchor bottom-left
                newSel.x = orig.x;
                newSel.y = orig.y + orig.h - adjH;
                newSel.w = adjW; newSel.h = adjH;
                break;
              case 2: // bottom-left - anchor top-right
                newSel.x = orig.x + orig.w - adjW;
                newSel.y = orig.y;
                newSel.w = adjW; newSel.h = adjH;
                break;
              case 3: // bottom-right - anchor top-left
                newSel.x = orig.x;
                newSel.y = orig.y;
                newSel.w = adjW; newSel.h = adjH;
                break;
              case 4: // top edge - anchor bottom
                newSel.x = orig.x + (orig.w - adjW) / 2;
                newSel.y = orig.y + orig.h - adjH;
                newSel.w = adjW; newSel.h = adjH;
                break;
              case 5: // bottom edge - anchor top
                newSel.x = orig.x + (orig.w - adjW) / 2;
                newSel.y = orig.y;
                newSel.w = adjW; newSel.h = adjH;
                break;
              case 6: // left edge - anchor right
                newSel.x = orig.x + orig.w - adjW;
                newSel.y = orig.y + (orig.h - adjH) / 2;
                newSel.w = adjW; newSel.h = adjH;
                break;
              case 7: // right edge - anchor left
                newSel.x = orig.x;
                newSel.y = orig.y + (orig.h - adjH) / 2;
                newSel.w = adjW; newSel.h = adjH;
                break;
            }
          }
          // Clamp to image rect (ensure selection stays inside image)
          newSel.x = Math.max(imgRect.x, Math.min(newSel.x, imgRect.x + imgRect.w - newSel.w));
          newSel.y = Math.max(imgRect.y, Math.min(newSel.y, imgRect.y + imgRect.h - newSel.h));
          newSel.w = Math.min(newSel.w, Math.max(1, imgRect.x + imgRect.w - newSel.x));
          newSel.h = Math.min(newSel.h, Math.max(1, imgRect.y + imgRect.h - newSel.y));
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

  // Reset only the adjustment/settings (color corrections, filters, effects, frame)
  function resetAdjustments() {
    // Default values
    const defExposure = 1;
    const defContrast = 1;
    const defSaturation = 1;
    const defTemperature = 0;
    const defVignette = 0;
    const defFrameColor: 'white' | 'black' = 'white';
    const defFrameThickness = 0;
    const defSelectedFilter = 'none';
    const defFilterStrength = 1;
    const defGrain = 0;
    const defSoftFocus = 0;
    const defFade = 0;
    const defMatte = 0;
  const defRotation = 0;

    // Update state
    setExposure(defExposure); exposureRef.current = defExposure;
    setContrast(defContrast); contrastRef.current = defContrast;
    setSaturation(defSaturation); saturationRef.current = defSaturation;
    setTemperature(defTemperature); temperatureRef.current = defTemperature;
    setVignette(defVignette); vignetteRef.current = defVignette;
    setFrameColor(defFrameColor); frameColorRef.current = defFrameColor;
    setFrameThickness(defFrameThickness); frameThicknessRef.current = defFrameThickness;
    setSelectedFilter(defSelectedFilter); selectedFilterRef.current = defSelectedFilter;
    setFilterStrength(defFilterStrength); filterStrengthRef.current = defFilterStrength;
    setGrain(defGrain); grainRef.current = defGrain;
    setSoftFocus(defSoftFocus); softFocusRef.current = defSoftFocus;
    setFade(defFade); fadeRef.current = defFade;
    setMatte(defMatte); matteRef.current = defMatte;
  setRotation(defRotation); rotationRef.current = defRotation;

  // Also clear any crop selection/preset
  setSel(null);
  if (typeof cropRatio !== 'undefined' && cropRatio) cropRatio.current = null;
  setPresetIndex(0);

    // Redraw with defaults
    requestAnimationFrame(() => draw());
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
  // Handle rotation: if rotation is set, output canvas needs to accommodate rotated bounds
  const rot = rotationRef.current ?? rotation;
  const angle = (rot * Math.PI) / 180;
  // compute rotated bounding box
  const absCos = Math.abs(Math.cos(angle));
  const absSin = Math.abs(Math.sin(angle));
  const rotatedW = Math.max(1, Math.round((srcW) * absCos + (srcH) * absSin));
  const rotatedH = Math.max(1, Math.round((srcW) * absSin + (srcH) * absCos));
  const out = document.createElement('canvas');
  out.width = rotatedW + padPx * 2; out.height = rotatedH + padPx * 2;
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
  // draw with rotation: translate to center of out canvas, rotate, then draw image centered
  const centerX = out.width / 2;
  const centerY = out.height / 2;
  const drawExport = () => {
    if (filterStrength >= 0.999) {
      octx.filter = `${baseFilterExport} ${preset}`;
      octx.save();
      octx.translate(centerX, centerY);
      octx.rotate(angle);
      octx.drawImage(img, srcX, srcY, srcW, srcH, -srcW / 2, -srcH / 2, srcW, srcH);
      octx.restore();
      octx.filter = 'none';
    } else if (filterStrength <= 0.001) {
      octx.filter = baseFilterExport;
      octx.save();
      octx.translate(centerX, centerY);
      octx.rotate(angle);
      octx.drawImage(img, srcX, srcY, srcW, srcH, -srcW / 2, -srcH / 2, srcW, srcH);
      octx.restore();
      octx.filter = 'none';
    } else {
      octx.filter = baseFilterExport;
      octx.save();
      octx.translate(centerX, centerY);
      octx.rotate(angle);
      octx.drawImage(img, srcX, srcY, srcW, srcH, -srcW / 2, -srcH / 2, srcW, srcH);
      octx.restore();
      octx.filter = `${baseFilterExport} ${preset}`;
      octx.globalAlpha = Math.min(1, Math.max(0, filterStrength));
      octx.save();
      octx.translate(centerX, centerY);
      octx.rotate(angle);
      octx.drawImage(img, srcX, srcY, srcW, srcH, -srcW / 2, -srcH / 2, srcW, srcH);
      octx.restore();
      octx.globalAlpha = 1;
      octx.filter = 'none';
    }
  };
  drawExport();
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
      rotation,
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
  overflowX: 'hidden',
  // ensure the editor never exceeds the viewport height; allow internal scrolling
  maxHeight: 'calc(100vh - 48px)',
  overflowY: 'auto',
  // subtle mount animation: only translate and fade (no scaling) to
  // avoid a size jump when the canvas finishes sizing.
  transform: mounted ? 'translateY(0)' : 'translateY(6px)',
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
        .cat-btn[data-active="true"] .cat-label {
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
          max-width: 100%;
          box-sizing: border-box;
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
        /* Hide horizontal scrollbar for category selector but keep scrollable (touch/drag) */
        .categories-scroll {
          overflow-x: auto;
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }
        .categories-scroll::-webkit-scrollbar { height: 0; display: none; }
        /* panels responsiveness: allow panels to grow and scroll on small viewports */
        .imgedit-panels { 
          position: relative; 
          max-height: calc(100vh - 180px); 
          overflow: hidden; 
          overflow-x: hidden; /* prevent horizontal scroll */
          border-radius: 12px;
          background: color-mix(in srgb, var(--bg-elev) 95%, var(--primary) 5%);
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.06);
        }
        .imgedit-panels > div { height: 100%; }
        .imgedit-panel-inner { 
          box-sizing: border-box; 
          overflow-y: auto; 
          overflow-x: hidden; /* avoid transient horizontal scroll */
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 12, gap: 12, flexWrap: 'wrap', padding: '4px 0' }}>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>
          <span className="sr-only">Edit Photo</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
          {/* rotate buttons removed from header */}

          {/* Cancel (ghost) */}
          <button type="button" className="btn icon ghost" onClick={onCancel} aria-label="Cancel edits">
            <X size={16} aria-hidden />
            <span className="sr-only">Cancel edits</span>
          </button>

          {/* Reset adjustments (match follow button visual) */}
          <button type="button" className="btn icon ghost" title="Reset adjustments" onClick={resetAdjustments} aria-label="Reset adjustments">
            <RefreshCw size={16} aria-hidden />
            <span className="sr-only">Reset adjustments</span>
          </button>

          {/* Confirm (match other icon buttons - subtle) */}
          <button type="button" className={`btn icon ghost`} onClick={applyEdit} aria-pressed={isEdited} aria-label="Confirm edits" title="Confirm edits">
            <Check size={16} aria-hidden />
            <span className="sr-only">Confirm edits</span>
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
            maxHeight: 'min(50vh, 520px)',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 2px rgba(255,255,255,0.05)',
            border: '1px solid color-mix(in srgb, var(--border) 80%, transparent)'
          }}
        />

  {/* header rotate buttons removed to declutter toolbar; use crop panel straighten / rotate controls instead */}
      </div>

  {/* help text removed per user request */}

      {/* Controls header with categories (emojis + slide panels) */}
  <div ref={categoriesContainerRef} className="categories-scroll" style={{ position: 'relative', display: 'flex', gap: 10, marginTop: 16, justifyContent: 'center', flexWrap: 'nowrap', overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: 820, margin: '16px auto 0', padding: '8px 10px', alignItems: 'center', whiteSpace: 'nowrap', background: 'color-mix(in srgb, var(--bg-elev) 70%, transparent)', borderRadius: 12, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)' }}>
  <div aria-hidden style={{ position: 'absolute', left: categoryHighlight?.left ?? 0, top: categoryHighlight?.top ?? 0, width: categoryHighlight?.width ?? 0, height: categoryHighlight?.height ?? 0, borderRadius: 8, background: 'color-mix(in srgb, var(--primary) 10%, transparent)', transition: 'left 220ms cubic-bezier(.2,.9,.2,1), width 220ms cubic-bezier(.2,.9,.2,1), top 220ms cubic-bezier(.2,.9,.2,1), height 220ms cubic-bezier(.2,.9,.2,1), opacity 160ms ease', pointerEvents: 'none', opacity: categoryHighlight ? 0.95 : 0, zIndex: 0, boxShadow: 'none', border: '1px solid color-mix(in srgb, var(--text) 6%, transparent)' }} />
  <button
    data-cat="basic"
    data-active={selectedCategory === 'basic'}
    type="button"
    aria-label="Basic"
    title="Basic"
    className="cat-btn"
    onClick={(e: any) => { try { e.currentTarget.animate([{ transform: 'scale(0.94)' }, { transform: 'scale(1)' }], { duration: 240, easing: 'cubic-bezier(.2,.9,.2,1)' }); } catch {} setSelectedCategory('basic'); }}
  style={{ padding: '10px 12px', borderRadius: 10, background: selectedCategory === 'basic' ? 'transparent' : 'transparent', color: 'var(--text)', transition: 'transform 140ms ease, box-shadow 220ms ease, color 220ms ease, width 200ms ease', position: 'relative', zIndex: 1, flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', fontWeight: selectedCategory === 'basic' ? 700 : 500, overflow: 'hidden' }}
  >
  <Sliders size={20} strokeWidth={2} aria-hidden style={{ flexShrink: 0, color: selectedCategory === 'basic' ? CATEGORY_COLORS.basic : undefined }} />
    <span className="cat-label" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>Basic</span>
  </button>

  <button
    data-cat="color"
    data-active={selectedCategory === 'color'}
    type="button"
    aria-label="Filters"
    title="Filters"
    className="cat-btn"
    onClick={(e: any) => { try { e.currentTarget.animate([{ transform: 'scale(0.94)' }, { transform: 'scale(1)' }], { duration: 240, easing: 'cubic-bezier(.2,.9,.2,1)' }); } catch {} setSelectedCategory('color'); }}
  style={{ padding: '10px 12px', borderRadius: 10, background: selectedCategory === 'color' ? 'transparent' : 'transparent', color: 'var(--text)', transition: 'transform 140ms ease, box-shadow 220ms ease, color 220ms ease, width 200ms ease', position: 'relative', zIndex: 1, flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', fontWeight: selectedCategory === 'color' ? 700 : 500, overflow: 'hidden' }}
  >
  <Palette size={20} strokeWidth={2} aria-hidden style={{ flexShrink: 0, color: selectedCategory === 'color' ? CATEGORY_COLORS.color : undefined }} />
    <span className="cat-label" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>Filters</span>
  </button>

  <button
    data-cat="effects"
    data-active={selectedCategory === 'effects'}
    type="button"
    aria-label="Effects"
    title="Effects"
    className="cat-btn"
    onClick={(e: any) => { try { e.currentTarget.animate([{ transform: 'scale(0.94)' }, { transform: 'scale(1)' }], { duration: 240, easing: 'cubic-bezier(.2,.9,.2,1)' }); } catch {} setSelectedCategory('effects'); }}
  style={{ padding: '10px 12px', borderRadius: 10, background: selectedCategory === 'effects' ? 'transparent' : 'transparent', color: 'var(--text)', transition: 'transform 140ms ease, box-shadow 220ms ease, color 220ms ease, width 200ms ease', position: 'relative', zIndex: 1, flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', fontWeight: selectedCategory === 'effects' ? 700 : 500, overflow: 'hidden' }}
  >
  <Sparkles size={20} strokeWidth={2} aria-hidden style={{ flexShrink: 0, color: selectedCategory === 'effects' ? CATEGORY_COLORS.effects : undefined }} />
    <span className="cat-label" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>Effects</span>
  </button>

  <button
    data-cat="crop"
    data-active={selectedCategory === 'crop'}
    type="button"
    aria-label="Crop"
    title="Crop"
    className="cat-btn"
    onClick={(e: any) => { try { e.currentTarget.animate([{ transform: 'scale(0.94)' }, { transform: 'scale(1)' }], { duration: 240, easing: 'cubic-bezier(.2,.9,.2,1)' }); } catch {} setSelectedCategory('crop'); }}
  style={{ padding: '10px 12px', borderRadius: 10, background: selectedCategory === 'crop' ? 'transparent' : 'transparent', color: 'var(--text)', transition: 'transform 120ms ease, box-shadow 220ms ease, color 220ms ease, width 200ms ease', position: 'relative', zIndex: 1, flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', fontWeight: selectedCategory === 'crop' ? 700 : 500, overflow: 'hidden' }}
  >
  <Scissors size={20} strokeWidth={2} aria-hidden style={{ flexShrink: 0, color: selectedCategory === 'crop' ? CATEGORY_COLORS.crop : undefined }} />
    <span className="cat-label" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>Crop</span>
  </button>

  <button
    data-cat="frame"
    data-active={selectedCategory === 'frame'}
    type="button"
    aria-label="Frame"
    title="Frame"
    className="cat-btn"
    onClick={(e: any) => { try { e.currentTarget.animate([{ transform: 'scale(0.94)' }, { transform: 'scale(1)' }], { duration: 240, easing: 'cubic-bezier(.2,.9,.2,1)' }); } catch {} setSelectedCategory('frame'); }}
  style={{ padding: '10px 12px', borderRadius: 10, background: selectedCategory === 'frame' ? 'transparent' : 'transparent', color: 'var(--text)', transition: 'transform 120ms ease, box-shadow 220ms ease, color 220ms ease, width 200ms ease', position: 'relative', zIndex: 1, flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', fontWeight: selectedCategory === 'frame' ? 700 : 500, overflow: 'hidden' }}
  >
  <ImageIcon size={20} strokeWidth={2} aria-hidden style={{ flexShrink: 0, color: selectedCategory === 'frame' ? CATEGORY_COLORS.frame : undefined }} />
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
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <input className="imgedit-range" type="range" min={0.5} max={1.8} step={0.01} value={exposure} onInput={(e: any) => { const v = Number(e.target.value); announceDirection('exposure', exposureRef.current, v); exposureRef.current = v; setExposure(v); draw(undefined, { exposure: v }); requestAnimationFrame(() => draw()); }} style={{ flex: 1, background: rangeBg(exposure, 0.5, 1.8, 'var(--slider-exposure-start)', 'var(--slider-exposure-end)') }} />
              </span>
            </label>
            <label style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span style={{ width: 120, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
                <Scale size={18} strokeWidth={2} aria-hidden />
                <span>Contrast</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <input className="imgedit-range" type="range" min={0.5} max={1.8} step={0.01} value={contrast} onInput={(e: any) => { const v = Number(e.target.value); announceDirection('contrast', contrastRef.current, v); contrastRef.current = v; setContrast(v); draw(undefined, { contrast: v }); requestAnimationFrame(() => draw()); }} style={{ flex: 1, background: rangeBg(contrast, 0.5, 1.8, 'var(--slider-contrast-start)', 'var(--slider-contrast-end)') }} />
              </span>
            </label>
            <label style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span style={{ width: 120, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
                <Rainbow size={18} strokeWidth={2} aria-hidden />
                <span>Saturation</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <input className="imgedit-range" type="range" min={0} max={2} step={0.01} value={saturation} onInput={(e: any) => { const v = Number(e.target.value); announceDirection('saturation', saturationRef.current, v); saturationRef.current = v; setSaturation(v); draw(undefined, { saturation: v }); requestAnimationFrame(() => draw()); }} style={{ flex: 1, background: rangeBg(saturation, 0, 2, 'var(--slider-saturation-start)', 'var(--slider-saturation-end)') }} />
              </span>
            </label>
            <label style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span style={{ width: 120, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
                <Thermometer size={18} strokeWidth={2} aria-hidden />
                <span>Temperature</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <input className="imgedit-range" type="range" min={-100} max={100} step={1} value={temperature} onInput={(e: any) => { const v = Number(e.target.value); announceDirection('temperature', temperatureRef.current, v); temperatureRef.current = v; setTemperature(v); draw(undefined, { temperature: v }); requestAnimationFrame(() => draw()); }} style={{ flex: 1, background: rangeBg(temperature, -100, 100, 'var(--slider-temperature-cold)', 'var(--slider-temperature-warm)') }} />
              </span>
            </label>
          </div>

          {/* Color panel */}
          <div className="imgedit-panel-inner" style={{ display: selectedCategory === 'color' ? 'grid' : 'none', width: '100%' }}>
            {/* panel heading removed (tab already shows Filters) */}
            <div ref={filtersContainerRef} style={{ position: 'relative', display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', padding: '8px 0' }}>
              {/* animated highlight pill sits behind buttons and moves between them */}
              <div aria-hidden style={{ position: 'absolute', left: filterHighlight?.left ?? 0, top: filterHighlight?.top ?? 0, width: filterHighlight?.width ?? 0, height: filterHighlight?.height ?? 0, borderRadius: 8, background: 'color-mix(in srgb, var(--primary) 10%, transparent)', transition: suppressFilterTransitionRef.current ? 'none' : 'left 220ms cubic-bezier(.2,.9,.2,1), width 220ms cubic-bezier(.2,.9,.2,1), top 220ms cubic-bezier(.2,.9,.2,1), height 220ms cubic-bezier(.2,.9,.2,1), opacity 160ms ease', pointerEvents: 'none', opacity: filterHighlight ? 0.95 : 0, boxShadow: 'none', border: '1px solid color-mix(in srgb, var(--text) 6%, transparent)' }} />
              {Object.keys(FILTER_PRESETS).map(f => {
                const Icon = FILTER_ICONS[f] || FILTER_ICONS.default;
                return (
                  <button
                    key={f}
                    data-filter={f}
                    type="button"
                    onMouseDown={() => { selectedFilterRef.current = f; setSelectedFilter(f); draw(undefined, { selectedFilter: f }); requestAnimationFrame(() => draw()); }}
                    style={{ padding: '8px 12px', borderRadius: 10, background: 'transparent', color: 'var(--text)', transition: 'transform 120ms ease, box-shadow 200ms ease, color 200ms ease', display: 'inline-flex', gap: 8, alignItems: 'center', position: 'relative', zIndex: 1, border: 'none', fontWeight: selectedFilter === f ? 700 : 500 }}
                    onMouseDownCapture={(e)=> (e.currentTarget.style.transform = 'scale(0.96)')}
                    onMouseUpCapture={(e)=> (e.currentTarget.style.transform = '')}
                    onMouseLeave={(e)=> (e.currentTarget.style.transform = '')}
                    onFocus={(e)=> (e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)')}
                    onBlur={(e)=> (e.currentTarget.style.boxShadow = '')}
                    aria-pressed={selectedFilter===f}
                  >
                    <Icon size={18} strokeWidth={2} aria-hidden style={{ color: selectedFilter === f ? FILTER_COLORS[f] ?? undefined : undefined }} />
                    <span style={{ fontSize: 13 }}>{f}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8 }}>
              <span style={{ width: 120, color: 'var(--text)', fontWeight: 600, fontSize: 14 }}>Strength</span>
              <input className="imgedit-range" type="range" min={0} max={1} step={0.01} value={filterStrength} onInput={(e: any) => { const v = Number(e.target.value); filterStrengthRef.current = v; setFilterStrength(v); draw(); requestAnimationFrame(() => draw()); }} style={{ flex: 1, background: rangeBg(filterStrength, 0, 1, '#2d9cff', 'rgba(255,255,255,0.08)') }} />
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
            </label>
            <label style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span style={{ width: 120, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
                <Layers size={18} strokeWidth={2} aria-hidden />
                <span>Grain</span>
              </span>
              <input className="imgedit-range" type="range" min={0} max={1} step={0.01} value={grain} onInput={(e: any) => { const v = Number(e.target.value); grainRef.current = v; setGrain(v); draw(undefined, { grain: v }); requestAnimationFrame(() => draw()); }} style={{ flex: 1, background: rangeBg(grain, 0, 1, '#e8d5b7', '#8b7355') }} />
            </label>

            <label style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span style={{ width: 120, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
                <ZapOff size={18} strokeWidth={2} aria-hidden />
                <span>Soft Focus</span>
              </span>
              <input className="imgedit-range" type="range" min={0} max={1} step={0.01} value={softFocus} onInput={(e: any) => { const v = Number(e.target.value); softFocusRef.current = v; setSoftFocus(v); draw(undefined, {  }); requestAnimationFrame(() => draw()); }} style={{ flex: 1, background: rangeBg(softFocus, 0, 1, '#f0e6ff', '#c8a2ff') }} />
            </label>

            <label style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span style={{ width: 120, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
                <Film size={18} strokeWidth={2} aria-hidden />
                <span>Fade</span>
              </span>
              <input className="imgedit-range" type="range" min={0} max={1} step={0.01} value={fade} onInput={(e: any) => { const v = Number(e.target.value); fadeRef.current = v; setFade(v); draw(undefined, {  }); requestAnimationFrame(() => draw()); }} style={{ flex: 1, background: rangeBg(fade, 0, 1, '#fff9e6', '#ffdc99') }} />
            </label>

            <label style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span style={{ width: 120, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
                <Square size={18} strokeWidth={2} aria-hidden />
                <span>Matte</span>
              </span>
              <input className="imgedit-range" type="range" min={0} max={1} step={0.01} value={matte} onInput={(e: any) => { const v = Number(e.target.value); matteRef.current = v; setMatte(v); draw(undefined, {  }); requestAnimationFrame(() => draw()); }} style={{ flex: 1, background: rangeBg(matte, 0, 1, '#e6ddd5', '#8b6f5c') }} />
            </label>
          </div>

          {/* Crop panel */}
          <div className="imgedit-panel-inner" style={{ display: selectedCategory === 'crop' ? 'grid' : 'none', width: '100%' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}><span className="sr-only">Crop Aspect Ratio</span></div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {/* header rotate buttons removed; use controls beside the Straighten slider */}
                </div>
              </div>

              {/* Responsive aspect switcher: grid on desktop, carousel on mobile */}
              <div className="aspect-presets-container">
                {/* Desktop: Show all presets in a grid */}
                <div className="aspect-presets-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(56px, 1fr))', gridAutoRows: 'minmax(44px, auto)', gap: 4, paddingBottom: 2, alignItems: 'start' }}>
                  {ASPECT_PRESETS.map((r, i) => {
                    const selected = cropRatio.current === r.v;
                    const base = 16 / 9;
                    const previewRatio = r.v ? Math.min(1.2, r.v / base) : 0.7;
                    const previewInnerWidth = Math.round(18 * previewRatio);
                    return (
                      <button key={r.label} type="button" onClick={() => {
                        // Toggle: if selecting the same preset again, clear selection
                        if (cropRatio.current === r.v) {
                          cropRatio.current = null;
                          setSel(null);
                          return;
                        }
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
                        padding: '6px 4px', 
                        borderRadius: 6, 
                        background: selected ? 'color-mix(in srgb, var(--text) 6%, transparent)' : 'var(--bg-elev)', 
                        color: selected ? 'var(--text)' : 'var(--text)', 
                        border: selected ? '1px solid color-mix(in srgb, var(--text) 6%, transparent)' : '1px solid color-mix(in srgb, var(--text) 4%, transparent)', 
                        boxShadow: 'none', 
                        display: 'flex', 
                        flexDirection: 'column',
                        gap: 6, 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        transition: 'transform 100ms ease, box-shadow 140ms ease, background 140ms ease', 
                        fontSize: 11,
                        fontWeight: selected ? 700 : 600,
                        cursor: 'pointer',
                        minHeight: 44,
                        lineHeight: 1
                      }}
                      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.06)'; }}
                      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
                      >
                        <span aria-hidden style={{ width: 28, height: 14, background: selected ? 'color-mix(in srgb, var(--bg-elev) 92%, color-mix(in srgb, var(--text) 6%, transparent))' : 'color-mix(in srgb, var(--text) 4%, transparent)', borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative', border: selected ? '1px solid color-mix(in srgb, var(--text) 8%, transparent)' : '1px solid color-mix(in srgb, var(--text) 6%, transparent)', boxShadow: 'none', flexShrink: 0 }}>
                          <span style={{ width: previewInnerWidth, height: 8, background: selected ? 'color-mix(in srgb, var(--text) 36%, #fff)' : 'color-mix(in srgb, var(--text) 28%, #fff)', borderRadius: 3, display: 'block', border: '1px solid color-mix(in srgb, var(--text) 10%, transparent)' }} />
                        </span>
                        <span style={{ fontSize: 11, fontWeight: selected ? 700 : 600, opacity: selected ? 1 : 0.85, lineHeight: 1 }}>{r.label}</span>
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
                        const previewInnerWidth = Math.round(14 * previewRatio);
                        return (
                          <div key={r.label} style={{ flex: '0 0 64px' }}>
                            <button type="button" onClick={() => {
                              // mirror desktop behavior: clicking the already-selected preset clears the crop
                              setPresetIndex(i);
                              const already = cropRatio.current === r.v;
                              if (already) {
                                cropRatio.current = null;
                                setSel(null);
                                return;
                              }
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
                            }} aria-pressed={selected} style={{ minWidth: 48, padding: '4px 6px', borderRadius: 6, background: selected ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)', color: selected ? 'var(--text)' : 'var(--text)', border: selected ? '1px solid color-mix(in srgb, var(--text) 6%, transparent)' : '1px solid color-mix(in srgb, var(--text) 4%, transparent)', boxShadow: 'none', display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-start', transition: 'transform 100ms ease, box-shadow 140ms ease, background 140ms ease', fontSize: 11 }}>
                              <span aria-hidden style={{ width: 28, height: 14, background: selected ? 'color-mix(in srgb, var(--primary) 6%, transparent)' : 'color-mix(in srgb, var(--text) 4%, transparent)', borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative', border: selected ? '1px solid color-mix(in srgb, var(--text) 8%, transparent)' : '1px solid color-mix(in srgb, var(--text) 6%, transparent)', boxShadow: 'none' }}>
                                <span style={{ width: previewInnerWidth, height: 8, background: selected ? 'color-mix(in srgb, var(--text) 82%, #fff)' : 'color-mix(in srgb, var(--text) 58%, #fff)', borderRadius: 3, display: 'block', border: '1px solid color-mix(in srgb, var(--text) 10%, transparent)' }} />
                              </span>
                              <span style={{ fontSize: 11, fontWeight: 600, opacity: selected ? 1 : 0.95 }}>{r.label}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <button type="button" aria-label="Next preset" onClick={() => setPresetIndex((presetIndex + 1) % ASPECT_PRESETS.length)} style={{ padding: 6, borderRadius: 8, border: 'none', background: 'transparent', fontSize: 18 }}>▶</button>
                </div>

                <style>{`
                  /* Always show the full presets grid; hide the carousel variant */
                  .aspect-presets-grid { display: grid !important; }
                  .aspect-presets-carousel { display: none !important; }
                  /* Ensure aspect buttons don't wrap text */
                  .aspect-presets-grid button { white-space: nowrap; overflow: visible; }
                `}</style>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ width: 120, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button type="button" title="Rotate -90°" onClick={async () => { await bakeRotateMinus90(); /* after bake, keep slider controlled rotation at 0 so user can fine-tune */ rotationRef.current = 0; setRotation(0); draw(); }} className="btn icon ghost" aria-label="Rotate -90°" style={{ padding: 6, borderRadius: 8 }}>
                      <RotateCw size={14} aria-hidden />
                    </button>
                    <button type="button" title="Rotate +90°" onClick={async () => { await bakeRotate90(); rotationRef.current = 0; setRotation(0); draw(); }} className="btn icon ghost" aria-label="Rotate +90°" style={{ padding: 6, borderRadius: 8 }}>
                      <RotateCcw size={14} aria-hidden />
                    </button>
                  </div>
                  <span className="sr-only">Straighten</span>
                </span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1 }}>
                  <input className="imgedit-range" type="range" min={-30} max={30} step={0.1} value={rotation} onInput={(e:any) => { const v = Number(e.target.value); rotationRef.current = v; setRotation(v); draw(); }} style={{ flex: 1, background: rangeBg(rotation, -30, 30, '#a8d8ff', 'rgba(255,255,255,0.06)') }} />
                </div>
              </label>
            </div>
          </div>

          {/* Frame panel */}
          <div className="imgedit-panel-inner" style={{ display: selectedCategory === 'frame' ? 'grid' : 'none', width: '100%' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}><span className="sr-only">Photo Frame</span></div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <label style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ width: 100, display: 'flex', gap: 6, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
                    <Ruler size={18} strokeWidth={2} aria-hidden />
                    <span>Thickness</span>
                  </span>
                  <input className="imgedit-range" type="range" min={0} max={0.2} step={0.005} value={frameThickness} onInput={(e:any) => { const v = Number(e.target.value); frameThicknessRef.current = v; setFrameThickness(v); draw(); }} style={{ flex: 1, background: rangeBg(frameThickness, 0, 0.2, '#d4c5b9', '#8b7355') }} />
                </label>

                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}><span className="sr-only">Frame Color</span></div>
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
