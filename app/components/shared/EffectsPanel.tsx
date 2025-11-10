"use client";

import React from "react";
import { EffectSlider } from "./EffectSlider";
import { Aperture, Layers, ZapOff, Film } from "lucide-react";

interface EffectsPanelProps {
  vignette: number;
  grain: number;
  softFocus: number;
  fade: number;
  onChange: (key: string, value: number) => void;
  onReset?: (key: string) => void;
  disabled?: boolean;
  vignetteRef?: React.MutableRefObject<number>;
  grainRef?: React.MutableRefObject<number>;
  softFocusRef?: React.MutableRefObject<number>;
  fadeRef?: React.MutableRefObject<number>;
  announce?: boolean;
}

export function EffectsPanel({
  vignette,
  grain,
  softFocus,
  fade,
  onChange,
  onReset,
  disabled = false,
  vignetteRef,
  grainRef,
  softFocusRef,
  fadeRef,
  announce = false,
}: EffectsPanelProps) {
  const effects = [
    {
      key: 'vignette',
      icon: <Aperture size={14} strokeWidth={2} aria-hidden />,
      label: 'Vignette',
      value: vignette,
      ref: vignetteRef,
      colorLeft: '#001122',
      colorRight: '#66d1ff'
    },
    {
      key: 'grain',
      icon: <Layers size={14} strokeWidth={2} aria-hidden />,
      label: 'Grain',
      value: grain,
      ref: grainRef,
      colorLeft: '#8b7355',
      colorRight: '#ff9f43'
    },
    {
      key: 'softFocus',
      icon: <ZapOff size={14} strokeWidth={2} aria-hidden />,
      label: 'Soft',
      value: softFocus,
      ref: softFocusRef,
      colorLeft: '#f0e6ff',
      colorRight: '#c8a2ff'
    },
    {
      key: 'fade',
      icon: <Film size={14} strokeWidth={2} aria-hidden />,
      label: 'Fade',
      value: fade,
      ref: fadeRef,
      colorLeft: '#fff9e6',
      colorRight: '#ffdc99'
    },
  ];

  return (
    <section className="imgedit-panel-inner effects-panel" style={{ display: 'grid', width: '100%', gap: 2 }}>
      {effects.map((effect) => (
        <EffectSlider
          key={effect.key}
          label={effect.label}
          icon={effect.icon}
          value={effect.value}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => onChange(effect.key, v)}
          onDoubleClick={onReset ? () => onReset(effect.key) : undefined}
          disabled={disabled}
          showValue={false}
          colorLeft={effect.colorLeft}
          colorRight={effect.colorRight}
          announce={announce}
          prevValueRef={effect.ref}
        />
      ))}
    </section>
  );
}