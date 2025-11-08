"use client";

import React from "react";
import { EffectSlider } from "./EffectSlider";
import { getBasicPanelSliders } from "./basicPanelConfig";

interface BasicPanelProps {
  exposure: number;
  contrast: number;
  saturation: number;
  temperature: number;
  vignette?: number;
  onChange: (key: string, value: number) => void;
  onReset?: (key: string) => void;
  disabled?: boolean;
  showVignette?: boolean;
  exposureRef?: React.MutableRefObject<number>;
  contrastRef?: React.MutableRefObject<number>;
  saturationRef?: React.MutableRefObject<number>;
  temperatureRef?: React.MutableRefObject<number>;
  vignetteRef?: React.MutableRefObject<number>;
  announce?: boolean;
}

export function BasicPanel({
  exposure,
  contrast,
  saturation,
  temperature,
  vignette = 0,
  onChange,
  onReset,
  disabled = false,
  showVignette = false,
  exposureRef,
  contrastRef,
  saturationRef,
  temperatureRef,
  vignetteRef,
  announce = false,
}: BasicPanelProps) {
  const sliders = getBasicPanelSliders(
    exposure,
    contrast,
    saturation,
    temperature,
    showVignette ? vignette : undefined,
    exposureRef,
    contrastRef,
    saturationRef,
    temperatureRef,
    vignetteRef
  );

  return (
    <section className="imgedit-panel-inner basic-panel" style={{ display: 'grid', width: '100%' }}>
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
          valueFormatter={slider.valueFormatter}
          colorLeft={slider.colorLeft}
          colorRight={slider.colorRight}
          announce={announce}
          prevValueRef={slider.ref}
        />
      ))}
    </section>
  );
}