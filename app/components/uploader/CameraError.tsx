"use client";

import React from "react";
import { Button } from "@/app/components/ui/Button";

interface CameraErrorProps {
  error: string | null;
  startCameraEnhanced: () => void;
  onClose: () => void;
}

export function CameraError({ error, startCameraEnhanced, onClose }: CameraErrorProps) {
  if (!error) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(0,0,0,0.8)',
        color: '#fff',
        padding: 16,
        borderRadius: 8,
        textAlign: 'center',
        maxWidth: '80%',
        zIndex: 4,
      }}
    >
      <div style={{ fontSize: 18, marginBottom: 8 }}>📷</div>
      <div style={{ fontSize: 14, marginBottom: 12 }}>{error}</div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <Button onClick={startCameraEnhanced} size="sm">
          Try Again
        </Button>
        <Button onClick={onClose} variant="ghost" size="sm">
          Close
        </Button>
      </div>
    </div>
  );
}