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
  const dragging = useRef<null | {
    startX: number;
    startY: number;
    mode: "pan" | "crop";
    action?: "move" | "draw";
    origSel?: { x: number; y: number; w: number; h: number };
    anchorX?: number;
    anchorY?: number;
  }>(null);
  const [sel, setSel] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  // default behavior: drag to create/move crop selection.
  const cropRatio = useRef<number | null>(null); // null = free

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
      img.onload = () => {
        imgRef.current = img;
        // schedule layout & draw on next frame so canvas sizing/resizes have applied
        requestAnimationFrame(() => {
          const info = computeImageLayout();
          if (info) {
            setOffset({ x: info.left, y: info.top });
            draw(info);
          } else {
            draw();
          }
        });
    };
    img.src = imageSrc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSrc]);

  function computeImageLayout() {
    const canvas = canvasRef.current; const img = imgRef.current;
    if (!canvas || !img) return null as any;
    const rect = canvas.getBoundingClientRect();
    const baseScale = Math.min(rect.width / img.naturalWidth, rect.height / img.naturalHeight);
    const dispW = img.naturalWidth * baseScale;
    const dispH = img.naturalHeight * baseScale;
    const left = (rect.width - dispW) / 2;
    const top = (rect.height - dispH) / 2;
    // return layout info; do NOT set state here (caller should set state and draw with info)
    return { rect, baseScale, dispW, dispH, left, top };
  }

  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current; const cont = containerRef.current;
      if (!c || !cont) return;
      const dpr = window.devicePixelRatio || 1;
      // use clientWidth/clientHeight to avoid transform/scale issues from parent modals
      const contW = Math.max(100, Math.round(cont.clientWidth));
      // pick a responsive height so editor fits smaller screens
      const targetHeight = Math.max(180, Math.round(Math.min(window.innerHeight * 0.6, 480)));
      c.width = Math.max(100, Math.round(contW * dpr));
      c.height = Math.max(100, Math.round(targetHeight * dpr));
      c.style.width = `${contW}px`;
      c.style.height = `${targetHeight}px`;
      // recompute image layout after resize so image stays centered
        const info = computeImageLayout();
        if (info) {
          setOffset({ x: info.left, y: info.top });
          draw(info);
        } else {
          draw();
        }
    };
    // initial sizing + a couple of extra recomputes for animated modals / theme toggles
    resize();
    requestAnimationFrame(() => resize());
    const t = window.setTimeout(() => resize(), 120);

    // also listen to container size changes via ResizeObserver so opening animations or theme changes reflow correctly
    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(() => resize());
      if (containerRef.current) ro.observe(containerRef.current);
      if (canvasRef.current) ro.observe(canvasRef.current);
    } catch (e) {
      // ResizeObserver may not be available in some environments; fall back to window resize
      window.addEventListener("resize", resize);
    }

    return () => {
      window.clearTimeout(t);
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);

  function draw(info?: { rect: DOMRect; baseScale: number; dispW: number; dispH: number; left: number; top: number }) {
    const canvas = canvasRef.current; const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    // prefer using the provided layout info to avoid state update races
    let left: number, top: number, dispW: number, dispH: number;
    if (info) {
      left = info.left; top = info.top; dispW = info.dispW; dispH = info.dispH;
    } else {
      const rect = canvas.getBoundingClientRect();
      const baseScale = Math.min(rect.width / img.naturalWidth, rect.height / img.naturalHeight);
      dispW = img.naturalWidth * baseScale;
      dispH = img.naturalHeight * baseScale;
      left = offset.x; top = offset.y;
    }

    ctx.drawImage(img, left, top, dispW, dispH);

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
      // stop propagation so AppShell swipe/mouse handlers don't react
      ev.stopPropagation?.();
      try { (ev.target as Element).setPointerCapture(ev.pointerId); } catch {}
      const p = getPointerPos(ev);
      // If clicked inside selection, prepare to move; otherwise start drawing a new selection
      if (sel && p.x >= sel.x && p.x <= sel.x + sel.w && p.y >= sel.y && p.y <= sel.y + sel.h) {
        dragging.current = { startX: p.x, startY: p.y, mode: 'crop', action: 'move', origSel: { ...sel }, anchorX: p.x - sel.x, anchorY: p.y - sel.y };
      } else {
        dragging.current = { startX: p.x, startY: p.y, mode: 'crop', action: 'draw' };
        setSel({ x: p.x, y: p.y, w: 0, h: 0 });
      }
    };

    const onPointerMove = (ev: PointerEvent) => {
      // prevent parent handlers from interpreting this as a swipe/drag
      ev.stopPropagation?.();
      const p = getPointerPos(ev);
      if (!dragging.current) return;
      if (dragging.current.mode === 'pan') {
        setOffset({ x: p.x - dragging.current.startX, y: p.y - dragging.current.startY });
      } else if (dragging.current.mode === 'crop') {
        const info = computeImageLayout();
        if (!info) return;
        const { left, top, dispW, dispH } = info;
        // image displayed rect in canvas coords
        const imgRect = { x: left, y: top, w: dispW, h: dispH };

        if (dragging.current.action === 'move' && dragging.current.origSel) {
          // moving existing selection: compute new top-left constrained inside image rect
          const nx = p.x - (dragging.current.anchorX || 0);
          const ny = p.y - (dragging.current.anchorY || 0);
          // clamp
          const maxX = imgRect.x + imgRect.w - dragging.current.origSel.w;
          const maxY = imgRect.y + imgRect.h - dragging.current.origSel.h;
          const cx = Math.min(Math.max(nx, imgRect.x), Math.max(maxX, imgRect.x));
          const cy = Math.min(Math.max(ny, imgRect.y), Math.max(maxY, imgRect.y));
          setSel({ x: cx, y: cy, w: dragging.current.origSel.w, h: dragging.current.origSel.h });
        } else {
          // drawing new selection
          const sx = dragging.current.startX; const sy = dragging.current.startY;
          let nx = Math.min(sx, p.x); let ny = Math.min(sy, p.y);
          let nw = Math.abs(p.x - sx); let nh = Math.abs(p.y - sy);
          if (cropRatio.current) {
            const fromW = Math.max(1, Math.abs(p.x - sx));
            const fromH = Math.max(1, Math.abs(p.y - sy));
            const hFromW = fromW / cropRatio.current;
            const wFromH = fromH * cropRatio.current;
            if (hFromW <= fromH) {
              nh = Math.round(hFromW);
              nw = fromW;
            } else {
              nw = Math.round(wFromH);
              nh = fromH;
            }
            if (p.x < sx) nx = sx - nw;
            if (p.y < sy) ny = sy - nh;
          }
          // clamp selection to image rect
          const selLeft = Math.max(nx, imgRect.x);
          const selTop = Math.max(ny, imgRect.y);
          const selRight = Math.min(nx + nw, imgRect.x + imgRect.w);
          const selBottom = Math.min(ny + nh, imgRect.y + imgRect.h);
          const finalW = Math.max(1, selRight - selLeft);
          const finalH = Math.max(1, selBottom - selTop);
          setSel({ x: selLeft, y: selTop, w: finalW, h: finalH });
        }
      }
      draw();
    };

    const onPointerUp = (ev: PointerEvent) => {
      // prevent parent handlers from interpreting this as a swipe/drag
      ev.stopPropagation?.();
      try { (ev.target as Element).releasePointerCapture(ev.pointerId); } catch {}
      dragging.current = null;
      draw();
    };
  canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  // no keyboard modifiers — panning is done by dragging outside/inside selection as before
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, sel]);

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
  const canvas = canvasRef.current;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const baseScale = Math.min(rect.width / img.naturalWidth, rect.height / img.naturalHeight);
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
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={(e) => { if ((e as any).key === 'Enter') { applyEdit(); } }}
      className="image-editor"
      style={{ width: '100%', maxWidth: 820, margin: '0 auto', background: 'var(--bg-elev)', color: 'var(--text)', padding: 12, paddingBottom: 'calc(96px + var(--safe-bottom))', borderRadius: 8, overflow: 'visible' }}
      
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 12, flexWrap: 'wrap' }}>
  <button type="button" className="btn ghost" onClick={onCancel} aria-label="back" style={{ color: 'var(--text)', background: 'transparent', border: 'none' }}>◀</button>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Edit</div>
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
          <button type="button" className="btn primary" onClick={applyEdit} style={{ padding: '8px 14px', borderRadius: 8, background: 'var(--primary)', color: '#fff', fontWeight: 600 }}>Confirm</button>
        </div>
      </div>

  <div style={{ position: 'relative', background: 'var(--bg)', padding: 8, borderRadius: 8 }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: 360, touchAction: 'none', display: 'block', borderRadius: 6 }}
          
        />

        <div style={{ position: 'absolute', right: 12, top: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" title="Rotate 90°" onClick={bakeRotate90} style={{ background: 'color-mix(in srgb, var(--bg-elev), transparent 8%)', color: 'var(--text)', border: 'none', padding: 8, borderRadius: 8 }}>⤾</button>
        </div>

  <div style={{ position: 'absolute', left: 12, bottom: 12, background: 'color-mix(in srgb, var(--bg-elev), transparent 40%)', color: 'var(--text)', padding: '6px 8px', borderRadius: 6 }}>
          <div style={{ fontSize: 11, opacity: 0.9 }}>Drag to crop; drag inside selection to move it</div>
        </div>
        {/* floating confirm button inside the canvas area so it's always visible */}
        <div style={{ position: 'absolute', right: 12, bottom: 12, zIndex: 30 }}>
          <button type="button" aria-label="Confirm crop" title="Confirm crop (Enter)" onClick={applyEdit} style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Confirm</button>
        </div>
      </div>

      {/* aspect ratio presets */}
  <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 80, paddingBottom: 8 }}>
          {[
          { label: 'Free', v: null },
          { label: '1:1', v: 1 },
          { label: '3:4', v: 3 / 4 },
          { label: '4:5', v: 4 / 5 }
        ].map(r => (
              <button type="button" key={r.label} onClick={() => {
            cropRatio.current = r.v;
            // compute selection centered inside the displayed image rect
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
              // fallback to canvas-centered selection
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
              }} style={{ padding: '8px 12px', minWidth: 60, minHeight: 36, fontSize: 14, borderRadius: 8, background: cropRatio.current === r.v ? 'var(--primary)' : 'var(--bg-elev)', color: cropRatio.current === r.v ? '#fff' : 'var(--text)', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', zIndex: 40 }}>{r.label}</button>
        ))}
      </div>

      {/* Bottom controls removed per request */}
    </div>
  );
}
