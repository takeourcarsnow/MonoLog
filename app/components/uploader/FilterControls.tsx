"use client";

import React from "react";
import { FilterPanel } from "../shared/FilterPanel";

interface FilterControlsProps {
  effectSettings: any;
  onSettingsChange: (settings: any) => void;
  disabled: boolean;
}

export function FilterControls({ effectSettings, onSettingsChange, disabled }: FilterControlsProps) {
  const handleChange = (key: string, value: string | number) => {
    onSettingsChange({ ...effectSettings, [key]: value });
  };

  return (
    <FilterPanel
      selectedFilter={effectSettings.selectedFilter || 'none'}
      filterStrength={effectSettings.filterStrength || 1}
      onChange={handleChange}
      disabled={disabled}
    />
  );
}