"use client";

import { useEffect, useRef, useState } from "react";

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

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef<{ startX: number; startY: number; mode: "pan" | "crop" } | null>(null);
  const [sel, setSel] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [mode, setMode] = useState<"pan" | "crop">("pan");

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current;
      if (canvas) {
        // center image in canvas
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const baseScale = Math.min(1, 600 / Math.max(img.naturalWidth, img.naturalHeight));
        const displayedW = img.naturalWidth * baseScale;
        const displayedH = img.naturalHeight * baseScale;
        setOffset({ x: (rect.width - displayedW) / 2, y: (rect.height - displayedH) / 2 });
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
  }, [sel]);

  function draw() {
    const canvas = canvasRef.current; const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    const baseScale = Math.min(1, 600 / Math.max(img.naturalWidth, img.naturalHeight));
    const dispW = img.naturalWidth * baseScale;
    const dispH = img.naturalHeight * baseScale;

    ctx.drawImage(img, offset.x, offset.y, dispW, dispH);

    if (sel) {
      ctx.save();
      ctx.strokeStyle = "#00aaff";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(sel.x, sel.y, sel.w, sel.h);
      ctx.restore();
      // dim outside selection
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.rect(0, 0, canvas.width / dpr, canvas.height / dpr);
      ctx.rect(sel.x, sel.y, sel.w, sel.h);
      // @ts-ignore
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
      if (mode === 'crop') {
        // if clicked inside existing selection, start moving the selection
        if (sel && p.x >= sel.x && p.x <= sel.x + sel.w && p.y >= sel.y && p.y <= sel.y + sel.h) {
          dragging.current = { startX: p.x - sel.x, startY: p.y - sel.y, mode: 'crop' };
        } else {
          // start a new selection
          dragging.current = { startX: p.x, startY: p.y, mode: 'crop' };
          setSel({ x: p.x, y: p.y, w: 0, h: 0 });
        }
      } else {
        // pan mode
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
        if (sel && sx !== sel.x) {
          // we are moving existing selection
          const nx = p.x - sx; const ny = p.y - sy;
          setSel({ x: nx, y: ny, w: sel.w, h: sel.h });
        } else {
          // drawing new selection
          let nx = Math.min(sx, p.x); let ny = Math.min(sy, p.y);
          let nw = Math.abs(p.x - sx); let nh = Math.abs(p.y - sy);
          setSel({ x: nx, y: ny, w: Math.max(1, nw), h: Math.max(1, nh) });
        }
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
  }, [mode, offset, sel]);

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
    setSel(null);
    setOffset({ x: 0, y: 0 });
  }

  function resetAll() {
    setImageSrc(originalRef.current);
    setSel(null); setOffset({ x: 0, y: 0 });
  }

  async function applyEdit() {
    const img = imgRef.current; if (!img) return;
    const baseScale = Math.min(1, 600 / Math.max(img.naturalWidth, img.naturalHeight));
    const scaleFactor = baseScale;

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
    octx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
    const dataUrl = out.toDataURL('image/jpeg', 0.92);
    onApply(dataUrl);
  }

  return (
    <div ref={containerRef} className="image-editor" style={{ width: '100%', background: '#0b0b0b', color: '#fff', padding: 12, borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <button className="btn ghost" onClick={onCancel} aria-label="back" style={{ color: '#fff', background: 'transparent', border: 'none' }}>◀</button>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Edit</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn primary" onClick={applyEdit} style={{ padding: '8px 14px', borderRadius: 8, background: '#fff', color: '#000', fontWeight: 600 }}>Confirm</button>
        </div>
      </div>

      <div style={{ position: 'relative', background: '#000', padding: 8, borderRadius: 8 }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: 360, touchAction: 'none', display: 'block', borderRadius: 6 }} />

        <div style={{ position: 'absolute', right: 12, top: 12, display: 'flex', gap: 8 }}>
          <button title="Rotate 90°" onClick={bakeRotate90} style={{ background: 'rgba(255,255,255,0.06)', color: '#fff', border: 'none', padding: 8, borderRadius: 8 }}>⤾</button>
          <button title={mode === 'pan' ? 'Switch to Crop' : 'Switch to Pan'} onClick={() => setMode(m => m === 'pan' ? 'crop' : 'pan')} style={{ background: mode === 'crop' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)', color: '#fff', border: 'none', padding: 8, borderRadius: 8 }}>{mode === 'pan' ? 'Crop' : 'Pan'}</button>
        </div>

        <div style={{ position: 'absolute', left: 12, bottom: 12, background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '6px 8px', borderRadius: 6 }}>
          <div style={{ fontSize: 11, opacity: 0.9 }}>{mode === 'pan' ? 'Drag to pan' : 'Drag to crop / move selection'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 14 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn ghost" onClick={resetAll} style={{ padding: '8px 12px', borderRadius: 8 }}>Reset</button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => { setImageSrc(originalRef.current); }} style={{ padding: '8px 12px', borderRadius: 8, background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.06)' }}>Original</button>
        </div>
      </div>
    </div>
  );
}
