"use client";

import React from "react";
import { CameraEffectType } from "./cameraEffects";
import { X, Grid3x3, Sparkles, Type, Frame, Layers } from "lucide-react";

interface EffectControlsProps {
  effectType: CameraEffectType;
  onEffectChange: (type: CameraEffectType) => void;
  disabled: boolean;
}

export function EffectControls({ effectType, onEffectChange, disabled }: EffectControlsProps) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
      <button
        type="button"
        className={`btn mini ${effectType === 'none' ? 'active' : ''}`}
        onClick={() => onEffectChange('none')}
        title="No effect"
        disabled={disabled}
      >
        <X size={16} />
      </button>
      <button
        type="button"
        className={`btn mini ${effectType === 'pixelate' ? 'active' : ''}`}
        onClick={() => onEffectChange('pixelate')}
        title="Pixelate"
        disabled={disabled}
      >
        <Grid3x3 size={16} />
      </button>
      <button
        type="button"
        className={`btn mini ${effectType === 'dither' ? 'active' : ''}`}
        onClick={() => onEffectChange('dither')}
        title="Dither"
        disabled={disabled}
      >
        <Sparkles size={16} />
      </button>
      <button
        type="button"
        className={`btn mini ${effectType === 'ascii' ? 'active' : ''}`}
        onClick={() => onEffectChange('ascii')}
        title="ASCII"
        disabled={disabled}
      >
        <Type size={16} />
      </button>
      <button
        type="button"
        className={`btn mini ${effectType === 'frame' ? 'active' : ''}`}
        onClick={() => onEffectChange('frame')}
        title="Frame"
        disabled={disabled}
      >
        <Frame size={16} />
      </button>
      <button
        type="button"
        className={`btn mini ${effectType === 'overlay' ? 'active' : ''}`}
        onClick={() => onEffectChange('overlay')}
        title="Overlay"
        disabled={disabled}
      >
        <Layers size={16} />
      </button>
    </div>
  );
}