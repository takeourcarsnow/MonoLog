import { SunDim, Scale, Rainbow, Thermometer } from "lucide-react";
import { rangeBg, announceDirection } from "../utils";

interface BasicPanelProps {
  exposure: number;
  setExposure: (v: number) => void;
  exposureRef: React.MutableRefObject<number>;
  contrast: number;
  setContrast: (v: number) => void;
  contrastRef: React.MutableRefObject<number>;
  saturation: number;
  setSaturation: (v: number) => void;
  saturationRef: React.MutableRefObject<number>;
  temperature: number;
  setTemperature: (v: number) => void;
  temperatureRef: React.MutableRefObject<number>;
  draw: (overrides?: any) => void;
  resetControlToDefault: (control: string) => void;
}

export default function BasicPanel({
  exposure,
  setExposure,
  exposureRef,
  contrast,
  setContrast,
  contrastRef,
  saturation,
  setSaturation,
  saturationRef,
  temperature,
  setTemperature,
  temperatureRef,
  draw,
  resetControlToDefault,
}: BasicPanelProps) {
  return (
    <section className="imgedit-panel-inner" style={{ display: 'grid', width: '100%' }}>
      <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ width: 100, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
          <SunDim size={18} strokeWidth={2} aria-hidden />
          <span>Exposure</span>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <input
            className="imgedit-range"
            type="range"
            min={-2}
            max={2}
            step={0.1}
            value={exposure}
            onInput={(e: any) => {
              const v = Number(e.target.value);
              announceDirection('exposure', exposureRef.current, v);
              exposureRef.current = v;
              setExposure(v);
              requestAnimationFrame(() => draw());
            }}
            onDoubleClick={() => resetControlToDefault('exposure')}
            style={{ flex: 1, background: rangeBg(exposure, -2, 2, 'var(--slider-heat-start)', 'var(--slider-heat-end)') }}
          />
        </span>
      </label>
      <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ width: 100, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
          <Scale size={18} strokeWidth={2} aria-hidden />
          <span>Contrast</span>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <input
            className="imgedit-range"
            type="range"
            min={-1}
            max={1}
            step={0.01}
            value={contrast}
            onInput={(e: any) => {
              const v = Number(e.target.value);
              announceDirection('contrast', contrastRef.current, v);
              contrastRef.current = v;
              setContrast(v);
              requestAnimationFrame(() => draw());
            }}
            onDoubleClick={() => resetControlToDefault('contrast')}
            style={{ flex: 1, background: rangeBg(contrast, -1, 1, 'var(--slider-heat-start)', 'var(--slider-heat-end)') }}
          />
        </span>
      </label>
      <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ width: 100, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
          <Rainbow size={18} strokeWidth={2} aria-hidden />
          <span>Saturation</span>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <input
            className="imgedit-range"
            type="range"
            min={-1}
            max={1}
            step={0.01}
            value={saturation}
            onInput={(e: any) => {
              const v = Number(e.target.value);
              announceDirection('saturation', saturationRef.current, v);
              saturationRef.current = v;
              setSaturation(v);
              requestAnimationFrame(() => draw());
            }}
            onDoubleClick={() => resetControlToDefault('saturation')}
            style={{ flex: 1, background: rangeBg(saturation, -1, 1, 'var(--slider-heat-start)', 'var(--slider-heat-end)') }}
          />
        </span>
      </label>
      <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ width: 100, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
          <Thermometer size={18} strokeWidth={2} aria-hidden />
          <span>Temperature</span>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <input
            className="imgedit-range"
            type="range"
            min={-100}
            max={100}
            step={1}
            value={temperature}
            onInput={(e: any) => {
              const v = Number(e.target.value);
              announceDirection('temperature', temperatureRef.current, v);
              temperatureRef.current = v;
              setTemperature(v);
              requestAnimationFrame(() => draw());
            }}
            onDoubleClick={() => resetControlToDefault('temperature')}
            style={{ flex: 1, background: rangeBg(temperature, -100, 100, 'var(--slider-temperature-cold)', 'var(--slider-temperature-warm)') }}
          />
        </span>
      </label>
    </section>
  );
}
