"use client";

import React from "react";
import { CameraEffectSettings } from "./cameraEffects";

interface DitherControlsProps {
  effectSettings: CameraEffectSettings;
  onSettingsChange: (settings: CameraEffectSettings) => void;
  disabled: boolean;
}

export function DitherControls({ effectSettings, onSettingsChange, disabled }: DitherControlsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0', alignItems: 'center' }}>
      <label style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8, width: '100%', maxWidth: 400 }}>
        <span style={{ minWidth: 80 }}>Resolution:</span>
        <input
          type="range"
          min="50"
          max="400"
          step="10"
          value={effectSettings.targetLongEdge || 150}
          onChange={(e) => {
            const newRes = parseInt(e.target.value);
            onSettingsChange({ ...effectSettings, targetLongEdge: newRes });
          }}
          style={{ flex: 1 }}
          disabled={disabled}
        />
        <span style={{ minWidth: 30, textAlign: 'right' }}>{effectSettings.targetLongEdge || 150}</span>
      </label>
      <label style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8, width: '100%', maxWidth: 400 }}>
        <span style={{ minWidth: 80 }}>Levels:</span>
        <input
          type="range"
          min={effectSettings.ditherMethod === 'ordered' ? "2" : "3"}
          max="8"
          value={effectSettings.ditherLevels || 3}
          onChange={(e) => {
            const newLevels = parseInt(e.target.value);
            onSettingsChange({ ...effectSettings, ditherLevels: newLevels });
          }}
          style={{ flex: 1 }}
          disabled={disabled}
        />
        <span style={{ minWidth: 30, textAlign: 'right' }}>{effectSettings.ditherLevels}</span>
      </label>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          type="button"
          className={`btn mini ${effectSettings.ditherColorMode === 'bw' ? 'active' : ''}`}
          onClick={() => onSettingsChange({ ...effectSettings, ditherColorMode: 'bw' })}
          disabled={disabled}
          style={{ fontSize: '0.75rem', padding: '4px 8px' }}
        >
          B&W
        </button>
        <button
          type="button"
          className={`btn mini ${effectSettings.ditherColorMode === 'color' ? 'active' : ''}`}
          onClick={() => onSettingsChange({ ...effectSettings, ditherColorMode: 'color' })}
          disabled={disabled}
          style={{ fontSize: '0.75rem', padding: '4px 8px' }}
        >
          Color
        </button>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          type="button"
          className={`btn mini ${effectSettings.ditherMethod === 'floyd-steinberg' ? 'active' : ''}`}
          onClick={() => {
            const newSettings = { ...effectSettings, ditherMethod: 'floyd-steinberg' as const };
            if ((effectSettings.ditherLevels || 3) < 3) {
              newSettings.ditherLevels = 3;
            }
            onSettingsChange(newSettings);
          }}
          disabled={disabled || effectSettings.ditherPalette === 'gameboy'}
          style={{ fontSize: '0.75rem', padding: '4px 8px' }}
        >
          Floyd
        </button>
        <button
          type="button"
          className={`btn mini ${effectSettings.ditherMethod === 'ordered' ? 'active' : ''}`}
          onClick={() => onSettingsChange({ ...effectSettings, ditherMethod: 'ordered' })}
          disabled={disabled}
          style={{ fontSize: '0.75rem', padding: '4px 8px' }}
        >
          Ordered
        </button>
        <button
          type="button"
          className={`btn mini ${effectSettings.ditherMethod === 'atkinson' ? 'active' : ''}`}
          onClick={() => {
            const newSettings = { ...effectSettings, ditherMethod: 'atkinson' as const };
            if ((effectSettings.ditherLevels || 3) < 3) {
              newSettings.ditherLevels = 3;
            }
            onSettingsChange(newSettings);
          }}
          disabled={disabled}
          style={{ fontSize: '0.75rem', padding: '4px 8px' }}
        >
          Atkinson
        </button>
        <button
          type="button"
          className={`btn mini ${effectSettings.ditherMethod === 'burkes' ? 'active' : ''}`}
          onClick={() => {
            const newSettings = { ...effectSettings, ditherMethod: 'burkes' as const };
            if ((effectSettings.ditherLevels || 3) < 3) {
              newSettings.ditherLevels = 3;
            }
            onSettingsChange(newSettings);
          }}
          disabled={disabled || effectSettings.ditherPalette === 'gameboy'}
          style={{ fontSize: '0.75rem', padding: '4px 8px' }}
        >
          Burkes
        </button>
      </div>
      {effectSettings.ditherColorMode === 'color' && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            className={`btn mini ${effectSettings.ditherPalette === 'auto' ? 'active' : ''}`}
            onClick={() => onSettingsChange({ ...effectSettings, ditherPalette: 'auto' })}
            disabled={disabled}
            style={{ fontSize: '0.7rem', padding: '3px 6px' }}
          >
            Auto
          </button>
          <button
            type="button"
            className={`btn mini ${effectSettings.ditherPalette === 'gameboy' ? 'active' : ''}`}
            onClick={() => {
              const newSettings = { ...effectSettings, ditherPalette: 'gameboy' as const };
              if (!['ordered', 'atkinson'].includes(effectSettings.ditherMethod || 'ordered')) {
                newSettings.ditherMethod = 'ordered';
              }
              onSettingsChange(newSettings);
            }}
            disabled={disabled}
            style={{ fontSize: '0.7rem', padding: '3px 6px' }}
          >
            Game Boy
          </button>
          <button
            type="button"
            className={`btn mini ${effectSettings.ditherPalette === 'pico8' ? 'active' : ''}`}
            onClick={() => onSettingsChange({ ...effectSettings, ditherPalette: 'pico8' })}
            disabled={disabled}
            style={{ fontSize: '0.7rem', padding: '3px 6px' }}
          >
            PICO-8
          </button>
          <button
            type="button"
            className={`btn mini ${effectSettings.ditherPalette === 'nes' ? 'active' : ''}`}
            onClick={() => onSettingsChange({ ...effectSettings, ditherPalette: 'nes' })}
            disabled={disabled}
            style={{ fontSize: '0.7rem', padding: '3px 6px' }}
          >
            NES
          </button>
          <button
            type="button"
            className={`btn mini ${effectSettings.ditherPalette === 'zx_spectrum' ? 'active' : ''}`}
            onClick={() => onSettingsChange({ ...effectSettings, ditherPalette: 'zx_spectrum' })}
            disabled={disabled}
            style={{ fontSize: '0.7rem', padding: '3px 6px' }}
          >
            ZX
          </button>
          <button
            type="button"
            className={`btn mini ${effectSettings.ditherPalette === 'atari_2600' ? 'active' : ''}`}
            onClick={() => onSettingsChange({ ...effectSettings, ditherPalette: 'atari_2600' })}
            disabled={disabled}
            style={{ fontSize: '0.7rem', padding: '3px 6px' }}
          >
            Atari
          </button>
          <button
            type="button"
            className={`btn mini ${effectSettings.ditherPalette === 'commodore64' ? 'active' : ''}`}
            onClick={() => onSettingsChange({ ...effectSettings, ditherPalette: 'commodore64' })}
            disabled={disabled}
            style={{ fontSize: '0.7rem', padding: '3px 6px' }}
          >
            C64
          </button>
          <button
            type="button"
            className={`btn mini ${effectSettings.ditherPalette === 'apple_ii' ? 'active' : ''}`}
            onClick={() => onSettingsChange({ ...effectSettings, ditherPalette: 'apple_ii' })}
            disabled={disabled}
            style={{ fontSize: '0.7rem', padding: '3px 6px' }}
          >
            Apple II
          </button>
        </div>
      )}
    </div>
  );
}