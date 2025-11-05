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
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%' }}>
      <label style={{ fontSize: 11, minWidth: 60 }}>Method</label>
      <select
        value={ditherMethod}
        onChange={(e) => {
          const m = e.target.value as DitherMethodSelectorProps['ditherMethod'];
          ditherMethodRef.current = m;
          setDitherMethod(m);
          scheduleDraw();
        }}
        style={{ fontSize: 11, padding: '4px 6px', minWidth: 140 }}
      >
        <option value="floyd-steinberg">Floyd</option>
        <option value="ordered">Ordered</option>
        <option value="atkinson">Atkinson</option>
        <option value="burkes">Burkes</option>
      </select>
    </div>
  );
}