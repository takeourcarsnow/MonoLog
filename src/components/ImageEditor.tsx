"use client";

import { useEffect } from "react";
import { RotateCcw, RotateCw, RefreshCw, X, Check, Sliders, Palette, Sparkles, Scissors, ImageIcon } from "lucide-react";
import BasicPanel from './imageEditor/panels/BasicPanel';
import ColorPanel from './imageEditor/panels/ColorPanel';
import EffectsPanel from './imageEditor/panels/EffectsPanel';
import CropPanel from './imageEditor/panels/CropPanel';
import FramePanel from './imageEditor/panels/FramePanel';
import { draw as canvasDraw } from './imageEditor/CanvasRenderer';
import { rangeBg } from './imageEditor/utils';
import type { EditorSettings } from './imageEditor/types';
import { useImageEditorState } from './imageEditor/hooks/useImageEditorState';
import { useCanvasEvents } from './imageEditor/hooks/useCanvasEvents';
import { useCanvasLayout } from './imageEditor/hooks/useCanvasLayout';
import { useHighlights, useAnimations, useSliderEvents } from './imageEditor/hooks/useUI';
import {
  applyEdit,
  applyCropOnly,
  resetAll,
  resetAdjustments,
  resetCrop,
  resetControlToDefault,
  bakeRotate90,
  bakeRotateMinus90
} from './imageEditor/exportUtils';

