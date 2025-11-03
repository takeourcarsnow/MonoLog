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
  ditherPalette?: 'auto' | 'websafe' | 'cga16' | 'ega64';
  setDitherPalette?: (v: 'auto' | 'websafe' | 'cga16' | 'ega64') => void;
  ditherPaletteRef?: React.MutableRefObject<'auto' | 'websafe' | 'cga16' | 'ega64'>;
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
          <option value="floyd-steinberg">Floyd–Steinberg</option>
          <option value="ordered">Ordered (Bayer 4x4)</option>
          <option value="bayer8">Ordered (Bayer 8x8)</option>
          <option value="atkinson">Atkinson</option>
          <option value="burkes">Burkes</option>
          <option value="stucki">Stucki</option>
          <option value="sierra">Sierra</option>
          <option value="jjn">Jarvis–Judice–Ninke</option>
        </select>
        <div style={{ flex: 1, minWidth: 220, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, opacity: 0.8, width: 60 }}>Levels</span>
          <input
            className="imgedit-range"
            type="range"
            min={2}
            max={32}
            step={1}
            value={props.ditherLevels}
            onInput={(e: any) => { const v = Number(e.target.value); props.ditherLevelsRef.current = v; props.setDitherLevels(v); requestAnimationFrame(() => props.draw()); }}
            style={{ flex: 1, background: rangeBg(props.ditherLevels, 2, 32, '#0f172a', '#a78bfa') }}
            aria-label="Dither levels"
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, opacity: 0.8 }}>Mode</span>
          <select
            value={props.ditherColorMode}
            onChange={(e) => { const v = e.target.value as any; props.ditherColorModeRef && (props.ditherColorModeRef.current = v); props.setDitherColorMode && props.setDitherColorMode(v); requestAnimationFrame(() => props.draw()); }}
            style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)', background: 'var(--bg-elev)', color: 'var(--text)' }}
            aria-label="Dither mode"
          >
            <option value="bw">B/W</option>
            <option value="color">Color</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, opacity: 0.8 }}>Palette</span>
          <select
            value={props.ditherPalette}
            onChange={(e) => { const v = e.target.value as any; props.ditherPaletteRef && (props.ditherPaletteRef.current = v); props.setDitherPalette && props.setDitherPalette(v); requestAnimationFrame(() => props.draw()); }}
            style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)', background: 'var(--bg-elev)', color: 'var(--text)' }}
            aria-label="Dither palette"
          >
            <option value="auto">Auto</option>
            <option value="websafe">Web-safe</option>
            <option value="cga16">CGA 16</option>
            <option value="ega64">EGA 64</option>
          </select>
        </div>
        <input
          type="text"
          placeholder="#ff0000,#00ff00,#0000ff"
          value={props.ditherCustomPalette ?? ''}
          onChange={(e) => { const v = e.target.value; props.ditherCustomPaletteRef && (props.ditherCustomPaletteRef.current = v); props.setDitherCustomPalette && props.setDitherCustomPalette(v); requestAnimationFrame(() => props.draw()); }}
          aria-label="Custom palette (comma-separated hex)"
          style={{ flex: 1, minWidth: 200, padding: '6px 8px', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)', background: 'var(--bg-elev)', color: 'var(--text)' }}
        />
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
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', opacity: props.asciiEnabled ? 1 : 0.5 }}>
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
            disabled={!props.asciiEnabled}
          />
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', opacity: props.asciiEnabled ? 1 : 0.5 }}>
          <span style={{ width: 140 }} />
          <input
            type="text"
            value={props.asciiCharset}
            onChange={(e) => { const v = e.target.value; props.asciiCharsetRef.current = v; props.setAsciiCharset(v); requestAnimationFrame(() => props.draw()); }}
            placeholder="Charset e.g. @%#*+=-:. "
            style={{ flex: 1, padding: '6px 8px', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)', background: 'var(--bg-elev)', color: 'var(--text)' }}
            aria-label="ASCII charset"
            disabled={!props.asciiEnabled}
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
            disabled={!props.asciiEnabled}
            style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)', background: 'var(--bg-elev)', color: 'var(--text)' }}
          >
            <option value="custom">Custom</option>
            <option value="dense">Dense</option>
            <option value="medium">Medium</option>
            <option value="sparse">Sparse</option>
            <option value="blocks">Blocks</option>
            <option value="dots">Dots</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', opacity: props.asciiEnabled ? 1 : 0.5 }}>
          <span style={{ width: 140 }} />
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={props.asciiInvert} onChange={(e) => { const v = e.target.checked; props.asciiInvertRef.current = v; props.setAsciiInvert(v); requestAnimationFrame(() => props.draw()); }} disabled={!props.asciiEnabled} />
            <span style={{ fontSize: 13 }}>Invert</span>
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={props.asciiColor} onChange={(e) => { const v = e.target.checked; props.asciiColorRef.current = v; props.setAsciiColor(v); requestAnimationFrame(() => props.draw()); }} disabled={!props.asciiEnabled} />
            <span style={{ fontSize: 13 }}>Color</span>
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={props.asciiBold ?? false} onChange={(e) => { const v = e.target.checked; props.asciiBoldRef && (props.asciiBoldRef.current = v); props.setAsciiBold && props.setAsciiBold(v); requestAnimationFrame(() => props.draw()); }} disabled={!props.asciiEnabled} />
            <span style={{ fontSize: 13 }}>Bold</span>
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>Edge</span>
            <select value={props.asciiEdge ?? 'none'} onChange={(e) => { const v = e.target.value as any; props.asciiEdgeRef && (props.asciiEdgeRef.current = v); props.setAsciiEdge && props.setAsciiEdge(v); requestAnimationFrame(() => props.draw()); }} disabled={!props.asciiEnabled} style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)', background: 'var(--bg-elev)', color: 'var(--text)' }}>
              <option value="none">None</option>
              <option value="stroke">Stroke</option>
            </select>
          </label>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', opacity: props.asciiEnabled ? 1 : 0.5, flexWrap: 'wrap' }}>
          <span style={{ width: 140 }} />
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>Opacity</span>
            <input className="imgedit-range" type="range" min={0} max={1} step={0.05} value={props.asciiOpacity ?? 1} onInput={(e: any) => { const v = Number(e.target.value); props.asciiOpacityRef && (props.asciiOpacityRef.current = v); props.setAsciiOpacity && props.setAsciiOpacity(v); requestAnimationFrame(() => props.draw()); }} disabled={!props.asciiEnabled} style={{ width: 160, background: rangeBg(props.asciiOpacity ?? 1, 0, 1, '#1f2937', '#10b981') }} />
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>Gamma</span>
            <input className="imgedit-range" type="range" min={0.5} max={2.5} step={0.1} value={props.asciiGamma ?? 1} onInput={(e: any) => { const v = Number(e.target.value); props.asciiGammaRef && (props.asciiGammaRef.current = v); props.setAsciiGamma && props.setAsciiGamma(v); requestAnimationFrame(() => props.draw()); }} disabled={!props.asciiEnabled} style={{ width: 160, background: rangeBg(props.asciiGamma ?? 1, 0.5, 2.5, '#1f2937', '#06b6d4') }} />
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flex: '1 1 220px' }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>Font</span>
            <input type="text" value={props.asciiFont ?? 'monospace'} onChange={(e) => { const v = e.target.value; props.asciiFontRef && (props.asciiFontRef.current = v); props.setAsciiFont && props.setAsciiFont(v); requestAnimationFrame(() => props.draw()); }} disabled={!props.asciiEnabled} style={{ flex: 1, minWidth: 140, padding: '6px 8px', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)', background: 'var(--bg-elev)', color: 'var(--text)' }} />
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flex: '1 1 220px' }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>Background</span>
            <input type="text" placeholder="transparent or #000" value={props.asciiBackground ?? 'transparent'} onChange={(e) => { const v = e.target.value; props.asciiBackgroundRef && (props.asciiBackgroundRef.current = v); props.setAsciiBackground && props.setAsciiBackground(v); requestAnimationFrame(() => props.draw()); }} disabled={!props.asciiEnabled} style={{ flex: 1, minWidth: 140, padding: '6px 8px', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)', background: 'var(--bg-elev)', color: 'var(--text)' }} />
          </label>
        </div>

        {/* Pixel options */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <span style={{ width: 140 }} />
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>Pixel Shape</span>
            <select value={props.pixelShape ?? 'square'} onChange={(e) => { const v = e.target.value as any; props.pixelShapeRef && (props.pixelShapeRef.current = v); props.setPixelShape && props.setPixelShape(v); requestAnimationFrame(() => props.draw()); }} style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)', background: 'var(--bg-elev)', color: 'var(--text)' }}>
              <option value="square">Square</option>
              <option value="circle">Circle</option>
            </select>
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>Sample</span>
            <select value={props.pixelSample ?? 'average'} onChange={(e) => { const v = e.target.value as any; props.pixelSampleRef && (props.pixelSampleRef.current = v); props.setPixelSample && props.setPixelSample(v); requestAnimationFrame(() => props.draw()); }} style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)', background: 'var(--bg-elev)', color: 'var(--text)' }}>
              <option value="average">Average</option>
              <option value="nearest">Nearest</option>
            </select>
          </label>
        </div>
      </div>
    </section>
  );
}
