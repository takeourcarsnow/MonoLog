"use client";

import { useEffect, useMemo, useRef, useCallback } from "react";
import BasicPanel from '@/app/components/imageEditor/panels/BasicPanel';
import ColorPanel from '@/app/components/imageEditor/panels/ColorPanel';
import EffectsPanel from '@/app/components/imageEditor/panels/EffectsPanel';
import CropPanel from '@/app/components/imageEditor/panels/CropPanel';
import FramePanel from '@/app/components/imageEditor/panels/FramePanel';
import { FILTER_PRESETS } from '@/app/components/imageEditor/effectsConfig';
import { CATEGORY_COLORS } from '@/app/components/imageEditor/effectsConfig';
import { rangeBg, generateNoiseCanvas } from '@/app/components/imageEditor/utils';
import { useImageEditorState } from '@/app/components/imageEditor/useImageEditorState';
import { draw as canvasDraw } from '@/app/components/imageEditor/CanvasRenderer';
import type { EditorSettings } from '@/app/components/imageEditor/types';
import { useImageEditorActions } from "@/app/components/media/useImageEditorActions";
import { usePointerEvents } from '@/app/components/imageEditor/pointerEvents';
import { useSliderEvents } from '@/app/components/imageEditor/sliderEvents';
import { useImageEditorLayout } from '@/app/components/imageEditor/useImageEditorLayout';
import { useImageEditorHighlights } from '@/app/components/imageEditor/useImageEditorHighlights';
import { useDashAnimation } from '@/app/components/imageEditor/useDashAnimation';
import { drawImage } from '@/app/components/imageEditor/imageEditorDrawing';
import ImageEditorCanvas from '@/app/components/imageEditor/ImageEditorCanvas';
import ImageEditorToolbar, { ImageEditorToolbarHeader, ImageEditorToolbarCategories } from '@/app/components/imageEditor/ImageEditorToolbar';
import ImageEditorPanels from '@/app/components/imageEditor/ImageEditorPanels';
import { useKeyboardEvents } from '@/app/components/imageEditor/useKeyboardEvents';
import '@/app/components/imageEditor/ImageEditor.css';
import { useImageEditorFullscreen } from '@/app/components/imageEditor/ImageEditorFullscreen';
import { useImageEditorDraw } from '@/app/components/imageEditor/ImageEditorDraw';
import { useImageEditorCrop } from '@/app/components/imageEditor/ImageEditorCrop';
import { useImageEditorDownload } from '@/app/components/imageEditor/ImageEditorDownload';
import { useImageEditorRefs } from '@/app/components/imageEditor/ImageEditorRefs';
import { useImageEditorEffects } from '@/app/components/imageEditor/ImageEditorEffects';
import { useCameraCapture } from "@/app/components/uploader/useCameraCapture";
import { CameraModal } from "@/app/components/uploader/CameraModal";
import { compressImage } from '@/lib/image';
import { toggleTheme } from '@/lib/theme';

type Props = {
  initialDataUrl: string;
  initialSettings?: EditorSettings;
  onCancel: () => void;
  onApply: (dataUrl: string, settings: EditorSettings) => Promise<void>;
};



import { useState } from "react";
import { Fullscreen } from "lucide-react";

