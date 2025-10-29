        import { Blend, Eye } from "lucide-react";
        import { rangeBg } from "../utils";
        import { useState, useEffect } from "react";
        import { getOverlayFiles, getThumbAvailabilityCache } from '../overlaysPreload';

interface OverlaysPanelProps {
  overlay: { img: HTMLImageElement; blendMode: string; opacity: number } | null;
  setOverlay: (v: { img: HTMLImageElement; blendMode: string; opacity: number } | null) => void;
  overlayRef: React.MutableRefObject<{ img: HTMLImageElement; blendMode: string; opacity: number } | null>;
  draw: () => void;
  resetControlToDefault: (control: string) => void;
}



export default function OverlaysPanel({
  overlay,
  setOverlay,
  overlayRef,
  draw,
  resetControlToDefault,
}: OverlaysPanelProps) {
  // Track the selected thumbnail by filename (e.g. 'overlay (1).jpg') instead
  // of by a full URL. This avoids mismatches between absolute img.src values
  // (which the browser will normalize to absolute URLs) and the relative
  // thumbnail paths used when rendering buttons.
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // Keep selection in sync if parent updates `overlay` (for example when
  // initial settings are provided or an external action changes the overlay).
  // useEffect(() => {
  //   const fname = overlay?.img?.src?.split('/').pop() || null;
  //   setSelectedFile(fname);
  // }, [overlay]);

  // Map of filename -> boolean indicating if a small thumbnail exists at
  // /overlays/thumbs/{file}. When thumbnails are present we use them for the
  // panel buttons so the browser doesn't download the large overlay image on open.
  const [thumbAvailability, setThumbAvailability] = useState<Record<string, boolean>>({});

  const [overlayFiles, setOverlayFiles] = useState<string[]>([]);

  useEffect(() => {
    getOverlayFiles().then(setOverlayFiles).catch(() => setOverlayFiles([]));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const cached = getThumbAvailabilityCache();
    if (cached) {
      setThumbAvailability(cached);
      return;
    }

    // If no cache exists yet, the editor-level preload will populate it when
    // ready; but fall back to a local quick-detect so the panel is resilient if
    // opened before the preload finishes.
    (async () => {
      const result: Record<string, boolean> = {};
      await Promise.all(
        overlayFiles.map((file) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              result[file] = true;
              resolve();
            };
            img.onerror = () => {
              result[file] = false;
              resolve();
            };
            const cacheBust = (process.env.NODE_ENV === 'development') ? `?v=${Date.now()}` : '';
            img.src = `/overlays/thumbs/${file}` + cacheBust;
          })
        )
      );
      if (!cancelled) {
        // If the editor-level preload already wrote the cache, prefer that one
        const editorCache = getThumbAvailabilityCache();
        if (editorCache) setThumbAvailability(editorCache);
        else setThumbAvailability(result);
      }
    })();
    return () => { cancelled = true; };
  }, [overlayFiles]);

  const handleSelectOverlay = (file: string) => {
    const url = `/overlays/${file}`; // full-size image (only loaded when user selects)
    // Toggle: if clicking the currently selected overlay, remove it
    if (selectedFile === file) {
      overlayRef.current = null;
      setOverlay(null);
      setSelectedFile(null);
      draw();
      try { console.debug('[OverlaysPanel] toggled off overlay', url); } catch (e) {}
      return;
    }

    setSelectedFile(file);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url; // load full-size only on explicit select
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
                const thumbUrl = `/overlays/thumbs/${file}`; // small thumbnail path (generated separately)
                const fullUrl = `/overlays/${file}`;
                // If a thumbnail isn't available we'll show a neutral placeholder here
                const showThumb = !!thumbAvailability[file];
                return (
                  <button
                    key={file}
                    type="button"
                    onClick={() => handleSelectOverlay(file)}
                    style={{
                      width: 60,
                      height: 60,
                      border: selectedFile === file ? '2px solid var(--primary)' : '1px solid var(--border)',
                      borderRadius: 8,
                      backgroundImage: showThumb ? `url("${thumbUrl}")` : undefined,
                      backgroundPosition: 'center',
                      backgroundSize: 'cover',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: showThumb ? undefined : 'var(--muted-bg)'
                    }}
                    title={file}
                  >
                    {/* Avoid showing filename text as a placeholder (causes flash). */}
                    {!showThumb && <div style={{ width: '100%', height: '100%' }} aria-hidden />}
                  </button>
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
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  {['multiply', 'screen', 'overlay', 'soft-light'].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      data-blend={mode}
                      aria-pressed={overlay.blendMode === mode}
                      onMouseDown={() => { /* visual press handled inline for snappy feel */ }}
                      onClick={() => handleBlendModeChange(mode)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        background: 'transparent',
                        border: 'none',
                        display: 'inline-flex',
                        gap: 6,
                        alignItems: 'center',
                        fontSize: 12,
                        textTransform: 'capitalize',
                        fontWeight: overlay.blendMode === mode ? 700 : 500,
                        color: 'var(--text)'
                      }}
                      onMouseDownCapture={(e)=> (e.currentTarget.style.transform = 'scale(0.96)')}
                      onMouseUpCapture={(e)=> (e.currentTarget.style.transform = '')}
                      onMouseLeave={(e)=> (e.currentTarget.style.transform = '')}
                      onFocus={(e)=> (e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)')}
                      onBlur={(e)=> (e.currentTarget.style.boxShadow = '')}
                    >
                      <span style={{ fontSize: 11 }}>{mode}</span>
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
                style={{ flex: 1, background: rangeBg(overlay.opacity, 0, 1, '#10b981', '#34d399') }}
              />
            </label>
          )}
        </div>
      </fieldset>
    </section>
  );
}