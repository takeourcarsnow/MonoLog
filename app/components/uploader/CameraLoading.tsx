"use client";

import React from "react";
import LogoLoader from "./LogoLoader";

interface CameraLoadingProps {
  cameraReady: boolean;
  error: string | null;
}

export function CameraLoading({ cameraReady, error }: CameraLoadingProps) {
  if (cameraReady || error) return null;

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