"use client";

import React from "react";
import { FILTER_PRESETS, CATEGORY_COLORS } from "../imageEditor/constants";

interface FiltersControlsProps {
  effectSettings: any;
  onSettingsChange: (settings: any) => void;
  disabled: boolean;
}

export function FiltersControls({ effectSettings, onSettingsChange, disabled }: FiltersControlsProps) {
  const updateSetting = (key: string, value: any) => {
    onSettingsChange({ ...effectSettings, [key]: value });
  };

  const selectedFilter = effectSettings.selectedFilter || 'none';
  const filterStrength = effectSettings.filterStrength || 1;

  return (
    <div style={{ display: 'grid', gap: 12, width: '100%' }}>
      {/* Filter selection */}
      <div>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
          Filter
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
          gap: 8,
          maxHeight: 120,
          overflowY: 'auto'
        }}>
          {Object.entries(FILTER_PRESETS).map(([key, value]) => (
            <button
              key={key}
              type="button"
              onClick={() => updateSetting('selectedFilter', key)}
              disabled={disabled}
              style={{
                padding: '8px 4px',
                borderRadius: 6,
                background: selectedFilter === key ? `color-mix(in srgb, ${CATEGORY_COLORS.color} 20%, transparent)` : 'transparent',
                border: selectedFilter === key ? `1px solid ${CATEGORY_COLORS.color}` : '1px solid transparent',
                color: 'var(--text)',
                fontSize: 12,
                fontWeight: selectedFilter === key ? 600 : 500,
                cursor: 'pointer',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Filter strength */}
      {selectedFilter !== 'none' && (
        <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ width: 80, fontSize: 14, fontWeight: 600 }}>
            Strength
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flex: 1 }}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={filterStrength}
              onChange={(e) => updateSetting('filterStrength', parseFloat(e.target.value))}
              disabled={disabled}
              style={{
                flex: 1,
                background: `linear-gradient(to right, var(--bg) 0%, var(--primary) ${filterStrength * 100}%, var(--bg) 100%)`,
              }}
            />
            <span style={{ fontSize: 12, fontWeight: 500, minWidth: 35, textAlign: 'right' }}>
              {(filterStrength * 100).toFixed(0)}%
            </span>
          </span>
        </label>
      )}
    </div>
  );
}