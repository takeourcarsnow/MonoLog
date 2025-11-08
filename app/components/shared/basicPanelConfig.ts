import { SunDim, Scale, Rainbow, Thermometer } from "lucide-react";
import React from "react";

export interface SliderConfig {
  label: string;
  icon: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  valueFormatter: (v: number) => string;
  colorLeft: string;
  colorRight: string;
  ref?: React.MutableRefObject<number>;
}

export const getBasicPanelSliders = (
  exposure: number,
  contrast: number,
  saturation: number,
  temperature: number,
  vignette: number | undefined,
  exposureRef?: React.MutableRefObject<number>,
  contrastRef?: React.MutableRefObject<number>,
  saturationRef?: React.MutableRefObject<number>,
  temperatureRef?: React.MutableRefObject<number>,
  vignetteRef?: React.MutableRefObject<number>
): SliderConfig[] => {
  const iconSize = 18;

  const sliders: SliderConfig[] = [
    {
      label: "Exposure",
      icon: React.createElement(SunDim, { size: iconSize, strokeWidth: 2, "aria-hidden": true }),
      value: exposure,
      min: -2,
      max: 2,
      step: 0.1,
      valueFormatter: (v) => `${(v * 100).toFixed(0)}%`,
      colorLeft: "#fff6db",
      colorRight: "#ffd166",
      ref: exposureRef
    },
    {
      label: "Contrast",
      icon: React.createElement(Scale, { size: iconSize, strokeWidth: 2, "aria-hidden": true }),
      value: contrast,
      min: -1,
      max: 1,
      step: 0.01,
      valueFormatter: (v) => `${(v * 100).toFixed(0)}%`,
      colorLeft: "#fff3e6",
      colorRight: "#ff9f43",
      ref: contrastRef
    },
    {
      label: "Saturation",
      icon: React.createElement(Rainbow, { size: iconSize, strokeWidth: 2, "aria-hidden": true }),
      value: saturation,
      min: -1,
      max: 1,
      step: 0.01,
      valueFormatter: (v) => `${(v * 100).toFixed(0)}%`,
      colorLeft: "#ffe9e9",
      colorRight: "#ff6b6b",
      ref: saturationRef
    },
    {
      label: "Temperature",
      icon: React.createElement(Thermometer, { size: iconSize, strokeWidth: 2, "aria-hidden": true }),
      value: temperature,
      min: -100,
      max: 100,
      step: 1,
      valueFormatter: (v) => (v > 0 ? '+' : '') + v.toFixed(0),
      colorLeft: "#66d1ff",
      colorRight: "#ffb86b",
      ref: temperatureRef
    }
  ];

  if (vignette !== undefined) {
    sliders.push({
      label: "Vignette",
      icon: React.createElement('span', { style: { width: iconSize, height: iconSize, borderRadius: '50%', background: 'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.8) 70%)', display: 'inline-block' } }),
      value: vignette,
      min: 0,
      max: 1,
      step: 0.05,
      valueFormatter: (v) => `${(v * 100).toFixed(0)}%`,
      colorLeft: "#001122",
      colorRight: "#66d1ff",
      ref: vignetteRef
    });
  }

  return sliders;
};