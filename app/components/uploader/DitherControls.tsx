"use client";

import React from "react";
import SharedDitherControls, { DitherMethod, DitherPalette } from "../dither/DitherControls";
import { CameraEffectSettings } from "./cameraEffects";

interface DitherControlsProps {
  effectSettings: CameraEffectSettings;
  onSettingsChange: (settings: CameraEffectSettings) => void;
  disabled: boolean;
}

export function DitherControls({ effectSettings, onSettingsChange, disabled }: DitherControlsProps) {
  const setDitherEnabled = (v: boolean) => onSettingsChange({ 
    ...effectSettings, 
    ditherEnabled: v,
    // Disable other conflicting effects when enabling dithering
    ...(v && { pixelateEnabled: false, asciiEnabled: false })
  });
  const setDitherMethod = (v: DitherMethod) => onSettingsChange({ ...effectSettings, ditherMethod: v === 'none' ? undefined : (v as any) });
  const setDitherColorMode = (v: 'bw' | 'color') => onSettingsChange({ ...effectSettings, ditherColorMode: v });
  const setDitherLevels = (v: number) => onSettingsChange({ ...effectSettings, ditherLevels: v });
  const setTargetLongEdge = (v: number) => onSettingsChange({ ...effectSettings, targetLongEdge: v });
  const setDitherPalette = (v: DitherPalette) => onSettingsChange({ ...effectSettings, ditherPalette: v as any });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Enable toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          type="checkbox"
          id="dither-enabled"
          checked={effectSettings.ditherEnabled || false}
          onChange={(e) => setDitherEnabled(e.target.checked)}
          disabled={disabled}
          style={{ margin: 0 }}
        />
        <label htmlFor="dither-enabled" style={{ fontSize: 10, opacity: 0.9, cursor: disabled ? 'not-allowed' : 'pointer' }}>
          Enable Dithering
        </label>
      </div>

      {/* Controls */}
      {effectSettings.ditherEnabled && (
        <SharedDitherControls
          ditherMethod={effectSettings.ditherMethod as any}
          setDitherMethod={setDitherMethod}
          ditherColorMode={effectSettings.ditherColorMode}
          setDitherColorMode={setDitherColorMode}
          ditherLevels={effectSettings.ditherLevels || 3}
          setDitherLevels={setDitherLevels}
          targetLongEdge={effectSettings.targetLongEdge}
          setTargetLongEdge={setTargetLongEdge}
          ditherPalette={effectSettings.ditherPalette as any}
          setDitherPalette={setDitherPalette}
          disabled={disabled}
        />
      )}
    </div>
  );
}