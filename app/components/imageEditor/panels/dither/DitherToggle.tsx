import React from 'react';
import { Wand2 } from 'lucide-react';

interface DitherToggleProps {
  ditherEnabled: boolean;
  onToggleEnabled: (enabled: boolean) => void;
}

export default function DitherToggle({ ditherEnabled, onToggleEnabled }: DitherToggleProps) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
      <span style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, fontWeight: 600 }}>
        <Wand2 size={16} strokeWidth={2} aria-hidden />
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