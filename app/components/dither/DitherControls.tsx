import React from 'react';
import { CameraEffectSettings } from '../uploader/cameraEffects';

export type DitherMethod = 'none' | 'floyd-steinberg' | 'ordered' | 'atkinson' | 'burkes';
export type DitherPalette = 'auto' | 'gameboy' | 'pico8' | 'nes' | 'zx_spectrum' | 'atari_2600' | 'commodore64' | 'apple_ii';

interface SharedDitherProps {
  ditherMethod: DitherMethod;
  setDitherMethod?: (v: DitherMethod) => void;
  ditherColorMode?: 'bw' | 'color';
  setDitherColorMode?: (v: 'bw' | 'color') => void;
  ditherLevels: number;
  setDitherLevels?: (v: number) => void;
  targetLongEdge?: number;
  setTargetLongEdge?: (v: number) => void;
  ditherPalette?: DitherPalette;
  setDitherPalette?: (v: DitherPalette) => void;
  disabled?: boolean;
  scheduleDraw?: () => void;
}

export default function DitherControlsShared({
  ditherMethod,
  setDitherMethod,
  ditherColorMode,
  setDitherColorMode,
  ditherLevels,
  setDitherLevels,
  targetLongEdge,
  setTargetLongEdge,
  ditherPalette,
  setDitherPalette,
  disabled,
  scheduleDraw,
}: SharedDitherProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', boxSizing: 'border-box' }}>
      {/* Two small sliders on one row */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ opacity: 0.9 }}>Res</span>
            <span style={{ opacity: 0.7 }}>{targetLongEdge || 150}</span>
          </div>
          <input
            type="range"
            min={50}
            max={400}
            step={10}
            value={targetLongEdge || 150}
            onChange={(e) => {
              const v = Number(e.target.value);
              setTargetLongEdge && setTargetLongEdge(v);
              scheduleDraw && scheduleDraw();
            }}
            style={{ width: '100%', minWidth: 0 }}
            disabled={disabled}
            aria-label="Dither resolution"
          />
        </div>

        <div style={{ width: 12 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ opacity: 0.9 }}>Lvl</span>
            <span style={{ opacity: 0.7 }}>{ditherLevels}</span>
          </div>
          <input
            type="range"
            min={ditherMethod === 'ordered' ? 2 : 3}
            max={31}
            step={1}
            value={ditherLevels}
            onChange={(e) => {
              const v = Number(e.target.value);
              setDitherLevels && setDitherLevels(v);
              scheduleDraw && scheduleDraw();
            }}
            style={{ width: '100%', minWidth: 0 }}
            disabled={disabled}
            aria-label="Dither levels"
          />
        </div>
      </div>

      {/* Compact control row: color toggle, method, optional palette */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', width: '100%', flexWrap: 'nowrap' }}>
        <button
          type="button"
          onClick={() => {
            const v = ditherColorMode === 'bw' ? 'color' : 'bw';
            setDitherColorMode && setDitherColorMode(v);
            scheduleDraw && scheduleDraw();
          }}
          disabled={disabled}
          style={{ padding: '6px 8px', fontSize: 11, whiteSpace: 'nowrap' }}
          aria-label="Toggle color mode"
        >
          {ditherColorMode === 'color' ? 'Color' : 'B&W'}
        </button>

        {setDitherMethod && (
          <select
            value={ditherMethod}
            onChange={(e) => {
              const m = e.target.value as DitherMethod;
              setDitherMethod && setDitherMethod(m);
              if ((m === 'floyd-steinberg' || m === 'atkinson' || m === 'burkes') && ditherLevels < 3) {
                setDitherLevels && setDitherLevels(3);
              }
              scheduleDraw && scheduleDraw();
            }}
            disabled={disabled}
            style={{ padding: '6px', fontSize: 12, minWidth: 0, width: 120 }}
            aria-label="Dither method"
          >
            <option value="floyd-steinberg">Floyd</option>
            <option value="ordered">Ordered</option>
            <option value="atkinson">Atkinson</option>
            <option value="burkes">Burkes</option>
          </select>
        )}

        {ditherColorMode === 'color' && setDitherPalette && (
          <select
            value={ditherPalette}
            onChange={(e) => {
              const p = e.target.value as DitherPalette;
              setDitherPalette && setDitherPalette(p);
              if (p === 'gameboy' && ditherMethod !== 'ordered' && setDitherMethod) {
                setDitherMethod('ordered');
              }
              scheduleDraw && scheduleDraw();
            }}
            disabled={disabled}
            style={{ padding: '6px', fontSize: 12, minWidth: 0, width: 140 }}
            aria-label="Dither palette"
          >
            <option value="auto">Auto</option>
            <option value="gameboy">Game Boy</option>
            <option value="pico8">PICO-8</option>
            <option value="nes">NES</option>
            <option value="zx_spectrum">ZX</option>
            <option value="atari_2600">Atari</option>
            <option value="commodore64">C64</option>
            <option value="apple_ii">Apple II</option>
          </select>
        )}
      </div>
    </div>
  );
}
