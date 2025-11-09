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

  const handleLineHeightChange = useCallback((value: number) => {
    onSettingsChange({ ...effectSettings, textLineHeight: value });
  }, [effectSettings, onSettingsChange]);

  const handleFontFamilyChange = useCallback((value: string) => {
    onSettingsChange({ ...effectSettings, textFontFamily: value });
  }, [effectSettings, onSettingsChange]);

  const handleColorChange = useCallback((value: string) => {
    onSettingsChange({ ...effectSettings, textColor: value });
  }, [effectSettings, onSettingsChange]);

  const handleShadowToggle = useCallback((checked: boolean) => {
    onSettingsChange({ ...effectSettings, textShadow: checked });
  }, [effectSettings, onSettingsChange]);

  const handleAlignChange = useCallback((align: string) => {
    onSettingsChange({ ...effectSettings, textAlign: align as any });
  }, [effectSettings, onSettingsChange]);

  return (
    <div style={{ padding: '4px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Controls */}
      <>
          {/* Text input - multi-line textarea */}
      <textarea
        value={effectSettings.textContent || ''}
        onChange={(e) => handleTextChange(e.target.value)}
        placeholder="Text (multi-line supported)"
        disabled={disabled}
        rows={3}
        style={{
          width: '100%',
          padding: '3px 4px',
          border: '1px solid var(--border)',
          borderRadius: 2,
          background: 'var(--bg)',
          color: 'var(--text)',
          fontSize: '12px',
          resize: 'vertical',
          minHeight: '60px',
        }}
      />

      {/* Row 1: Size slider + Line height slider + Font select + Shadow toggle */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', minWidth: '24px' }}>
            {effectSettings.textFontSize || 40}px
          </span>
          <input
            type="range"
            min="12"
            max="72"
            step="2"
            value={effectSettings.textFontSize || 40}
            onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
            disabled={disabled}
            style={{ flex: 1, height: '16px' }}
          />
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', minWidth: '24px' }}>
            {(effectSettings.textLineHeight || 1.4).toFixed(1)}x
          </span>
          <input
            type="range"
            min="0.8"
            max="3.0"
            step="0.1"
            value={effectSettings.textLineHeight || 1.4}
            onChange={(e) => handleLineHeightChange(parseFloat(e.target.value))}
            disabled={disabled}
            style={{ flex: 1, height: '16px' }}
          />
        </div>
        <select
          value={effectSettings.textFontFamily || 'Roboto'}
          onChange={(e) => handleFontFamilyChange(e.target.value)}
          disabled={disabled}
          style={{
            flex: 1,
            padding: '2px 4px',
            border: '1px solid var(--border)',
            borderRadius: 2,
            background: 'var(--bg)',
            color: 'var(--text)',
            fontSize: '11px',
            height: '24px',
          }}
        >
          <option value="Roboto">Roboto</option>
          <option value="Pacifico">Pacifico</option>
          <option value="Bangers">Bangers</option>
          <option value="Space Mono">Space Mono</option>
          <option value="Playfair Display">Playfair</option>
          <option value="Oswald">Oswald</option>
          <option value="Anton">Anton</option>
          <option value="Ubuntu">Ubuntu</option>
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <input
            type="checkbox"
            id="textShadow"
            checked={!!effectSettings.textShadow}
            onChange={(e) => handleShadowToggle(e.target.checked)}
            disabled={disabled}
            style={{ margin: 0, width: '12px', height: '12px' }}
          />
          <label htmlFor="textShadow" style={{ fontSize: '10px', color: 'var(--text-secondary)', margin: 0 }}>
            Shadow
          </label>
        </div>
      </div>

      {/* Row 2: Color picker + Alignment buttons */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <input
          type="color"
          value={effectSettings.textColor || '#ffffff'}
          onChange={(e) => handleColorChange(e.target.value)}
          disabled={disabled}
          style={{
            width: '32px',
            height: '24px',
            border: '1px solid var(--border)',
            borderRadius: 2,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        />
        <div style={{ display: 'flex', gap: 2, flex: 1 }}>
          <button
            type="button"
            onClick={() => handleAlignChange('left')}
            disabled={disabled}
            style={{
              flex: 1,
              padding: '2px 4px',
              border: `1px solid ${effectSettings.textAlign === 'left' ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 2,
              background: effectSettings.textAlign === 'left' ? 'var(--accent)' : 'var(--bg)',
              color: effectSettings.textAlign === 'left' ? 'white' : 'var(--text)',
              fontSize: '10px',
              cursor: 'pointer',
              height: '24px',
            }}
          >
            ⬅️ Left
          </button>
          <button
            type="button"
            onClick={() => handleAlignChange('center')}
            disabled={disabled}
            style={{
              flex: 1,
              padding: '2px 4px',
              border: `1px solid ${effectSettings.textAlign === 'center' ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 2,
              background: effectSettings.textAlign === 'center' ? 'var(--accent)' : 'var(--bg)',
              color: effectSettings.textAlign === 'center' ? 'white' : 'var(--text)',
              fontSize: '10px',
              cursor: 'pointer',
              height: '24px',
            }}
          >
            ⬌ Center
          </button>
          <button
            type="button"
            onClick={() => handleAlignChange('right')}
            disabled={disabled}
            style={{
              flex: 1,
              padding: '2px 4px',
              border: `1px solid ${effectSettings.textAlign === 'right' ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 2,
              background: effectSettings.textAlign === 'right' ? 'var(--accent)' : 'var(--bg)',
              color: effectSettings.textAlign === 'right' ? 'white' : 'var(--text)',
              fontSize: '10px',
              cursor: 'pointer',
              height: '24px',
            }}
          >
            ➡️ Right
          </button>
        </div>
      </div>
        </>
    </div>
  );
});

TextControls.displayName = 'TextControls';