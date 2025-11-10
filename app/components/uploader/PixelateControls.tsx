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
  const setPixelateEnabled = (v: boolean) => onSettingsChange({ 
    ...effectSettings, 
    pixelateEnabled: v,
    // Disable other conflicting effects when enabling pixelation
    ...(v && { asciiEnabled: false, ditherEnabled: false })
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Enable toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          type="checkbox"
          id="pixelate-enabled"
          checked={effectSettings.pixelateEnabled === true}
          onChange={(e) => setPixelateEnabled(e.target.checked)}
          disabled={disabled}
          style={{ margin: 0 }}
        />
        <label htmlFor="pixelate-enabled" style={{ fontSize: 10, opacity: 0.9, cursor: disabled ? 'not-allowed' : 'pointer' }}>
          Enable Pixelation
        </label>
      </div>

      {/* Controls */}
      {effectSettings.pixelateEnabled !== false && (
        <PixelateControlsShared
          pixelSize={effectSettings.pixelSize || 8}
          pixelShape={(effectSettings.pixelShape as 'square' | 'circle') || 'square'}
          setPixelSize={(v) => onSettingsChange({ ...effectSettings, pixelSize: v })}
          setPixelShape={(s) => onSettingsChange({ ...effectSettings, pixelShape: s })}
          enabled={true}
        />
      )}
    </div>
  );
}