"use client";

import React from "react";
import { CameraEffectSettings } from "./cameraEffects";
import PixelateControlsShared from "../pixelate/PixelateControls";

interface PixelateControlsProps {
  effectSettings: CameraEffectSettings;
  onSettingsChange: (settings: CameraEffectSettings) => void;
  disabled: boolean;
}

export function PixelateControls({ effectSettings, onSettingsChange, disabled }: PixelateControlsProps) {
  return (
    <div style={{ padding: '8px 0' }}>
      <PixelateControlsShared
        pixelSize={effectSettings.pixelSize || 8}
        pixelShape={(effectSettings.pixelShape as 'square' | 'circle') || 'square'}
        setPixelSize={(v) => onSettingsChange({ ...effectSettings, pixelSize: v })}
        setPixelShape={(s) => onSettingsChange({ ...effectSettings, pixelShape: s })}
      />
    </div>
  );
}