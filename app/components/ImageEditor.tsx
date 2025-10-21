"use client";

import { useEffect, useMemo, useRef, useCallback } from "react";
import BasicPanel from './imageEditor/panels/BasicPanel';
import ColorPanel from './imageEditor/panels/ColorPanel';
import EffectsPanel from './imageEditor/panels/EffectsPanel';
import CropPanel from './imageEditor/panels/CropPanel';
import FramePanel from './imageEditor/panels/FramePanel';
import { FILTER_PRESETS, CATEGORY_COLORS } from './imageEditor/constants';
import { rangeBg, generateNoiseCanvas } from './imageEditor/utils';
import { useImageEditorState } from './imageEditor/useImageEditorState';
import { draw as canvasDraw } from './imageEditor/CanvasRenderer';
import type { EditorSettings } from './imageEditor/types';
import { useImageEditorActions } from './useImageEditorActions';
import { usePointerEvents } from './imageEditor/pointerEvents';
import { useSliderEvents } from './imageEditor/sliderEvents';
import { useImageEditorLayout } from './imageEditor/useImageEditorLayout';
import { useImageEditorHighlights } from './imageEditor/useImageEditorHighlights';
import { useDashAnimation } from './imageEditor/useDashAnimation';
import { drawImage } from './imageEditor/imageEditorDrawing';
import ImageEditorCanvas from './imageEditor/ImageEditorCanvas';
import ImageEditorToolbar, { ImageEditorToolbarHeader, ImageEditorToolbarCategories } from './imageEditor/ImageEditorToolbar';
import ImageEditorPanels from './imageEditor/ImageEditorPanels';
import { useKeyboardEvents } from './imageEditor/useKeyboardEvents';
import { useImageEditorDraw } from './imageEditor/useImageEditorDraw';
import './imageEditor/ImageEditor.css';
import { preloadOverlayThumbnails } from './imageEditor/overlaysPreload';

type Props = {
  initialDataUrl: string;
  initialSettings?: EditorSettings;
  onCancel: () => void;
  onApply: (dataUrl: string, settings: EditorSettings) => void;
};



import { useState } from "react";
import { Fullscreen } from "lucide-react";

