import { SunDim, Scale, Rainbow, Thermometer } from "lucide-react";
import { rangeBg, announceDirection } from "../utils";
import { EffectSlider } from "../../shared/EffectSlider";

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
  const handleChange = (key: string, value: number) => {
    switch (key) {
      case 'exposure':
        announceDirection('exposure', exposureRef.current, value);
        exposureRef.current = value;
        setExposure(value);
        break;
      case 'contrast':
        announceDirection('contrast', contrastRef.current, value);
        contrastRef.current = value;
        setContrast(value);
        break;
      case 'saturation':
        announceDirection('saturation', saturationRef.current, value);
        saturationRef.current = value;
        setSaturation(value);
        break;
      case 'temperature':
        announceDirection('temperature', temperatureRef.current, value);
        temperatureRef.current = value;
        setTemperature(value);
        break;
    }
    requestAnimationFrame(() => draw());
  };

  return (
    <section className="imgedit-panel-inner basic-panel" style={{ display: 'grid', width: '100%' }}>
      <EffectSlider
        label="Exposure"
        icon={<SunDim size={18} strokeWidth={2} aria-hidden />}
        value={exposure}
        min={-2}
        max={2}
        step={0.1}
        onChange={(v) => handleChange('exposure', v)}
        onDoubleClick={() => resetControlToDefault('exposure')}
        valueFormatter={(v) => `${(v * 100).toFixed(0)}%`}
        colorLeft="#fff6db"
        colorRight="#ffd166"
        announce={true}
        prevValueRef={exposureRef}
      />

      <EffectSlider
        label="Contrast"
        icon={<Scale size={18} strokeWidth={2} aria-hidden />}
        value={contrast}
        min={-1}
        max={1}
        step={0.01}
        onChange={(v) => handleChange('contrast', v)}
        onDoubleClick={() => resetControlToDefault('contrast')}
        valueFormatter={(v) => `${(v * 100).toFixed(0)}%`}
        colorLeft="#fff3e6"
        colorRight="#ff9f43"
        announce={true}
        prevValueRef={contrastRef}
      />

      <EffectSlider
        label="Saturation"
        icon={<Rainbow size={18} strokeWidth={2} aria-hidden />}
        value={saturation}
        min={-1}
        max={1}
        step={0.01}
        onChange={(v) => handleChange('saturation', v)}
        onDoubleClick={() => resetControlToDefault('saturation')}
        valueFormatter={(v) => `${(v * 100).toFixed(0)}%`}
        colorLeft="#ffe9e9"
        colorRight="#ff6b6b"
        announce={true}
        prevValueRef={saturationRef}
      />

      <EffectSlider
        label="Temperature"
        icon={<Thermometer size={18} strokeWidth={2} aria-hidden />}
        value={temperature}
        min={-100}
        max={100}
        step={1}
        onChange={(v) => handleChange('temperature', v)}
        onDoubleClick={() => resetControlToDefault('temperature')}
        valueFormatter={(v) => (v > 0 ? '+' : '') + v.toFixed(0)}
        colorLeft="#66d1ff"
        colorRight="#ffb86b"
        announce={true}
        prevValueRef={temperatureRef}
      />
    </section>
  );
}
