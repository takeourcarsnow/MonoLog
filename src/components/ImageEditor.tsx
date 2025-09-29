"use client";

import { useEffect, useRef, useState } from "react";
import { approxDataUrlBytes } from "@/lib/image";

type Props = {
  initialDataUrl: string;
  onCancel: () => void;
  onApply: (dataUrl: string) => void;
};

export default function ImageEditor({ initialDataUrl, onCancel, onApply }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imageSrc, setImageSrc] = useState(initialDataUrl);
  const originalRef = useRef<string>(initialDataUrl);

  const [zoom, setZoom] = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef<{ startX: number; startY: number; mode: "pan" | "crop" } | null>(null);
  const [sel, setSel] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [mode, setMode] = useState<"pan" | "crop">("pan");
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('ALL TOOLS');
  const [cropRatio, setCropRatio] = useState<number | null>(null); // null = free

  // create a centered default selection when user activates Crop
  function createDefaultSel() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pad = 0.08; // 8% padding
    let w = rect.width * (1 - pad * 2);
    let h = rect.height * (1 - pad * 2);
    if (cropRatio) {
      // enforce ratio using width as base
      h = w / cropRatio;
      if (h > rect.height * (1 - pad * 2)) {
        h = rect.height * (1 - pad * 2);
        w = h * cropRatio;
      }
    }
    const x = (rect.width - w) / 2;
    const y = (rect.height - h) / 2;
    setSel({ x, y, w, h });
  }

  const [previewBytes, setPreviewBytes] = useState<number | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current;
      if (canvas) {
        const cw = canvas.width; const ch = canvas.height;
        const displayScale = Math.min(1, 600 / Math.max(img.naturalWidth, img.naturalHeight));
        const displayedW = img.naturalWidth * displayScale * zoom;
        const displayedH = img.naturalHeight * displayScale * zoom;
        setOffset({ x: (cw / (window.devicePixelRatio || 1) - displayedW) / 2, y: (ch / (window.devicePixelRatio || 1) - displayedH) / 2 });
      }
      draw();
    };
    img.src = imageSrc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSrc]);

  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current; const cont = containerRef.current;
      if (!c || !cont) return;
      const rect = cont.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      c.width = Math.max(100, Math.round(rect.width * dpr));
      c.height = Math.max(100, Math.round(360 * dpr));
      c.style.width = `${Math.round(rect.width)}px`;
      c.style.height = `360px`;
      draw();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, brightness, sel]);

  function draw() {
    const canvas = canvasRef.current; const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    const baseScale = Math.min(1, 600 / Math.max(img.naturalWidth, img.naturalHeight));
    const dispW = img.naturalWidth * baseScale * zoom;
    const dispH = img.naturalHeight * baseScale * zoom;

    ctx.save();
    ctx.filter = `brightness(${brightness}%)`;
    ctx.drawImage(img, offset.x, offset.y, dispW, dispH);
    ctx.restore();

    if (sel) {
      ctx.save();
      ctx.strokeStyle = "#00aaff";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(sel.x, sel.y, sel.w, sel.h);
      // draw 3x3 grid inside selection (rule of thirds)
      ctx.setLineDash([]);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      const thirdW = sel.w / 3;
      const thirdH = sel.h / 3;
      ctx.beginPath();
      ctx.moveTo(sel.x + thirdW, sel.y);
      ctx.lineTo(sel.x + thirdW, sel.y + sel.h);
      ctx.moveTo(sel.x + thirdW * 2, sel.y);
      ctx.lineTo(sel.x + thirdW * 2, sel.y + sel.h);
      ctx.moveTo(sel.x, sel.y + thirdH);
      ctx.lineTo(sel.x + sel.w, sel.y + thirdH);
      ctx.moveTo(sel.x, sel.y + thirdH * 2);
      ctx.lineTo(sel.x + sel.w, sel.y + thirdH * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.beginPath();
      ctx.rect(0, 0, canvas.width / dpr, canvas.height / dpr);
      ctx.rect(sel.x, sel.y, sel.w, sel.h);
      // @ts-ignore - evenodd fill is supported in browsers
      ctx.fill("evenodd");
      ctx.restore();
    }
  }

  function getPointerPos(e: PointerEvent | React.PointerEvent) {
    const canvas = canvasRef.current; if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: (e as any).clientX - rect.left, y: (e as any).clientY - rect.top };
  }

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const onPointerDown = (ev: PointerEvent) => {
      try { (ev.target as Element).setPointerCapture(ev.pointerId); } catch {}
      const p = getPointerPos(ev);

      // Unified behavior:
      // - If active tool is Crop: start drawing a new selection unless user clicked inside existing selection -> move selection
      // - Otherwise: pan image
      if (activeTool === 'Crop') {
        if (sel && p.x >= sel.x && p.x <= sel.x + sel.w && p.y >= sel.y && p.y <= sel.y + sel.h) {
          // pan image while keeping the crop window stationary
          dragging.current = { startX: p.x - offset.x, startY: p.y - offset.y, mode: 'pan' };
        } else {
          // start drawing selection
          dragging.current = { startX: p.x, startY: p.y, mode: 'crop' };
          setSel({ x: p.x, y: p.y, w: 0, h: 0 });
        }
      } else {
        // pan normally
        dragging.current = { startX: p.x - offset.x, startY: p.y - offset.y, mode: 'pan' };
      }
    };

    const onPointerMove = (ev: PointerEvent) => {
      const p = getPointerPos(ev);
      if (!dragging.current) return;
      if (dragging.current.mode === 'pan') {
        setOffset({ x: p.x - dragging.current.startX, y: p.y - dragging.current.startY });
  } else if (dragging.current.mode === 'crop') {
        const sx = dragging.current.startX; const sy = dragging.current.startY;
        let nx = Math.min(sx, p.x); let ny = Math.min(sy, p.y);
        let nw = Math.abs(p.x - sx); let nh = Math.abs(p.y - sy);
        if (cropRatio) {
          // enforce ratio: choose based on which delta is dominant
          const signW = p.x >= sx ? 1 : -1;
          const signH = p.y >= sy ? 1 : -1;
          // compute width from height and vice versa and pick the one that fits pointer
          const fromW = Math.max(1, Math.abs(p.x - sx));
          const fromH = Math.max(1, Math.abs(p.y - sy));
          const hFromW = fromW / cropRatio;
          const wFromH = fromH * cropRatio;
          if (hFromW <= fromH) {
            nh = Math.round(hFromW);
            nw = fromW;
          } else {
            nw = Math.round(wFromH);
            nh = fromH;
          }
          // fix nx/ny depending on drag direction
          if (p.x < sx) nx = sx - nw;
          if (p.y < sy) ny = sy - nh;
        }
        setSel({ x: nx, y: ny, w: Math.max(1, nw), h: Math.max(1, nh) });
      }
      draw();
    };

    const onPointerUp = (ev: PointerEvent) => { try { (ev.target as Element).releasePointerCapture(ev.pointerId); } catch {} dragging.current = null; };
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool, offset, sel, zoom, brightness, cropRatio]);

  async function bakeRotate90() {
    const img = imgRef.current; if (!img) return;
    const tmp = document.createElement('canvas');
    tmp.width = img.naturalHeight; tmp.height = img.naturalWidth;
    const t = tmp.getContext('2d')!;
    t.translate(tmp.width / 2, tmp.height / 2);
    t.rotate(Math.PI / 2);
    t.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    const dataUrl = tmp.toDataURL('image/png');
    setImageSrc(dataUrl);
    setZoom(1); setSel(null); setBrightness(100);
  }

  async function bakeFlip() {
    const img = imgRef.current; if (!img) return;
    const tmp = document.createElement('canvas');
    tmp.width = img.naturalWidth; tmp.height = img.naturalHeight;
    const t = tmp.getContext('2d')!;
    t.translate(tmp.width, 0);
    t.scale(-1, 1);
    t.drawImage(img, 0, 0);
    const dataUrl = tmp.toDataURL('image/png');
    setImageSrc(dataUrl);
    setZoom(1); setSel(null); setBrightness(100);
  }

  function resetAll() {
    setImageSrc(originalRef.current);
    setZoom(1); setSel(null); setOffset({ x: 0, y: 0 }); setBrightness(100);
  }

  useEffect(() => {
    const id = setTimeout(() => {
      const canvas = canvasRef.current; if (!canvas) return;
      const data = canvas.toDataURL('image/jpeg', 0.92);
      setPreviewBytes(approxDataUrlBytes(data));
    }, 250);
    return () => clearTimeout(id);
  }, [zoom, brightness, sel, imageSrc, offset]);

  // remove flipH from deps since it's no longer used
  // eslint-disable-next-line react-hooks/exhaustive-deps
  

  async function applyEdit() {
    const img = imgRef.current; if (!img) return;
    const baseScale = Math.min(1, 600 / Math.max(img.naturalWidth, img.naturalHeight));
    const scaleFactor = baseScale * zoom;

  let srcX = 0, srcY = 0, srcW = img.naturalWidth, srcH = img.naturalHeight;
    if (sel) {
      srcX = Math.max(0, Math.round((sel.x - offset.x) / scaleFactor));
      srcY = Math.max(0, Math.round((sel.y - offset.y) / scaleFactor));
      srcW = Math.max(1, Math.round(sel.w / scaleFactor));
      srcH = Math.max(1, Math.round(sel.h / scaleFactor));
      srcW = Math.min(srcW, img.naturalWidth - srcX);
      srcH = Math.min(srcH, img.naturalHeight - srcY);
    }

    const out = document.createElement('canvas');
    out.width = srcW; out.height = srcH;
    const octx = out.getContext('2d')!;
    octx.imageSmoothingQuality = 'high';
    if (brightness !== 100) octx.filter = `brightness(${brightness}%)`;
    octx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
    const dataUrl = out.toDataURL('image/jpeg', 0.92);
    onApply(dataUrl);
  }
  return (
    <div ref={containerRef} className="image-editor" style={{ width: '100%', background: '#0b0b0b', color: '#fff', padding: 12, borderRadius: 8 }}>
      {/* Top bar (back + share) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <button className="btn ghost" onClick={onCancel} aria-label="back" style={{ color: '#fff', background: 'transparent', border: 'none' }}>◀</button>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Edit</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => { /* placeholder share */ }} style={{ color: '#fff', background: 'transparent', border: 'none' }}>⋯</button>
        </div>
      </div>

      {/* Canvas area */}
      <div style={{ position: 'relative', background: '#000', padding: 8, borderRadius: 8 }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: 360, touchAction: 'none', display: 'block', borderRadius: 6 }} />

        {/* floating action buttons (rotate/flip/crop toggle) */}
        <div style={{ position: 'absolute', right: 12, top: 12, display: 'flex', gap: 8 }}>
          <button title="Rotate 90°" onClick={bakeRotate90} style={{ background: 'rgba(255,255,255,0.06)', color: '#fff', border: 'none', padding: 8, borderRadius: 8 }}>⤾</button>
          <button title="Flip" onClick={bakeFlip} style={{ background: 'rgba(255,255,255,0.06)', color: '#fff', border: 'none', padding: 8, borderRadius: 8 }}>⇋</button>
          <button title="Crop/Pan" onClick={() => { setMode(m => m === 'pan' ? 'crop' : 'pan'); setActiveTool('Crop'); }} style={{ background: mode === 'crop' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)', color: '#fff', border: 'none', padding: 8, borderRadius: 8 }}>{mode === 'pan' ? 'Crop' : 'Pan'}</button>
        </div>

        {/* left-side small controls when activeTool is Adjust or Exposure */}
        {activeTool === 'Adjust' && (
          <div style={{ position: 'absolute', left: 12, top: 12, background: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 8 }}>
            <div style={{ fontSize: 12, opacity: 0.9 }}>Zoom</div>
            <input type="range" min={0.5} max={3} step={0.01} value={zoom} onChange={e => { setZoom(Number(e.target.value)); draw(); }} />
          </div>
        )}

        {activeTool === 'Exposure' && (
          <div style={{ position: 'absolute', left: 12, top: 12, background: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 8 }}>
            <div style={{ fontSize: 12, opacity: 0.9 }}>Exposure {brightness}%</div>
            <input type="range" min={50} max={200} step={1} value={brightness} onChange={e => { setBrightness(Number(e.target.value)); draw(); }} />
          </div>
        )}

        {/* bottom-left preview info */}
        <div style={{ position: 'absolute', left: 12, bottom: 12, background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '6px 8px', borderRadius: 6 }}>
          <div style={{ fontSize: 12 }}>Preview: {previewBytes ? Math.round(previewBytes / 1024) + ' KB' : '—'}</div>
          <div style={{ fontSize: 11, marginTop: 6, opacity: 0.85 }}>{mode === 'pan' ? 'Drag to pan' : 'Drag to crop'}</div>
        </div>
      </div>

      {/* tabs like VSCO: ALL TOOLS, ESSENTIAL, LIGHT, COLOR, EFFECTS */}
      <div style={{ display: 'flex', gap: 12, marginTop: 12, overflowX: 'auto' }}>
        {['ALL TOOLS', 'ESSENTIAL', 'LIGHT', 'COLOR', 'EFFECTS'].map(t => (
          <button key={t} onClick={() => setActiveTool(null)} style={{ background: activeTool === t ? 'rgba(255,255,255,0.08)' : 'transparent', color: '#fff', border: 'none', padding: '6px 8px', borderRadius: 6 }}>{t}</button>
        ))}
      </div>

      {/* tool grid (icons + labels) */}
      <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
        {[
          { id: 'Dodge', label: 'Dodge & Burn' },
          { id: 'Blur', label: 'Blur' },
          { id: 'Text', label: 'Text' },
          { id: 'Adjust', label: 'Adjust' },
          { id: 'Exposure', label: 'Exposure' },
          { id: 'Crop', label: 'Crop' }
        ].map(tool => (
          <div key={tool.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button onClick={() => {
                setActiveTool(tool.id);
                if (tool.id === 'Crop') {
                  // set up crop selection if missing
                  if (!sel) createDefaultSel();
                }
              }} style={{ width: 96, height: 96, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: activeTool === tool.id ? 'rgba(255,255,255,0.04)' : 'transparent', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 8, color: '#fff' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>{tool.id[0]}</div>
              <div style={{ fontSize: 12 }}>{tool.label}</div>
            </button>
            {/* show ratio presets when Crop is active */}
            {tool.id === 'Crop' && activeTool === 'Crop' && (
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                {[
                  { label: 'Free', v: null },
                  { label: '1:1', v: 1 },
                  { label: '3:4', v: 3 / 4 },
                  { label: '4:5', v: 4 / 5 }
                ].map(r => (
                  <button key={r.label} onClick={() => { setCropRatio(r.v); createDefaultSel(); }} style={{ padding: '4px 8px', borderRadius: 6, fontSize: 12, background: cropRatio === r.v ? 'rgba(255,255,255,0.12)' : 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.04)' }}>{r.label}</button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* bottom action row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 14 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn ghost" onClick={resetAll} style={{ padding: '8px 12px', borderRadius: 8 }}>Reset</button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => { setImageSrc(originalRef.current); setActiveTool(null); }} style={{ padding: '8px 12px', borderRadius: 8, background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.06)' }}>Original</button>
          <button className="btn primary" onClick={applyEdit} style={{ padding: '8px 14px', borderRadius: 8, background: '#fff', color: '#000', fontWeight: 600 }}>Apply</button>
        </div>
      </div>
    </div>
  );
}
