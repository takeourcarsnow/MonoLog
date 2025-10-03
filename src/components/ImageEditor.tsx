"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { RotateCcw, RotateCw, RefreshCw, X, Check, Circle, Film, Droplet, Feather, Camera, Sun, Snowflake, Clapperboard, Sliders, Palette, Sparkles, Image as ImageIcon, Scissors, SunDim, Scale, Rainbow, Thermometer, Aperture, Layers, ZapOff, Square, Ruler } from "lucide-react";
import BasicPanel from './imageEditor/panels/BasicPanel';
import ColorPanel from './imageEditor/panels/ColorPanel';
import EffectsPanel from './imageEditor/panels/EffectsPanel';
import CropPanel from './imageEditor/panels/CropPanel';
import FramePanel from './imageEditor/panels/FramePanel';
import { draw as canvasDraw } from './imageEditor/CanvasRenderer';
import { FILTER_PRESETS, CATEGORY_COLORS, FILTER_COLORS } from './imageEditor/constants';
import { rangeBg, announceDirection } from './imageEditor/utils';
import type { EditorSettings } from './imageEditor/types';

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
  // v range 0.2..1.8 -> normalize to 0..1 (we keep neutral=1 centered)
  const EXPOSURE_MIN = 0.2;
  const EXPOSURE_MAX = 1.8;
  const t = Math.max(0, Math.min(1, (v - EXPOSURE_MIN) / (EXPOSURE_MAX - EXPOSURE_MIN)));
  return lerpColor('#fff6db', '#ffd166', t);
}

