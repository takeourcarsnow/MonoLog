import React from 'react';
import BasicPanel from './panels/BasicPanel';
import ColorPanel from './panels/ColorPanel';
import EffectsPanel from './panels/EffectsPanel';
import LightLeakPanel from './panels/LightLeakPanel';
import CropPanel from './panels/CropPanel';
import FramePanel from './panels/FramePanel';
import OverlaysPanel from './panels/OverlaysPanel';

interface ImageEditorPanelsProps {
  selectedCategory: 'basic' | 'color' | 'effects' | 'crop' | 'frame' | 'lightleak' | 'overlays';
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
  filtersContainerRef: React.RefObject<HTMLDivElement>;
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
  // Light leak panel props
  lightLeak: { preset: string; intensity: number };
  setLightLeak: (v: { preset: string; intensity: number }) => void;
  lightLeakRef: React.MutableRefObject<{ preset: string; intensity: number }>;
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
  canvasRef: React.RefObject<HTMLCanvasElement>;
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
}

export default function ImageEditorPanels(props: ImageEditorPanelsProps) {
  return (
    <section className="imgedit-panels" style={{
      maxWidth: 820,
      margin: '8px auto 0',
      position: 'relative',
      borderRadius: 12,
      minHeight: 140
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
        />
      )}

      {props.selectedCategory === 'lightleak' && (
        <LightLeakPanel
          lightLeak={props.lightLeak}
          setLightLeak={props.setLightLeak}
          lightLeakRef={props.lightLeakRef}
          draw={props.draw}
          resetControlToDefault={props.resetControlToDefault}
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
}
