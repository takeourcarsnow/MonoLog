import { Ruler } from "lucide-react";
import { rangeBg } from "../utils";

interface FramePanelProps {
  frameThickness: number;
  setFrameThickness: (v: number) => void;
  frameThicknessRef: React.MutableRefObject<number>;
  frameColor: 'white' | 'black';
  setFrameColor: (c: 'white' | 'black') => void;
  frameColorRef: React.MutableRefObject<'white' | 'black'>;
  draw: () => void;
  resetControlToDefault: (control: string) => void;
}

export default function FramePanel({
  frameThickness,
  setFrameThickness,
  frameThicknessRef,
  frameColor,
  setFrameColor,
  frameColorRef,
  draw,
  resetControlToDefault,
}: FramePanelProps) {
  return (
    <section className="imgedit-panel-inner" style={{ display: 'grid', width: '100%' }}>
      <fieldset>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}><span className="sr-only">Photo Frame</span></div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ width: 100, display: 'flex', gap: 6, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
              <Ruler size={18} strokeWidth={2} aria-hidden />
              <span>Thickness</span>
            </span>
            <input className="imgedit-range" type="range" min={0} max={0.2} step={0.005} value={frameThickness} onInput={(e:any) => { const v = Number(e.target.value); frameThicknessRef.current = v; setFrameThickness(v); draw(); }} onDoubleClick={() => resetControlToDefault('frameThickness')} style={{ flex: 1, background: rangeBg(frameThickness, 0, 0.2, '#d4c5b9', '#8b7355') }} />
          </label>

          <fieldset>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}><span className="sr-only">Frame Color</span></div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className={frameColor === 'white' ? 'btn primary' : 'btn ghost'}
                onClick={() => { frameColorRef.current = 'white'; setFrameColor('white'); draw(); }}
                style={{
                  padding: '10px 20px',
                  fontSize: 14,
                  flex: 1,
                  opacity: frameThickness > 0 ? 1 : 0.5,
                  pointerEvents: frameThickness > 0 ? 'auto' : 'none',
                  transition: 'all 200ms ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                <span style={{ fontSize: 18 }}>⚪</span>
                <span>White</span>
              </button>
              <button
                type="button"
                className={frameColor === 'black' ? 'btn primary' : 'btn ghost'}
                onClick={() => { frameColorRef.current = 'black'; setFrameColor('black'); draw(); }}
                style={{
                  padding: '10px 20px',
                  fontSize: 14,
                  flex: 1,
                  opacity: frameThickness > 0 ? 1 : 0.5,
                  pointerEvents: frameThickness > 0 ? 'auto' : 'none',
                  transition: 'all 200ms ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                <span style={{ fontSize: 18 }}>⚫</span>
                <span>Black</span>
              </button>
            </div>
          </fieldset>

          {/* hint removed */}
        </div>
      </fieldset>
    </section>
  );
}
