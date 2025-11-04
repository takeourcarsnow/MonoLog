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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: 8 }}>
        {frameFiles.map((file) => {
          const thumbUrl = `/frames/${file}`;
          return (
            <button
              key={file}
              type="button"
              onClick={() => onSelectFrame(file)}
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