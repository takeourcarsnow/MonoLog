import React, { useMemo } from 'react';
import PixelateControlsShared from '../../pixelate/PixelateControls';
import { throttle } from '@/lib/utils';

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
  // keep schedule draw throttle consistent with before
  const scheduleDraw = useMemo(() => throttle(() => props.draw(), 80), [props.draw]);

  return (
    <>
      {(!props.anyEnabled || props.pixelateEnabled) && (
        <div style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
          <PixelateControlsShared
            pixelSize={props.pixelSize}
            pixelShape={props.pixelShape}
            setPixelSize={(v) => { props.pixelSizeRef.current = v; props.setPixelSize(v); scheduleDraw(); }}
            pixelSizeRef={props.pixelSizeRef}
            setPixelShape={(s) => { props.pixelShapeRef && (props.pixelShapeRef.current = s); props.setPixelShape && props.setPixelShape(s); scheduleDraw(); }}
            pixelShapeRef={props.pixelShapeRef}
            draw={props.draw}
            showToggle={true}
            enabled={props.pixelateEnabled}
            onToggleEnabled={props.onToggleEnabled}
          />
        </div>
      )}
    </>
  );
}