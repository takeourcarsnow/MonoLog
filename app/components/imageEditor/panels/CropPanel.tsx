import { RotateCw, RotateCcw } from "lucide-react";
import { rangeBg } from "../utils";

const ASPECT_PRESETS = [
  { label: 'Free', v: null },
  { label: '16:9', v: 16 / 9 },
  { label: '4:3', v: 4 / 3 },
  { label: '3:2', v: 3 / 2 },
  // 4:5 removed per request
];

interface CropPanelProps {
  sel: { x: number; y: number; w: number; h: number } | null;
  setSel: (sel: { x: number; y: number; w: number; h: number } | null) => void;
  cropRatio: React.MutableRefObject<number | null>;
  presetIndex: number;
  setPresetIndex: (i: number) => void;
  rotation: number;
  setRotation: (v: number) => void;
  rotationRef: React.MutableRefObject<number>;
  draw: () => void;
  resetControlToDefault: (control: string) => void;
  computeImageLayout: () => { rect: DOMRect; baseScale: number; dispW: number; dispH: number; left: number; top: number } | null;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  imageSrc: string;
  originalRef: React.MutableRefObject<string>;
  bakeRotate90: () => Promise<void>;
  bakeRotateMinus90: () => Promise<void>;
}

export default function CropPanel({
  sel,
  setSel,
  cropRatio,
  presetIndex,
  setPresetIndex,
  rotation,
  setRotation,
  rotationRef,
  draw,
  resetControlToDefault,
  computeImageLayout,
  canvasRef,
  imageSrc,
  originalRef,
  bakeRotate90,
  bakeRotateMinus90,
}: CropPanelProps) {
  // Compute the largest axis-aligned rectangle centered on the displayed image
  // that fully fits inside the rotated image quad. We keep the image center as
  // the selection center (simple + intuitive) and, when an aspect preset is
  // active, we fit that aspect inside the maximal rect.
  function autoCropSelectionForRotation(angleDeg: number) {
    try {
      const info = computeImageLayout();
      const canvas = canvasRef.current;
      if (!info || !canvas) return;
      const left = info.left, top = info.top, dispW = info.dispW, dispH = info.dispH;
      const cx = left + dispW / 2;
      const cy = top + dispH / 2;
      const ang = (angleDeg * Math.PI) / 180;

      // Build rotated image polygon (four corners rotated around center)
      const corners = [
        { x: left, y: top },
        { x: left + dispW, y: top },
        { x: left + dispW, y: top + dispH },
        { x: left, y: top + dispH }
      ].map(p => rotatePoint(p.x, p.y, cx, cy, ang));

      // Binary search scale k for axis-aligned rect with same aspect as the image (dispW:dispH)
      // so that rect centered at (cx, cy), w = dispW*k, h = dispH*k fits into the rotated polygon.
      let lo = 0, hi = 1;
      for (let i = 0; i < 32; i++) {
        const mid = (lo + hi) / 2;
        const w = dispW * mid;
        const h = dispH * mid;
        const rectCorners = [
          { x: cx - w / 2, y: cy - h / 2 },
          { x: cx + w / 2, y: cy - h / 2 },
          { x: cx + w / 2, y: cy + h / 2 },
          { x: cx - w / 2, y: cy + h / 2 }
        ];
        const inside = rectCorners.every(pt => pointInConvexPolygon(pt, corners));
        if (inside) lo = mid; else hi = mid;
      }

      // Base maximal rect
      let maxW = dispW * lo;
      let maxH = dispH * lo;

      // If an aspect preset is active, fit that inside the maximal rect
      const ratio = cropRatio.current;
      if (ratio && ratio > 0) {
        // Fit rect of aspect `ratio` inside maxW x maxH, centered
        const fitWFirst = maxW;
        let w = fitWFirst;
        let h = w / ratio;
        if (h > maxH) {
          h = maxH;
          w = h * ratio;
        }
        maxW = w; maxH = h;
      }

      const x = cx - maxW / 2;
      const y = cy - maxH / 2;
      if (!isFinite(x) || !isFinite(y) || maxW <= 0 || maxH <= 0) return;
      setSel({ x, y, w: maxW, h: maxH });
    } catch {}
  }

  function rotatePoint(x: number, y: number, cx: number, cy: number, ang: number) {
    const dx = x - cx, dy = y - cy;
    const c = Math.cos(ang), s = Math.sin(ang);
    return { x: cx + dx * c - dy * s, y: cy + dx * s + dy * c };
  }

  // Convex polygon point inclusion via signed area (CCW polygon assumed)
  function pointInConvexPolygon(pt: { x: number; y: number }, poly: Array<{ x: number; y: number }>) {
    const n = poly.length;
    let sign = 0;
    for (let i = 0; i < n; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % n];
      const cross = (b.x - a.x) * (pt.y - a.y) - (b.y - a.y) * (pt.x - a.x);
      if (cross === 0) continue;
      const s = cross > 0 ? 1 : -1;
      if (sign === 0) sign = s; else if (s !== sign) return false;
    }
    return true;
  }

  return (
    <section className="imgedit-panel-inner" style={{ display: 'grid', width: '100%' }}>
      <fieldset style={{ border: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}><span className="sr-only">Crop Aspect Ratio</span></div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* header rotate buttons removed; use controls beside the Straighten slider */}
          </div>
        </div>

        {/* Responsive aspect switcher: grid on desktop, carousel on mobile */}
        <div className="aspect-presets-container">
          {/* Desktop: Show all presets in a grid */}
          <div className="aspect-presets-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(56px, 1fr))', gridAutoRows: 'minmax(36px, auto)', gap: 4, paddingBottom: 0, alignItems: 'start' }}>
            {ASPECT_PRESETS.map((r, i) => {
              const selected = cropRatio.current === r.v;
              const base = 16 / 9;
              const previewRatio = r.v ? Math.min(1.2, r.v / base) : 0.7;
              const previewInnerWidth = Math.round(18 * previewRatio);
              return (
                <button key={r.label} type="button" onClick={() => {
                  // Toggle: if selecting the same preset again, clear selection
                  if (cropRatio.current === r.v) {
                    cropRatio.current = null;
                    setSel(null);
                    return;
                  }
                  setPresetIndex(i);
                  cropRatio.current = r.v;
                  const canvas = canvasRef.current;
                  if (!canvas) return;
                  const info = computeImageLayout();
                  const pad = 0.08;
                  if (info) {
                    let w = info.dispW * (1 - pad * 2);
                    let h = info.dispH * (1 - pad * 2);
                    if (r.v) {
                      h = w / r.v;
                      if (h > info.dispH * (1 - pad * 2)) {
                        h = info.dispH * (1 - pad * 2);
                        w = h * r.v;
                      }
                    }
                    const x = info.left + (info.dispW - w) / 2;
                    const y = info.top + (info.dispH - h) / 2;
                    setSel({ x, y, w, h });
                  } else {
                    const rect = canvas.getBoundingClientRect();
                    let w = rect.width * (1 - pad * 2);
                    let h = rect.height * (1 - pad * 2);
                    if (r.v) {
                      h = w / r.v;
                      if (h > rect.height * (1 - pad * 2)) {
                        h = rect.height * (1 - pad * 2);
                        w = h * r.v;
                      }
                    }
                    const x = (rect.width - w) / 2;
                    const y = (rect.height - h) / 2;
                    setSel({ x, y, w, h });
                  }
                }} aria-pressed={selected} style={{
                  padding: '4px 4px',
                  borderRadius: 6,
                  background: selected ? 'color-mix(in srgb, var(--text) 6%, transparent)' : 'var(--bg-elev)',
                  color: selected ? 'var(--text)' : 'var(--text)',
                  border: 'none',
                  boxShadow: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 100ms ease, box-shadow 140ms ease, background 140ms ease',
                  fontSize: 11,
                  fontWeight: selected ? 700 : 600,
                  cursor: 'pointer',
                  minHeight: 36,
                  lineHeight: 1
                }}
                onMouseEnter={(e) => { if (!selected) e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.06)'; }}
                onMouseLeave={(e) => { if (!selected) e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
                >
                  <span aria-hidden style={{ width: 28, height: 14, background: selected ? 'color-mix(in srgb, var(--bg-elev) 92%, color-mix(in srgb, var(--text) 6%, transparent))' : 'color-mix(in srgb, var(--text) 4%, transparent)', borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative', border: selected ? '1px solid color-mix(in srgb, var(--text) 8%, transparent)' : '1px solid color-mix(in srgb, var(--text) 6%, transparent)', boxShadow: 'none', flexShrink: 0 }}>
                    <span style={{ width: previewInnerWidth, height: 8, background: selected ? 'color-mix(in srgb, var(--text) 36%, #fff)' : 'color-mix(in srgb, var(--text) 28%, #fff)', borderRadius: 3, display: 'block', border: '1px solid color-mix(in srgb, var(--text) 10%, transparent)' }} />
                  </span>
                  <span style={{ fontSize: 11, fontWeight: selected ? 700 : 600, opacity: selected ? 1 : 0.85, lineHeight: 1 }}>{r.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mobile: Carousel with arrows */}
          <div className="aspect-presets-carousel" style={{ display: 'none', alignItems: 'center', gap: 8, paddingBottom: 4 }}>
            <button type="button" aria-label="Previous preset" onClick={() => setPresetIndex((presetIndex - 1 + ASPECT_PRESETS.length) % ASPECT_PRESETS.length)} style={{ padding: 6, borderRadius: 8, border: 'none', background: 'transparent', fontSize: 18 }}>◀</button>
            <div style={{ overflow: 'hidden', width: 240, borderRadius: 10 }}>
              <div style={{ display: 'flex', gap: 8, transition: 'transform 300ms cubic-bezier(.2,.9,.2,1)', transform: `translateX(-${presetIndex * 92}px)` }}>
                {ASPECT_PRESETS.map((r, i) => {
                  const selected = cropRatio.current === r.v;
                  const base = 16 / 9;
                  const previewRatio = r.v ? Math.min(1.2, r.v / base) : 0.7;
                  const previewInnerWidth = Math.round(14 * previewRatio);
                  return (
                    <div key={r.label} style={{ flex: '0 0 64px' }}>
                      <button type="button" onClick={() => {
                        // mirror desktop behavior: clicking the already-selected preset clears the crop
                        setPresetIndex(i);
                        const already = cropRatio.current === r.v;
                        if (already) {
                          cropRatio.current = null;
                          setSel(null);
                          return;
                        }
                        cropRatio.current = r.v;
                        const canvas = canvasRef.current;
                        if (!canvas) return;
                        const info = computeImageLayout();
                        const pad = 0.08;
                        if (info) {
                          let w = info.dispW * (1 - pad * 2);
                          let h = info.dispH * (1 - pad * 2);
                          if (r.v) {
                            h = w / r.v;
                            if (h > info.dispH * (1 - pad * 2)) {
                              h = info.dispH * (1 - pad * 2);
                              w = h * r.v;
                            }
                          }
                          const x = info.left + (info.dispW - w) / 2;
                          const y = info.top + (info.dispH - h) / 2;
                          setSel({ x, y, w, h });
                        } else {
                          const rect = canvas.getBoundingClientRect();
                          let w = rect.width * (1 - pad * 2);
                          let h = rect.height * (1 - pad * 2);
                          if (r.v) {
                            h = w / r.v;
                            if (h > rect.height * (1 - pad * 2)) {
                              h = rect.height * (1 - pad * 2);
                              w = h * r.v;
                            }
                          }
                          const x = (rect.width - w) / 2;
                          const y = (rect.height - h) / 2;
                          setSel({ x, y, w, h });
                        }
                      }} aria-pressed={selected} style={{ minWidth: 48, padding: '4px 6px', borderRadius: 6, background: selected ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)', color: selected ? 'var(--text)' : 'var(--text)', border: 'none', boxShadow: 'none', display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-start', transition: 'transform 100ms ease, box-shadow 140ms ease, background 140ms ease', fontSize: 11 }}>
                        <span aria-hidden style={{ width: 28, height: 14, background: selected ? 'color-mix(in srgb, var(--primary) 6%, transparent)' : 'color-mix(in srgb, var(--text) 4%, transparent)', borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative', border: selected ? '1px solid color-mix(in srgb, var(--text) 8%, transparent)' : '1px solid color-mix(in srgb, var(--text) 6%, transparent)', boxShadow: 'none' }}>
                          <span style={{ width: previewInnerWidth, height: 8, background: selected ? 'color-mix(in srgb, var(--text) 82%, #fff)' : 'color-mix(in srgb, var(--text) 58%, #fff)', borderRadius: 3, display: 'block', border: '1px solid color-mix(in srgb, var(--text) 10%, transparent)' }} />
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 600, opacity: selected ? 1 : 0.95 }}>{r.label}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            <button type="button" aria-label="Next preset" onClick={() => setPresetIndex((presetIndex + 1) % ASPECT_PRESETS.length)} style={{ padding: 6, borderRadius: 8, border: 'none', background: 'transparent', fontSize: 18 }}>▶</button>
          </div>

          <style>{`
            /* Always show the full presets grid; hide the carousel variant */
            .aspect-presets-grid { display: grid !important; }
            .aspect-presets-carousel { display: none !important; }
            /* Ensure aspect buttons don't wrap text */
            .aspect-presets-grid button { white-space: nowrap; overflow: visible; }
          `}</style>
        </div>
      </fieldset>
      <fieldset style={{ marginTop: 8, border: 'none' }}>
        <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ width: 100, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button type="button" title="Rotate -90°" onClick={async () => { await bakeRotateMinus90(); /* after bake, keep slider controlled rotation at 0 so user can fine-tune */ rotationRef.current = 0; setRotation(0); draw(); }} className="btn icon ghost" aria-label="Rotate -90°" style={{ padding: 6, borderRadius: 8, border: 'none' }}>
                <RotateCw size={14} aria-hidden />
              </button>
              <button type="button" title="Rotate +90°" onClick={async () => { await bakeRotate90(); rotationRef.current = 0; setRotation(0); draw(); }} className="btn icon ghost" aria-label="Rotate +90°" style={{ padding: 6, borderRadius: 8, border: 'none' }}>
                <RotateCcw size={14} aria-hidden />
              </button>
            </div>
            <span className="sr-only">Straighten</span>
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1 }}>
            <input className="imgedit-range" type="range" min={-30} max={30} step={0.1} value={rotation} onInput={(e:any) => { const v = Number(e.target.value); rotationRef.current = v; setRotation(v); // Auto-fit crop to avoid empty triangles
              autoCropSelectionForRotation(v); draw(); }} onDoubleClick={() => resetControlToDefault('rotation')}             style={{ flex: 1, background: rangeBg(rotation, -30, 30, '#ef4444', '#f87171') }} />
          </div>
        </label>
      </fieldset>
    </section>
  );
}
