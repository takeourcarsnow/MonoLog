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
  const setDitherMethod = (v: DitherMethod) => onSettingsChange({ ...effectSettings, ditherMethod: v === 'none' ? undefined : (v as any) });
  const setDitherColorMode = (v: 'bw' | 'color') => onSettingsChange({ ...effectSettings, ditherColorMode: v });
  const setDitherLevels = (v: number) => onSettingsChange({ ...effectSettings, ditherLevels: v });
  const setTargetLongEdge = (v: number) => onSettingsChange({ ...effectSettings, targetLongEdge: v });
  const setDitherPalette = (v: DitherPalette) => onSettingsChange({ ...effectSettings, ditherPalette: v as any });

  return (
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
  );
}