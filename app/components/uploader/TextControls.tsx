"use client";

import React, { memo, useCallback } from "react";
import { CameraEffectSettings } from "./cameraEffects";

interface TextControlsProps {
  effectSettings: CameraEffectSettings;
  onSettingsChange: (settings: CameraEffectSettings) => void;
  disabled: boolean;
}

export const TextControls = memo<TextControlsProps>(({ effectSettings, onSettingsChange, disabled }) => {
  // Memoized change handlers to prevent unnecessary re-renders
  const handleTextChange = useCallback((value: string) => {
    onSettingsChange({ ...effectSettings, textContent: value });
  }, [effectSettings, onSettingsChange]);

  const handleFontSizeChange = useCallback((value: number) => {
    onSettingsChange({ ...effectSettings, textFontSize: value });
  }, [effectSettings, onSettingsChange]);

  const handleFontFamilyChange = useCallback((value: string) => {
    onSettingsChange({ ...effectSettings, textFontFamily: value });
  }, [effectSettings, onSettingsChange]);

  const handleColorChange = useCallback((value: string) => {
    onSettingsChange({ ...effectSettings, textColor: value });
  }, [effectSettings, onSettingsChange]);

  const handleAlignChange = useCallback((align: string) => {
    onSettingsChange({ ...effectSettings, textAlign: align as any });
  }, [effectSettings, onSettingsChange]);

  return (
    <div style={{ padding: '4px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Text input - compact single line */}
      <input
        type="text"
        value={effectSettings.textContent || ''}
        onChange={(e) => handleTextChange(e.target.value)}
        placeholder="Text overlay"
        disabled={disabled}
        style={{
          width: '100%',
          padding: '4px 6px',
          border: '1px solid var(--border)',
          borderRadius: 2,
          background: 'var(--bg)',
          color: 'var(--text)',
          fontSize: '12px',
        }}
      />

      {/* Compact controls row */}
      <div style={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Font size */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <span style={{ fontSize: '9px', color: 'var(--muted)', minWidth: '16px' }}>
            {effectSettings.textFontSize || 24}
          </span>
          <input
            type="range"
            min="12"
            max="48"
            step="2"
            value={effectSettings.textFontSize || 24}
            onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
            disabled={disabled}
            style={{ width: '50px', height: '10px' }}
          />
        </div>

        {/* Font family - compact */}
        <select
          value={effectSettings.textFontFamily || 'Roboto'}
          onChange={(e) => handleFontFamilyChange(e.target.value)}
          disabled={disabled}
          style={{
            padding: '1px 3px',
            border: '1px solid var(--border)',
            borderRadius: 2,
            background: 'var(--bg)',
            color: 'var(--text)',
            fontSize: '9px',
            height: '18px',
            minWidth: '65px',
          }}
        >
          <option value="Roboto" style={{ fontFamily: 'Roboto, sans-serif' }}>Roboto</option>
          <option value="Pacifico" style={{ fontFamily: 'Pacifico, cursive' }}>Pacifico</option>
          <option value="Bangers" style={{ fontFamily: 'Bangers, cursive' }}>Bangers</option>
          <option value="Space Mono" style={{ fontFamily: 'Space Mono, monospace' }}>Space Mono</option>
          <option value="Playfair Display" style={{ fontFamily: 'Playfair Display, serif' }}>Playfair</option>
          <option value="Oswald" style={{ fontFamily: 'Oswald, sans-serif' }}>Oswald</option>
          <option value="Anton" style={{ fontFamily: 'Anton, sans-serif' }}>Anton</option>
          <option value="Ubuntu" style={{ fontFamily: 'Ubuntu, sans-serif' }}>Ubuntu</option>
        </select>

        {/* Color picker */}
        <input
          type="color"
          value={effectSettings.textColor || '#ffffff'}
          onChange={(e) => handleColorChange(e.target.value)}
          disabled={disabled}
          style={{
            width: '20px',
            height: '18px',
            border: '1px solid var(--border)',
            borderRadius: 2,
            cursor: 'pointer',
          }}
        />

        {/* Alignment - simplified icons only */}
        <div style={{ display: 'flex', gap: 1 }}>
          <button
            type="button"
            onClick={() => handleAlignChange('left')}
            disabled={disabled}
            style={{
              padding: '1px',
              border: `1px solid ${effectSettings.textAlign === 'left' ? 'var(--primary)' : 'transparent'}`,
              borderRadius: 2,
              background: 'transparent',
              color: 'var(--text)',
              fontSize: '9px',
              cursor: 'pointer',
              width: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ⬅️
          </button>
          <button
            type="button"
            onClick={() => handleAlignChange('center')}
            disabled={disabled}
            style={{
              padding: '1px',
              border: `1px solid ${effectSettings.textAlign === 'center' ? 'var(--primary)' : 'transparent'}`,
              borderRadius: 2,
              background: 'transparent',
              color: 'var(--text)',
              fontSize: '9px',
              cursor: 'pointer',
              width: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ⬌
          </button>
          <button
            type="button"
            onClick={() => handleAlignChange('right')}
            disabled={disabled}
            style={{
              padding: '1px',
              border: `1px solid ${effectSettings.textAlign === 'right' ? 'var(--primary)' : 'transparent'}`,
              borderRadius: 2,
              background: 'transparent',
              color: 'var(--text)',
              fontSize: '9px',
              cursor: 'pointer',
              width: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ➡️
          </button>
        </div>
      </div>
    </div>
  );
});

TextControls.displayName = 'TextControls';