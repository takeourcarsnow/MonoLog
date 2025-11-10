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
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 2, alignItems: 'center' }}>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20 }}>
        {icon}
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
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
          style={{ flex: 1, background, minWidth: 60 }}
        />
        {showValue && (
          <span style={{ fontSize: 9, fontWeight: 500, minWidth: 20, textAlign: 'right' }}>
            {valueFormatter(value)}
          </span>
        )}
      </span>
    </div>
  );
}