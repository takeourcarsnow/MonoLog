import React, { useMemo } from 'react';
import AsciiControlsShared from '../../ascii/AsciiControls';
import { throttle } from '@/lib/utils';

interface AsciiPanelProps {
  asciiEnabled: boolean;
  setAsciiEnabled: (v: boolean) => void;
  asciiEnabledRef: React.MutableRefObject<boolean>;
  asciiCellSize: number;
  setAsciiCellSize: (v: number) => void;
  asciiCellSizeRef: React.MutableRefObject<number>;
  asciiCharset: string;
  setAsciiCharset: (v: string) => void;
  asciiCharsetRef: React.MutableRefObject<string>;
  asciiInvert: boolean;
  setAsciiInvert: (v: boolean) => void;
  asciiInvertRef: React.MutableRefObject<boolean>;
  asciiColor: boolean;
  setAsciiColor: (v: boolean) => void;
  asciiColorRef: React.MutableRefObject<boolean>;
  asciiOpacity?: number;
  setAsciiOpacity?: (v: number) => void;
  asciiOpacityRef?: React.MutableRefObject<number>;
  asciiBackground?: string;
  setAsciiBackground?: (v: string) => void;
  asciiBackgroundRef?: React.MutableRefObject<string>;
  asciiFont?: string;
  setAsciiFont?: (v: string) => void;
  asciiFontRef?: React.MutableRefObject<string>;
  asciiGamma?: number;
  setAsciiGamma?: (v: number) => void;
  asciiGammaRef?: React.MutableRefObject<number>;
  asciiBold?: boolean;
  setAsciiBold?: (v: boolean) => void;
  asciiBoldRef?: React.MutableRefObject<boolean>;
  asciiEdge?: 'none' | 'stroke';
  setAsciiEdge?: (v: 'none' | 'stroke') => void;
  asciiEdgeRef?: React.MutableRefObject<'none' | 'stroke'>;
  asciiCharsetPreset?: 'custom' | 'dense' | 'medium' | 'sparse' | 'blocks' | 'dots' | 'lines' | 'numbers' | 'letters';
  setAsciiCharsetPreset?: (v: 'custom' | 'dense' | 'medium' | 'sparse' | 'blocks' | 'dots' | 'lines' | 'numbers' | 'letters') => void;
  draw: (overrides?: any) => void;
  asciiEnabledFlag: boolean;
  anyEnabled: boolean;
}

export default function AsciiPanel(props: AsciiPanelProps) {
  const scheduleDraw = useMemo(() => throttle(() => props.draw(), 80), [props.draw]);

  return (
    <>
      {(!props.anyEnabled || props.asciiEnabledFlag) && (
        <div style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
          <AsciiControlsShared
            asciiEnabled={props.asciiEnabled}
            setAsciiEnabled={(v) => { props.asciiEnabledRef.current = v; props.setAsciiEnabled(v); scheduleDraw(); }}
            asciiCellSize={props.asciiCellSize}
            asciiCellSizeRef={props.asciiCellSizeRef}
            setAsciiCellSize={(v) => { props.asciiCellSizeRef.current = v; props.setAsciiCellSize(v); scheduleDraw(); }}
            asciiCharset={props.asciiCharset}
            asciiCharsetRef={props.asciiCharsetRef}
            setAsciiCharset={(v) => { props.asciiCharsetRef.current = v; props.setAsciiCharset(v); scheduleDraw(); }}
            asciiInvert={props.asciiInvert}
            setAsciiInvert={(v) => { props.asciiInvertRef.current = v; props.setAsciiInvert(v); scheduleDraw(); }}
            asciiColor={props.asciiColor}
            setAsciiColor={(v) => { props.asciiColorRef.current = v; props.setAsciiColor(v); scheduleDraw(); }}
            asciiCharsetPreset={props.asciiCharsetPreset}
            setAsciiCharsetPreset={(p) => { props.setAsciiCharsetPreset && props.setAsciiCharsetPreset(p); scheduleDraw(); }}
            draw={props.draw}
          />
        </div>
      )}
    </>
  );
}