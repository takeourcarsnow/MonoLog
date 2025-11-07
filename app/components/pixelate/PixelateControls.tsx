"use client";

import React, { useMemo } from 'react';
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
    <div style={{ display: 'grid', gap: 6, width: '100%', boxSizing: 'border-box' }}>
      {props.enabled && (
        <>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="imgedit-range"
              type="range"
              min={1}
              max={100}
              step={1}
              value={props.pixelSize}
              onChange={(e: any) => onSizeChange(Number(e.target.value))}
              style={{ flex: 1, minWidth: 0, background: rangeBg(props.pixelSize, 1, 100, '#334155', '#38bdf8') }}
              aria-label="Pixel size"
            />
            <span style={{ minWidth: 32, textAlign: 'right', fontSize: 12 }}>{props.pixelSize}</span>
            <select
              value={props.pixelShape ?? 'square'}
              onChange={(e) => onShapeChange(e.target.value as 'square' | 'circle')}
              style={{ padding: '4px 6px', fontSize: 12, borderRadius: 6, minWidth: 92 }}
              aria-label="Pixel shape"
            >
              <option value="square">Square</option>
              <option value="circle">Circle</option>
            </select>
          </div>
        </>
      )}
    </div>
  );
}
