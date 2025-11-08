"use client";

import React from "react";
import { EffectSlider } from "./EffectSlider";
import { SunDim, Scale, Rainbow, Thermometer } from "lucide-react";

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
  const iconSize = 18;

  return (
    <section className="imgedit-panel-inner basic-panel" style={{ display: 'grid', width: '100%' }}>
      <EffectSlider
        label="Exposure"
        icon={<SunDim size={iconSize} strokeWidth={2} aria-hidden />}
        value={exposure}
        min={-2}
        max={2}
        step={0.1}
        onChange={(v) => onChange('exposure', v)}
        onDoubleClick={onReset ? () => onReset('exposure') : undefined}
        disabled={disabled}
        valueFormatter={(v) => `${(v * 100).toFixed(0)}%`}
        colorLeft="#fff6db"
        colorRight="#ffd166"
        announce={announce}
        prevValueRef={exposureRef}
      />

      <EffectSlider
        label="Contrast"
        icon={<Scale size={iconSize} strokeWidth={2} aria-hidden />}
        value={contrast}
        min={-1}
        max={1}
        step={0.01}
        onChange={(v) => onChange('contrast', v)}
        onDoubleClick={onReset ? () => onReset('contrast') : undefined}
        disabled={disabled}
        valueFormatter={(v) => `${(v * 100).toFixed(0)}%`}
        colorLeft="#fff3e6"
        colorRight="#ff9f43"
        announce={announce}
        prevValueRef={contrastRef}
      />

      <EffectSlider
        label="Saturation"
        icon={<Rainbow size={iconSize} strokeWidth={2} aria-hidden />}
        value={saturation}
        min={-1}
        max={1}
        step={0.01}
        onChange={(v) => onChange('saturation', v)}
        onDoubleClick={onReset ? () => onReset('saturation') : undefined}
        disabled={disabled}
        valueFormatter={(v) => `${(v * 100).toFixed(0)}%`}
        colorLeft="#ffe9e9"
        colorRight="#ff6b6b"
        announce={announce}
        prevValueRef={saturationRef}
      />

      <EffectSlider
        label="Temperature"
        icon={<Thermometer size={iconSize} strokeWidth={2} aria-hidden />}
        value={temperature}
        min={-100}
        max={100}
        step={1}
        onChange={(v) => onChange('temperature', v)}
        onDoubleClick={onReset ? () => onReset('temperature') : undefined}
        disabled={disabled}
        valueFormatter={(v) => (v > 0 ? '+' : '') + v.toFixed(0)}
        colorLeft="#66d1ff"
        colorRight="#ffb86b"
        announce={announce}
        prevValueRef={temperatureRef}
      />

      {showVignette && (
        <EffectSlider
          label="Vignette"
          icon={<span style={{ width: iconSize, height: iconSize, borderRadius: '50%', background: 'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.8) 70%)', display: 'inline-block' }} />}
          value={vignette}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => onChange('vignette', v)}
          onDoubleClick={onReset ? () => onReset('vignette') : undefined}
          disabled={disabled}
          valueFormatter={(v) => `${(v * 100).toFixed(0)}%`}
          colorLeft="#001122"
          colorRight="#66d1ff"
          announce={announce}
          prevValueRef={vignetteRef}
        />
      )}
    </section>
  );
}