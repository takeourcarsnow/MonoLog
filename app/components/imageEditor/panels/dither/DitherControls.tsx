import React from 'react';
import DitherControlsShared, { DitherMethod } from '../../../dither/DitherControls';
import { Contrast, Palette } from 'lucide-react';
import { rangeBg } from '../../utils';

interface DitherControlsProps {
  ditherMethod: DitherMethod;
  ditherColorMode?: 'bw' | 'color';
  setDitherColorMode?: (v: 'bw' | 'color') => void;
  ditherColorModeRef?: React.MutableRefObject<'bw' | 'color'>;
  ditherLevels: number;
  setDitherLevels: (v: number) => void;
  ditherLevelsRef: React.MutableRefObject<number>;
  targetLongEdge?: number;
  setTargetLongEdge?: (v: number) => void;
  targetLongEdgeRef?: React.MutableRefObject<number>;
  draw: (overrides?: any) => void;
  resetControlToDefault?: (control: string) => void;
  scheduleDraw: () => void;
}

export default function DitherControls({
  ditherMethod,
  ditherColorMode,
  setDitherColorMode,
  ditherColorModeRef,
  ditherLevels,
  setDitherLevels,
  ditherLevelsRef,
  targetLongEdge,
  setTargetLongEdge,
  targetLongEdgeRef,
  draw,
  resetControlToDefault,
  scheduleDraw,
}: DitherControlsProps) {
  if (ditherMethod === 'none') return null;

  return (
    <DitherControlsShared
      ditherMethod={ditherMethod}
      // The panel exposes method selector separately; do NOT provide a method setter so the shared
      // control will skip rendering its own method selector and avoid duplication.
      setDitherMethod={undefined}
      ditherColorMode={ditherColorMode}
      setDitherColorMode={(v: 'bw' | 'color') => { ditherColorModeRef && (ditherColorModeRef.current = v); setDitherColorMode && setDitherColorMode(v); scheduleDraw(); }}
      ditherLevels={ditherLevels}
      setDitherLevels={(v: number) => { ditherLevelsRef.current = v; setDitherLevels(v); scheduleDraw(); }}
      targetLongEdge={targetLongEdge}
      setTargetLongEdge={(v: number) => { targetLongEdgeRef && (targetLongEdgeRef.current = v); setTargetLongEdge && setTargetLongEdge(v); scheduleDraw(); }}
      ditherPalette={undefined}
      setDitherPalette={undefined}
      disabled={false}
      scheduleDraw={scheduleDraw}
    />
  );
}