"use client";

import React from "react";
import { EffectSlider } from "./EffectSlider";
import { getBasicPanelSliders } from "./basicPanelConfig";

interface BasicPanelProps {
  exposure: number;
  contrast: number;
  saturation: number;
  temperature: number;
  onChange: (key: string, value: number) => void;
  onReset?: (key: string) => void;
  disabled?: boolean;
  exposureRef?: React.MutableRefObject<number>;
  contrastRef?: React.MutableRefObject<number>;
  saturationRef?: React.MutableRefObject<number>;
  temperatureRef?: React.MutableRefObject<number>;
  announce?: boolean;
}

export function BasicPanel({
  exposure,
  contrast,
  saturation,
  temperature,
  onChange,
  onReset,
  disabled = false,
  exposureRef,
  contrastRef,
  saturationRef,
  temperatureRef,
  announce = false,
}: BasicPanelProps) {
  const sliders = getBasicPanelSliders(
    exposure,
    contrast,
    saturation,
    temperature,
    undefined,
    exposureRef,
    contrastRef,
    saturationRef,
    temperatureRef
  );

  return (
    <section className="imgedit-panel-inner basic-panel" style={{ display: 'grid', width: '100%', gap: 2 }}>
      {sliders.map((slider, index) => (
        <EffectSlider
          key={slider.label}
          label={slider.label}
          icon={slider.icon}
          value={slider.value}
          min={slider.min}
          max={slider.max}
          step={slider.step}
          onChange={(v) => onChange(slider.label.toLowerCase(), v)}
          onDoubleClick={onReset ? () => onReset(slider.label.toLowerCase()) : undefined}
          disabled={disabled}
          showValue={false}
          colorLeft={slider.colorLeft}
          colorRight={slider.colorRight}
          announce={announce}
          prevValueRef={slider.ref}
        />
      ))}
    </section>
  );
}