import { Aperture, Layers, ZapOff, Film } from "lucide-react";
import { rangeBg } from "../utils";
import { EffectSlider } from "../../shared/EffectSlider";

interface EffectsPanelProps {
  vignette: number;
  setVignette: (v: number) => void;
  vignetteRef: React.MutableRefObject<number>;
  grain: number;
  setGrain: (v: number) => void;
  grainRef: React.MutableRefObject<number>;
  softFocus: number;
  setSoftFocus: (v: number) => void;
  softFocusRef: React.MutableRefObject<number>;
  fade: number;
  setFade: (v: number) => void;
  fadeRef: React.MutableRefObject<number>;
  draw: (overrides?: any) => void;
  resetControlToDefault: (control: string) => void;
}

export default function EffectsPanel({
  vignette,
  setVignette,
  vignetteRef,
  grain,
  setGrain,
  grainRef,
  softFocus,
  setSoftFocus,
  softFocusRef,
  fade,
  setFade,
  fadeRef,
  draw,
  resetControlToDefault,
}: EffectsPanelProps) {
  const handleChange = (key: string, value: number) => {
    switch (key) {
      case 'vignette':
        vignetteRef.current = value;
        setVignette(value);
        break;
      case 'grain':
        grainRef.current = value;
        setGrain(value);
        break;
      case 'softFocus':
        softFocusRef.current = value;
        setSoftFocus(value);
        break;
      case 'fade':
        fadeRef.current = value;
        setFade(value);
        break;
    }
    requestAnimationFrame(() => draw());
  };

  return (
    <section className="imgedit-panel-inner effects-panel" style={{ display: 'grid', width: '100%', gap: 6 }}>
      <EffectSlider
        label="Vignette"
        icon={<Aperture size={14} strokeWidth={2} aria-hidden />}
        value={vignette}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => handleChange('vignette', v)}
        onDoubleClick={() => resetControlToDefault('vignette')}
        showValue={false}
        colorLeft="#001122"
        colorRight="#66d1ff"
        prevValueRef={vignetteRef}
      />

      <EffectSlider
        label="Grain"
        icon={<Layers size={14} strokeWidth={2} aria-hidden />}
        value={grain}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => handleChange('grain', v)}
        onDoubleClick={() => resetControlToDefault('grain')}
        showValue={false}
        colorLeft="#8b7355"
        colorRight="#ff9f43"
        prevValueRef={grainRef}
      />

      <EffectSlider
        label="Soft"
        icon={<ZapOff size={14} strokeWidth={2} aria-hidden />}
        value={softFocus}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => handleChange('softFocus', v)}
        onDoubleClick={() => resetControlToDefault('softFocus')}
        showValue={false}
        colorLeft="#f0e6ff"
        colorRight="#c8a2ff"
        prevValueRef={softFocusRef}
      />

      <EffectSlider
        label="Fade"
        icon={<Film size={14} strokeWidth={2} aria-hidden />}
        value={fade}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => handleChange('fade', v)}
        onDoubleClick={() => resetControlToDefault('fade')}
        showValue={false}
        colorLeft="#fff9e6"
        colorRight="#ffdc99"
        prevValueRef={fadeRef}
      />
    </section>
  );
}
