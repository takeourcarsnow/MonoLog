import React from 'react';
import { Wand2, Grid, Type } from 'lucide-react';
import { rangeBg } from '../utils';

interface SpecialPanelProps {
  // Dither
  ditherMethod: 'none' | 'floyd-steinberg' | 'ordered' | 'bayer8' | 'atkinson' | 'burkes' | 'stucki' | 'sierra' | 'jjn';
  setDitherMethod: (v: 'none' | 'floyd-steinberg' | 'ordered' | 'bayer8' | 'atkinson' | 'burkes' | 'stucki' | 'sierra' | 'jjn') => void;
  ditherMethodRef: React.MutableRefObject<'none' | 'floyd-steinberg' | 'ordered' | 'bayer8' | 'atkinson' | 'burkes' | 'stucki' | 'sierra' | 'jjn'>;
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
  asciiCharsetPreset?: 'custom' | 'dense' | 'medium' | 'sparse' | 'blocks' | 'dots';
  setAsciiCharsetPreset?: (v: 'custom' | 'dense' | 'medium' | 'sparse' | 'blocks' | 'dots') => void;
  // shared
  draw: (overrides?: any) => void;
  resetControlToDefault?: (control: string) => void;
}

export default function SpecialPanel(props: SpecialPanelProps) {
  return (
    <section className="imgedit-panel-inner" style={{ display: 'grid', width: '100%', gap: 8 }}>
      {/* Pixelate */}
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
            requestAnimationFrame(() => props.draw());
          }}
          style={{ flex: 1, background: rangeBg(props.pixelSize, 1, 100, '#334155', '#38bdf8') }}
          aria-label="Pixel size"
        />
      </label>

      {/* Dithering */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ width: 140, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
          <Wand2 size={18} strokeWidth={2} aria-hidden />
          <span>Dithering</span>
        </span>
        <select
          value={props.ditherMethod}
          onChange={(e) => { const v = e.target.value as any; props.ditherMethodRef.current = v; props.setDitherMethod(v); requestAnimationFrame(() => props.draw()); }}
          style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)', background: 'var(--bg-elev)', color: 'var(--text)' }}
          aria-label="Dither method"
        >
          <option value="none">Off</option>
          {props.ditherPalette === 'gameboy' ? (
            <>
              <option value="ordered">Ordered (Bayer 4x4)</option>
              <option value="atkinson">Atkinson</option>
            </>
          ) : (
            <>
              <option value="floyd-steinberg">Floyd–Steinberg</option>
              <option value="ordered">Ordered (Bayer 4x4)</option>
              <option value="bayer8">Ordered (Bayer 8x8)</option>
              <option value="atkinson">Atkinson</option>
              <option value="burkes">Burkes</option>
              <option value="stucki">Stucki</option>
              <option value="sierra">Sierra</option>
              <option value="jjn">Jarvis–Judice–Ninke</option>
            </>
          )}
        </select>
        {props.ditherMethod !== 'none' && (
          <>
            <div style={{ flex: 1, minWidth: 220, display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                className="imgedit-range"
                type="range"
                min={3}
                max={31}
                step={1}
                value={props.ditherLevels}
                onInput={(e: any) => { const v = Number(e.target.value); props.ditherLevelsRef.current = v; props.setDitherLevels(v); requestAnimationFrame(() => props.draw()); }}
                onDoubleClick={() => props.resetControlToDefault && props.resetControlToDefault('ditherLevels')}
                style={{ flex: 1, background: rangeBg(props.ditherLevels, 3, 31, '#0f172a', '#a78bfa') }}
                aria-label="Dither levels"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, opacity: 0.8 }}>Mode</span>
              <button
                type="button"
                onClick={() => {
                  const v = props.ditherColorMode === 'bw' ? 'color' : 'bw';
                  props.ditherColorModeRef && (props.ditherColorModeRef.current = v);
                  props.setDitherColorMode && props.setDitherColorMode(v);
                  requestAnimationFrame(() => props.draw());
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
                  background: props.ditherColorMode === 'bw' ? 'var(--bg-elev)' : 'color-mix(in srgb, var(--primary) 10%, transparent)',
                  color: 'var(--text)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
                aria-label={`Dither mode: ${props.ditherColorMode === 'bw' ? 'B/W' : 'Color'}`}
              >
                {props.ditherColorMode === 'bw' ? 'B/W' : 'Color'}
              </button>
            </div>
            {props.ditherColorMode === 'color' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>Palette</span>
                <select
                  value={props.ditherPalette}
                  onChange={(e) => { 
                    const v = e.target.value as any; 
                    props.ditherPaletteRef && (props.ditherPaletteRef.current = v); 
                    props.setDitherPalette && props.setDitherPalette(v); 
                    // If switching to gameboy and current method is not ordered or atkinson, set to ordered
                    if (v === 'gameboy' && !['ordered', 'atkinson'].includes(props.ditherMethod)) {
                      props.ditherMethodRef.current = 'ordered';
                      props.setDitherMethod('ordered');
                    }
                    requestAnimationFrame(() => props.draw()); 
                  }}
                  style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)', background: 'var(--bg-elev)', color: 'var(--text)' }}
                  aria-label="Dither palette"
                >
                  <option value="auto">Auto</option>
                  <option value="gameboy">Game Boy</option>
                  <option value="pico8">PICO-8</option>
                  <option value="nes">NES</option>
                  <option value="zx_spectrum">ZX Spectrum</option>
                  <option value="atari_2600">Atari 2600</option>
                  <option value="commodore64">Commodore 64</option>
                  <option value="apple_ii">Apple II</option>
                </select>
              </div>
            )}
          </>
        )}
      </div>

      {/* ASCII */}
      <div style={{ display: 'grid', gap: 8 }}>
        <label style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <span style={{ width: 140, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
            <Type size={18} strokeWidth={2} aria-hidden />
            <span>ASCII Art</span>
          </span>
          <input
            type="checkbox"
            checked={props.asciiEnabled}
            onChange={(e) => { const v = e.target.checked; props.asciiEnabledRef.current = v; props.setAsciiEnabled(v); requestAnimationFrame(() => props.draw()); }}
            aria-label="Enable ASCII art"
          />
        </label>
        {props.asciiEnabled && (
          <>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span style={{ width: 140 }} />
              <span style={{ fontSize: 12, opacity: 0.8, width: 60 }}>Cell</span>
              <input
                className="imgedit-range"
                type="range"
                min={2}
                max={36}
                step={1}
                value={props.asciiCellSize}
                onInput={(e: any) => { const v = Number(e.target.value); props.asciiCellSizeRef.current = v; props.setAsciiCellSize(v); requestAnimationFrame(() => props.draw()); }}
                style={{ flex: 1, background: rangeBg(props.asciiCellSize, 2, 36, '#1f2937', '#f59e0b') }}
                aria-label="ASCII cell size"
              />
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span style={{ width: 140 }} />
              <input
                type="text"
                value={props.asciiCharset}
                onChange={(e) => { const v = e.target.value; props.asciiCharsetRef.current = v; props.setAsciiCharset(v); requestAnimationFrame(() => props.draw()); }}
                placeholder="Charset e.g. @%#*+=-:. "
                style={{ flex: 1, padding: '6px 8px', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)', background: 'var(--bg-elev)', color: 'var(--text)' }}
                aria-label="ASCII charset"
              />
              <select
                value={props.asciiCharsetPreset ?? 'custom'}
                onChange={(e) => {
                  const preset = e.target.value as any;
                  props.setAsciiCharsetPreset && props.setAsciiCharsetPreset(preset);
                  let set = props.asciiCharset;
                  if (preset === 'dense') set = '@%#*+=-:. ';
                  if (preset === 'medium') set = '#&@%$*+=-:. ';
                  if (preset === 'sparse') set = '@%#*:. ';
                  if (preset === 'blocks') set = '█▓▒░ ';
                  if (preset === 'dots') set = '●◉○· ';
                  props.asciiCharsetRef.current = set;
                  props.setAsciiCharset(set);
                  requestAnimationFrame(() => props.draw());
                }}
                style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)', background: 'var(--bg-elev)', color: 'var(--text)' }}
              >
                <option value="custom">Custom</option>
                <option value="dense">Dense</option>
                <option value="medium">Medium</option>
                <option value="sparse">Sparse</option>
                <option value="blocks">Blocks</option>
                <option value="dots">Dots</option>
              </select>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={props.asciiInvert} onChange={(e) => { const v = e.target.checked; props.asciiInvertRef.current = v; props.setAsciiInvert(v); requestAnimationFrame(() => props.draw()); }} />
                <span style={{ fontSize: 13 }}>Invert</span>
              </label>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