export default function ImageEditor({ initialDataUrl, initialSettings, onCancel, onApply }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
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
    // special effects state
    ditherMethod,
    setDitherMethod,
    ditherLevels,
    setDitherLevels,
    ditherColorMode,
    setDitherColorMode,
    ditherPalette,
    setDitherPalette,
    ditherCustomPalette,
    setDitherCustomPalette,
    targetLongEdge,
    setTargetLongEdge,
    pixelSize,
    setPixelSize,
    pixelShape,
    setPixelShape,
    pixelSample,
    setPixelSample,
    asciiEnabled,
    setAsciiEnabled,
    asciiCellSize,
    setAsciiCellSize,
    asciiCharset,
    setAsciiCharset,
    asciiInvert,
    setAsciiInvert,
    asciiColor,
    setAsciiColor,
    asciiOpacity,
    setAsciiOpacity,
    asciiBackground,
    setAsciiBackground,
    asciiFont,
    setAsciiFont,
    asciiGamma,
    setAsciiGamma,
    asciiBold,
    setAsciiBold,
    asciiEdge,
    setAsciiEdge,
    asciiCharsetPreset,
    setAsciiCharsetPreset,
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
    // special refs
    ditherMethodRef,
    ditherLevelsRef,
    ditherColorModeRef,
    ditherPaletteRef,
    ditherCustomPaletteRef,
    targetLongEdgeRef,
    pixelSizeRef,
    pixelShapeRef,
    pixelSampleRef,
    asciiEnabledRef,
    asciiCellSizeRef,
    asciiCharsetRef,
    asciiInvertRef,
    asciiColorRef,
    asciiOpacityRef,
    asciiBackgroundRef,
    asciiFontRef,
    asciiGammaRef,
    asciiBoldRef,
    asciiEdgeRef,
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

  const computeImageLayoutRef = useRef<(() => any) | null>(null);

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
    // special effects
    ditherMethodRef,
    ditherLevelsRef,
    ditherColorModeRef,
    ditherPaletteRef,
    ditherCustomPaletteRef,
    targetLongEdgeRef,
    pixelSizeRef,
    pixelShapeRef,
    pixelSampleRef,
    asciiEnabledRef,
    asciiCellSizeRef,
    asciiCharsetRef,
    asciiInvertRef,
    asciiColorRef,
    asciiOpacityRef,
    asciiBackgroundRef,
    asciiFontRef,
    asciiGammaRef,
    asciiBoldRef,
    asciiEdgeRef,
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
    frameOverlayRef,
    // special
    ditherMethod,
    ditherMethodRef,
    ditherLevels,
    ditherLevelsRef,
    pixelSize,
    pixelSizeRef,
    asciiEnabled,
    asciiEnabledRef,
    asciiCellSize,
    asciiCellSizeRef,
    asciiCharset,
    asciiCharsetRef,
    asciiInvert,
    asciiInvertRef,
    asciiColor,
    asciiColorRef,
    // new specials
    ditherColorMode,
    ditherColorModeRef,
    ditherPalette,
    ditherPaletteRef,
    ditherCustomPalette,
    ditherCustomPaletteRef,
    pixelShape,
    pixelShapeRef,
    pixelSample,
    pixelSampleRef,
    asciiOpacity,
    asciiOpacityRef,
    asciiBackground,
    asciiBackgroundRef,
    asciiFont,
    asciiFontRef,
    asciiGamma,
    asciiGammaRef,
    asciiBold,
    asciiBoldRef,
    asciiEdge,
    asciiEdgeRef
  );

  const setSelectedCategoryWithHistory = useCallback((category: typeof selectedCategory) => {
    if (category === 'crop' && selectedCategory !== 'crop') {
      setPreviousCategory(selectedCategory);
    }
    setSelectedCategory(category);
  }, [selectedCategory, setSelectedCategory, setPreviousCategory]);

  const { isEdited, applyEdit, resetAdjustments, resetControlToDefault, bakeRotate90, bakeRotateMinus90, applyCropOnly, resetCrop } = useImageEditorActions(
    setIsProcessing,
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
    // special effects state
    ditherMethod,
    ditherLevels,
    ditherColorMode,
    ditherPalette,
    ditherCustomPalette,
    pixelSize,
    pixelShape,
    pixelSample,
    asciiEnabled,
    asciiCellSize,
    asciiCharset,
    asciiInvert,
    asciiColor,
    asciiOpacity,
    asciiBackground,
    asciiFont,
    asciiGamma,
    asciiBold,
    asciiEdge,
    asciiCharsetPreset,
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
    // special setters/refs
    setDitherMethod,
    ditherMethodRef,
    setDitherLevels,
    ditherLevelsRef,
    setDitherColorMode,
    ditherColorModeRef,
    setDitherPalette,
    ditherPaletteRef,
    setDitherCustomPalette,
    ditherCustomPaletteRef,
    setPixelSize,
    pixelSizeRef,
    setPixelShape,
    pixelShapeRef,
    setPixelSample,
    pixelSampleRef,
    setAsciiEnabled,
    asciiEnabledRef,
    setAsciiCellSize,
    asciiCellSizeRef,
    setAsciiCharset,
    asciiCharsetRef,
    setAsciiInvert,
    asciiInvertRef,
    setAsciiColor,
    asciiColorRef,
    setAsciiOpacity,
    asciiOpacityRef,
    setAsciiBackground,
    asciiBackgroundRef,
    setAsciiFont,
    asciiFontRef,
    setAsciiGamma,
    asciiGammaRef,
    setAsciiBold,
    asciiBoldRef,
    setAsciiEdge,
    asciiEdgeRef,
    setAsciiCharsetPreset,
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

  const { cameraOpen, setCameraOpen, videoRef, streamRef, openCamera, closeCamera } = useCameraCapture();

















  useKeyboardEvents(applyEdit, onCancel);

  const handleCameraCapture = async () => {
    const v = videoRef.current;
    if (!v) return;
    setIsProcessing(true);
    try {
      const w = v.videoWidth || v.clientWidth;
      const h = v.videoHeight || v.clientHeight || Math.round(w * 0.75);
      const cnv = document.createElement('canvas');
      cnv.width = w; cnv.height = h;
      const ctx = cnv.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');
      ctx.drawImage(v, 0, 0, w, h);
      cnv.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
        const url = await compressImage(file);
        // Set new image
        setImageSrc(url);
        originalRef.current = url;
        // Reset all settings to default
        setExposure(0);
        setContrast(0);
        setSaturation(0);
        setTemperature(0);
        setVignette(0);
        setFrameColor('white');
        setFrameThickness(0);
        setSelectedFilter('none');
        setFilterStrength(1);
        setRotation(0);
        setGrain(0);
        setSoftFocus(0);
        setFade(0);
        setOverlay(null);
        setFrameOverlay(null);
        setDitherMethod('none');
        setDitherLevels(8);
        setDitherColorMode('bw');
        setDitherPalette('auto');
        setDitherCustomPalette('');
        setPixelSize(1);
        setPixelShape('square');
        setPixelSample('average');
        setAsciiEnabled(false);
        setAsciiCellSize(8);
        setAsciiCharset("@%#*+=-:. ");
        setAsciiInvert(false);
        setAsciiColor(true);
        setAsciiOpacity(1);
        setAsciiBackground('black');
        setAsciiFont('monospace');
        setAsciiGamma(1);
        setAsciiBold(false);
        setAsciiEdge('none');
        setAsciiCharsetPreset('custom');
        setSel(null);
        setSelectedCategory('basic');
        // Update refs
        exposureRef.current = 0;
        contrastRef.current = 0;
        saturationRef.current = 0;
        temperatureRef.current = 0;
        vignetteRef.current = 0;
        frameColorRef.current = 'white';
        frameThicknessRef.current = 0;
        selectedFilterRef.current = 'none';
        filterStrengthRef.current = 1;
        grainRef.current = 0;
        softFocusRef.current = 0;
        fadeRef.current = 0;
        overlayRef.current = null;
        frameOverlayRef.current = null;
        ditherMethodRef.current = 'none';
        ditherLevelsRef.current = 8;
        ditherColorModeRef.current = 'bw';
        ditherPaletteRef.current = 'auto';
        ditherCustomPaletteRef.current = '';
        pixelSizeRef.current = 1;
        pixelShapeRef.current = 'square';
        pixelSampleRef.current = 'average';
        asciiEnabledRef.current = false;
        asciiCellSizeRef.current = 8;
        asciiCharsetRef.current = "@%#*+=-:. ";
        asciiInvertRef.current = false;
        asciiColorRef.current = true;
        asciiOpacityRef.current = 1;
        asciiBackgroundRef.current = 'black';
        asciiFontRef.current = 'monospace';
        asciiGammaRef.current = 1;
        asciiBoldRef.current = false;
        asciiEdgeRef.current = 'none';
        rotationRef.current = 0;
        // Recompute layout
        if (computeImageLayoutRef.current) {
          computeImageLayoutRef.current();
        }
        setIsProcessing(false);
        closeCamera();
      }, 'image/jpeg', 0.92);
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
    }
  };

  const handleOpenCamera = async () => {
    try {
      await openCamera();
    } catch (e) {
      console.error('Failed to open camera:', e);
    }
  };

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
        onToggleTheme={toggleTheme}
        onCamera={handleOpenCamera}
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
          // Special
          ditherMethod={ditherMethod}
          setDitherMethod={setDitherMethod}
          ditherMethodRef={ditherMethodRef}
          ditherLevels={ditherLevels}
          setDitherLevels={setDitherLevels}
          ditherLevelsRef={ditherLevelsRef}
          ditherColorMode={ditherColorMode}
          setDitherColorMode={setDitherColorMode}
          ditherColorModeRef={ditherColorModeRef}
          ditherPalette={ditherPalette}
          setDitherPalette={setDitherPalette}
          ditherPaletteRef={ditherPaletteRef}
          ditherCustomPalette={ditherCustomPalette}
          setDitherCustomPalette={setDitherCustomPalette}
          ditherCustomPaletteRef={ditherCustomPaletteRef}
          targetLongEdge={targetLongEdge}
          setTargetLongEdge={setTargetLongEdge}
          targetLongEdgeRef={targetLongEdgeRef}
          pixelSize={pixelSize}
          setPixelSize={setPixelSize}
          pixelSizeRef={pixelSizeRef}
          pixelShape={pixelShape}
          setPixelShape={setPixelShape}
          pixelShapeRef={pixelShapeRef}
          pixelSample={pixelSample}
          setPixelSample={setPixelSample}
          pixelSampleRef={pixelSampleRef}
          asciiEnabled={asciiEnabled}
          setAsciiEnabled={setAsciiEnabled}
          asciiEnabledRef={asciiEnabledRef}
          asciiCellSize={asciiCellSize}
          setAsciiCellSize={setAsciiCellSize}
          asciiCellSizeRef={asciiCellSizeRef}
          asciiCharset={asciiCharset}
          setAsciiCharset={setAsciiCharset}
          asciiCharsetRef={asciiCharsetRef}
          asciiInvert={asciiInvert}
          setAsciiInvert={setAsciiInvert}
          asciiInvertRef={asciiInvertRef}
          asciiColor={asciiColor}
          setAsciiColor={setAsciiColor}
          asciiColorRef={asciiColorRef}
          asciiOpacity={asciiOpacity}
          setAsciiOpacity={setAsciiOpacity}
          asciiOpacityRef={asciiOpacityRef}
          asciiBackground={asciiBackground}
          setAsciiBackground={setAsciiBackground}
          asciiBackgroundRef={asciiBackgroundRef}
          asciiFont={asciiFont}
          setAsciiFont={setAsciiFont}
          asciiFontRef={asciiFontRef}
          asciiGamma={asciiGamma}
          setAsciiGamma={setAsciiGamma}
          asciiGammaRef={asciiGammaRef}
          asciiBold={asciiBold}
          setAsciiBold={setAsciiBold}
          asciiBoldRef={asciiBoldRef}
          asciiEdge={asciiEdge}
          setAsciiEdge={setAsciiEdge}
          asciiEdgeRef={asciiEdgeRef}
          asciiCharsetPreset={asciiCharsetPreset}
          setAsciiCharsetPreset={setAsciiCharsetPreset}
        />
      </aside>
      {/* debug overlay removed */}
      <CameraModal
        cameraOpen={cameraOpen}
        setCameraOpen={setCameraOpen}
        videoRef={videoRef}
        streamRef={streamRef}
        processing={isProcessing}
        onCapture={handleCameraCapture}
        openCamera={openCamera}
      />
      {isProcessing && <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backdropFilter: 'blur(5px)', zIndex: 9999, pointerEvents: 'none'}}></div>}
    </main>
  );
}
