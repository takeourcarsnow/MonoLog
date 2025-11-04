"use client";

import React from "react";
import { CameraEffectSettings } from "./cameraEffects";

interface AsciiControlsProps {
  effectSettings: CameraEffectSettings;
  onSettingsChange: (settings: CameraEffectSettings) => void;
  disabled: boolean;
}

export function AsciiControls({ effectSettings, onSettingsChange, disabled }: AsciiControlsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0', alignItems: 'center' }}>
      <label style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8, width: '100%', maxWidth: 400 }}>
        <span style={{ minWidth: 80 }}>Cell Size:</span>
        <input
          type="range"
          min="10"
          max="50"
          value={effectSettings.asciiCellSize || 10}
          onChange={(e) => onSettingsChange({ ...effectSettings, asciiCellSize: parseInt(e.target.value) })}
          style={{ flex: 1 }}
          disabled={disabled}
        />
        <span style={{ minWidth: 30, textAlign: 'right' }}>{effectSettings.asciiCellSize}</span>
      </label>
      <input
        type="text"
        value={effectSettings.asciiCharset}
        onChange={(e) => onSettingsChange({ ...effectSettings, asciiCharset: e.target.value, asciiCharsetPreset: 'custom' })}
        placeholder="Charset e.g. @%#*+=-:. "
        style={{
          maxWidth: 300,
          width: '100%',
          padding: '6px 8px',
          borderRadius: 6,
          border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
          background: 'var(--bg-elev)',
          color: 'var(--text)',
          fontSize: 12
        }}
        disabled={disabled}
      />
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          type="button"
          className={`btn mini ${effectSettings.asciiCharsetPreset === 'custom' ? 'active' : ''}`}
          onClick={() => onSettingsChange({ ...effectSettings, asciiCharset: ' .:-=+*#%@', asciiCharsetPreset: 'custom' })}
          disabled={disabled}
          style={{ fontSize: '0.7rem', padding: '3px 6px' }}
        >
          Custom
        </button>
        <button
          type="button"
          className={`btn mini ${effectSettings.asciiCharsetPreset === 'dense' ? 'active' : ''}`}
          onClick={() => onSettingsChange({ ...effectSettings, asciiCharset: '@%#*+=-:.ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', asciiCharsetPreset: 'dense' })}
          disabled={disabled}
          style={{ fontSize: '0.7rem', padding: '3px 6px' }}
        >
          Dense
        </button>
        <button
          type="button"
          className={`btn mini ${effectSettings.asciiCharsetPreset === 'sparse' ? 'active' : ''}`}
          onClick={() => onSettingsChange({ ...effectSettings, asciiCharset: '@%#*:. ', asciiCharsetPreset: 'sparse' })}
          disabled={disabled}
          style={{ fontSize: '0.7rem', padding: '3px 6px' }}
        >
          Sparse
        </button>
        <button
          type="button"
          className={`btn mini ${effectSettings.asciiCharsetPreset === 'blocks' ? 'active' : ''}`}
          onClick={() => onSettingsChange({ ...effectSettings, asciiCharset: '█▓▒░ ', asciiCharsetPreset: 'blocks' })}
          disabled={disabled}
          style={{ fontSize: '0.7rem', padding: '3px 6px' }}
        >
          Blocks
        </button>
        <button
          type="button"
          className={`btn mini ${effectSettings.asciiCharsetPreset === 'dots' ? 'active' : ''}`}
          onClick={() => onSettingsChange({ ...effectSettings, asciiCharset: '●◉○· ', asciiCharsetPreset: 'dots' })}
          disabled={disabled}
          style={{ fontSize: '0.7rem', padding: '3px 6px' }}
        >
          Dots
        </button>
        <button
          type="button"
          className={`btn mini ${effectSettings.asciiCharsetPreset === 'lines' ? 'active' : ''}`}
          onClick={() => onSettingsChange({ ...effectSettings, asciiCharset: '│─┼┌┐└┘', asciiCharsetPreset: 'lines' })}
          disabled={disabled}
          style={{ fontSize: '0.7rem', padding: '3px 6px' }}
        >
          Lines
        </button>
        <button
          type="button"
          className={`btn mini ${effectSettings.asciiCharsetPreset === 'numbers' ? 'active' : ''}`}
          onClick={() => onSettingsChange({ ...effectSettings, asciiCharset: '0123456789', asciiCharsetPreset: 'numbers' })}
          disabled={disabled}
          style={{ fontSize: '0.7rem', padding: '3px 6px' }}
        >
          Numbers
        </button>
        <button
          type="button"
          className={`btn mini ${effectSettings.asciiCharsetPreset === 'letters' ? 'active' : ''}`}
          onClick={() => onSettingsChange({ ...effectSettings, asciiCharset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', asciiCharsetPreset: 'letters' })}
          disabled={disabled}
          style={{ fontSize: '0.7rem', padding: '3px 6px' }}
        >
          Letters
        </button>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button
          type="button"
          className={`btn mini ${!effectSettings.asciiInvert ? 'active' : ''}`}
          onClick={() => onSettingsChange({ ...effectSettings, asciiInvert: false })}
          disabled={disabled}
          style={{ fontSize: '0.75rem', padding: '4px 8px' }}
        >
          Normal
        </button>
        <button
          type="button"
          className={`btn mini ${effectSettings.asciiInvert ? 'active' : ''}`}
          onClick={() => onSettingsChange({ ...effectSettings, asciiInvert: true })}
          disabled={disabled}
          style={{ fontSize: '0.75rem', padding: '4px 8px' }}
        >
          Inverted
        </button>
      </div>
    </div>
  );
}