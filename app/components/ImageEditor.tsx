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
  function draw(info?: any, overrides?: any) {
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
      rotationRef,
      dashOffsetRef,
      computeImageLayout,
      info,
      overrides
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
    draw
  );

  useSliderEvents(containerRef);

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
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'edited-photo.png';
    link.click();
  }, []);

















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
        />
      </aside>
      {/* debug overlay removed */}
    </main>
  );
}
