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
  const handleTextEnabledChange = useCallback((value: boolean) => {
    onSettingsChange({ ...effectSettings, textEnabled: value });
  }, [effectSettings, onSettingsChange]);

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

  const handlePositionChange = useCallback((value: string) => {
    onSettingsChange({ ...effectSettings, textPosition: value as any, textX: undefined, textY: undefined });
  }, [effectSettings, onSettingsChange]);

  const handleResetPosition = useCallback(() => {
    onSettingsChange({ ...effectSettings, textX: undefined, textY: undefined });
  }, [effectSettings, onSettingsChange]);

  const handleOpacityChange = useCallback((value: number) => {
    onSettingsChange({ ...effectSettings, textOpacity: value });
  }, [effectSettings, onSettingsChange]);

  const handleStrokeToggle = useCallback((checked: boolean) => {
    onSettingsChange({ ...effectSettings, textStroke: checked });
  }, [effectSettings, onSettingsChange]);

  const handleStrokeColorChange = useCallback((value: string) => {
    onSettingsChange({ ...effectSettings, textStrokeColor: value });
  }, [effectSettings, onSettingsChange]);

  const handleStrokeWidthChange = useCallback((value: number) => {
    onSettingsChange({ ...effectSettings, textStrokeWidth: value });
  }, [effectSettings, onSettingsChange]);

  return (
    <div style={{ padding: '4px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Enable toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          type="checkbox"
          id="text-enabled"
          checked={effectSettings.textEnabled !== false}
          onChange={(e) => handleTextEnabledChange(e.target.checked)}
          disabled={disabled}
          style={{ margin: 0 }}
        />
        <label htmlFor="text-enabled" style={{ fontSize: 12, opacity: 0.9, cursor: disabled ? 'not-allowed' : 'pointer' }}>
          Enable Text Overlay
        </label>
      </div>

      {/* Controls */}
      {effectSettings.textEnabled !== false && (
        <>
          {/* Text input - full width */}
      <input
        type="text"
        value={effectSettings.textContent || ''}
        onChange={(e) => handleTextChange(e.target.value)}
        placeholder="Text"
        disabled={disabled}
        style={{
          width: '100%',
          padding: '3px 4px',
          border: '1px solid var(--border)',
          borderRadius: 2,
          background: 'var(--bg)',
          color: 'var(--text)',
          fontSize: '12px',
        }}
      />

      {/* Row 1: Size slider + Font select */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', minWidth: '24px' }}>
            {effectSettings.textFontSize || 24}px
          </span>
          <input
            type="range"
            min="12"
            max="72"
            step="2"
            value={effectSettings.textFontSize || 24}
            onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
            disabled={disabled}
            style={{ flex: 1, height: '16px' }}
          />
        </div>
        <select
          value={effectSettings.textFontFamily || 'Arial'}
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
          <option value="Arial">Arial</option>
          <option value="Helvetica">Helv</option>
          <option value="Times New Roman">Times</option>
          <option value="Georgia">Georgia</option>
          <option value="Verdana">Verdana</option>
          <option value="Courier New">Courier</option>
          <option value="Impact">Impact</option>
          <option value="Comic Sans MS">Comic</option>
        </select>
      </div>

      {/* Row 2: Color picker + Position select */}
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
        <select
          value={effectSettings.textPosition || 'center'}
          onChange={(e) => handlePositionChange(e.target.value)}
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
          <option value="top-left">TL</option>
          <option value="top-center">TC</option>
          <option value="top-right">TR</option>
          <option value="center-left">CL</option>
          <option value="center">Center</option>
          <option value="center-right">CR</option>
          <option value="bottom-left">BL</option>
          <option value="bottom-center">BC</option>
          <option value="bottom-right">BR</option>
        </select>
        <button
          type="button"
          onClick={handleResetPosition}
          disabled={disabled}
          style={{
            padding: '2px 6px',
            border: '1px solid var(--border)',
            borderRadius: 2,
            background: 'var(--bg)',
            color: 'var(--text)',
            fontSize: '10px',
            cursor: 'pointer',
            height: '24px',
          }}
          title="Reset to preset position"
        >
          ↺
        </button>
      </div>

      {/* Manual position indicator - only show when dragging or has manual position */}
      {(effectSettings.textX !== undefined && effectSettings.textY !== undefined) && (
        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textAlign: 'center' }}>
          Position: ({Math.round(effectSettings.textX * 100)}%, {Math.round(effectSettings.textY * 100)}%) - Drag to move
        </div>
      )}

      {/* Row 3: Opacity slider + Stroke checkbox */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', minWidth: '28px' }}>
            {Math.round((effectSettings.textOpacity || 1) * 100)}%
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={effectSettings.textOpacity || 1}
            onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
            disabled={disabled}
            style={{ flex: 1, height: '16px' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <input
            type="checkbox"
            id="textStroke"
            checked={!!effectSettings.textStroke}
            onChange={(e) => handleStrokeToggle(e.target.checked)}
            disabled={disabled}
            style={{ margin: 0, width: '12px', height: '12px' }}
          />
          <label htmlFor="textStroke" style={{ fontSize: '10px', color: 'var(--text-secondary)', margin: 0 }}>
            Stroke
          </label>
        </div>
      </div>

      {/* Stroke controls - only show when stroke is enabled */}
      {effectSettings.textStroke && (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input
            type="color"
            value={effectSettings.textStrokeColor || '#000000'}
            onChange={(e) => handleStrokeColorChange(e.target.value)}
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
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', minWidth: '20px' }}>
              {effectSettings.textStrokeWidth || 2}px
            </span>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={effectSettings.textStrokeWidth || 2}
              onChange={(e) => handleStrokeWidthChange(parseInt(e.target.value))}
              disabled={disabled}
              style={{ flex: 1, height: '16px' }}
            />
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
});

TextControls.displayName = 'TextControls';