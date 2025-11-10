"use client";

import React, { useMemo } from 'react';
import { Square, Circle } from 'lucide-react';
import { rangeBg } from '../imageEditor/utils';
import { throttle } from '@/lib/utils';

interface SharedPixelateProps {
  // values
  pixelSize: number;
  pixelShape?: 'square' | 'circle';
  // optional setters (uploader will not provide these)
  setPixelSize?: (v: number) => void;
  pixelSizeRef?: React.MutableRefObject<number>;
  setPixelShape?: (v: 'square' | 'circle') => void;
  pixelShapeRef?: React.MutableRefObject<'square' | 'circle'>;
  // optional draw for editor preview
  draw?: (overrides?: any) => void;
  // optional toggle UI (editor shows a checkbox to enable/disable pixelate)
  showToggle?: boolean;
  enabled?: boolean;
  onToggleEnabled?: (v: boolean) => void;
}

export default function PixelateControlsShared(props: SharedPixelateProps) {
  const scheduleDraw = useMemo(() => props.draw ? throttle(() => props.draw!(), 80) : undefined, [props.draw]);

  const onSizeChange = (v: number) => {
    if (props.pixelSizeRef) props.pixelSizeRef.current = v;
    props.setPixelSize && props.setPixelSize(v);
    scheduleDraw && scheduleDraw();
  };

  const onShapeChange = (shape: 'square' | 'circle') => {
    if (props.pixelShapeRef) props.pixelShapeRef.current = shape;
    props.setPixelShape && props.setPixelShape(shape);
    scheduleDraw && scheduleDraw();
  };

  return (
    <div style={{ display: 'grid', gap: 2, width: '100%', boxSizing: 'border-box' }}>
      {props.enabled && (
        <>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              className="imgedit-range"
              type="range"
              min={10}
              max={100}
              step={1}
              value={props.pixelSize}
              onChange={(e: any) => onSizeChange(Number(e.target.value))}
              style={{ flex: 1, minWidth: 0, background: rangeBg(props.pixelSize, 10, 100, '#334155', '#38bdf8') }}
              aria-label="Pixel size"
            />
            <span style={{ minWidth: 24, textAlign: 'right', fontSize: 10 }}>{props.pixelSize}</span>
            <button
              type="button"
              onClick={() => onShapeChange(props.pixelShape === 'square' ? 'circle' : 'square')}
              style={{
                padding: '2px 4px',
                fontSize: 10,
                borderRadius: 4,
                minWidth: 32,
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label={`Pixel shape: ${props.pixelShape === 'square' ? 'Square' : 'Circle'}`}
            >
              {props.pixelShape === 'square' ? <Square size={14} /> : <Circle size={14} />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
