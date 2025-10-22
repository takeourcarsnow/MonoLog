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
import './imageEditor/ImageEditor.css';
import { useImageEditorFullscreen } from './imageEditor/ImageEditorFullscreen';
import { useImageEditorDraw } from './imageEditor/ImageEditorDraw';
import { useImageEditorCrop } from './imageEditor/ImageEditorCrop';
import { useImageEditorDownload } from './imageEditor/ImageEditorDownload';
import { useImageEditorRefs } from './imageEditor/ImageEditorRefs';
import { useImageEditorEffects } from './imageEditor/ImageEditorEffects';

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
    overlay,
    setOverlay,
    frameOverlay,
    setFrameOverlay,
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
    overlayRef,
    frameOverlayRef,
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

  // Use modular hooks
  useImageEditorEffects();

  const { isFullscreen, editorContainerRef, handleToggleFullscreen } = useImageEditorFullscreen();

  const computeImageLayoutRef = useRef<() => any>();

  const { draw } = useImageEditorDraw(
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
    overlayRef,
    rotationRef,
    dashOffsetRef,
    computeImageLayoutRef.current || (() => ({})),
    frameOverlayRef
  );

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

  computeImageLayoutRef.current = computeImageLayout;

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

  const { cancelCrop } = useImageEditorCrop(
    selectedCategory,
    cropRatio,
    sel,
    setSel,
    computeImageLayout,
    canvasRef,
    draw,
    dragging,
    previewPointerIdRef,
    previewOriginalRef,
    setPreviewOriginal,
    setSelectedCategory
  );

  useImageEditorRefs(
    rotation,
    rotationRef,
    exposure,
    exposureRef,
    contrast,
    contrastRef,
    saturation,
    saturationRef,
    temperature,
    temperatureRef,
    vignette,
    vignetteRef,
    frameColor,
    frameColorRef,
    frameThickness,
    frameThicknessRef,
    selectedFilter,
    selectedFilterRef,
    filterStrength,
    filterStrengthRef,
    grain,
    grainRef,
    softFocus,
    softFocusRef,
    overlay,
    overlayRef,
    frameOverlay,
    frameOverlayRef
  );

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
    overlay,
    setOverlay,
    overlayRef,
    frameOverlay,
    setFrameOverlay,
    frameOverlayRef,
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

  const { handleDownload } = useImageEditorDownload(draw, imgRef);

















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
          frameOverlay={frameOverlay}
          setFrameOverlay={setFrameOverlay}
          frameOverlayRef={frameOverlayRef}
        />
      </aside>
      {/* debug overlay removed */}
    </main>
  );
}
