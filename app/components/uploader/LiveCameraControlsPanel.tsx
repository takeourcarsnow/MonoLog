"use client";

import React from "react";
import { EffectControls } from "./EffectControls";
import { PixelateControls } from "./PixelateControls";
import { DitherControls } from "./DitherControls";
import { AsciiControls } from "./AsciiControls";
import { FrameSelector } from "./FrameSelector";
import { OverlaySelector } from "./OverlaySelector";
import { BasicControls } from "./BasicControls";
import { FilterControls } from "./FilterControls";
import { EffectsControls } from "./EffectsControls";
import { TextControls } from "./TextControls";
import { DEFAULT_EFFECT_SETTINGS } from "./useLiveCameraState";

interface LiveCameraControlsPanelProps {
  effectSettings: any;
  setEffectSettings: React.Dispatch<React.SetStateAction<any>>;
  disabled: boolean;
  overlayVisible: boolean;
  toggleOverlay: () => void;
  frameFiles: any[];
  selectedFrame: any;
  handleSelectFrame: (frame: any) => void;
  overlayFiles: any[];
  selectedOverlay: any;
  handleSelectOverlay: (overlay: any) => void;
  setSelectedFrame: React.Dispatch<React.SetStateAction<any>>;
  setSelectedOverlay: React.Dispatch<React.SetStateAction<any>>;
}

export function LiveCameraControlsPanel({
  effectSettings,
  setEffectSettings,
  disabled,
  overlayVisible,
  toggleOverlay,
  frameFiles,
  selectedFrame,
  handleSelectFrame,
  overlayFiles,
  selectedOverlay,
  handleSelectOverlay,
  setSelectedFrame,
  setSelectedOverlay,
}: LiveCameraControlsPanelProps) {
  return (
    <div style={{ padding: '16px 20px 24px 20px' }}>
      {/* Effect selection buttons */}
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ padding: 8, borderRadius: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
          <EffectControls
            effectType={effectSettings.type}
            onEffectChange={(type) => {
              if (type === 'none') {
                // Reset all settings to defaults when 'No effect' is chosen
                setEffectSettings(DEFAULT_EFFECT_SETTINGS);
                // Clear selected frame/overlay as part of reset
                setSelectedFrame(null);
                setSelectedOverlay(null);
              } else {
                setEffectSettings((prev: any) => ({ ...prev, type }));
              }
            }}
            disabled={disabled}
            overlayVisible={overlayVisible}
            toggleOverlay={toggleOverlay}
          />
        </div>
      </div>

      {/* Effect-specific controls */}
      {effectSettings.type === 'basic' && (
        <BasicControls
          effectSettings={effectSettings}
          onSettingsChange={setEffectSettings}
          disabled={disabled}
        />
      )}

      {effectSettings.type === 'filters' && (
        <FilterControls
          effectSettings={effectSettings}
          onSettingsChange={setEffectSettings}
          disabled={disabled}
        />
      )}

      {effectSettings.type === 'effects' && (
        <EffectsControls
          effectSettings={effectSettings}
          onSettingsChange={setEffectSettings}
          disabled={disabled}
        />
      )}

      {effectSettings.type === 'pixelate' && (
        <PixelateControls
          effectSettings={effectSettings}
          onSettingsChange={setEffectSettings}
          disabled={disabled}
        />
      )}

      {effectSettings.type === 'dither' && (
        <DitherControls
          effectSettings={effectSettings}
          onSettingsChange={setEffectSettings}
          disabled={disabled}
        />
      )}

      {effectSettings.type === 'ascii' && (
        <AsciiControls
          effectSettings={effectSettings}
          onSettingsChange={setEffectSettings}
          disabled={disabled}
        />
      )}

      {effectSettings.type === 'text' && (
        <TextControls
          effectSettings={effectSettings}
          onSettingsChange={setEffectSettings}
          disabled={disabled}
        />
      )}

      {/* Frame selection panel */}
      {effectSettings.type === 'frame' && (
        <FrameSelector
          frameFiles={frameFiles}
          selectedFrame={selectedFrame}
          onSelectFrame={handleSelectFrame}
          disabled={disabled}
        />
      )}

      {/* Overlay selection panel */}
      {effectSettings.type === 'overlay' && (
        <OverlaySelector
          overlayFiles={overlayFiles}
          selectedOverlay={selectedOverlay}
          effectSettings={effectSettings}
          onSelectOverlay={handleSelectOverlay}
          onSettingsChange={setEffectSettings}
          disabled={disabled}
        />
      )}
    </div>
  );
}