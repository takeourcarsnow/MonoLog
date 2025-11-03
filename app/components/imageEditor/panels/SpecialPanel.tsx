import React from 'react';
import PixelatePanel from './PixelatePanel';
import DitherPanel from './DitherPanel';
import AsciiPanel from './AsciiPanel';

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
  const pixelateEnabled = props.pixelSize > 1;
  const ditherEnabled = props.ditherMethod !== 'none';
  const asciiEnabled = props.asciiEnabled;
  const anyEnabled = pixelateEnabled || ditherEnabled || asciiEnabled;

  return (
    <section className="imgedit-panel-inner special-panel" style={{ display: 'grid', width: '100%', gap: 8, maxWidth: 720, margin: '0 auto' }}>
      <PixelatePanel
        pixelSize={props.pixelSize}
        setPixelSize={props.setPixelSize}
        pixelSizeRef={props.pixelSizeRef}
        pixelShape={props.pixelShape}
        setPixelShape={props.setPixelShape}
        pixelShapeRef={props.pixelShapeRef}
        pixelSample={props.pixelSample}
        setPixelSample={props.setPixelSample}
        pixelSampleRef={props.pixelSampleRef}
        draw={props.draw}
        pixelateEnabled={pixelateEnabled}
        anyEnabled={anyEnabled}
        onToggleEnabled={(enabled) => {
          if (enabled) {
            // Enable pixelation with default values
            props.pixelSizeRef.current = 3;
            props.setPixelSize(3);
            props.draw();
          } else {
            // Reset to disabled state
            props.pixelSizeRef.current = 1;
            props.setPixelSize(1);
            props.draw();
          }
        }}
      />
      <DitherPanel
        ditherMethod={props.ditherMethod}
        setDitherMethod={props.setDitherMethod}
        ditherMethodRef={props.ditherMethodRef}
        ditherLevels={props.ditherLevels}
        setDitherLevels={props.setDitherLevels}
        ditherLevelsRef={props.ditherLevelsRef}
        ditherColorMode={props.ditherColorMode}
        setDitherColorMode={props.setDitherColorMode}
        ditherColorModeRef={props.ditherColorModeRef}
        ditherPalette={props.ditherPalette}
        setDitherPalette={props.setDitherPalette}
        ditherPaletteRef={props.ditherPaletteRef}
        ditherCustomPalette={props.ditherCustomPalette}
        setDitherCustomPalette={props.setDitherCustomPalette}
        ditherCustomPaletteRef={props.ditherCustomPaletteRef}
        draw={props.draw}
        resetControlToDefault={props.resetControlToDefault}
        ditherEnabled={ditherEnabled}
        anyEnabled={anyEnabled}
        onToggleEnabled={(enabled) => {
          if (enabled) {
            // Enable dithering with default values
            props.ditherMethodRef.current = 'floyd-steinberg';
            props.setDitherMethod('floyd-steinberg');
            props.draw();
          } else {
            // Reset to disabled state
            props.ditherMethodRef.current = 'none';
            props.setDitherMethod('none');
            props.draw();
          }
        }}
      />
      <AsciiPanel
        asciiEnabled={props.asciiEnabled}
        setAsciiEnabled={props.setAsciiEnabled}
        asciiEnabledRef={props.asciiEnabledRef}
        asciiCellSize={props.asciiCellSize}
        setAsciiCellSize={props.setAsciiCellSize}
        asciiCellSizeRef={props.asciiCellSizeRef}
        asciiCharset={props.asciiCharset}
        setAsciiCharset={props.setAsciiCharset}
        asciiCharsetRef={props.asciiCharsetRef}
        asciiInvert={props.asciiInvert}
        setAsciiInvert={props.setAsciiInvert}
        asciiInvertRef={props.asciiInvertRef}
        asciiColor={props.asciiColor}
        setAsciiColor={props.setAsciiColor}
        asciiColorRef={props.asciiColorRef}
        asciiOpacity={props.asciiOpacity}
        setAsciiOpacity={props.setAsciiOpacity}
        asciiOpacityRef={props.asciiOpacityRef}
        asciiBackground={props.asciiBackground}
        setAsciiBackground={props.setAsciiBackground}
        asciiBackgroundRef={props.asciiBackgroundRef}
        asciiFont={props.asciiFont}
        setAsciiFont={props.setAsciiFont}
        asciiFontRef={props.asciiFontRef}
        asciiGamma={props.asciiGamma}
        setAsciiGamma={props.setAsciiGamma}
        asciiGammaRef={props.asciiGammaRef}
        asciiBold={props.asciiBold}
        setAsciiBold={props.setAsciiBold}
        asciiBoldRef={props.asciiBoldRef}
        asciiEdge={props.asciiEdge}
        setAsciiEdge={props.setAsciiEdge}
        asciiEdgeRef={props.asciiEdgeRef}
        asciiCharsetPreset={props.asciiCharsetPreset}
        setAsciiCharsetPreset={props.setAsciiCharsetPreset}
        draw={props.draw}
        asciiEnabledFlag={asciiEnabled}
        anyEnabled={anyEnabled}
      />
    </section>
  );
}
