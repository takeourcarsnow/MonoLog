"use client";

import React from "react";
import { CameraEffectSettings } from "./cameraEffects";

interface PixelateControlsProps {
  effectSettings: CameraEffectSettings;
  onSettingsChange: (settings: CameraEffectSettings) => void;
  disabled: boolean;
}

export function PixelateControls({ effectSettings, onSettingsChange, disabled }: PixelateControlsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
      <label style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ minWidth: 80 }}>Pixel Size:</span>
        <input
          type="range"
          min="2"
          max="32"
          value={effectSettings.pixelSize || 8}
          onChange={(e) => onSettingsChange({ ...effectSettings, pixelSize: parseInt(e.target.value) })}
          style={{ flex: 1 }}
          disabled={disabled}
        />
        <span style={{ minWidth: 30, textAlign: 'right' }}>{effectSettings.pixelSize}</span>
      </label>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button
          type="button"
          className={`btn mini ${effectSettings.pixelShape === 'square' ? 'active' : ''}`}
          onClick={() => onSettingsChange({ ...effectSettings, pixelShape: 'square' })}
          disabled={disabled}
          style={{ fontSize: '0.75rem', padding: '4px 8px' }}
        >
          Square
        </button>
        <button
          type="button"
          className={`btn mini ${effectSettings.pixelShape === 'circle' ? 'active' : ''}`}
          onClick={() => onSettingsChange({ ...effectSettings, pixelShape: 'circle' })}
          disabled={disabled}
          style={{ fontSize: '0.75rem', padding: '4px 8px' }}
        >
          Circle
        </button>
      </div>
    </div>
  );
}