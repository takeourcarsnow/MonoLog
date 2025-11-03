import React from 'react';
import BasicPanel from './panels/BasicPanel';
import ColorPanel from './panels/ColorPanel';
import EffectsPanel from './panels/EffectsPanel';
import SpecialPanel from './panels/SpecialPanel';
import CropPanel from './panels/CropPanel';
import FramePanel from './panels/FramePanel';
import OverlaysPanel from './panels/OverlaysPanel';

interface ImageEditorPanelsProps {
  selectedCategory: 'basic' | 'color' | 'effects' | 'special' | 'crop' | 'frame' | 'overlays';
  // Basic panel props
  exposure: number;
  setExposure: (v: number) => void;
  exposureRef: React.MutableRefObject<number>;
  contrast: number;
  setContrast: (v: number) => void;
  contrastRef: React.MutableRefObject<number>;
  saturation: number;
  setSaturation: (v: number) => void;
  saturationRef: React.MutableRefObject<number>;
  temperature: number;
  setTemperature: (v: number) => void;
  temperatureRef: React.MutableRefObject<number>;
  draw: (info?: any) => void;
  resetControlToDefault: (control: string) => void;
  // Color panel props
  selectedFilter: string;
  setSelectedFilter: (v: string) => void;
  selectedFilterRef: React.MutableRefObject<string>;
  filterStrength: number;
  setFilterStrength: (v: number) => void;
  filterStrengthRef: React.MutableRefObject<number>;
  filtersContainerRef: React.RefObject<HTMLDivElement | null>;
  filterHighlight: { left: number; top: number; width: number; height: number } | null;
  // Effects panel props
  vignette: number;
  setVignette: (v: number) => void;
  vignetteRef: React.MutableRefObject<number>;
  grain: number;
  setGrain: (v: number) => void;
  grainRef: React.MutableRefObject<number>;
  softFocus: number;
  setSoftFocus: (v: number) => void;
  softFocusRef: React.MutableRefObject<number>;
  fade: number;
  setFade: (v: number) => void;
  fadeRef: React.MutableRefObject<number>;
  // Crop panel props
  sel: { x: number; y: number; w: number; h: number } | null;
  setSel: (sel: { x: number; y: number; w: number; h: number } | null) => void;
  cropRatio: React.MutableRefObject<number | null>;
  presetIndex: number;
  setPresetIndex: (v: number) => void;
  rotation: number;
  setRotation: (v: number) => void;
  rotationRef: React.MutableRefObject<number>;
  computeImageLayout: () => any;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  imageSrc: string;
  originalRef: React.MutableRefObject<string>;
  bakeRotate90: () => Promise<void>;
  bakeRotateMinus90: () => Promise<void>;
  // Frame panel props
  frameThickness: number;
  setFrameThickness: (v: number) => void;
  frameThicknessRef: React.MutableRefObject<number>;
  frameColor: 'white' | 'black';
  setFrameColor: (v: 'white' | 'black') => void;
  frameColorRef: React.MutableRefObject<'white' | 'black'>;
  // Overlay panel props
  overlay: { img: HTMLImageElement; blendMode: string; opacity: number } | null;
  setOverlay: (v: { img: HTMLImageElement; blendMode: string; opacity: number } | null) => void;
  overlayRef: React.MutableRefObject<{ img: HTMLImageElement; blendMode: string; opacity: number } | null>;
  // Frame overlay props
  frameOverlay: { img: HTMLImageElement; opacity: number; bounds?: { minX: number; minY: number; maxX: number; maxY: number } } | null;
  setFrameOverlay: (v: { img: HTMLImageElement; opacity: number; bounds?: { minX: number; minY: number; maxX: number; maxY: number } } | null) => void;
  frameOverlayRef: React.MutableRefObject<{ img: HTMLImageElement; opacity: number; bounds?: { minX: number; minY: number; maxX: number; maxY: number } } | null>;
  // Special panel props
  ditherMethod: 'none' | 'floyd-steinberg' | 'ordered' | 'bayer8' | 'atkinson' | 'burkes' | 'stucki' | 'sierra' | 'jjn';
  setDitherMethod: (v: 'none' | 'floyd-steinberg' | 'ordered' | 'bayer8' | 'atkinson' | 'burkes' | 'stucki' | 'sierra' | 'jjn') => void;
  ditherMethodRef: React.MutableRefObject<'none' | 'floyd-steinberg' | 'ordered' | 'bayer8' | 'atkinson' | 'burkes' | 'stucki' | 'sierra' | 'jjn'>;
  ditherLevels: number;
  setDitherLevels: (v: number) => void;
  ditherLevelsRef: React.MutableRefObject<number>;
  ditherColorMode?: 'bw' | 'color';
  setDitherColorMode?: (v: 'bw' | 'color') => void;
  ditherColorModeRef?: React.MutableRefObject<'bw' | 'color'>;
  ditherPalette?: 'auto' | 'websafe' | 'cga16' | 'ega64';
  setDitherPalette?: (v: 'auto' | 'websafe' | 'cga16' | 'ega64') => void;
  ditherPaletteRef?: React.MutableRefObject<'auto' | 'websafe' | 'cga16' | 'ega64'>;
  ditherCustomPalette?: string;
  setDitherCustomPalette?: (v: string) => void;
  ditherCustomPaletteRef?: React.MutableRefObject<string>;
  pixelSize: number;
  setPixelSize: (v: number) => void;
  pixelSizeRef: React.MutableRefObject<number>;
  pixelShape?: 'square' | 'circle';
  setPixelShape?: (v: 'square' | 'circle') => void;
  pixelShapeRef?: React.MutableRefObject<'square' | 'circle'>;
  pixelSample?: 'average' | 'nearest';
  setPixelSample?: (v: 'average' | 'nearest') => void;
  pixelSampleRef?: React.MutableRefObject<'average' | 'nearest'>;
  asciiEnabled: boolean;
  setAsciiEnabled: (v: boolean) => void;
  asciiEnabledRef: React.MutableRefObject<boolean>;
  asciiCellSize: number;
  setAsciiCellSize: (v: number) => void;
  asciiCellSizeRef: React.MutableRefObject<number>;
  asciiCharset: string;
  setAsciiCharset: (v: string) => void;
  asciiCharsetRef: React.MutableRefObject<string>;
  asciiInvert: boolean;
  setAsciiInvert: (v: boolean) => void;
  asciiInvertRef: React.MutableRefObject<boolean>;
  asciiColor: boolean;
  setAsciiColor: (v: boolean) => void;
  asciiColorRef: React.MutableRefObject<boolean>;
  asciiOpacity?: number;
  setAsciiOpacity?: (v: number) => void;
  asciiOpacityRef?: React.MutableRefObject<number>;
  asciiBackground?: string;
  setAsciiBackground?: (v: string) => void;
  asciiBackgroundRef?: React.MutableRefObject<string>;
  asciiFont?: string;
  setAsciiFont?: (v: string) => void;
  asciiFontRef?: React.MutableRefObject<string>;
  asciiGamma?: number;
  setAsciiGamma?: (v: number) => void;
  asciiGammaRef?: React.MutableRefObject<number>;
  asciiBold?: boolean;
  setAsciiBold?: (v: boolean) => void;
  asciiBoldRef?: React.MutableRefObject<boolean>;
  asciiEdge?: 'none' | 'stroke';
  setAsciiEdge?: (v: 'none' | 'stroke') => void;
  asciiEdgeRef?: React.MutableRefObject<'none' | 'stroke'>;
  asciiCharsetPreset?: 'custom' | 'dense' | 'medium' | 'sparse' | 'blocks' | 'dots';
  setAsciiCharsetPreset?: (v: 'custom' | 'dense' | 'medium' | 'sparse' | 'blocks' | 'dots') => void;
}

