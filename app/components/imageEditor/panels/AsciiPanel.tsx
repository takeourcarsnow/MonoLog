import React, { useMemo } from 'react';
import { Type, Contrast } from 'lucide-react';
import { rangeBg } from '../utils';
import { throttle } from '@/src/lib/utils';

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
        <div style={{ display: 'grid', gap: 4 }}>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ width: 80, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
              <Type size={18} strokeWidth={2} aria-hidden />
              <span>ASCII Art</span>
            </span>
            <input
              type="checkbox"
              checked={props.asciiEnabled}
              onChange={(e) => { const v = e.target.checked; props.asciiEnabledRef.current = v; props.setAsciiEnabled(v); scheduleDraw(); }}
              aria-label="Enable ASCII art"
            />
          </label>
          {props.asciiEnabled && (
            <>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ width: 80, fontSize: 12, opacity: 0.8 }}>Cell Size</span>
                <input
                  className="imgedit-range"
                  type="range"
                  min={2}
                  max={36}
                  step={1}
                  value={props.asciiCellSize}
                  onInput={(e: any) => { const v = Number(e.target.value); props.asciiCellSizeRef.current = v; props.setAsciiCellSize(v); scheduleDraw(); }}
                  style={{ flex: 1, maxWidth: 180, background: rangeBg(props.asciiCellSize, 2, 36, '#1f2937', '#f59e0b') }}
                  aria-label="ASCII cell size"
                />
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ width: 80, fontSize: 12, opacity: 0.8 }}>Charset</span>
                <input
                  type="text"
                  value={props.asciiCharset}
                  onChange={(e) => { const v = e.target.value; props.asciiCharsetRef.current = v; props.setAsciiCharset(v); scheduleDraw(); }}
                  placeholder="Charset e.g. @%#*+=-:. "
                  style={{ flex: 1, maxWidth: 180, padding: '4px 6px', borderRadius: 6, border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)', background: 'var(--bg-elev)', color: 'var(--text)', fontSize: 12 }}
                  aria-label="ASCII charset"
                />
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ width: 80, fontSize: 12, opacity: 0.8 }}>Preset</span>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1, alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const preset = 'custom';
                      props.setAsciiCharsetPreset && props.setAsciiCharsetPreset(preset);
                      let set = ' .:-=+*#%@';
                      props.asciiCharsetRef.current = set;
                      props.setAsciiCharset(set);
                      scheduleDraw();
                    }}
                    style={{
                      padding: '2px 4px',
                      borderRadius: 4,
                      border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
                      background: (props.asciiCharsetPreset ?? 'custom') === 'custom' ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)',
                      color: 'var(--text)',
                      fontSize: 9,
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'background 0.2s ease',
                      flexShrink: 0
                    }}
                    aria-label="ASCII preset: Custom"
                  >
                    Custom
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const preset = 'dense';
                      props.setAsciiCharsetPreset && props.setAsciiCharsetPreset(preset);
                      let set = '@%#*+=-:.ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                      props.asciiCharsetRef.current = set;
                      props.setAsciiCharset(set);
                      scheduleDraw();
                    }}
                    style={{
                      padding: '2px 4px',
                      borderRadius: 4,
                      border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
                      background: props.asciiCharsetPreset === 'dense' ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)',
                      color: 'var(--text)',
                      fontSize: 9,
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'background 0.2s ease',
                      flexShrink: 0
                    }}
                    aria-label="ASCII preset: Dense"
                  >
                    Dense
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const preset = 'sparse';
                      props.setAsciiCharsetPreset && props.setAsciiCharsetPreset(preset);
                      let set = '@%#*:. ';
                      props.asciiCharsetRef.current = set;
                      props.setAsciiCharset(set);
                      scheduleDraw();
                    }}
                    style={{
                      padding: '2px 4px',
                      borderRadius: 4,
                      border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
                      background: props.asciiCharsetPreset === 'sparse' ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)',
                      color: 'var(--text)',
                      fontSize: 9,
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'background 0.2s ease',
                      flexShrink: 0
                    }}
                    aria-label="ASCII preset: Sparse"
                  >
                    Sparse
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const preset = 'dots';
                      props.setAsciiCharsetPreset && props.setAsciiCharsetPreset(preset);
                      let set = '●◉○· ';
                      props.asciiCharsetRef.current = set;
                      props.setAsciiCharset(set);
                      scheduleDraw();
                    }}
                    style={{
                      padding: '2px 4px',
                      borderRadius: 4,
                      border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
                      background: props.asciiCharsetPreset === 'dots' ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)',
                      color: 'var(--text)',
                      fontSize: 9,
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'background 0.2s ease',
                      flexShrink: 0
                    }}
                    aria-label="ASCII preset: Dots"
                  >
                    Dots
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const preset = 'blocks';
                      props.setAsciiCharsetPreset && props.setAsciiCharsetPreset(preset);
                      let set = '█▓▒░ ';
                      props.asciiCharsetRef.current = set;
                      props.setAsciiCharset(set);
                      scheduleDraw();
                    }}
                    style={{
                      padding: '2px 4px',
                      borderRadius: 4,
                      border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
                      background: props.asciiCharsetPreset === 'blocks' ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)',
                      color: 'var(--text)',
                      fontSize: 9,
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'background 0.2s ease',
                      flexShrink: 0
                    }}
                    aria-label="ASCII preset: Blocks"
                  >
                    Blocks
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const preset = 'lines';
                      props.setAsciiCharsetPreset && props.setAsciiCharsetPreset(preset);
                      let set = '│─┼┌┐└┘';
                      props.asciiCharsetRef.current = set;
                      props.setAsciiCharset(set);
                      scheduleDraw();
                    }}
                    style={{
                      padding: '2px 4px',
                      borderRadius: 4,
                      border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
                      background: props.asciiCharsetPreset === 'lines' ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)',
                      color: 'var(--text)',
                      fontSize: 9,
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'background 0.2s ease',
                      flexShrink: 0
                    }}
                    aria-label="ASCII preset: Lines"
                  >
                    Lines
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const preset = 'numbers';
                      props.setAsciiCharsetPreset && props.setAsciiCharsetPreset(preset);
                      let set = '0123456789';
                      props.asciiCharsetRef.current = set;
                      props.setAsciiCharset(set);
                      scheduleDraw();
                    }}
                    style={{
                      padding: '2px 4px',
                      borderRadius: 4,
                      border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
                      background: props.asciiCharsetPreset === 'numbers' ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)',
                      color: 'var(--text)',
                      fontSize: 9,
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'background 0.2s ease',
                      flexShrink: 0
                    }}
                    aria-label="ASCII preset: Numbers"
                  >
                    Numbers
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const preset = 'letters';
                      props.setAsciiCharsetPreset && props.setAsciiCharsetPreset(preset);
                      let set = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                      props.asciiCharsetRef.current = set;
                      props.setAsciiCharset(set);
                      scheduleDraw();
                    }}
                    style={{
                      padding: '2px 4px',
                      borderRadius: 4,
                      border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
                      background: props.asciiCharsetPreset === 'letters' ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)',
                      color: 'var(--text)',
                      fontSize: 9,
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'background 0.2s ease',
                      flexShrink: 0
                    }}
                    aria-label="ASCII preset: Letters"
                  >
                    Letters
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ width: 80, fontSize: 12, opacity: 0.8 }}>Invert</span>
                <button
                  type="button"
                  onClick={() => {
                    const v = !props.asciiInvert;
                    props.asciiInvertRef.current = v;
                    props.setAsciiInvert(v);
                    scheduleDraw();
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
                    background: props.asciiInvert ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)',
                    color: 'var(--text)',
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'background 0.2s ease',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  aria-label={`ASCII invert: ${props.asciiInvert ? 'On' : 'Off'}`}
                >
                  <Contrast
                    size={16}
                    strokeWidth={2}
                    style={{
                      color: props.asciiInvert ? '#ff6b6b' : 'var(--text)',
                      fill: 'none'
                    }}
                    aria-hidden
                  />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}