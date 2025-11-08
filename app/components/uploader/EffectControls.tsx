"use client";

import React from "react";
import dynamic from "next/dynamic";
import { CameraEffectType } from "./cameraEffects";
import { Sliders, Palette, Sparkles, Wand2, ImageIcon, Layers, Ban, Eye, EyeOff } from "lucide-react";

const Grid3x3 = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Grid3x3 })), { ssr: false });
const Type = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Type })), { ssr: false });
const FileText = dynamic(() => import('lucide-react').then(mod => ({ default: mod.FileText })), { ssr: false });
const Frame = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Frame })), { ssr: false });

interface EffectControlsProps {
  effectType: CameraEffectType;
  onEffectChange: (type: CameraEffectType) => void;
  disabled: boolean;
  // Optional overlay visibility controls
  overlayVisible?: boolean;
  toggleOverlay?: () => void;
}

export function EffectControls({ effectType, onEffectChange, disabled, overlayVisible, toggleOverlay }: EffectControlsProps) {
  const iconSize = 14;
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <button type="button" className={`btn mini ${effectType === 'none' ? 'active' : ''}`} onClick={() => onEffectChange('none')} title="No effect" disabled={disabled} style={{ padding: 6 }}>
        <Ban size={iconSize} />
      </button>
      <button type="button" className={`btn mini ${effectType === 'basic' ? 'active' : ''}`} onClick={() => onEffectChange('basic')} title="Basic Adjustments" disabled={disabled} style={{ padding: 6 }}>
        <Sliders size={iconSize} />
      </button>
      <button type="button" className={`btn mini ${effectType === 'filters' ? 'active' : ''}`} onClick={() => onEffectChange('filters')} title="Filters" disabled={disabled} style={{ padding: 6 }}>
        <Palette size={iconSize} />
      </button>
      <button type="button" className={`btn mini ${effectType === 'effects' ? 'active' : ''}`} onClick={() => onEffectChange('effects')} title="Effects" disabled={disabled} style={{ padding: 6 }}>
        <Sparkles size={iconSize} />
      </button>
      <button type="button" className={`btn mini ${effectType === 'pixelate' ? 'active' : ''}`} onClick={() => onEffectChange('pixelate')} title="Pixelate" disabled={disabled} style={{ padding: 6 }}>
        <Grid3x3 size={iconSize} />
      </button>
      <button type="button" className={`btn mini ${effectType === 'dither' ? 'active' : ''}`} onClick={() => onEffectChange('dither')} title="Dither" disabled={disabled} style={{ padding: 6 }}>
        <Wand2 size={iconSize} />
      </button>
      <button type="button" className={`btn mini ${effectType === 'ascii' ? 'active' : ''}`} onClick={() => onEffectChange('ascii')} title="ASCII" disabled={disabled} style={{ padding: 6 }}>
        <Type size={iconSize} />
      </button>
      <button type="button" className={`btn mini ${effectType === 'text' ? 'active' : ''}`} onClick={() => onEffectChange('text')} title="Text Overlay" disabled={disabled} style={{ padding: 6 }}>
        <FileText size={iconSize} />
      </button>
      <button type="button" className={`btn mini ${effectType === 'frame' ? 'active' : ''}`} onClick={() => onEffectChange('frame')} title="Frame" disabled={disabled} style={{ padding: 6 }}>
        <Frame size={iconSize} />
      </button>
      <button type="button" className={`btn mini ${effectType === 'overlay' ? 'active' : ''}`} onClick={() => onEffectChange('overlay')} title="Overlay" disabled={disabled} style={{ padding: 6 }}>
        <Layers size={iconSize} />
      </button>
      {typeof toggleOverlay === 'function' && (
        <button type="button" className="btn mini" onClick={toggleOverlay} title={overlayVisible ? 'Hide controls' : 'Show controls'} disabled={disabled} style={{ padding: 6 }}>
          {overlayVisible ? <EyeOff size={iconSize} /> : <Eye size={iconSize} />}
        </button>
      )}
    </div>
  );
}