export default React.memo(function ImageEditorPanels(props: ImageEditorPanelsProps) {
  return (
    <section className="imgedit-panels" style={{
      maxWidth: 820,
      margin: '8px auto 0',
      position: 'relative',
      borderRadius: 12,
      minHeight: 100
    }}>
      {props.selectedCategory === 'basic' && (
        <BasicPanel
          exposure={props.exposure}
          setExposure={props.setExposure}
          exposureRef={props.exposureRef}
          contrast={props.contrast}
          setContrast={props.setContrast}
          contrastRef={props.contrastRef}
          saturation={props.saturation}
          setSaturation={props.setSaturation}
          saturationRef={props.saturationRef}
          temperature={props.temperature}
          setTemperature={props.setTemperature}
          temperatureRef={props.temperatureRef}
          draw={props.draw}
          resetControlToDefault={props.resetControlToDefault}
        />
      )}

      {props.selectedCategory === 'color' && (
        <ColorPanel
          selectedFilter={props.selectedFilter}
          setSelectedFilter={props.setSelectedFilter}
          selectedFilterRef={props.selectedFilterRef}
          filterStrength={props.filterStrength}
          setFilterStrength={props.setFilterStrength}
          filterStrengthRef={props.filterStrengthRef}
          draw={props.draw}
          resetControlToDefault={props.resetControlToDefault}
          filtersContainerRef={props.filtersContainerRef}
          filterHighlight={props.filterHighlight}
        />
      )}

      {props.selectedCategory === 'effects' && (
        <EffectsPanel
          vignette={props.vignette}
          setVignette={props.setVignette}
          vignetteRef={props.vignetteRef}
          grain={props.grain}
          setGrain={props.setGrain}
          grainRef={props.grainRef}
          softFocus={props.softFocus}
          setSoftFocus={props.setSoftFocus}
          softFocusRef={props.softFocusRef}
          fade={props.fade}
          setFade={props.setFade}
          fadeRef={props.fadeRef}
          draw={props.draw}
          resetControlToDefault={props.resetControlToDefault}
        />
      )}

      {props.selectedCategory === 'special' && (
        <SpecialPanel
          ditherMethod={props.ditherMethod}
          setDitherMethod={props.setDitherMethod}
          ditherMethodRef={props.ditherMethodRef}
          ditherLevels={props.ditherLevels}
          setDitherLevels={props.setDitherLevels}
          ditherLevelsRef={props.ditherLevelsRef}
          ditherColorMode={props.ditherColorMode}
          setDitherColorMode={props.setDitherColorMode!}
          ditherColorModeRef={props.ditherColorModeRef}
          ditherPalette={props.ditherPalette}
          setDitherPalette={props.setDitherPalette!}
          ditherPaletteRef={props.ditherPaletteRef}
          ditherCustomPalette={props.ditherCustomPalette}
          setDitherCustomPalette={props.setDitherCustomPalette!}
          ditherCustomPaletteRef={props.ditherCustomPaletteRef}
          pixelSize={props.pixelSize}
          setPixelSize={props.setPixelSize}
          pixelSizeRef={props.pixelSizeRef}
          pixelShape={props.pixelShape}
          setPixelShape={props.setPixelShape!}
          pixelShapeRef={props.pixelShapeRef}
          pixelSample={props.pixelSample}
          setPixelSample={props.setPixelSample!}
          pixelSampleRef={props.pixelSampleRef}
          asciiEnabled={props.asciiEnabled}
          setAsciiEnabled={props.setAsciiEnabled}
          asciiEnabledRef={props.asciiEnabledRef}
          asciiCellSize={props.asciiCellSize}
          setAsciiCellSize={props.setAsciiCellSize}
          asciiCellSizeRef={props.asciiCellSizeRef}
          asciiCharset={props.asciiCharset}
          setAsciiCharset={props.setAsciiCharset}
          asciiCharsetRef={props.asciiCharsetRef}
          asciiInvert={props.asciiInvert}
          setAsciiInvert={props.setAsciiInvert}
          asciiInvertRef={props.asciiInvertRef}
          asciiColor={props.asciiColor}
          setAsciiColor={props.setAsciiColor}
          asciiColorRef={props.asciiColorRef}
          asciiOpacity={props.asciiOpacity}
          setAsciiOpacity={props.setAsciiOpacity!}
          asciiOpacityRef={props.asciiOpacityRef}
          asciiBackground={props.asciiBackground}
          setAsciiBackground={props.setAsciiBackground!}
          asciiBackgroundRef={props.asciiBackgroundRef}
          asciiFont={props.asciiFont}
          setAsciiFont={props.setAsciiFont!}
          asciiFontRef={props.asciiFontRef}
          asciiGamma={props.asciiGamma}
          setAsciiGamma={props.setAsciiGamma!}
          asciiGammaRef={props.asciiGammaRef}
          asciiBold={props.asciiBold}
          setAsciiBold={props.setAsciiBold!}
          asciiBoldRef={props.asciiBoldRef}
          asciiEdge={props.asciiEdge}
          setAsciiEdge={props.setAsciiEdge!}
          asciiEdgeRef={props.asciiEdgeRef}
          asciiCharsetPreset={props.asciiCharsetPreset}
          setAsciiCharsetPreset={props.setAsciiCharsetPreset!}
          draw={props.draw}
        />
      )}

      {props.selectedCategory === 'crop' && (
        <CropPanel
          sel={props.sel}
          setSel={props.setSel}
          cropRatio={props.cropRatio}
          presetIndex={props.presetIndex}
          setPresetIndex={props.setPresetIndex}
          rotation={props.rotation}
          setRotation={props.setRotation}
          rotationRef={props.rotationRef}
          draw={props.draw}
          resetControlToDefault={props.resetControlToDefault}
          computeImageLayout={props.computeImageLayout}
          canvasRef={props.canvasRef}
          imageSrc={props.imageSrc}
          originalRef={props.originalRef}
          bakeRotate90={props.bakeRotate90}
          bakeRotateMinus90={props.bakeRotateMinus90}
        />
      )}

      {props.selectedCategory === 'frame' && (
        <FramePanel
          frameThickness={props.frameThickness}
          setFrameThickness={props.setFrameThickness}
          frameThicknessRef={props.frameThicknessRef}
          frameColor={props.frameColor}
          setFrameColor={props.setFrameColor}
          frameColorRef={props.frameColorRef}
          draw={props.draw}
          resetControlToDefault={props.resetControlToDefault}
          frameOverlay={props.frameOverlay}
          setFrameOverlay={props.setFrameOverlay}
          frameOverlayRef={props.frameOverlayRef}
        />
      )}

      {props.selectedCategory === 'overlays' && (
        <OverlaysPanel
          overlay={props.overlay}
          setOverlay={props.setOverlay}
          overlayRef={props.overlayRef}
          draw={props.draw}
          resetControlToDefault={props.resetControlToDefault}
        />
      )}
    </section>
  );
});
