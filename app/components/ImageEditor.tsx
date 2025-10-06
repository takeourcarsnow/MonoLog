"use client";

import { useEffect, useMemo, useState, useRef } from "react";
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
    matte,
    setMatte,
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
    drawImage(
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

  useEffect(() => { rotationRef.current = rotation; }, [rotation]);
  useEffect(() => { exposureRef.current = exposure; }, [exposure]);
  useEffect(() => { contrastRef.current = contrast; }, [contrast]);
  useEffect(() => { saturationRef.current = saturation; }, [saturation]);
  useEffect(() => { temperatureRef.current = temperature; }, [temperature]);
  useEffect(() => { vignetteRef.current = vignette; }, [vignette]);
  useEffect(() => { frameColorRef.current = frameColor; }, [frameColor]);
  useEffect(() => { frameThicknessRef.current = frameThickness; }, [frameThickness]);
  useEffect(() => { selectedFilterRef.current = selectedFilter; }, [selectedFilter]);
  useEffect(() => { filterStrengthRef.current = filterStrength; }, [filterStrength]);
  useEffect(() => { grainRef.current = grain; }, [grain]);
  useEffect(() => { softFocusRef.current = softFocus; }, [softFocus]);
  useEffect(() => { fadeRef.current = fade; }, [fade]);
  useEffect(() => { matteRef.current = matte; }, [matte]);

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
    matte,
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
    setMatte,
    matteRef,
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
    setPreviewOriginal
  );

  // redraw whenever any adjustment state changes to avoid stale-draw races
  useEffect(() => {
    // small RAF to batch with potential layout changes
    requestAnimationFrame(() => draw());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exposure, contrast, saturation, temperature, vignette, selectedFilter, grain, softFocus, fade, matte, sel, offset]);

















  useKeyboardEvents(applyEdit, onCancel);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={`image-editor ${mounted ? '' : 'unmounted'}`}
    >
      {/* Toolbar header (buttons) above the canvas */}
      <ImageEditorToolbarHeader onCancel={onCancel} resetAdjustments={resetAdjustments} applyEdit={applyEdit} isEdited={isEdited} />

      <div className="image-editor-canvas-container">
        <ImageEditorCanvas canvasRef={canvasRef} mounted={mounted} />
      </div>

      {/* Category selector (Filters / Basic / Effects / Crop / Frame) below the canvas */}
      <ImageEditorToolbarCategories categoriesContainerRef={categoriesContainerRef} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} categoryHighlight={categoryHighlight} sel={sel} applyCropOnly={applyCropOnly} resetCrop={resetCrop} />

      <div className="image-editor-panels-container">
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
          matte={matte}
          setMatte={setMatte}
          matteRef={matteRef}
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
      </div>
    </div>
  );
}
