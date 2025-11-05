"use client";

import React from "react";
import { CameraEffectSettings } from "./cameraEffects";
import AsciiControlsShared from "../ascii/AsciiControls";

interface AsciiControlsProps {
  effectSettings: CameraEffectSettings;
  onSettingsChange: (settings: CameraEffectSettings) => void;
  disabled: boolean;
}

export function AsciiControls({ effectSettings, onSettingsChange, disabled }: AsciiControlsProps) {
  return (
    <div style={{ padding: '8px 0' }}>
      <AsciiControlsShared
        asciiEnabled={true}
        asciiCellSize={effectSettings.asciiCellSize || 10}
        setAsciiCellSize={(v) => onSettingsChange({ ...effectSettings, asciiCellSize: v })}
        asciiCharset={effectSettings.asciiCharset || ''}
        setAsciiCharset={(v) => onSettingsChange({ ...effectSettings, asciiCharset: v, asciiCharsetPreset: 'custom' })}
        asciiCharsetPreset={(effectSettings.asciiCharsetPreset as any) || 'custom'}
        setAsciiCharsetPreset={(p) => onSettingsChange({ ...effectSettings, asciiCharsetPreset: p })}
        asciiInvert={!!effectSettings.asciiInvert}
        setAsciiInvert={(v) => onSettingsChange({ ...effectSettings, asciiInvert: v })}
      />
    </div>
  );
}