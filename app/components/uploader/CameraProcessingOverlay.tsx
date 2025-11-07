"use client";

import React from "react";
import LogoLoader from "./LogoLoader";

interface CameraProcessingOverlayProps {
  showProcessingOverlay: boolean;
}

export function CameraProcessingOverlay({ showProcessingOverlay }: CameraProcessingOverlayProps) {
  if (!showProcessingOverlay) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        borderRadius: 6,
        zIndex: 1,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <LogoLoader size={48} variant="other" />
        <span style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 500 }}>Processing...</span>
      </div>
    </div>
  );
}