export default function ImageEditor({ initialDataUrl, initialSettings, onCancel, onApply }: Props) {
  const {
    canvasRef,
    containerRef,
    imgRef,
    originalImgRef,
    imageSrc,
    setImageSrc,
    originalRef,
    previewOriginal,
    setPreviewOriginal,
    previewPointerIdRef,
    previewOriginalRef,
    offset,
    setOffset,
    dragging,
    sel,
    setSel,
    exposure,
    setExposure,
    contrast,
    setContrast,
    saturation,
    setSaturation,
    temperature,
    setTemperature,
    vignette,
    setVignette,
    frameColor,
    setFrameColor,
    frameThickness,
    setFrameThickness,
    controlsOpen,
    setControlsOpen,
    selectedCategory,
    setSelectedCategory,
    previousCategory,
    setPreviousCategory,
    ASPECT_PRESETS,
    presetIndex,
    setPresetIndex,
    selectedFilter,
    setSelectedFilter,
    filterStrength,
    setFilterStrength,
    rotation,
    setRotation,
    grain,
    setGrain,
    rotationRef,
    softFocus,
    setSoftFocus,
    fade,
    setFade,
    lightLeak,
    setLightLeak,
    overlay,
    setOverlay,
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
    lightLeakRef,
    overlayRef,
    filtersContainerRef,
    filterHighlight,
    setFilterHighlight,
    suppressFilterTransitionRef,
    categoriesContainerRef,
    categoryHighlight,
    setCategoryHighlight,
    dashOffsetRef,
    dashAnimRef,
    mounted,
    setMounted,
    cropRatio,
  } = useImageEditorState(initialDataUrl, initialSettings);

  // Fullscreen logic
  const [isFullscreen, setIsFullscreen] = useState(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // While the image editor is mounted we want to make the bottom navbar non-interactive.
  // The app loads the `wicg-inert` polyfill via `InertPolyfillClient`, so toggling the
  // `inert` attribute here will disable pointer/keyboard interaction with the tabbar
  // area and stop hover behaviors from generating links under the portal.
  useEffect(() => {
    const bar = document.querySelector('.tabbar') as HTMLElement | null;
    // Add a body class which CSS can target immediately to disable pointer-events
    // on the tabbar and its children. This is more reliable than depending on
    // runtime JS-style changes to every child and works even before the inert
    // polyfill finishes loading.
    const body = document.body;
    body.classList.add('imgedit-open');

    let hadInert = false;
    let prevPointer = '';
    if (bar) {
      hadInert = bar.hasAttribute('inert');
      prevPointer = bar.style.pointerEvents || '';
      if (!hadInert) bar.setAttribute('inert', '');
      // also attempt to set style on the bar itself as a fallback
      bar.style.pointerEvents = 'none';
    }

    return () => {
      body.classList.remove('imgedit-open');
      if (bar) {
        if (!hadInert) bar.removeAttribute('inert');
        bar.style.pointerEvents = prevPointer;
      }
    };
  }, []);

  // Start preloading overlay thumbnails as soon as the editor mounts so the
  // OverlaysPanel can show thumbnails instantly.
  useEffect(() => {
    // Fire-and-forget: preloadOverlayThumbnails populates a shared cache used
    // by the OverlaysPanel and avoids duplicate re-fetches.
    preloadOverlayThumbnails().catch(() => {});
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    const el = editorContainerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  const { computeImageLayout } = useImageEditorLayout(
    imageSrc,
    canvasRef,
    containerRef,
    imgRef,
    originalImgRef,
    originalRef,
    setOffset,
    setMounted,
    draw
  );


  // Local draw wrapper binds all refs/state to the lower-level drawImage helper so
  // callers can simply call draw() or draw(info).
  function draw(info?: any, overrides?: any, targetCanvas?: HTMLCanvasElement) {
    return drawImage(
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
      lightLeakRef,
      overlayRef,
      rotationRef,
      dashOffsetRef,
      computeImageLayout,
      info,
      overrides,
      targetCanvas
    );
  }

  useImageEditorHighlights(
    selectedCategory,
    selectedFilter,
    categoriesContainerRef,
    filtersContainerRef,
    setCategoryHighlight,
    setFilterHighlight,
    suppressFilterTransitionRef
  );

  useDashAnimation(sel, dashOffsetRef, dashAnimRef, draw);

  usePointerEvents(
    canvasRef,
    containerRef,
    selectedCategory,
    cropRatio,
    dragging,
    sel,
    setSel,
    offset,
    setOffset,
    previewPointerIdRef,
    previewOriginalRef,
    setPreviewOriginal,
    computeImageLayout,
    draw,
    setOverlay,
    overlayRef
  );

  useSliderEvents(containerRef);

  // When entering the Crop category, automatically create an initial
  // crop selection if none exists. This mirrors the previous behavior
  // (drawing by drag was removed) and ensures the overlay appears when
  // the Crop panel is opened, including when the Free preset is active.
  // We honor the current cropRatio (null = free) and center a selection
  // with a small padding around the image display area.
  useEffect(() => {
    if (selectedCategory !== 'crop') return;
    if (sel) return; // already have a selection
    const pad = 0.08;
    const info = computeImageLayout();
    const createFromInfo = (info: any) => {
      let w = info.dispW * (1 - pad * 2);
      let h = info.dispH * (1 - pad * 2);
      const ratio = cropRatio.current;
      if (ratio) {
        h = w / ratio;
        if (h > info.dispH * (1 - pad * 2)) {
          h = info.dispH * (1 - pad * 2);
          w = h * ratio;
        }
      }
      const x = info.left + (info.dispW - w) / 2;
      const y = info.top + (info.dispH - h) / 2;
      setSel({ x, y, w, h });
      // ensure canvas redraw to show overlay immediately
      requestAnimationFrame(() => draw());
    };
    if (info) {
      createFromInfo(info);
      return;
    }
    // fallback: use canvas bounding rect
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    let w = rect.width * (1 - pad * 2);
    let h = rect.height * (1 - pad * 2);
    const ratio = cropRatio.current;
    if (ratio) {
      h = w / ratio;
      if (h > rect.height * (1 - pad * 2)) {
        h = rect.height * (1 - pad * 2);
        w = h * ratio;
      }
    }
    const x = (rect.width - w) / 2;
    const y = (rect.height - h) / 2;
    setSel({ x, y, w, h });
    requestAnimationFrame(() => draw());
  }, [selectedCategory, sel, computeImageLayout, cropRatio, canvasRef, setSel, draw]);

  useEffect(() => { rotationRef.current = rotation; }, [rotation, rotationRef]);
  useEffect(() => { exposureRef.current = exposure; }, [exposure, exposureRef]);
  useEffect(() => { contrastRef.current = contrast; }, [contrast, contrastRef]);
  useEffect(() => { saturationRef.current = saturation; }, [saturation, saturationRef]);
  useEffect(() => { temperatureRef.current = temperature; }, [temperature, temperatureRef]);
  useEffect(() => { vignetteRef.current = vignette; }, [vignette, vignetteRef]);
  useEffect(() => { frameColorRef.current = frameColor; }, [frameColor, frameColorRef]);
  useEffect(() => { frameThicknessRef.current = frameThickness; }, [frameThickness, frameThicknessRef]);
  useEffect(() => { selectedFilterRef.current = selectedFilter; }, [selectedFilter, selectedFilterRef]);
  useEffect(() => { filterStrengthRef.current = filterStrength; }, [filterStrength, filterStrengthRef]);
  useEffect(() => { grainRef.current = grain; }, [grain, grainRef]);
  useEffect(() => { softFocusRef.current = softFocus; }, [softFocus, softFocusRef]);
  useEffect(() => { fadeRef.current = fade; }, [fade, fadeRef]);
  useEffect(() => { lightLeakRef.current = lightLeak; }, [lightLeak, lightLeakRef]);
  useEffect(() => { overlayRef.current = overlay; }, [overlay, overlayRef]);

  const setSelectedCategoryWithHistory = useCallback((category: typeof selectedCategory) => {
    if (category === 'crop' && selectedCategory !== 'crop') {
      setPreviousCategory(selectedCategory);
    }
    setSelectedCategory(category);
  }, [selectedCategory, setSelectedCategory, setPreviousCategory]);

  const { isEdited, applyEdit, resetAdjustments, resetControlToDefault, bakeRotate90, bakeRotateMinus90, applyCropOnly, resetCrop } = useImageEditorActions(
    imgRef,
    canvasRef,
    offset,
    sel,
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
    rotation,
    rotationRef,
    onApply,
    setExposure,
    exposureRef,
    setContrast,
    contrastRef,
    setSaturation,
    saturationRef,
    setTemperature,
    temperatureRef,
    setVignette,
    vignetteRef,
    setFrameColor,
    frameColorRef,
    setFrameThickness,
    frameThicknessRef,
    setSelectedFilter,
    selectedFilterRef,
    setFilterStrength,
    filterStrengthRef,
    setGrain,
    grainRef,
    setSoftFocus,
    softFocusRef,
    setFade,
    fadeRef,
    lightLeak,
    setLightLeak,
    lightLeakRef,
    overlay,
    setOverlay,
    overlayRef,
    setRotation,
    setSel,
    cropRatio,
    setPresetIndex,
    draw,
    imageSrc,
    originalRef,
    setImageSrc,
    setOffset,
    computeImageLayout,
    dragging,
    previewPointerIdRef,
    previewOriginalRef,
    setPreviewOriginal,
    setSelectedCategoryWithHistory,
    previousCategory
  );

  const cancelCrop = () => {
    setSel(null);
    setSelectedCategory('basic');
  };

  const handleDownload = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.naturalWidth;
    tempCanvas.height = img.naturalHeight;
    draw(null, null, tempCanvas);
    const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.9);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'edited-photo.jpg';
    link.click();
  }, [draw, imgRef]);

















  useKeyboardEvents(applyEdit, onCancel);

  return (
    <main
      tabIndex={0}
      className={`image-editor ${mounted ? '' : 'unmounted'}`}
      ref={editorContainerRef}
    >
      {/* Toolbar header (buttons) above the canvas */}
      <ImageEditorToolbarHeader
        onCancel={onCancel}
        resetAdjustments={resetAdjustments}
        applyEdit={applyEdit}
        isEdited={isEdited}
        onToggleFullscreen={handleToggleFullscreen}
        isFullscreen={isFullscreen}
        onDownload={handleDownload}
      />

      <figure className="image-editor-canvas-container" ref={containerRef}>
        <ImageEditorCanvas canvasRef={canvasRef} mounted={mounted} />
      </figure>

      {/* Category selector (Filters / Basic / Effects / Crop / Frame) below the canvas */}
      <ImageEditorToolbarCategories categoriesContainerRef={categoriesContainerRef} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategoryWithHistory} categoryHighlight={categoryHighlight} sel={sel} applyCropOnly={applyCropOnly} resetCrop={resetCrop} cancelCrop={cancelCrop} />

      <aside className="image-editor-panels-container">
        <ImageEditorPanels
          selectedCategory={selectedCategory}
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
          selectedFilter={selectedFilter}
          setSelectedFilter={setSelectedFilter}
          selectedFilterRef={selectedFilterRef}
          filterStrength={filterStrength}
          setFilterStrength={setFilterStrength}
          filterStrengthRef={filterStrengthRef}
          filtersContainerRef={filtersContainerRef}
          filterHighlight={filterHighlight}
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
          lightLeak={lightLeak}
          setLightLeak={setLightLeak}
          lightLeakRef={lightLeakRef}
          sel={sel}
          setSel={setSel}
          cropRatio={cropRatio}
          presetIndex={presetIndex}
          setPresetIndex={setPresetIndex}
          rotation={rotation}
          setRotation={setRotation}
          rotationRef={rotationRef}
          computeImageLayout={computeImageLayout}
          canvasRef={canvasRef}
          imageSrc={imageSrc}
          originalRef={originalRef}
          bakeRotate90={bakeRotate90}
          bakeRotateMinus90={bakeRotateMinus90}
          frameThickness={frameThickness}
          setFrameThickness={setFrameThickness}
          frameThicknessRef={frameThicknessRef}
          frameColor={frameColor}
          setFrameColor={setFrameColor}
          frameColorRef={frameColorRef}
          overlay={overlay}
          setOverlay={setOverlay}
          overlayRef={overlayRef}
        />
      </aside>
      {/* debug overlay removed */}
    </main>
  );
}
