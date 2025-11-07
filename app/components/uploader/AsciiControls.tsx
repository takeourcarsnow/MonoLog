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
    <div style={{ padding: '8px 0' }}>
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
    </div>
  );
}