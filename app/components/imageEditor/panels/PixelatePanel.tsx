import React, { useMemo } from 'react';
import { Grid } from 'lucide-react';
import { rangeBg } from '../utils';
import { throttle } from '@/src/lib/utils';

interface PixelatePanelProps {
  pixelSize: number;
  setPixelSize: (v: number) => void;
  pixelSizeRef: React.MutableRefObject<number>;
  pixelShape?: 'square' | 'circle';
  setPixelShape?: (v: 'square' | 'circle') => void;
  pixelShapeRef?: React.MutableRefObject<'square' | 'circle'>;
  pixelSample?: 'average' | 'nearest';
  setPixelSample?: (v: 'average' | 'nearest') => void;
  pixelSampleRef?: React.MutableRefObject<'average' | 'nearest'>;
  draw: (overrides?: any) => void;
  pixelateEnabled: boolean;
  anyEnabled: boolean;
  onToggleEnabled: (enabled: boolean) => void;
}

export default function PixelatePanel(props: PixelatePanelProps) {
  const scheduleDraw = useMemo(() => throttle(() => props.draw(), 80), [props.draw]);

  return (
    <>
      {(!props.anyEnabled || props.pixelateEnabled) && (
        <div style={{ display: 'grid', gap: 4 }}>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ width: 80, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
              <Grid size={18} strokeWidth={2} aria-hidden />
              <span>Pixelate</span>
            </span>
            <input
              type="checkbox"
              checked={props.pixelateEnabled}
              onChange={(e) => props.onToggleEnabled(e.target.checked)}
              aria-label="Enable pixelation"
            />
          </label>
          {props.pixelateEnabled && (
            <>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ width: 80, fontSize: 12, opacity: 0.8 }}>Pixel Size</span>
                <input
                  className="imgedit-range"
                  type="range"
                  min={1}
                  max={100}
                  step={1}
                  value={props.pixelSize}
                  onInput={(e: any) => {
                    const v = Number(e.target.value);
                    props.pixelSizeRef.current = v;
                    props.setPixelSize(v);
                    scheduleDraw();
                  }}
                  style={{ flex: 1, maxWidth: 180, background: rangeBg(props.pixelSize, 1, 100, '#334155', '#38bdf8') }}
                  aria-label="Pixel size"
                />
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}