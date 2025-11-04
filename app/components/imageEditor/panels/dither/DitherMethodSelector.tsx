import React from 'react';

interface DitherMethodSelectorProps {
  ditherMethod: 'none' | 'floyd-steinberg' | 'ordered' | 'atkinson' | 'burkes';
  setDitherMethod: (v: 'none' | 'floyd-steinberg' | 'ordered' | 'atkinson' | 'burkes') => void;
  ditherMethodRef: React.MutableRefObject<'none' | 'floyd-steinberg' | 'ordered' | 'atkinson' | 'burkes'>;
  ditherPalette?: 'auto' | 'gameboy' | 'pico8' | 'nes' | 'zx_spectrum' | 'atari_2600' | 'commodore64' | 'apple_ii';
  scheduleDraw: () => void;
}

export default function DitherMethodSelector({
  ditherMethod,
  setDitherMethod,
  ditherMethodRef,
  ditherPalette,
  scheduleDraw,
}: DitherMethodSelectorProps) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
      <button
        type="button"
        disabled={ditherPalette === 'gameboy'}
        onClick={() => {
          if (ditherPalette !== 'gameboy') {
            ditherMethodRef.current = 'floyd-steinberg';
            setDitherMethod('floyd-steinberg');
            scheduleDraw();
          }
        }}
        style={{
          padding: '4px 8px',
          borderRadius: 6,
          border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
          background: ditherMethod === 'floyd-steinberg' ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)',
          color: ditherPalette === 'gameboy' ? 'color-mix(in srgb, var(--text) 50%, transparent)' : 'var(--text)',
          fontSize: 11,
          fontWeight: 500,
          cursor: ditherPalette === 'gameboy' ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s ease'
        }}
        aria-label="Dither method: Floyd"
      >
        Floyd
      </button>
      <button
        type="button"
        onClick={() => {
          ditherMethodRef.current = 'ordered';
          setDitherMethod('ordered');
          scheduleDraw();
        }}
        style={{
          padding: '4px 8px',
          borderRadius: 6,
          border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
          background: ditherMethod === 'ordered' ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)',
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
          ditherMethodRef.current = 'atkinson';
          setDitherMethod('atkinson');
          scheduleDraw();
        }}
        style={{
          padding: '4px 8px',
          borderRadius: 6,
          border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
          background: ditherMethod === 'atkinson' ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)',
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
        disabled={ditherPalette === 'gameboy'}
        onClick={() => {
          if (ditherPalette !== 'gameboy') {
            ditherMethodRef.current = 'burkes';
            setDitherMethod('burkes');
            scheduleDraw();
          }
        }}
        style={{
          padding: '4px 8px',
          borderRadius: 6,
          border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
          background: ditherMethod === 'burkes' ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg-elev)',
          color: ditherPalette === 'gameboy' ? 'color-mix(in srgb, var(--text) 50%, transparent)' : 'var(--text)',
          fontSize: 11,
          fontWeight: 500,
          cursor: ditherPalette === 'gameboy' ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s ease'
        }}
        aria-label="Dither method: Burkes"
      >
        Burkes
      </button>
    </div>
  );
}