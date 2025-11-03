import React, { useMemo } from 'react';
import { Wand2, Grid, Type, Palette, Contrast } from 'lucide-react';
import { rangeBg } from '../utils';
import { throttle } from '@/src/lib/utils';

interface SpecialPanelProps {
  // Dither
  ditherMethod: 'none' | 'floyd-steinberg' | 'ordered' | 'atkinson' | 'burkes';
  setDitherMethod: (v: 'none' | 'floyd-steinberg' | 'ordered' | 'atkinson' | 'burkes') => void;
  ditherMethodRef: React.MutableRefObject<'none' | 'floyd-steinberg' | 'ordered' | 'atkinson' | 'burkes'>;
  ditherLevels: number;
  setDitherLevels: (v: number) => void;
  ditherLevelsRef: React.MutableRefObject<number>;
  ditherColorMode?: 'bw' | 'color';
  setDitherColorMode?: (v: 'bw' | 'color') => void;
  ditherColorModeRef?: React.MutableRefObject<'bw' | 'color'>;
  ditherPalette?: 'auto' | 'gameboy' | 'pico8' | 'nes' | 'zx_spectrum' | 'atari_2600' | 'commodore64' | 'apple_ii';
  setDitherPalette?: (v: 'auto' | 'gameboy' | 'pico8' | 'nes' | 'zx_spectrum' | 'atari_2600' | 'commodore64' | 'apple_ii') => void;
  ditherPaletteRef?: React.MutableRefObject<'auto' | 'gameboy' | 'pico8' | 'nes' | 'zx_spectrum' | 'atari_2600' | 'commodore64' | 'apple_ii'>;
  ditherCustomPalette?: string;
  setDitherCustomPalette?: (v: string) => void;
  ditherCustomPaletteRef?: React.MutableRefObject<string>;
  // Pixelate
  pixelSize: number;
  setPixelSize: (v: number) => void;
  pixelSizeRef: React.MutableRefObject<number>;
  pixelShape?: 'square' | 'circle';
  setPixelShape?: (v: 'square' | 'circle') => void;
  pixelShapeRef?: React.MutableRefObject<'square' | 'circle'>;
  pixelSample?: 'average' | 'nearest';
  setPixelSample?: (v: 'average' | 'nearest') => void;
  pixelSampleRef?: React.MutableRefObject<'average' | 'nearest'>;
  // ASCII
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
  // shared
  draw: (overrides?: any) => void;
  resetControlToDefault?: (control: string) => void;
}

