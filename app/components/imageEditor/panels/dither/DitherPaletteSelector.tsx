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
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%' }}>
      <label style={{ fontSize: 11, minWidth: 60 }}>Palette</label>
      <select
        value={ditherPalette}
        onChange={(e) => {
          const v = e.target.value as NonNullable<DitherPaletteSelectorProps['ditherPalette']>;
          ditherPaletteRef && (ditherPaletteRef.current = v);
          setDitherPalette && setDitherPalette(v as any);
          // ensure method for some palettes
          if (v === 'gameboy' && !['ordered', 'atkinson'].includes(ditherMethod)) {
            ditherMethodRef.current = 'ordered';
            setDitherMethod('ordered');
          }
          scheduleDraw();
        }}
        style={{ fontSize: 11, padding: '4px 6px', minWidth: 160 }}
      >
        <option value="auto">Auto</option>
        <option value="gameboy">Game Boy</option>
        <option value="pico8">PICO-8</option>
        <option value="nes">NES</option>
        <option value="zx_spectrum">ZX</option>
        <option value="atari_2600">Atari 2600</option>
        <option value="commodore64">C64</option>
        <option value="apple_ii">Apple II</option>
      </select>
    </div>
  );
}