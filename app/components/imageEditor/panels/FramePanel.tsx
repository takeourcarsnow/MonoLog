import { Ruler } from "lucide-react";
import { rangeBg, computeFrameBounds } from "../utils";
import { useState, useEffect } from "react";
import { getFrameFiles, getThumbAvailabilityCache } from '../framesPreload';

interface FramePanelProps {
  frameThickness: number;
  setFrameThickness: (v: number) => void;
  frameThicknessRef: React.MutableRefObject<number>;
  frameColor: 'white' | 'black';
  setFrameColor: (c: 'white' | 'black') => void;
  frameColorRef: React.MutableRefObject<'white' | 'black'>;
  draw: () => void;
  resetControlToDefault: (control: string) => void;
  frameOverlay: { img: HTMLImageElement; opacity: number; bounds?: { minX: number; minY: number; maxX: number; maxY: number } } | null;
  setFrameOverlay: (v: { img: HTMLImageElement; opacity: number; bounds?: { minX: number; minY: number; maxX: number; maxY: number } } | null) => void;
  frameOverlayRef: React.MutableRefObject<{ img: HTMLImageElement; opacity: number; bounds?: { minX: number; minY: number; maxX: number; maxY: number } } | null>;
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
  frameOverlay,
  setFrameOverlay,
  frameOverlayRef,
}: FramePanelProps) {
  // Track the selected frame by filename
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // Map of filename -> boolean indicating if a thumbnail exists
  const [thumbAvailability, setThumbAvailability] = useState<Record<string, boolean>>({});
  const [frameFiles, setFrameFiles] = useState<string[]>([]);

  useEffect(() => {
    getFrameFiles().then(setFrameFiles).catch(() => setFrameFiles([]));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const cached = getThumbAvailabilityCache();
    if (cached) {
      setThumbAvailability(cached);
      return;
    }

    (async () => {
      const result: Record<string, boolean> = {};
      await Promise.all(
        frameFiles.map((file) =>
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
            img.src = `/frames/${file}` + cacheBust;
          })
        )
      );
      if (!cancelled) {
        const editorCache = getThumbAvailabilityCache();
        if (editorCache) setThumbAvailability(editorCache);
        else setThumbAvailability(result);
      }
    })();
    return () => { cancelled = true; };
  }, [frameFiles]);

  const handleSelectFrame = (file: string) => {
    const url = `/frames/${file}`;
    if (selectedFile === file) {
      // Toggle off
      frameOverlayRef.current = null;
      setFrameOverlay(null);
      setSelectedFile(null);
      draw();
      return;
    }

    setSelectedFile(file);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => {
      const bounds = computeFrameBounds(img);
      const newFrameOverlay = frameOverlay ? { ...frameOverlay, img, bounds } : { img, opacity: 1, bounds };
      frameOverlayRef.current = newFrameOverlay;
      setFrameOverlay(newFrameOverlay);
      draw();
    };
  };
  return (
    <section className="imgedit-panel-inner" style={{ display: 'grid', width: '100%' }}>
      <fieldset>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}><span className="sr-only">Photo Frame</span></div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Frame selection */}
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: 8 }}>
              {frameFiles.map((file) => {
                const thumbUrl = `/frames/${file}`;
                const showThumb = !!thumbAvailability[file];
                return (
                  <button
                    key={file}
                    type="button"
                    onClick={() => handleSelectFrame(file)}
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
                    {!showThumb && <div style={{ width: '100%', height: '100%' }} aria-hidden />}
                  </button>
                );
              })}
            </div>
          </div>

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
