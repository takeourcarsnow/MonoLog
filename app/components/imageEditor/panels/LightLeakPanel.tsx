import { Sun, Snowflake, Droplet, RotateCcw, Flame, Zap } from "lucide-react";
import { rangeBg } from "../utils";

interface LightLeakPanelProps {
  lightLeak: { preset: string; intensity: number };
  setLightLeak: (v: { preset: string; intensity: number }) => void;
  lightLeakRef: React.MutableRefObject<{ preset: string; intensity: number }>;
  draw: (overrides?: any) => void;
  resetControlToDefault: (control: string) => void;
}

const LIGHT_LEAK_PRESETS = [
  { id: 'none', label: 'None', Icon: RotateCcw },
  { id: 'warm-top-right', label: 'Warm Corner', Icon: Sun },
  { id: 'cool-bottom-left', label: 'Cool Corner', Icon: Snowflake },
  { id: 'magenta-center', label: 'Magenta Glow', Icon: Droplet },
  { id: 'blue-side', label: 'Blue Edge', Icon: Droplet },
  { id: 'golden-hour', label: 'Golden Hour', Icon: Sun },
  { id: 'warm-bottom-left', label: 'Warm Bottom', Icon: Flame },
  { id: 'cool-top-right', label: 'Cool Top', Icon: Snowflake },
  { id: 'red-corner', label: 'Red Corner', Icon: Flame },
  { id: 'purple-glow', label: 'Purple Glow', Icon: Zap },
  { id: 'sunset', label: 'Sunset', Icon: Sun },
  { id: 'moonlight', label: 'Moonlight', Icon: Snowflake },
];

export default function LightLeakPanel({
  lightLeak,
  setLightLeak,
  lightLeakRef,
  draw,
  resetControlToDefault,
}: LightLeakPanelProps) {
  return (
    <section className="imgedit-panel-inner" style={{ display: 'grid', width: '100%' }}>
      <fieldset>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
          <span className="sr-only">Light Leak</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
            {LIGHT_LEAK_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onMouseDown={() => {
                  const newLightLeak = { ...lightLeak, preset: preset.id };
                  lightLeakRef.current = newLightLeak;
                  setLightLeak(newLightLeak);
                  draw();
                  requestAnimationFrame(() => draw());
                }}
                style={{
                  padding: '4px 6px',
                  borderRadius: 6,
                  background: 'transparent',
                  color: 'var(--text)',
                  transition: 'transform 120ms ease, box-shadow 200ms ease, color 200ms ease',
                  display: 'inline-flex',
                  gap: 4,
                  alignItems: 'center',
                  position: 'relative',
                  zIndex: 1,
                  border: 'none',
                  fontWeight: lightLeak.preset === preset.id ? 700 : 500
                }}
                onMouseDownCapture={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
                onMouseUpCapture={(e) => (e.currentTarget.style.transform = '')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
                onFocus={(e) => (e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)')}
                onBlur={(e) => (e.currentTarget.style.boxShadow = '')}
                aria-pressed={lightLeak.preset === preset.id}
              >
                <preset.Icon size={14} strokeWidth={2} aria-hidden />
                <span style={{ fontSize: 11 }}>{preset.label}</span>
              </button>
            ))}
          </div>

          <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ width: 100, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
              Intensity
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flex: 1 }}>
              <input
                className="imgedit-range"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={lightLeak.intensity}
                disabled={lightLeak.preset === 'none'}
                onInput={(e: any) => {
                  const v = Number(e.target.value);
                  const newLightLeak = { ...lightLeak, intensity: v };
                  lightLeakRef.current = newLightLeak;
                  setLightLeak(newLightLeak);
                  requestAnimationFrame(() => draw());
                }}
                onDoubleClick={() => resetControlToDefault('lightLeak')}
                style={{ flex: 1, background: rangeBg(lightLeak.intensity, 0, 1, '#f0f0f0', '#ffcc00') }}
              />
            </span>
          </label>
        </div>
      </fieldset>
    </section>
  );
}