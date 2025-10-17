import { useState } from "react";
import { Combobox } from "../Combobox";
import { CAMERA_PRESETS, CAMERA_DIGITAL_PRESETS, CAMERA_FILM_PRESETS } from "@/src/lib/exifPresets";
import { Camera, Monitor, Film } from "lucide-react";

// Small scoped selector component for picking between All/Digital/Film cameras
function CameraScopeSelector({ camera, setCamera, disabled, onFocus, onBlur, expanded }: { camera?: string; setCamera?: (c: string) => void; disabled?: boolean; onFocus?: () => void; onBlur?: () => void; expanded?: boolean }) {
  const [scope, setScope] = useState<'all' | 'digital' | 'film'>('all');
  const getOptions = () => {
    if (scope === 'digital') return CAMERA_DIGITAL_PRESETS;
    if (scope === 'film') return CAMERA_FILM_PRESETS;
    return CAMERA_PRESETS;
  };

  const header = (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
      <button type="button" className={`btn mini ${scope === 'all' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setScope('all'); }} disabled={disabled} aria-pressed={scope === 'all'} title="All cameras">
        <Camera size={14} />
      </button>
      <button type="button" className={`btn mini ${scope === 'digital' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setScope('digital'); }} disabled={disabled} aria-pressed={scope === 'digital'} title="Digital cameras">
        <Monitor size={14} />
      </button>
      <button type="button" className={`btn mini ${scope === 'film' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setScope('film'); }} disabled={disabled} aria-pressed={scope === 'film'} title="Film cameras">
        <Film size={14} />
      </button>
    </div>
  );

  return (
    <Combobox
      value={camera || ''}
      onChange={setCamera || (() => {})}
      options={getOptions()}
      placeholder="Camera"
      disabled={disabled}
      icon={Camera}
      header={header}
      onFocus={onFocus}
      onBlur={onBlur}
      expanded={expanded}
    />
  );
}

export { CameraScopeSelector };