export default function SpecialPanel(props: SpecialPanelProps) {
  // Throttle heavy redraws (particularly dithering/pixelate/ASCII) to avoid pegging CPU on mobile while dragging
  const scheduleDraw = useMemo(() => throttle(() => props.draw(), 80), [props]);

  const pixelateEnabled = props.pixelSize > 1;
  const ditherEnabled = props.ditherMethod !== 'none';
  const asciiEnabled = props.asciiEnabled;
  const anyEnabled = pixelateEnabled || ditherEnabled || asciiEnabled;

  return (
    <section className="imgedit-panel-inner" style={{ display: 'grid', width: '100%', gap: 8 }}>
      {/* Pixelate */}
      {(!anyEnabled || pixelateEnabled) && (
        <label style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <span style={{ width: 140, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
            <Grid size={18} strokeWidth={2} aria-hidden />
            <span>Pixelate</span>
          </span>
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
            style={{ flex: 1, background: rangeBg(props.pixelSize, 1, 100, '#334155', '#38bdf8') }}
            aria-label="Pixel size"
          />
        </label>
      )}

      {/* Dithering */}
      {(!anyEnabled || ditherEnabled) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ width: 140, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
            <Wand2 size={18} strokeWidth={2} aria-hidden />
            <span>Dithering</span>
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {props.ditherMethod !== 'none' && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    const v = props.ditherColorMode === 'bw' ? 'color' : 'bw';
                    props.ditherColorModeRef && (props.ditherColorModeRef.current = v);
                    props.setDitherColorMode && props.setDitherColorMode(v);
                    scheduleDraw();
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
                    background: props.ditherColorMode === 'bw' ? 'var(--bg-elev)' : 'color-mix(in srgb, var(--primary) 10%, transparent)',
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
                  aria-label={`Dither mode: ${props.ditherColorMode === 'bw' ? 'B/W' : 'Color'}`}
                >
                  <Palette 
                    size={16} 
                    strokeWidth={2} 
                    style={{ 
                      color: props.ditherColorMode === 'color' ? '#ff6b6b' : 'var(--text)',
                      fill: 'none'
                    }} 
                    aria-hidden 
                  />
                </button>
                <input
                  className="imgedit-range"
                  type="range"
                  min={3}
                  max={31}
                  step={1}
                  value={props.ditherLevels}
                  onInput={(e: any) => { const v = Number(e.target.value); props.ditherLevelsRef.current = v; props.setDitherLevels(v); scheduleDraw(); }}
                  onDoubleClick={() => props.resetControlToDefault && props.resetControlToDefault('ditherLevels')}
                  style={{ flex: 1, minWidth: 120, background: rangeBg(props.ditherLevels, 3, 31, '#0f172a', '#a78bfa') }}
                  aria-label="Dither levels"
                />
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  props.ditherMethodRef.current = 'none';
                  props.setDitherMethod('none');
                  scheduleDraw();
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
                  background: props.ditherMethod === 'none' ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)',
                  color: 'var(--text)',
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
                aria-label="Dither method: Off"
              >
                Off
              </button>
              <button
                type="button"
                disabled={props.ditherPalette === 'gameboy'}
                onClick={() => {
                  if (props.ditherPalette !== 'gameboy') {
                    props.ditherMethodRef.current = 'floyd-steinberg';
                    props.setDitherMethod('floyd-steinberg');
                    scheduleDraw();
                  }
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
                  background: props.ditherMethod === 'floyd-steinberg' ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)',
                  color: props.ditherPalette === 'gameboy' ? 'color-mix(in srgb, var(--text) 50%, transparent)' : 'var(--text)',
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: props.ditherPalette === 'gameboy' ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s ease'
                }}
                aria-label="Dither method: Floyd"
              >
                Floyd
              </button>
              <button
                type="button"
                onClick={() => {
                  props.ditherMethodRef.current = 'ordered';
                  props.setDitherMethod('ordered');
                  scheduleDraw();
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
                  background: props.ditherMethod === 'ordered' ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)',
                  color: 'var(--text)',
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
                aria-label="Dither method: Ordered (Bayer 4x4)"
              >
                Ordered
              </button>
              <button
                type="button"
                onClick={() => {
                  props.ditherMethodRef.current = 'atkinson';
                  props.setDitherMethod('atkinson');
                  scheduleDraw();
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
                  background: props.ditherMethod === 'atkinson' ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)',
                  color: 'var(--text)',
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
                aria-label="Dither method: Atkinson"
              >
                Atkinson
              </button>
              <button
                type="button"
                disabled={props.ditherPalette === 'gameboy'}
                onClick={() => {
                  if (props.ditherPalette !== 'gameboy') {
                    props.ditherMethodRef.current = 'burkes';
                    props.setDitherMethod('burkes');
                    scheduleDraw();
                  }
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
                  background: props.ditherMethod === 'burkes' ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)',
                  color: props.ditherPalette === 'gameboy' ? 'color-mix(in srgb, var(--text) 50%, transparent)' : 'var(--text)',
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: props.ditherPalette === 'gameboy' ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s ease'
                }}
                aria-label="Dither method: Burkes"
              >
                Burkes
              </button>
            </div>
          </div>
          {props.ditherMethod !== 'none' && props.ditherColorMode === 'color' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, opacity: 0.8 }}>Palette</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    const v = 'auto';
                    props.ditherPaletteRef && (props.ditherPaletteRef.current = v);
                    props.setDitherPalette && props.setDitherPalette(v);
                    scheduleDraw();
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
                    background: props.ditherPalette === 'auto' ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)',
                    color: 'var(--text)',
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                  aria-label="Dither palette: Auto"
                >
                  Auto
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const v = 'gameboy';
                    props.ditherPaletteRef && (props.ditherPaletteRef.current = v);
                    props.setDitherPalette && props.setDitherPalette(v);
                    // If switching to gameboy and current method is not ordered or atkinson, set to ordered
                    if (!['ordered', 'atkinson'].includes(props.ditherMethod)) {
                      props.ditherMethodRef.current = 'ordered';
                      props.setDitherMethod('ordered');
                    }
                    scheduleDraw();
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
                    background: props.ditherPalette === 'gameboy' ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)',
                    color: 'var(--text)',
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                  aria-label="Dither palette: Game Boy"
                >
                  Game Boy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const v = 'pico8';
                    props.ditherPaletteRef && (props.ditherPaletteRef.current = v);
                    props.setDitherPalette && props.setDitherPalette(v);
                    scheduleDraw();
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
                    background: props.ditherPalette === 'pico8' ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)',
                    color: 'var(--text)',
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                  aria-label="Dither palette: PICO-8"
                >
                  PICO-8
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const v = 'nes';
                    props.ditherPaletteRef && (props.ditherPaletteRef.current = v);
                    props.setDitherPalette && props.setDitherPalette(v);
                    scheduleDraw();
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
                    background: props.ditherPalette === 'nes' ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)',
                    color: 'var(--text)',
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                  aria-label="Dither palette: NES"
                >
                  NES
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const v = 'zx_spectrum';
                    props.ditherPaletteRef && (props.ditherPaletteRef.current = v);
                    props.setDitherPalette && props.setDitherPalette(v);
                    scheduleDraw();
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
                    background: props.ditherPalette === 'zx_spectrum' ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)',
                    color: 'var(--text)',
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                  aria-label="Dither palette: ZX Spectrum"
                >
                  ZX
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const v = 'atari_2600';
                    props.ditherPaletteRef && (props.ditherPaletteRef.current = v);
                    props.setDitherPalette && props.setDitherPalette(v);
                    scheduleDraw();
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
                    background: props.ditherPalette === 'atari_2600' ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)',
                    color: 'var(--text)',
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                  aria-label="Dither palette: Atari 2600"
                >
                  Atari 2600
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const v = 'commodore64';
                    props.ditherPaletteRef && (props.ditherPaletteRef.current = v);
                    props.setDitherPalette && props.setDitherPalette(v);
                    scheduleDraw();
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
                    background: props.ditherPalette === 'commodore64' ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)',
                    color: 'var(--text)',
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                  aria-label="Dither palette: Commodore 64"
                >
                  C64
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const v = 'apple_ii';
                    props.ditherPaletteRef && (props.ditherPaletteRef.current = v);
                    props.setDitherPalette && props.setDitherPalette(v);
                    scheduleDraw();
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
                    background: props.ditherPalette === 'apple_ii' ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)',
                    color: 'var(--text)',
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                  aria-label="Dither palette: Apple II"
                >
                  Apple II
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ASCII */}
      {(!anyEnabled || asciiEnabled) && (
        <div style={{ display: 'grid', gap: 4 }}>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ width: 100, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
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
                <span style={{ width: 100, fontSize: 12, opacity: 0.8 }}>Cell Size</span>
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
                <span style={{ width: 100, fontSize: 12, opacity: 0.8 }}>Charset</span>
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
                <span style={{ width: 100, fontSize: 12, opacity: 0.8 }}>Preset</span>
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
                <span style={{ width: 100, fontSize: 12, opacity: 0.8 }}>Invert</span>
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
    </section>
  );
}
