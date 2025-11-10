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
  const setAsciiEnabled = (v: boolean) => onSettingsChange({ 
    ...effectSettings, 
    asciiEnabled: v,
    // Disable other conflicting effects when enabling ASCII
    ...(v && { pixelateEnabled: false, ditherEnabled: false })
  });

  const applyPreset = (preset: 'custom' | 'dense' | 'medium' | 'sparse' | 'blocks' | 'dots' | 'lines' | 'numbers' | 'letters') => {
    let charset = effectSettings.asciiCharset || '';
    switch (preset) {
      case 'custom': charset = ' .:-=+*#%@'; break;
      case 'dense': charset = '@%#*+=-:.ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; break;
      case 'sparse': charset = '@%#*:. '; break;
      case 'dots': charset = '●◉○· '; break;
      case 'blocks': charset = '█▓▒░ '; break;
      case 'lines': charset = '│─┼┌┐└┘'; break;
      case 'numbers': charset = '0123456789'; break;
      case 'letters': charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; break;
      default: break;
    }
    onSettingsChange({ ...effectSettings, asciiCharset: charset, asciiCharsetPreset: preset });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Enable toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          type="checkbox"
          id="ascii-enabled"
          checked={effectSettings.asciiEnabled !== false}
          onChange={(e) => setAsciiEnabled(e.target.checked)}
          disabled={disabled}
          style={{ margin: 0 }}
        />
        <label htmlFor="ascii-enabled" style={{ fontSize: 10, opacity: 0.9, cursor: disabled ? 'not-allowed' : 'pointer' }}>
          Enable ASCII
        </label>
      </div>

      {/* Controls */}
      {effectSettings.asciiEnabled !== false && (
        <AsciiControlsShared
          asciiEnabled={true}
          asciiCellSize={effectSettings.asciiCellSize || 10}
          setAsciiCellSize={(v) => onSettingsChange({ ...effectSettings, asciiCellSize: v })}
          asciiCharset={effectSettings.asciiCharset || ''}
          setAsciiCharset={(v) => onSettingsChange({ ...effectSettings, asciiCharset: v, asciiCharsetPreset: 'custom' })}
          asciiCharsetPreset={(effectSettings.asciiCharsetPreset as any) || 'custom'}
          setAsciiCharsetPreset={applyPreset}
          asciiInvert={!!effectSettings.asciiInvert}
          setAsciiInvert={(v) => onSettingsChange({ ...effectSettings, asciiInvert: v })}
          asciiColor={!!effectSettings.asciiColor}
          setAsciiColor={(v) => onSettingsChange({ ...effectSettings, asciiColor: v })}
        />
      )}
    </div>
  );
}