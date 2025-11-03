import React, { useMemo } from 'react';
import { Wand2, Contrast, Palette } from 'lucide-react';
import { rangeBg } from '../utils';
import { throttle } from '@/src/lib/utils';

interface DitherPanelProps {
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
  draw: (overrides?: any) => void;
  resetControlToDefault?: (control: string) => void;
  ditherEnabled: boolean;
  anyEnabled: boolean;
  onToggleEnabled: (enabled: boolean) => void;
}

export default function DitherPanel(props: DitherPanelProps) {
  const scheduleDraw = useMemo(() => throttle(() => props.draw(), 80), [props.draw]);

  return (
    <>
      {(!props.anyEnabled || props.ditherEnabled) && (
        <div style={{ display: 'grid', gap: 4 }}>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ width: 80, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
              <Wand2 size={18} strokeWidth={2} aria-hidden />
              <span>Dithering</span>
            </span>
            <input
              type="checkbox"
              checked={props.ditherEnabled}
              onChange={(e) => props.onToggleEnabled(e.target.checked)}
              aria-label="Enable dithering"
            />
          </label>
          {props.ditherEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {props.ditherMethod !== 'none' && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 2, borderRadius: 6, border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)', overflow: 'hidden' }}>
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
                        background: props.ditherColorMode === 'bw' ? 'color-mix(in srgb, var(--primary) 15%, transparent)' : 'var(--bg-elev)',
                        color: 'var(--text)',
                        fontSize: 11,
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'background 0.2s ease',
                        border: 'none',
                        borderRight: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      aria-label="Toggle dither mode to Black & White"
                    >
                      <Contrast size={16} strokeWidth={2} />
                    </button>
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
                        background: props.ditherColorMode === 'color' ? 'color-mix(in srgb, var(--primary) 15%, transparent)' : 'var(--bg-elev)',
                        color: 'var(--text)',
                        fontSize: 11,
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'background 0.2s ease',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      aria-label="Toggle dither mode to Color"
                    >
                      <Palette size={16} strokeWidth={2} />
                    </button>
                  </div>
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
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text)', minWidth: 20, textAlign: 'center' }}>
                    {props.ditherLevels}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
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
              {props.ditherMethod !== 'none' && props.ditherColorMode === 'color' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
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
        </div>
      )}
    </>
  );
}