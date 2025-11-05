import React from 'react';
import { Contrast, Palette } from 'lucide-react';
import { rangeBg } from '../../utils';

interface DitherControlsProps {
  ditherMethod: 'none' | 'floyd-steinberg' | 'ordered' | 'atkinson' | 'burkes';
  ditherColorMode?: 'bw' | 'color';
  setDitherColorMode?: (v: 'bw' | 'color') => void;
  ditherColorModeRef?: React.MutableRefObject<'bw' | 'color'>;
  ditherLevels: number;
  setDitherLevels: (v: number) => void;
  ditherLevelsRef: React.MutableRefObject<number>;
  targetLongEdge?: number;
  setTargetLongEdge?: (v: number) => void;
  targetLongEdgeRef?: React.MutableRefObject<number>;
  draw: (overrides?: any) => void;
  resetControlToDefault?: (control: string) => void;
  scheduleDraw: () => void;
}

export default function DitherControls({
  ditherMethod,
  ditherColorMode,
  setDitherColorMode,
  ditherColorModeRef,
  ditherLevels,
  setDitherLevels,
  ditherLevelsRef,
  targetLongEdge,
  setTargetLongEdge,
  targetLongEdgeRef,
  draw,
  resetControlToDefault,
  scheduleDraw,
}: DitherControlsProps) {
  if (ditherMethod === 'none') return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Resolution control */}
      {setTargetLongEdge && targetLongEdgeRef && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text)', minWidth: 60 }}>Res</span>
          <input
            className="imgedit-range"
            type="range"
            min={50}
            max={400}
            step={10}
            value={targetLongEdge || 150}
            onInput={(e: any) => { const v = Number(e.target.value); targetLongEdgeRef.current = v; setTargetLongEdge(v); scheduleDraw(); }}
            onDoubleClick={() => resetControlToDefault && resetControlToDefault('targetLongEdge')}
            style={{ flex: 1, minWidth: 120, background: rangeBg(targetLongEdge || 150, 50, 400, '#0f172a', '#a78bfa') }}
            aria-label="Dither resolution"
          />
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text)', minWidth: 30, textAlign: 'center' }}>
            {targetLongEdge || 150}
          </span>
        </div>
      )}
      {/* Levels and color mode controls */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: 2, borderRadius: 6, border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)', overflow: 'hidden' }}>
        <button
          type="button"
          onClick={() => {
            const v = ditherColorMode === 'bw' ? 'color' : 'bw';
            ditherColorModeRef && (ditherColorModeRef.current = v);
            setDitherColorMode && setDitherColorMode(v);
            scheduleDraw();
          }}
          style={{
            padding: '4px 8px',
            background: ditherColorMode === 'bw' ? 'color-mix(in srgb, var(--primary) 15%, transparent)' : 'var(--bg-elev)',
            color: 'var(--text)',
            fontSize: 11,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 0.2s ease',
            border: 'none',
            borderRight: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          aria-label="Toggle dither mode to Black & White"
        >
          <Contrast size={16} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => {
            const v = ditherColorMode === 'bw' ? 'color' : 'bw';
            ditherColorModeRef && (ditherColorModeRef.current = v);
            setDitherColorMode && setDitherColorMode(v);
            scheduleDraw();
          }}
          style={{
            padding: '4px 8px',
            background: ditherColorMode === 'color' ? 'color-mix(in srgb, var(--primary) 15%, transparent)' : 'var(--bg-elev)',
            color: 'var(--text)',
            fontSize: 11,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 0.2s ease',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          aria-label="Toggle dither mode to Color"
        >
          <Palette size={16} strokeWidth={2} />
        </button>
      </div>
      <input
        className="imgedit-range"
        type="range"
        min={3}
        max={31}
        step={1}
        value={ditherLevels}
        onInput={(e: any) => { const v = Number(e.target.value); ditherLevelsRef.current = v; setDitherLevels(v); scheduleDraw(); }}
        onDoubleClick={() => resetControlToDefault && resetControlToDefault('ditherLevels')}
        style={{ flex: 1, minWidth: 120, background: rangeBg(ditherLevels, 3, 31, '#0f172a', '#a78bfa') }}
        aria-label="Dither levels"
      />
      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text)', minWidth: 20, textAlign: 'center' }}>
        {ditherLevels}
      </span>
      </div>
    </div>
  );
}