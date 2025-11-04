import React from 'react';

interface DitherPaletteSelectorProps {
  ditherMethod: 'none' | 'floyd-steinberg' | 'ordered' | 'atkinson' | 'burkes';
  setDitherMethod: (v: 'none' | 'floyd-steinberg' | 'ordered' | 'atkinson' | 'burkes') => void;
  ditherMethodRef: React.MutableRefObject<'none' | 'floyd-steinberg' | 'ordered' | 'atkinson' | 'burkes'>;
  ditherColorMode?: 'bw' | 'color';
  ditherPalette?: 'auto' | 'gameboy' | 'pico8' | 'nes' | 'zx_spectrum' | 'atari_2600' | 'commodore64' | 'apple_ii';
  setDitherPalette?: (v: 'auto' | 'gameboy' | 'pico8' | 'nes' | 'zx_spectrum' | 'atari_2600' | 'commodore64' | 'apple_ii') => void;
  ditherPaletteRef?: React.MutableRefObject<'auto' | 'gameboy' | 'pico8' | 'nes' | 'zx_spectrum' | 'atari_2600' | 'commodore64' | 'apple_ii'>;
  scheduleDraw: () => void;
}

export default function DitherPaletteSelector({
  ditherMethod,
  setDitherMethod,
  ditherMethodRef,
  ditherColorMode,
  ditherPalette,
  setDitherPalette,
  ditherPaletteRef,
  scheduleDraw,
}: DitherPaletteSelectorProps) {
  if (ditherMethod === 'none' || ditherColorMode !== 'color') return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={() => {
            const v = 'auto';
            ditherPaletteRef && (ditherPaletteRef.current = v);
            setDitherPalette && setDitherPalette(v);
            scheduleDraw();
          }}
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
            background: ditherPalette === 'auto' ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)',
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
            ditherPaletteRef && (ditherPaletteRef.current = v);
            setDitherPalette && setDitherPalette(v);
            // If switching to gameboy and current method is not ordered or atkinson, set to ordered
            if (!['ordered', 'atkinson'].includes(ditherMethod)) {
              ditherMethodRef.current = 'ordered';
              setDitherMethod('ordered');
            }
            scheduleDraw();
          }}
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
            background: ditherPalette === 'gameboy' ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)',
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
            ditherPaletteRef && (ditherPaletteRef.current = v);
            setDitherPalette && setDitherPalette(v);
            scheduleDraw();
          }}
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
            background: ditherPalette === 'pico8' ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)',
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
            ditherPaletteRef && (ditherPaletteRef.current = v);
            setDitherPalette && setDitherPalette(v);
            scheduleDraw();
          }}
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
            background: ditherPalette === 'nes' ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)',
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
            ditherPaletteRef && (ditherPaletteRef.current = v);
            setDitherPalette && setDitherPalette(v);
            scheduleDraw();
          }}
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
            background: ditherPalette === 'zx_spectrum' ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)',
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
            ditherPaletteRef && (ditherPaletteRef.current = v);
            setDitherPalette && setDitherPalette(v);
            scheduleDraw();
          }}
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
            background: ditherPalette === 'atari_2600' ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)',
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
            ditherPaletteRef && (ditherPaletteRef.current = v);
            setDitherPalette && setDitherPalette(v);
            scheduleDraw();
          }}
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
            background: ditherPalette === 'commodore64' ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)',
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
            ditherPaletteRef && (ditherPaletteRef.current = v);
            setDitherPalette && setDitherPalette(v);
            scheduleDraw();
          }}
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
            background: ditherPalette === 'apple_ii' ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)',
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
  );
}