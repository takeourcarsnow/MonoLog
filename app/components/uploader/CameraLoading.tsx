"use client";

import React from "react";
import LogoLoader from "./LogoLoader";

interface CameraLoadingProps {
  cameraReady: boolean;
  error: string | null;
  isPreviewing?: boolean;
}

export function CameraLoading({ cameraReady, error, isPreviewing }: CameraLoadingProps) {
  if (cameraReady || error || isPreviewing) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        color: '#fff',
        zIndex: 2,
      }}
    >
      <LogoLoader size={40} variant="other" />
    </div>
  );
}