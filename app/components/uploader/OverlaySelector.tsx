"use client";

import React from "react";
import { CameraEffectSettings } from "./cameraEffects";

interface OverlaySelectorProps {
  overlayFiles: string[];
  selectedOverlay: string | null;
  effectSettings: CameraEffectSettings;
  onSelectOverlay: (file: string) => void;
  onSettingsChange: (settings: CameraEffectSettings) => void;
  disabled: boolean;
}

export function OverlaySelector({
  overlayFiles,
  selectedOverlay,
  effectSettings,
  onSelectOverlay,
  onSettingsChange,
  disabled
}: OverlaySelectorProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: 8 }}>
        {overlayFiles.map((file) => {
          const thumbUrl = `/overlays/thumbs/${file}`;
          return (
            <button
              key={file}
              type="button"
              onClick={() => onSelectOverlay(file)}
              disabled={disabled}
              style={{
                width: 60,
                height: 60,
                border: 'none',
                borderRadius: 8,
                backgroundImage: `url("${thumbUrl}")`,
                backgroundPosition: 'center',
                backgroundSize: 'cover',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--muted-bg)',
                boxShadow: selectedOverlay === file ? '0 0 0 2px var(--primary)' : 'none',
                opacity: disabled ? 0.5 : 1,
              }}
              title={file}
            />
          );
        })}
      </div>
      {effectSettings.overlay && (
        <>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
            {['multiply', 'screen', 'overlay', 'soft-light'].map((mode) => (
              <button
                key={mode}
                type="button"
                className={`btn mini ${effectSettings.overlay?.blendMode === mode ? 'active' : ''}`}
                onClick={() => {
                  if (effectSettings.overlay) {
                    onSettingsChange({
                      ...effectSettings,
                      overlay: { ...effectSettings.overlay, blendMode: mode }
                    });
                  }
                }}
                disabled={disabled}
                style={{ fontSize: '0.7rem', padding: '3px 6px', textTransform: 'capitalize' }}
              >
                {mode}
              </button>
            ))}
          </div>
          <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ minWidth: 60 }}>Opacity:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={effectSettings.overlay?.opacity || 0.85}
              onChange={(e) => {
                if (effectSettings.overlay) {
                  onSettingsChange({
                    ...effectSettings,
                    overlay: { ...effectSettings.overlay, opacity: parseFloat(e.target.value) }
                  });
                }
              }}
              style={{ flex: 1 }}
              disabled={disabled}
            />
            <span style={{ minWidth: 30, textAlign: 'right' }}>{Math.round((effectSettings.overlay?.opacity || 0.85) * 100)}%</span>
          </label>
        </>
      )}
    </div>
  );
}