function contrastColor(v: number) {
  // contrast uses same numeric range as exposure so normalize against the same bounds
  const CONTRAST_MIN = 0.2;
  const CONTRAST_MAX = 1.8;
  const t = Math.max(0, Math.min(1, (v - CONTRAST_MIN) / (CONTRAST_MAX - CONTRAST_MIN)));
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



export default function ImageEditor({ initialDataUrl, initialSettings, onCancel, onApply }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const originalImgRef = useRef<HTMLImageElement | null>(null);
  const [imageSrc, setImageSrc] = useState(initialDataUrl);
  const originalRef = useRef<string>(initialDataUrl);
  const [previewOriginal, setPreviewOriginal] = useState(false);
  const previewPointerIdRef = useRef<number | null>(null);
  const previewOriginalRef = useRef<boolean>(false);

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
    // preload original (unedited) image for instant preview when pressed
    try {
      const oimg = new Image();
      oimg.crossOrigin = 'anonymous';
      oimg.onload = () => { originalImgRef.current = oimg; };
      oimg.src = originalRef.current;
    } catch (e) {
      // ignore preload errors
    }
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
    const canvas = canvasRef.current;
    const img = previewOriginalRef.current && originalImgRef.current ? originalImgRef.current : imgRef.current;
    if (!canvas || !img) return;
  canvasDraw({
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
    computeImageLayout
  }, info, overrides);
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
    // We'll only enable the A/B preview for pan interactions. For crop-related
    // interactions (draw/resize/move) we should NOT show the original preview while dragging.
    // So defer setting previewOriginal until we've determined the action below.
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

      // If clicked inside existing selection, prepare to move (do NOT enable preview)
      if (sel && p.x >= sel.x && p.x <= sel.x + sel.w && p.y >= sel.y && p.y <= sel.y + sel.h) {
        dragging.current = { startX: p.x, startY: p.y, mode: 'crop', action: 'move', origSel: { ...sel }, anchorX: p.x - sel.x, anchorY: p.y - sel.y };
        return;
      }

      // Only start drawing a new crop if Crop category is active AND an aspect preset is selected.
      // If no aspect ratio is selected (free mode), treat the click as a pan so the user still gets the
      // A/B preview on press instead of immediately creating a selection.
      if (selectedCategory === 'crop' && cropRatio.current != null) {
        dragging.current = { startX: p.x, startY: p.y, mode: 'crop', action: 'draw' };
        setSel({ x: p.x, y: p.y, w: 0, h: 0 });
        return;
      }

      // Default: start panning (click on image should not create a new crop when not in crop mode)
      dragging.current = { startX: p.x, startY: p.y, mode: 'pan' };
      // Enable A/B preview for pan interactions only
      previewPointerIdRef.current = ev.pointerId ?? null;
      previewOriginalRef.current = true;
      setPreviewOriginal(true);
      // Ensure the canvas repaints to show the unedited original immediately
      requestAnimationFrame(() => draw());
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
      // Only clear the preview if this pointer matches the one that started it
      if (previewPointerIdRef.current == null || previewPointerIdRef.current === ev.pointerId) {
        previewOriginalRef.current = false;
        setPreviewOriginal(false);
        previewPointerIdRef.current = null;
      }
      draw();
    };
  canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    const onPointerCancel = (ev: PointerEvent) => {
      if (previewPointerIdRef.current == null || previewPointerIdRef.current === ev.pointerId) {
        setPreviewOriginal(false);
        previewPointerIdRef.current = null;
      }
      dragging.current = null;
    };
    window.addEventListener('pointercancel', onPointerCancel);
  // no keyboard modifiers — panning is done by dragging outside/inside selection as before
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
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

  // Reset a single control to its default value (used by double-click on sliders)
  function resetControlToDefault(control: string) {
    switch (control) {
      case 'exposure': {
        const v = 1;
        exposureRef.current = v; setExposure(v); draw(undefined, { exposure: v }); requestAnimationFrame(() => draw());
        break;
      }
      case 'contrast': {
        const v = 1;
        contrastRef.current = v; setContrast(v); draw(undefined, { contrast: v }); requestAnimationFrame(() => draw());
        break;
      }
      case 'saturation': {
        const v = 1;
        saturationRef.current = v; setSaturation(v); draw(undefined, { saturation: v }); requestAnimationFrame(() => draw());
        break;
      }
      case 'temperature': {
        const v = 0;
        temperatureRef.current = v; setTemperature(v); draw(undefined, { temperature: v }); requestAnimationFrame(() => draw());
        break;
      }
      case 'filterStrength': {
        const v = 1;
        filterStrengthRef.current = v; setFilterStrength(v); draw(); requestAnimationFrame(() => draw());
        break;
      }
      case 'vignette': {
        const v = 0;
        vignetteRef.current = v; setVignette(v); draw(undefined, { vignette: v }); requestAnimationFrame(() => draw());
        break;
      }
      case 'grain': {
        const v = 0;
        grainRef.current = v; setGrain(v); draw(undefined, { grain: v }); requestAnimationFrame(() => draw());
        break;
      }
      case 'softFocus': {
        const v = 0;
        softFocusRef.current = v; setSoftFocus(v); draw(); requestAnimationFrame(() => draw());
        break;
      }
      case 'fade': {
        const v = 0;
        fadeRef.current = v; setFade(v); draw(); requestAnimationFrame(() => draw());
        break;
      }
      case 'matte': {
        const v = 0;
        matteRef.current = v; setMatte(v); draw(); requestAnimationFrame(() => draw());
        break;
      }
      case 'rotation': {
        const v = 0;
        rotationRef.current = v; setRotation(v); draw(); requestAnimationFrame(() => draw());
        break;
      }
      case 'frameThickness': {
        const v = 0;
        frameThicknessRef.current = v; setFrameThickness(v); draw(); requestAnimationFrame(() => draw());
        break;
      }
      default:
        break;
    }
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

  // Apply only the current crop (and rotation) to the image without confirming all edits.
  // This bakes geometry (crop + rotation) into the underlying image source so the user
  // can continue editing other adjustments afterwards.
  async function applyCropOnly() {
    const img = imgRef.current; if (!img) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const baseScale = Math.min(rect.width / img.naturalWidth, rect.height / img.naturalHeight);

    if (!sel) return; // nothing to crop

    // Map selection (canvas coords) back to source image pixels
    const srcX = Math.max(0, Math.round((sel.x - offset.x) / baseScale));
    const srcY = Math.max(0, Math.round((sel.y - offset.y) / baseScale));
    const srcW = Math.max(1, Math.round(sel.w / baseScale));
    const srcH = Math.max(1, Math.round(sel.h / baseScale));

    // Handle rotation: bake rotation into the new image and then reset the rotation slider
    const rot = rotationRef.current ?? rotation;
    const angle = (rot * Math.PI) / 180;
    const absCos = Math.abs(Math.cos(angle));
    const absSin = Math.abs(Math.sin(angle));
    const outW = Math.max(1, Math.round((srcW) * absCos + (srcH) * absSin));
    const outH = Math.max(1, Math.round((srcW) * absSin + (srcH) * absCos));

    const out = document.createElement('canvas');
    out.width = outW; out.height = outH;
    const octx = out.getContext('2d')!;
    octx.imageSmoothingQuality = 'high';

    // Draw the selected source region into the center of the output canvas with rotation applied.
    octx.save();
    octx.translate(outW / 2, outH / 2);
    octx.rotate(angle);
    // draw the selected region centered
    octx.drawImage(img, srcX, srcY, srcW, srcH, -srcW / 2, -srcH / 2, srcW, srcH);
    octx.restore();

    // Replace working image with the cropped version (keep adjustments intact)
    const dataUrl = out.toDataURL('image/png');
    setImageSrc(dataUrl);
    // Clear selection and reset pan/rotation since geometry is baked
    setSel(null);
    setOffset({ x: 0, y: 0 });
    rotationRef.current = 0; setRotation(0);
    // allow the new image to load and then redraw
    requestAnimationFrame(() => {
      const info = computeImageLayout();
      if (info) { setOffset({ x: info.left, y: info.top }); draw(info); }
      else draw();
    });
  }

  // Reset crop selection and aspect preset without affecting other edits
  function resetCrop() {
    // If the underlying working image was replaced by a baked crop, restore
    // the original (uncropped) image. Do not reset color adjustments — only
    // undo geometry (crop/rotation/preset/selection).
    if (imageSrc !== originalRef.current) {
      setImageSrc(originalRef.current);
      // Clear any baked rotation as well so the photo returns to its original geometry
      rotationRef.current = 0; setRotation(0);
    }

    cropRatio.current = null;
    setSel(null);
    setPresetIndex(0);
    // clear any active drag state and A/B preview
    if (dragging.current) dragging.current = null;
    previewPointerIdRef.current = null;
    previewOriginalRef.current = false;
    setPreviewOriginal(false);
    // recentre image in canvas and redraw
    requestAnimationFrame(() => {
      const info = computeImageLayout();
      if (info) { setOffset({ x: info.left, y: info.top }); draw(info); }
      else draw();
    });
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
          /* unified heat gradient used across primary sliders */
          --slider-heat-start: #2d9cff;
          --slider-heat-end: #ffd166;
          /* rotation slider colors: left is subtle blue, right is warm so the track forms a blue->warm heat gradient */
          --slider-rotation-start: var(--slider-heat-start);
          --slider-rotation-end: var(--slider-heat-end);
        }
        /* Prefer a slightly lighter/whiter right-side color in dark mode so the filled portion remains visible */
        @media (prefers-color-scheme: dark) {
          .image-editor {
            --slider-rotation-end: #ffdc99;
          }
        }
        /* visually-hidden helper for screen readers */
        .sr-only { position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 12, gap: 12, flexWrap: 'wrap', padding: '4px 0' }}>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>
          <span className="sr-only">Edit Photo</span>
        </div>
  <div className="image-editor-buttons" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
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

      {/* compact the header buttons on desktop to free horizontal editor space */}
      <style>{`
        @media (min-width: 720px) {
          /* much narrower header icon buttons */
          .image-editor .image-editor-buttons { gap: 4px; }
          .image-editor .btn.icon.ghost {
            padding: 4px;
            width: 28px;
            height: 28px;
            min-width: 28px;
            border-radius: 6px;
          }
          .image-editor .btn.icon.ghost svg { width: 12px; height: 12px; }

          /* tighten category pills to avoid forcing header width */
          .image-editor .cat-btn { padding: 6px 8px; border-radius: 8px; }
          /* keep labels short and only visible when active */
          .image-editor .cat-btn .cat-label { max-width: 56px; }

          /* reduce top header vertical spacing slightly */
          .image-editor > div[style] { margin-bottom: 8px; }
        }
      `}</style>

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
          <BasicPanel
            exposure={exposure}
            setExposure={setExposure}
            exposureRef={exposureRef}
            contrast={contrast}
            setContrast={setContrast}
            contrastRef={contrastRef}
            saturation={saturation}
            setSaturation={setSaturation}
            saturationRef={saturationRef}
            temperature={temperature}
            setTemperature={setTemperature}
            temperatureRef={temperatureRef}
            draw={draw}
            resetControlToDefault={resetControlToDefault}
          />

          {/* Color panel */}
          <ColorPanel
            selectedFilter={selectedFilter}
            setSelectedFilter={setSelectedFilter}
            selectedFilterRef={selectedFilterRef}
            filterStrength={filterStrength}
            setFilterStrength={setFilterStrength}
            filterStrengthRef={filterStrengthRef}
            draw={draw}
            resetControlToDefault={resetControlToDefault}
            filtersContainerRef={filtersContainerRef}
            filterHighlight={filterHighlight}
          />

          {/* Effects panel */}
          <EffectsPanel
            vignette={vignette}
            setVignette={setVignette}
            vignetteRef={vignetteRef}
            grain={grain}
            setGrain={setGrain}
            grainRef={grainRef}
            softFocus={softFocus}
            setSoftFocus={setSoftFocus}
            softFocusRef={softFocusRef}
            fade={fade}
            setFade={setFade}
            fadeRef={fadeRef}
            matte={matte}
            setMatte={setMatte}
            matteRef={matteRef}
            draw={draw}
            resetControlToDefault={resetControlToDefault}
          />

          {/* Crop panel */}
          <CropPanel
            sel={sel}
            setSel={setSel}
            cropRatio={cropRatio}
            presetIndex={presetIndex}
            setPresetIndex={setPresetIndex}
            rotation={rotation}
            setRotation={setRotation}
            rotationRef={rotationRef}
            draw={draw}
            resetControlToDefault={resetControlToDefault}
            computeImageLayout={computeImageLayout}
            canvasRef={canvasRef}
            applyCropOnly={applyCropOnly}
            resetCrop={resetCrop}
            imageSrc={imageSrc}
            originalRef={originalRef}
            bakeRotate90={bakeRotate90}
            bakeRotateMinus90={bakeRotateMinus90}
          />

          {/* Frame panel */}
          <FramePanel
            frameThickness={frameThickness}
            setFrameThickness={setFrameThickness}
            frameThicknessRef={frameThicknessRef}
            frameColor={frameColor}
            setFrameColor={setFrameColor}
            frameColorRef={frameColorRef}
            draw={draw}
            resetControlToDefault={resetControlToDefault}
          />
        </div>
      </div>
      {/* Bottom controls removed per request */}
    </div>
  );
}
