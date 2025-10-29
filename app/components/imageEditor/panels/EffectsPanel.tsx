import { Aperture, Layers, ZapOff, Film } from "lucide-react";
import { rangeBg } from "../utils";

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
  return (
    <section className="imgedit-panel-inner" style={{ display: 'grid', width: '100%' }}>
      <label style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <span style={{ width: 120, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
          <Aperture size={18} strokeWidth={2} aria-hidden />
          <span>Vignette</span>
        </span>
        <input
          className="imgedit-range"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={vignette}
          onInput={(e: any) => {
            const v = Number(e.target.value);
            vignetteRef.current = v;
            setVignette(v);
            requestAnimationFrame(() => draw());
          }}
          onDoubleClick={() => resetControlToDefault('vignette')}
          style={{ flex: 1, background: rangeBg(vignette, 0, 1, '#001122', '#66d1ff') }}
        />
      </label>
      <label style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <span style={{ width: 120, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
          <Layers size={18} strokeWidth={2} aria-hidden />
          <span>Grain</span>
        </span>
        <input
          className="imgedit-range"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={grain}
          onInput={(e: any) => {
            const v = Number(e.target.value);
            grainRef.current = v;
            setGrain(v);
            requestAnimationFrame(() => draw());
          }}
          onDoubleClick={() => resetControlToDefault('grain')}
          style={{ flex: 1, background: rangeBg(grain, 0, 1, '#8b7355', '#ff9f43') }}
        />
      </label>

      <label style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <span style={{ width: 120, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
          <ZapOff size={18} strokeWidth={2} aria-hidden />
          <span>Soft Focus</span>
        </span>
        <input
          className="imgedit-range"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={softFocus}
          onInput={(e: any) => {
            const v = Number(e.target.value);
            softFocusRef.current = v;
            setSoftFocus(v);
            requestAnimationFrame(() => draw());
          }}
          onDoubleClick={() => resetControlToDefault('softFocus')}
          style={{ flex: 1, background: rangeBg(softFocus, 0, 1, '#f0e6ff', '#c8a2ff') }}
        />
      </label>

      <label style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <span style={{ width: 120, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
          <Film size={18} strokeWidth={2} aria-hidden />
          <span>Fade</span>
        </span>
        <input
          className="imgedit-range"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={fade}
          onInput={(e: any) => {
            const v = Number(e.target.value);
            fadeRef.current = v;
            setFade(v);
            requestAnimationFrame(() => draw());
          }}
          onDoubleClick={() => resetControlToDefault('fade')}
          style={{ flex: 1, background: rangeBg(fade, 0, 1, '#fff9e6', '#ffdc99') }}
        />
      </label>
    </section>
  );
}
