"use client";

import React from "react";
import { EffectsPanel } from "../shared/EffectsPanel";

interface EffectsControlsProps {
  effectSettings: any;
  onSettingsChange: (settings: any) => void;
  disabled: boolean;
}

export function EffectsControls({ effectSettings, onSettingsChange, disabled }: EffectsControlsProps) {
  const handleChange = (key: string, value: number) => {
    onSettingsChange({ ...effectSettings, [key]: value });
  };

  return (
    <EffectsPanel
      vignette={effectSettings.vignette || 0}
      grain={effectSettings.grain || 0}
      softFocus={effectSettings.softFocus || 0}
      fade={effectSettings.fade || 0}
      onChange={handleChange}
      disabled={disabled}
    />
  );
}