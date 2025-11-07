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
    <div style={{ padding: '8px 0' }}>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {overlayFiles.map((file) => {
          const thumbUrl = `/overlays/thumbs/${file}`;
          return (
            <button
              key={file}
              type="button"
              onClick={() => onSelectOverlay(file)}
              disabled={disabled}
              style={{
                flexShrink: 0,
                width: 48,
                height: 48,
                border: 'none',
                borderRadius: 6,
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
    </div>
  );
}