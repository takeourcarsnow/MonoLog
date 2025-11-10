"use client";

import React from "react";
import { BasicPanel } from "../shared/BasicPanel";

interface BasicControlsProps {
  effectSettings: any;
  onSettingsChange: (settings: any) => void;
  disabled: boolean;
}

export function BasicControls({ effectSettings, onSettingsChange, disabled }: BasicControlsProps) {
  const handleChange = (key: string, value: number) => {
    onSettingsChange({ ...effectSettings, [key]: value });
  };

  return (
    <BasicPanel
      exposure={effectSettings.exposure || 0}
      contrast={effectSettings.contrast || 0}
      saturation={effectSettings.saturation || 0}
      temperature={effectSettings.temperature || 0}
      onChange={handleChange}
      disabled={disabled}
    />
  );
}