"use client";

import React, { useMemo } from 'react';
import { Type } from 'lucide-react';
import { throttle } from '@/lib/utils';
import { rangeBg } from '../imageEditor/utils';

type CharsetPreset = 'custom' | 'dense' | 'medium' | 'sparse' | 'blocks' | 'dots' | 'lines' | 'numbers' | 'letters';

interface SharedAsciiProps {
  asciiEnabled: boolean;
  setAsciiEnabled?: (v: boolean) => void;
  asciiCellSize: number;
  setAsciiCellSize?: (v: number) => void;
  asciiCellSizeRef?: React.MutableRefObject<number>;
  asciiCharset: string;
  setAsciiCharset?: (v: string) => void;
  asciiCharsetRef?: React.MutableRefObject<string>;
  asciiInvert?: boolean;
  setAsciiInvert?: (v: boolean) => void;
  asciiCharsetPreset?: CharsetPreset;
  setAsciiCharsetPreset?: (v: CharsetPreset) => void;
  asciiColor?: boolean;
  setAsciiColor?: (v: boolean) => void;
  draw?: (overrides?: any) => void;
}

export default function AsciiControlsShared(props: SharedAsciiProps) {
  const scheduleDraw = useMemo(() => props.draw ? throttle(() => props.draw!(), 80) : undefined, [props.draw]);

  const applyPreset = (preset: CharsetPreset) => {
    props.setAsciiCharsetPreset && props.setAsciiCharsetPreset(preset);
    scheduleDraw && scheduleDraw();
  };

  return (
    <div style={{ display: 'grid', gap: 6, width: '100%', boxSizing: 'border-box' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, fontWeight: 600 }}>
          <Type size={16} strokeWidth={2} aria-hidden />
          <span>ASCII Art</span>
        </span>
        {props.setAsciiEnabled ? (
          <input type="checkbox" checked={!!props.asciiEnabled} onChange={(e) => { props.setAsciiEnabled!(e.target.checked); scheduleDraw && scheduleDraw(); }} aria-label="Enable ASCII art" />
        ) : null}
      </label>

      {props.asciiEnabled && (
        <>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="imgedit-range"
              type="range"
              min={2}
              max={36}
              step={1}
              value={props.asciiCellSize}
              onChange={(e: any) => { const v = Number(e.target.value); props.asciiCellSizeRef && (props.asciiCellSizeRef.current = v); props.setAsciiCellSize && props.setAsciiCellSize(v); scheduleDraw && scheduleDraw(); }}
              style={{ flex: 1, minWidth: 0, background: rangeBg(props.asciiCellSize, 2, 36, '#1f2937', '#f59e0b') }}
              aria-label="ASCII cell size"
            />
            <span style={{ minWidth: 32, textAlign: 'right', fontSize: 12 }}>{props.asciiCellSize}</span>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={props.asciiCharsetPreset ?? 'custom'}
              onChange={(e) => applyPreset(e.target.value as CharsetPreset)}
              style={{ padding: '4px 6px', fontSize: 12, borderRadius: 6, flex: 1 }}
              aria-label="ASCII preset"
            >
              <option value="custom">Custom</option>
              <option value="dense">Dense</option>
              <option value="sparse">Sparse</option>
              <option value="dots">Dots</option>
              <option value="blocks">Blocks</option>
              <option value="lines">Lines</option>
              <option value="numbers">Numbers</option>
              <option value="letters">Letters</option>
            </select>

            <select
              value={props.asciiInvert ? 'inverted' : 'normal'}
              onChange={(e) => { const v = e.target.value === 'inverted'; props.setAsciiInvert && props.setAsciiInvert(v); scheduleDraw && scheduleDraw(); }}
              style={{ padding: '4px 6px', fontSize: 12, borderRadius: 6 }}
              aria-label="ASCII invert"
            >
              <option value="normal">Normal</option>
              <option value="inverted">Inverted</option>
            </select>

            <label style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input type="checkbox" checked={!!props.asciiColor} onChange={(e) => { props.setAsciiColor && props.setAsciiColor(e.target.checked); scheduleDraw && scheduleDraw(); }} aria-label="ASCII color" />
              <span style={{ fontSize: 12 }}>Color</span>
            </label>
          </div>
        </>
      )}
    </div>
  );
}
