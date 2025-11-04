import React, { useMemo } from 'react';
import { throttle } from '@/lib/utils';
import DitherToggle from './dither/DitherToggle';
import DitherControls from './dither/DitherControls';
import DitherMethodSelector from './dither/DitherMethodSelector';
import DitherPaletteSelector from './dither/DitherPaletteSelector';

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
        <div style={{ display: 'grid', gap: 4, maxWidth: 720, margin: '0 auto', width: '100%' }}>
          <DitherToggle ditherEnabled={props.ditherEnabled} onToggleEnabled={props.onToggleEnabled} />
          {props.ditherEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
              <DitherControls
                ditherMethod={props.ditherMethod}
                ditherColorMode={props.ditherColorMode}
                setDitherColorMode={props.setDitherColorMode}
                ditherColorModeRef={props.ditherColorModeRef}
                ditherLevels={props.ditherLevels}
                setDitherLevels={props.setDitherLevels}
                ditherLevelsRef={props.ditherLevelsRef}
                draw={props.draw}
                resetControlToDefault={props.resetControlToDefault}
                scheduleDraw={scheduleDraw}
              />
              <DitherMethodSelector
                ditherMethod={props.ditherMethod}
                setDitherMethod={props.setDitherMethod}
                ditherMethodRef={props.ditherMethodRef}
                ditherPalette={props.ditherPalette}
                scheduleDraw={scheduleDraw}
              />
              <DitherPaletteSelector
                ditherMethod={props.ditherMethod}
                setDitherMethod={props.setDitherMethod}
                ditherMethodRef={props.ditherMethodRef}
                ditherColorMode={props.ditherColorMode}
                ditherPalette={props.ditherPalette}
                setDitherPalette={props.setDitherPalette}
                ditherPaletteRef={props.ditherPaletteRef}
                scheduleDraw={scheduleDraw}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}