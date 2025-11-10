import React from 'react';
import { Palette, Contrast } from 'lucide-react';
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', boxSizing: 'border-box' }}>
      {/* Two small sliders on one row */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
          <span style={{ opacity: 0.9, fontSize: 10, whiteSpace: 'nowrap' }}>Res</span>
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
            style={{ flex: 1, minWidth: 0 }}
            disabled={disabled}
            aria-label="Dither resolution"
          />
          <span style={{ opacity: 0.7, fontSize: 10, whiteSpace: 'nowrap' }}>{targetLongEdge || 150}</span>
        </div>

        <div style={{ width: 8 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
          <span style={{ opacity: 0.9, fontSize: 10, whiteSpace: 'nowrap' }}>Lvl</span>
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
            style={{ flex: 1, minWidth: 0 }}
            disabled={disabled}
            aria-label="Dither levels"
          />
          <span style={{ opacity: 0.7, fontSize: 10, whiteSpace: 'nowrap' }}>{ditherLevels}</span>
        </div>
      </div>

      {/* Compact control row: color toggle, method, optional palette */}
      <div style={{ display: 'flex', gap: 2, alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => {
            const v = ditherColorMode === 'bw' ? 'color' : 'bw';
            setDitherColorMode && setDitherColorMode(v);
            scheduleDraw && scheduleDraw();
          }}
          disabled={disabled}
          style={{
            padding: '2px 4px',
            fontSize: 10,
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 28,
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            cursor: 'pointer'
          }}
          aria-label={`Toggle color mode: ${ditherColorMode === 'color' ? 'Color' : 'Black & White'}`}
        >
          {ditherColorMode === 'color' ? <Palette size={12} /> : <Contrast size={12} />}
        </button>

        {setDitherMethod && (
          <div style={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {[
              { value: 'floyd-steinberg', label: 'Floyd' },
              { value: 'ordered', label: 'Ordered' },
              { value: 'atkinson', label: 'Atkinson' },
              { value: 'burkes', label: 'Burkes' }
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  const m = value as DitherMethod;
                  setDitherMethod && setDitherMethod(m);
                  if ((m === 'floyd-steinberg' || m === 'atkinson' || m === 'burkes') && ditherLevels < 3) {
                    setDitherLevels && setDitherLevels(3);
                  }
                  scheduleDraw && scheduleDraw();
                }}
                disabled={disabled}
                style={{
                  padding: '2px 4px',
                  fontSize: 9,
                  borderRadius: 3,
                  background: ditherMethod === value ? 'var(--primary)' : 'transparent',
                  border: `1px solid ${ditherMethod === value ? 'var(--primary)' : 'var(--border)'}`,
                  color: ditherMethod === value ? 'white' : 'var(--text)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
                aria-label={`Dither method: ${label}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {ditherColorMode === 'color' && setDitherPalette && (
          <div style={{ display: 'flex', gap: 1, flexWrap: 'wrap', marginTop: 2 }}>
            {[
              { value: 'auto', label: 'Auto' },
              { value: 'gameboy', label: 'GB' },
              { value: 'pico8', label: 'P8' },
              { value: 'nes', label: 'NES' },
              { value: 'zx_spectrum', label: 'ZX' },
              { value: 'atari_2600', label: 'Atari' },
              { value: 'commodore64', label: 'C64' },
              { value: 'apple_ii', label: 'Apple' }
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  const p = value as DitherPalette;
                  setDitherPalette && setDitherPalette(p);
                  if (p === 'gameboy' && ditherMethod !== 'ordered' && setDitherMethod) {
                    setDitherMethod('ordered');
                  }
                  scheduleDraw && scheduleDraw();
                }}
                disabled={disabled}
                style={{
                  padding: '2px 3px',
                  fontSize: 8,
                  borderRadius: 3,
                  background: ditherPalette === value ? 'var(--primary)' : 'transparent',
                  border: `1px solid ${ditherPalette === value ? 'var(--primary)' : 'var(--border)'}`,
                  color: ditherPalette === value ? 'white' : 'var(--text)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
                aria-label={`Dither palette: ${label}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
