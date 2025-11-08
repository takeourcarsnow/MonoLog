"use client";

import React from "react";
import { rangeBg, announceDirection } from "../imageEditor/utils";

interface EffectSliderProps {
  label: string;
  icon?: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  onDoubleClick?: () => void;
  disabled?: boolean;
  showValue?: boolean;
  valueFormatter?: (value: number) => string;
  colorLeft?: string;
  colorRight?: string;
  announce?: boolean;
  prevValueRef?: React.MutableRefObject<number>;
  ariaLabel?: string;
}

export function EffectSlider({
  label,
  icon,
  value,
  min,
  max,
  step,
  onChange,
  onDoubleClick,
  disabled = false,
  showValue = true,
  valueFormatter = (v) => v.toString(),
  colorLeft,
  colorRight,
  announce = false,
  prevValueRef,
  ariaLabel,
}: EffectSliderProps) {
  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    const newValue = Number((e.target as HTMLInputElement).value);
    if (announce && prevValueRef) {
      announceDirection(label.toLowerCase(), prevValueRef.current, newValue);
      prevValueRef.current = newValue;
    }
    onChange(newValue);
  };

  const background = rangeBg(value, min, max, colorLeft, colorRight);

  return (
    <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <span style={{ width: 80, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
        {icon}
        <span>{label}</span>
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flex: 1 }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onInput={handleInput}
          onDoubleClick={onDoubleClick}
          disabled={disabled}
          aria-label={ariaLabel || label}
          style={{ flex: 1, background }}
        />
        {showValue && (
          <span style={{ fontSize: 12, fontWeight: 500, minWidth: 35, textAlign: 'right' }}>
            {valueFormatter(value)}
          </span>
        )}
      </span>
    </label>
  );
}