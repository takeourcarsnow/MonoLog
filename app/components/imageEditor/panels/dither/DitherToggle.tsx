import React from 'react';
import { Wand2 } from 'lucide-react';

interface DitherToggleProps {
  ditherEnabled: boolean;
  onToggleEnabled: (enabled: boolean) => void;
}

export default function DitherToggle({ ditherEnabled, onToggleEnabled }: DitherToggleProps) {
  return (
    <label style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ width: 'auto', display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
        <Wand2 size={18} strokeWidth={2} aria-hidden />
        <span>Dithering</span>
      </span>
      <input
        type="checkbox"
        checked={ditherEnabled}
        onChange={(e) => onToggleEnabled(e.target.checked)}
        aria-label="Enable dithering"
      />
    </label>
  );
}