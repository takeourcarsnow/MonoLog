        import { Layers, Blend, Eye } from "lucide-react";
import { rangeBg } from "../utils";
import { useState } from "react";

interface OverlaysPanelProps {
  overlay: { img: HTMLImageElement; blendMode: string; opacity: number } | null;
  setOverlay: (v: { img: HTMLImageElement; blendMode: string; opacity: number } | null) => void;
  overlayRef: React.MutableRefObject<{ img: HTMLImageElement; blendMode: string; opacity: number } | null>;
  draw: () => void;
  resetControlToDefault: (control: string) => void;
}

const overlayFiles = [
  'overlay (1).jpg',
  'overlay (2).jpg',
  'overlay (5).jpg',
  'overlay (6).jpg',
  'overlay (7).jpg',
  'overlay (9).jpg',
  'overlay (10).jpg',
  'overlay (11).jpg',
  'overlay (12).jpg',
  'overlay (13).jpg',
  'overlay (14).jpg',
  'overlay (15).jpg',
  'overlay (16).jpg',
  'overlay (17).jpg',
];

export default function OverlaysPanel({
  overlay,
  setOverlay,
  overlayRef,
  draw,
  resetControlToDefault,
}: OverlaysPanelProps) {
  const [selectedUrl, setSelectedUrl] = useState<string | null>(overlay?.img.src || null);

  const handleSelectOverlay = (file: string) => {
    const url = `/overlays/${file}`;
    // Toggle: if clicking the currently selected overlay, remove it
    if (selectedUrl === url) {
      overlayRef.current = null;
      setOverlay(null);
      setSelectedUrl(null);
      draw();
      try { console.debug('[OverlaysPanel] toggled off overlay', url); } catch (e) {}
      return;
    }

    setSelectedUrl(url);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => {
      // default to 'screen' for black-background overlays (black behaves as transparent)
      // use a higher default opacity so effects are visible on first select
      const newOverlay = overlay ? { ...overlay, img } : { img, blendMode: 'screen', opacity: 0.85 };
      // Debug: log selection in dev
      try { console.debug('[OverlaysPanel] selected overlay', url, newOverlay); } catch (e) {}
      overlayRef.current = newOverlay;
      setOverlay(newOverlay);
      draw();
    };
  };

  const handleBlendModeChange = (blendMode: string) => {
    if (!overlay) return;
    try { console.debug('[OverlaysPanel] blendMode change', blendMode); } catch (e) {}
    const newOverlay = { ...overlay, blendMode };
    overlayRef.current = newOverlay;
    setOverlay(newOverlay);
    draw();
  };

  const handleOpacityChange = (opacity: number) => {
    if (!overlay) return;
    const newOverlay = { ...overlay, opacity };
    overlayRef.current = newOverlay;
    setOverlay(newOverlay);
    draw();
  };

  // Removal is handled by clicking the active thumbnail (toggle behavior)

  return (
    <section className="imgedit-panel-inner" style={{ display: 'grid', width: '100%' }}>
      <fieldset>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Overlay selection */}
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: 8 }}>
              {overlayFiles.map((file) => {
                const thumbUrl = `/overlays/${file}`;
                return (
                  <button
                    key={file}
                    type="button"
                    onClick={() => handleSelectOverlay(file)}
                    style={{
                      width: 60,
                      height: 60,
                      border: selectedUrl === thumbUrl ? '2px solid var(--primary)' : '1px solid var(--border)',
                      borderRadius: 8,
                      backgroundImage: `url("${thumbUrl}")`,
                      backgroundPosition: 'center',
                      backgroundSize: 'cover',
                      cursor: 'pointer',
                    }}
                    title={file}
                  />
                );
              })}
            </div>
            {/* Removal handled by toggling the thumbnail — no separate button needed */}
          </div>

          {/* Blending mode */}
          {overlay && (
            <fieldset>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <Blend size={18} style={{ marginRight: 4 }} />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['multiply', 'screen', 'overlay', 'soft-light'].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={overlay.blendMode === mode ? 'btn primary' : 'btn ghost'}
                      onClick={() => handleBlendModeChange(mode)}
                      style={{ padding: '6px 12px', fontSize: 12, textTransform: 'capitalize' }}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </fieldset>
          )}

          {/* Opacity */}
          {overlay && (
            <label style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ width: 36, display: 'flex', gap: 6, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
                <Eye size={18} strokeWidth={2} aria-hidden />
                <span className="sr-only">Opacity</span>
              </span>
              <input
                className="imgedit-range"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={overlay.opacity}
                onInput={(e: any) => handleOpacityChange(Number(e.target.value))}
                onDoubleClick={() => resetControlToDefault('overlayOpacity')}
                style={{ flex: 1, background: rangeBg(overlay.opacity, 0, 1, 'var(--slider-heat-start)', 'var(--slider-heat-end)') }}
              />
            </label>
          )}
        </div>
      </fieldset>
    </section>
  );
}