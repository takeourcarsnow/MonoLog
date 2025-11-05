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
    <section className="imgedit-panel-inner effects-panel" style={{ display: 'grid', width: '100%', gap: 6 }}>
      {[
        { key: 'vignette', icon: <Aperture size={14} strokeWidth={2} aria-hidden />, label: 'Vignette', value: vignette, ref: vignetteRef, set: setVignette, color: ['#001122', '#66d1ff'] },
        { key: 'grain', icon: <Layers size={14} strokeWidth={2} aria-hidden />, label: 'Grain', value: grain, ref: grainRef, set: setGrain, color: ['#8b7355', '#ff9f43'] },
        { key: 'softFocus', icon: <ZapOff size={14} strokeWidth={2} aria-hidden />, label: 'Soft', value: softFocus, ref: softFocusRef, set: setSoftFocus, color: ['#f0e6ff', '#c8a2ff'] },
        { key: 'fade', icon: <Film size={14} strokeWidth={2} aria-hidden />, label: 'Fade', value: fade, ref: fadeRef, set: setFade, color: ['#fff9e6', '#ffdc99'] },
      ].map((c) => (
        <label key={c.key} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, fontWeight: 600, minWidth: 72 }}>
            {c.icon}
            <span style={{ whiteSpace: 'nowrap' }}>{c.label}</span>
          </span>
          <input
            className="imgedit-range"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={c.value}
            onInput={(e: any) => {
              const v = Number(e.target.value);
              c.ref.current = v;
              c.set(v);
              requestAnimationFrame(() => draw());
            }}
            onDoubleClick={() => resetControlToDefault(c.key)}
            style={{ flex: 1, minWidth: 0, background: rangeBg(c.value, 0, 1, c.color[0], c.color[1]) }}
          />
        </label>
      ))}
    </section>
  );
}