// Category colors for active state icons
const CATEGORY_COLORS = {
  basic: 'var(--primary)',
  color: '#ff6b6b',
  effects: '#ffd166',
  crop: '#4ecdc4',
  frame: '#45b7d1'
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
  // Use custom hooks for state management
  const state = useImageEditorState(initialDataUrl, initialSettings);

  // Canvas layout and drawing
  const { computeImageLayout } = useCanvasLayout({
    canvasRef: state.canvasRef,
    containerRef: state.containerRef,
    imgRef: state.imgRef,
    originalImgRef: state.originalImgRef,
    previewOriginalRef: state.previewOriginalRef,
    offset: state.offset,
    setOffset: state.setOffset,
    sel: state.sel,
    setSel: state.setSel,
    setMounted: state.setMounted,
    imageSrc: state.imageSrc,
    originalRef: state.originalRef,
    exposureRef: state.exposureRef,
    contrastRef: state.contrastRef,
    saturationRef: state.saturationRef,
    temperatureRef: state.temperatureRef,
    vignetteRef: state.vignetteRef,
    frameColorRef: state.frameColorRef,
    frameThicknessRef: state.frameThicknessRef,
    selectedFilterRef: state.selectedFilterRef,
    filterStrengthRef: state.filterStrengthRef,
    grainRef: state.grainRef,
    softFocusRef: state.softFocusRef,
    fadeRef: state.fadeRef,
    matteRef: state.matteRef,
    rotationRef: state.rotationRef,
    dashOffsetRef: state.dashOffsetRef,
  });

  // Canvas events
  useCanvasEvents({
    canvasRef: state.canvasRef,
    containerRef: state.containerRef,
    imgRef: state.imgRef,
    originalImgRef: state.originalImgRef,
    previewOriginalRef: state.previewOriginalRef,
    offset: state.offset,
    setOffset: state.setOffset,
    sel: state.sel,
    setSel: state.setSel,
    dragging: state.dragging,
    selectedCategory: state.selectedCategory,
    cropRatio: state.cropRatio,
    previewPointerIdRef: state.previewPointerIdRef,
    setPreviewOriginal: state.setPreviewOriginal,
    computeImageLayout,
    exposureRef: state.exposureRef,
    contrastRef: state.contrastRef,
    saturationRef: state.saturationRef,
    temperatureRef: state.temperatureRef,
    vignetteRef: state.vignetteRef,
    frameColorRef: state.frameColorRef,
    frameThicknessRef: state.frameThicknessRef,
    selectedFilterRef: state.selectedFilterRef,
    filterStrengthRef: state.filterStrengthRef,
    grainRef: state.grainRef,
    softFocusRef: state.softFocusRef,
    fadeRef: state.fadeRef,
    matteRef: state.matteRef,
    rotationRef: state.rotationRef,
    dashOffsetRef: state.dashOffsetRef,
  });

  // UI highlights and animations
  useHighlights({
    selectedCategory: state.selectedCategory,
    selectedFilter: state.selectedFilter,
    selectedCategoryRef: { current: state.selectedCategory },
    filtersContainerRef: state.filtersContainerRef,
    categoriesContainerRef: state.categoriesContainerRef,
    setFilterHighlight: state.setFilterHighlight,
    setCategoryHighlight: state.setCategoryHighlight,
    suppressFilterTransitionRef: state.suppressFilterTransitionRef,
  });

  useAnimations({
    sel: state.sel,
    dashOffsetRef: state.dashOffsetRef,
    dashAnimRef: state.dashAnimRef,
    draw: () => canvasDraw({
      canvasRef: state.canvasRef,
      imgRef: state.imgRef,
      originalImgRef: state.originalImgRef,
      previewOriginalRef: state.previewOriginalRef,
      offset: state.offset,
      sel: state.sel,
      exposureRef: state.exposureRef,
      contrastRef: state.contrastRef,
      saturationRef: state.saturationRef,
      temperatureRef: state.temperatureRef,
      vignetteRef: state.vignetteRef,
      frameColorRef: state.frameColorRef,
      frameThicknessRef: state.frameThicknessRef,
      selectedFilterRef: state.selectedFilterRef,
      filterStrengthRef: state.filterStrengthRef,
      grainRef: state.grainRef,
      softFocusRef: state.softFocusRef,
      fadeRef: state.fadeRef,
      matteRef: state.matteRef,
      rotationRef: state.rotationRef,
      dashOffsetRef: state.dashOffsetRef,
      computeImageLayout
    }),
  });

  useSliderEvents({ containerRef: state.containerRef });

  // redraw whenever any adjustment state changes to avoid stale-draw races
  useEffect(() => {
    // small RAF to batch with potential layout changes
    requestAnimationFrame(() => canvasDraw({
      canvasRef: state.canvasRef,
      imgRef: state.imgRef,
      originalImgRef: state.originalImgRef,
      previewOriginalRef: state.previewOriginalRef,
      offset: state.offset,
      sel: state.sel,
      exposureRef: state.exposureRef,
      contrastRef: state.contrastRef,
      saturationRef: state.saturationRef,
      temperatureRef: state.temperatureRef,
      vignetteRef: state.vignetteRef,
      frameColorRef: state.frameColorRef,
      frameThicknessRef: state.frameThicknessRef,
      selectedFilterRef: state.selectedFilterRef,
      filterStrengthRef: state.filterStrengthRef,
      grainRef: state.grainRef,
      softFocusRef: state.softFocusRef,
      fadeRef: state.fadeRef,
      matteRef: state.matteRef,
      rotationRef: state.rotationRef,
      dashOffsetRef: state.dashOffsetRef,
      computeImageLayout
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.exposure, state.contrast, state.saturation, state.temperature, state.vignette, state.selectedFilter, state.grain, state.softFocus, state.fade, state.matte, state.sel, state.offset]);

  // Helper functions
  const draw = () => canvasDraw({
    canvasRef: state.canvasRef,
    imgRef: state.imgRef,
    originalImgRef: state.originalImgRef,
    previewOriginalRef: state.previewOriginalRef,
    offset: state.offset,
    sel: state.sel,
    exposureRef: state.exposureRef,
    contrastRef: state.contrastRef,
    saturationRef: state.saturationRef,
    temperatureRef: state.temperatureRef,
    vignetteRef: state.vignetteRef,
    frameColorRef: state.frameColorRef,
    frameThicknessRef: state.frameThicknessRef,
    selectedFilterRef: state.selectedFilterRef,
    filterStrengthRef: state.filterStrengthRef,
    grainRef: state.grainRef,
    softFocusRef: state.softFocusRef,
    fadeRef: state.fadeRef,
    matteRef: state.matteRef,
    rotationRef: state.rotationRef,
    dashOffsetRef: state.dashOffsetRef,
    computeImageLayout
  });

  const handleApplyEdit = () => applyEdit({
    imgRef: state.imgRef,
    canvasRef: state.canvasRef,
    sel: state.sel,
    offset: state.offset,
    exposure: state.exposure,
    contrast: state.contrast,
    saturation: state.saturation,
    temperature: state.temperature,
    vignette: state.vignette,
    frameColor: state.frameColor,
    frameThickness: state.frameThickness,
    selectedFilter: state.selectedFilter,
    filterStrength: state.filterStrength,
    grain: state.grain,
    softFocus: state.softFocus,
    fade: state.fade,
    matte: state.matte,
    rotation: state.rotation,
    rotationRef: state.rotationRef,
    onApply,
  });

  const handleApplyCropOnly = () => applyCropOnly({
    imgRef: state.imgRef,
    canvasRef: state.canvasRef,
    sel: state.sel,
    offset: state.offset,
    setImageSrc: state.setImageSrc,
    setSel: state.setSel,
    setOffset: state.setOffset,
    rotationRef: state.rotationRef,
    setRotation: state.setRotation,
    computeImageLayout,
    draw,
  });

  const handleResetAll = () => resetAll({
    setImageSrc: state.setImageSrc,
    originalRef: state.originalRef,
    setSel: state.setSel,
    setOffset: state.setOffset,
    setExposure: state.setExposure,
    exposureRef: state.exposureRef,
    setContrast: state.setContrast,
    contrastRef: state.contrastRef,
    setSaturation: state.setSaturation,
    saturationRef: state.saturationRef,
    setTemperature: state.setTemperature,
    temperatureRef: state.temperatureRef,
    setVignette: state.setVignette,
    vignetteRef: state.vignetteRef,
    setFrameColor: state.setFrameColor,
    frameColorRef: state.frameColorRef,
    setFrameThickness: state.setFrameThickness,
    frameThicknessRef: state.frameThicknessRef,
    setSelectedFilter: state.setSelectedFilter,
    selectedFilterRef: state.selectedFilterRef,
    setFilterStrength: state.setFilterStrength,
    filterStrengthRef: state.filterStrengthRef,
    setGrain: state.setGrain,
    grainRef: state.grainRef,
    setSoftFocus: state.setSoftFocus,
    softFocusRef: state.softFocusRef,
    setFade: state.setFade,
    fadeRef: state.fadeRef,
    setMatte: state.setMatte,
    matteRef: state.matteRef,
    rotationRef: state.rotationRef,
    setRotation: state.setRotation,
    cropRatio: state.cropRatio,
    setPresetIndex: state.setPresetIndex,
    computeImageLayout,
    draw,
  });

  const handleResetAdjustments = () => resetAdjustments({
    setExposure: state.setExposure,
    exposureRef: state.exposureRef,
    setContrast: state.setContrast,
    contrastRef: state.contrastRef,
    setSaturation: state.setSaturation,
    saturationRef: state.saturationRef,
    setTemperature: state.setTemperature,
    temperatureRef: state.temperatureRef,
    setVignette: state.setVignette,
    vignetteRef: state.vignetteRef,
    setFrameColor: state.setFrameColor,
    frameColorRef: state.frameColorRef,
    setFrameThickness: state.setFrameThickness,
    frameThicknessRef: state.frameThicknessRef,
    setSelectedFilter: state.setSelectedFilter,
    selectedFilterRef: state.selectedFilterRef,
    setFilterStrength: state.setFilterStrength,
    filterStrengthRef: state.filterStrengthRef,
    setGrain: state.setGrain,
    grainRef: state.grainRef,
    setSoftFocus: state.setSoftFocus,
    softFocusRef: state.softFocusRef,
    setFade: state.setFade,
    fadeRef: state.fadeRef,
    setMatte: state.setMatte,
    matteRef: state.matteRef,
    rotationRef: state.rotationRef,
    setRotation: state.setRotation,
    setSel: state.setSel,
    cropRatio: state.cropRatio,
    setPresetIndex: state.setPresetIndex,
    draw,
  });

  const handleResetCrop = () => resetCrop({
    setImageSrc: state.setImageSrc,
    originalRef: state.originalRef,
    imageSrc: state.imageSrc,
    setSel: state.setSel,
    setOffset: state.setOffset,
    rotationRef: state.rotationRef,
    setRotation: state.setRotation,
    cropRatio: state.cropRatio,
    setPresetIndex: state.setPresetIndex,
    computeImageLayout,
    draw,
  });

  const handleResetControlToDefault = (control: string) => resetControlToDefault(control, {
    exposureRef: state.exposureRef,
    setExposure: state.setExposure,
    contrastRef: state.contrastRef,
    setContrast: state.setContrast,
    saturationRef: state.saturationRef,
    setSaturation: state.setSaturation,
    temperatureRef: state.temperatureRef,
    setTemperature: state.setTemperature,
    filterStrengthRef: state.filterStrengthRef,
    setFilterStrength: state.setFilterStrength,
    vignetteRef: state.vignetteRef,
    setVignette: state.setVignette,
    grainRef: state.grainRef,
    setGrain: state.setGrain,
    softFocusRef: state.softFocusRef,
    setSoftFocus: state.setSoftFocus,
    fadeRef: state.fadeRef,
    setFade: state.setFade,
    matteRef: state.matteRef,
    setMatte: state.setMatte,
    rotationRef: state.rotationRef,
    setRotation: state.setRotation,
    frameThicknessRef: state.frameThicknessRef,
    setFrameThickness: state.setFrameThickness,
  }, draw);

  const handleBakeRotate90 = async () => {
    bakeRotate90({
      imgRef: state.imgRef,
      setImageSrc: state.setImageSrc,
      setSel: state.setSel,
      setOffset: state.setOffset,
    });
  };

  const handleBakeRotateMinus90 = async () => {
    bakeRotateMinus90({
      imgRef: state.imgRef,
      setImageSrc: state.setImageSrc,
      setSel: state.setSel,
      setOffset: state.setOffset,
    });
  };

  return (
    <div
      ref={state.containerRef}
      tabIndex={0}
      onKeyDown={(e) => {
        const k = (e as any).key;
        if (k === 'Enter') { handleApplyEdit(); }
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
  transform: state.mounted ? 'translateY(0)' : 'translateY(6px)',
  opacity: state.mounted ? 1 : 0,
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
          <button type="button" className="btn icon ghost" title="Reset adjustments" onClick={handleResetAdjustments} aria-label="Reset adjustments">
            <RefreshCw size={16} aria-hidden />
            <span className="sr-only">Reset adjustments</span>
          </button>

          {/* Confirm (match other icon buttons - subtle) */}
          <button type="button" className={`btn icon ghost`} onClick={handleApplyEdit} aria-pressed={state.isEdited} aria-label="Confirm edits" title="Confirm edits">
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
          ref={state.canvasRef}
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
  <div ref={state.categoriesContainerRef} className="categories-scroll" style={{ position: 'relative', display: 'flex', gap: 10, marginTop: 16, justifyContent: 'center', flexWrap: 'nowrap', overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: 820, margin: '16px auto 0', padding: '8px 10px', alignItems: 'center', whiteSpace: 'nowrap', background: 'color-mix(in srgb, var(--bg-elev) 70%, transparent)', borderRadius: 12, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)' }}>
  <div aria-hidden style={{ position: 'absolute', left: state.categoryHighlight?.left ?? 0, top: state.categoryHighlight?.top ?? 0, width: state.categoryHighlight?.width ?? 0, height: state.categoryHighlight?.height ?? 0, borderRadius: 8, background: 'color-mix(in srgb, var(--primary) 10%, transparent)', transition: 'left 220ms cubic-bezier(.2,.9,.2,1), width 220ms cubic-bezier(.2,.9,.2,1), top 220ms cubic-bezier(.2,.9,.2,1), height 220ms cubic-bezier(.2,.9,.2,1), opacity 160ms ease', pointerEvents: 'none', opacity: state.categoryHighlight ? 0.95 : 0, zIndex: 0, boxShadow: 'none', border: '1px solid color-mix(in srgb, var(--text) 6%, transparent)' }} />
  <button
    data-cat="basic"
    data-active={state.selectedCategory === 'basic'}
    type="button"
    aria-label="Basic"
    title="Basic"
    className="cat-btn"
    onClick={(e: any) => { try { e.currentTarget.animate([{ transform: 'scale(0.94)' }, { transform: 'scale(1)' }], { duration: 240, easing: 'cubic-bezier(.2,.9,.2,1)' }); } catch {} state.setSelectedCategory('basic'); }}
  style={{ padding: '10px 12px', borderRadius: 10, background: state.selectedCategory === 'basic' ? 'transparent' : 'transparent', color: 'var(--text)', transition: 'transform 140ms ease, box-shadow 220ms ease, color 220ms ease, width 200ms ease', position: 'relative', zIndex: 1, flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', fontWeight: state.selectedCategory === 'basic' ? 700 : 500, overflow: 'hidden' }}
  >
  <Sliders size={20} strokeWidth={2} aria-hidden style={{ flexShrink: 0, color: state.selectedCategory === 'basic' ? CATEGORY_COLORS.basic : undefined }} />
    <span className="cat-label" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>Basic</span>
  </button>

  <button
    data-cat="color"
    data-active={state.selectedCategory === 'color'}
    type="button"
    aria-label="Filters"
    title="Filters"
    className="cat-btn"
    onClick={(e: any) => { try { e.currentTarget.animate([{ transform: 'scale(0.94)' }, { transform: 'scale(1)' }], { duration: 240, easing: 'cubic-bezier(.2,.9,.2,1)' }); } catch {} state.setSelectedCategory('color'); }}
  style={{ padding: '10px 12px', borderRadius: 10, background: state.selectedCategory === 'color' ? 'transparent' : 'transparent', color: 'var(--text)', transition: 'transform 140ms ease, box-shadow 220ms ease, color 220ms ease, width 200ms ease', position: 'relative', zIndex: 1, flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', fontWeight: state.selectedCategory === 'color' ? 700 : 500, overflow: 'hidden' }}
  >
  <Palette size={20} strokeWidth={2} aria-hidden style={{ flexShrink: 0, color: state.selectedCategory === 'color' ? CATEGORY_COLORS.color : undefined }} />
    <span className="cat-label" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>Filters</span>
  </button>

  <button
    data-cat="effects"
    data-active={state.selectedCategory === 'effects'}
    type="button"
    aria-label="Effects"
    title="Effects"
    className="cat-btn"
    onClick={(e: any) => { try { e.currentTarget.animate([{ transform: 'scale(0.94)' }, { transform: 'scale(1)' }], { duration: 240, easing: 'cubic-bezier(.2,.9,.2,1)' }); } catch {} state.setSelectedCategory('effects'); }}
  style={{ padding: '10px 12px', borderRadius: 10, background: state.selectedCategory === 'effects' ? 'transparent' : 'transparent', color: 'var(--text)', transition: 'transform 140ms ease, box-shadow 220ms ease, color 220ms ease, width 200ms ease', position: 'relative', zIndex: 1, flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', fontWeight: state.selectedCategory === 'effects' ? 700 : 500, overflow: 'hidden' }}
  >
  <Sparkles size={20} strokeWidth={2} aria-hidden style={{ flexShrink: 0, color: state.selectedCategory === 'effects' ? CATEGORY_COLORS.effects : undefined }} />
    <span className="cat-label" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>Effects</span>
  </button>

  <button
    data-cat="crop"
    data-active={state.selectedCategory === 'crop'}
    type="button"
    aria-label="Crop"
    title="Crop"
    className="cat-btn"
    onClick={(e: any) => { try { e.currentTarget.animate([{ transform: 'scale(0.94)' }, { transform: 'scale(1)' }], { duration: 240, easing: 'cubic-bezier(.2,.9,.2,1)' }); } catch {} state.setSelectedCategory('crop'); }}
  style={{ padding: '10px 12px', borderRadius: 10, background: state.selectedCategory === 'crop' ? 'transparent' : 'transparent', color: 'var(--text)', transition: 'transform 120ms ease, box-shadow 220ms ease, color 220ms ease, width 200ms ease', position: 'relative', zIndex: 1, flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', fontWeight: state.selectedCategory === 'crop' ? 700 : 500, overflow: 'hidden' }}
  >
  <Scissors size={20} strokeWidth={2} aria-hidden style={{ flexShrink: 0, color: state.selectedCategory === 'crop' ? CATEGORY_COLORS.crop : undefined }} />
    <span className="cat-label" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>Crop</span>
  </button>

  <button
    data-cat="frame"
    data-active={state.selectedCategory === 'frame'}
    type="button"
    aria-label="Frame"
    title="Frame"
    className="cat-btn"
    onClick={(e: any) => { try { e.currentTarget.animate([{ transform: 'scale(0.94)' }, { transform: 'scale(1)' }], { duration: 240, easing: 'cubic-bezier(.2,.9,.2,1)' }); } catch {} state.setSelectedCategory('frame'); }}
  style={{ padding: '10px 12px', borderRadius: 10, background: state.selectedCategory === 'frame' ? 'transparent' : 'transparent', color: 'var(--text)', transition: 'transform 120ms ease, box-shadow 220ms ease, color 220ms ease, width 200ms ease', position: 'relative', zIndex: 1, flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', fontWeight: state.selectedCategory === 'frame' ? 700 : 500, overflow: 'hidden' }}
  >
  <ImageIcon size={20} strokeWidth={2} aria-hidden style={{ flexShrink: 0, color: state.selectedCategory === 'frame' ? CATEGORY_COLORS.frame : undefined }} />
    <span className="cat-label" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>Frame</span>
  </button>
  </div>

      {/* Sliding category panels container */}
  <div className="imgedit-panels" style={{ maxWidth: 820, margin: '16px auto 0', position: 'relative', borderRadius: 12, minHeight: 200 }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          {/* Basic panel */}
          <BasicPanel
            exposure={state.exposure}
            setExposure={state.setExposure}
            exposureRef={state.exposureRef}
            contrast={state.contrast}
            setContrast={state.setContrast}
            contrastRef={state.contrastRef}
            saturation={state.saturation}
            setSaturation={state.setSaturation}
            saturationRef={state.saturationRef}
            temperature={state.temperature}
            setTemperature={state.setTemperature}
            temperatureRef={state.temperatureRef}
            draw={draw}
            resetControlToDefault={handleResetControlToDefault}
          />

          {/* Color panel */}
          <ColorPanel
            selectedFilter={state.selectedFilter}
            setSelectedFilter={state.setSelectedFilter}
            selectedFilterRef={state.selectedFilterRef}
            filterStrength={state.filterStrength}
            setFilterStrength={state.setFilterStrength}
            filterStrengthRef={state.filterStrengthRef}
            draw={draw}
            resetControlToDefault={handleResetControlToDefault}
            filtersContainerRef={state.filtersContainerRef}
            filterHighlight={state.filterHighlight}
          />

          {/* Effects panel */}
          <EffectsPanel
            vignette={state.vignette}
            setVignette={state.setVignette}
            vignetteRef={state.vignetteRef}
            grain={state.grain}
            setGrain={state.setGrain}
            grainRef={state.grainRef}
            softFocus={state.softFocus}
            setSoftFocus={state.setSoftFocus}
            softFocusRef={state.softFocusRef}
            fade={state.fade}
            setFade={state.setFade}
            fadeRef={state.fadeRef}
            matte={state.matte}
            setMatte={state.setMatte}
            matteRef={state.matteRef}
            draw={draw}
            resetControlToDefault={handleResetControlToDefault}
          />

          {/* Crop panel */}
          <CropPanel
            sel={state.sel}
            setSel={state.setSel}
            cropRatio={state.cropRatio}
            presetIndex={state.presetIndex}
            setPresetIndex={state.setPresetIndex}
            rotation={state.rotation}
            setRotation={state.setRotation}
            rotationRef={state.rotationRef}
            draw={draw}
            resetControlToDefault={handleResetControlToDefault}
            computeImageLayout={computeImageLayout}
            canvasRef={state.canvasRef}
            applyCropOnly={handleApplyCropOnly}
            resetCrop={handleResetCrop}
            imageSrc={state.imageSrc}
            originalRef={state.originalRef}
            bakeRotate90={handleBakeRotate90}
            bakeRotateMinus90={handleBakeRotateMinus90}
          />

          {/* Frame panel */}
          <FramePanel
            frameThickness={state.frameThickness}
            setFrameThickness={state.setFrameThickness}
            frameThicknessRef={state.frameThicknessRef}
            frameColor={state.frameColor}
            setFrameColor={state.setFrameColor}
            frameColorRef={state.frameColorRef}
            draw={draw}
            resetControlToDefault={handleResetControlToDefault}
          />
        </div>
      </div>
      {/* Bottom controls removed per request */}
    </div>
  );
}
