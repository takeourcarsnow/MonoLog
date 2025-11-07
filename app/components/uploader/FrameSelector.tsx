"use client";

import React from "react";

interface FrameSelectorProps {
  frameFiles: string[];
  selectedFrame: string | null;
  onSelectFrame: (file: string) => void;
  disabled: boolean;
}

export function FrameSelector({ frameFiles, selectedFrame, onSelectFrame, disabled }: FrameSelectorProps) {
  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {frameFiles.map((file) => {
          const thumbUrl = `/frames/${file}`;
          return (
            <button
              key={file}
              type="button"
              onClick={() => onSelectFrame(file)}
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
                boxShadow: selectedFrame === file ? '0 0 0 2px var(--primary)' : 'none',
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