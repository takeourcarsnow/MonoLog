import { useState } from "react";
import { Combobox } from "../Combobox";
import { CameraScopeSelector } from "./CameraScopeSelector";
import { CAMERA_DIGITAL_PRESETS, LENS_PRESETS, FILM_PRESETS, ISO_PRESETS } from "@/src/lib/exifPresets";
import { Settings, Image, Gauge } from "lucide-react";

interface ExifInputsProps {
  camera?: string;
  setCamera?: (camera: string) => void;
  lens?: string;
  setLens?: (lens: string) => void;
  filmType?: string;
  setFilmType?: (filmType: string) => void;
  filmIso?: string;
  setFilmIso?: (filmIso: string) => void;
  hasPreview: boolean;
  processing: boolean;
}

export function ExifInputs({
  camera,
  setCamera,
  lens,
  setLens,
  filmType,
  setFilmType,
  filmIso,
  setFilmIso,
  hasPreview,
  processing
}: ExifInputsProps) {
  const [activeExifField, setActiveExifField] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', marginTop: 8 }}>
      {activeExifField === null ? (
        // Show all fields when none is active
        <>
          <CameraScopeSelector
            camera={camera}
            setCamera={setCamera}
            disabled={!hasPreview || processing}
            onFocus={() => setActiveExifField('camera')}
            onBlur={() => setActiveExifField(null)}
          />
          <Combobox
            value={lens || ''}
            onChange={setLens || (() => {})}
            options={LENS_PRESETS}
            placeholder="Lens"
            disabled={!hasPreview || processing}
            icon={Settings}
            onFocus={() => setActiveExifField('lens')}
            onBlur={() => setActiveExifField(null)}
          />
          {!camera || !CAMERA_DIGITAL_PRESETS.includes(camera) ? (
            <>
              <Combobox
                value={filmType || ''}
                onChange={(value) => {
                  setFilmType?.(value);
                  if (!value) setFilmIso?.(''); // Clear ISO when film is cleared
                }}
                options={FILM_PRESETS}
                placeholder="Film"
                disabled={!hasPreview || processing}
                icon={Image}
                onFocus={() => setActiveExifField('film')}
                onBlur={() => setActiveExifField(null)}
              />
              {filmType && (
                <Combobox
                  value={filmIso || ''}
                  onChange={setFilmIso || (() => {})}
                  options={ISO_PRESETS}
                  placeholder="ISO"
                  disabled={!hasPreview || processing}
                  icon={Gauge}
                  onFocus={() => setActiveExifField('iso')}
                  onBlur={() => setActiveExifField(null)}
                />
              )}
            </>
          ) : null}
        </>
      ) : (
        // Show only the active field in full width
        <div style={{ width: '100%' }}>
          {activeExifField === 'camera' && (
            <CameraScopeSelector
              camera={camera}
              setCamera={setCamera}
              disabled={!hasPreview || processing}
              onFocus={() => setActiveExifField('camera')}
              onBlur={() => setActiveExifField(null)}
              expanded={true}
            />
          )}
          {activeExifField === 'lens' && (
            <Combobox
              value={lens || ''}
              onChange={setLens || (() => {})}
              options={LENS_PRESETS}
              placeholder="Lens"
              disabled={!hasPreview || processing}
              icon={Settings}
              onFocus={() => setActiveExifField('lens')}
              onBlur={() => setActiveExifField(null)}
              expanded={true}
            />
          )}
          {activeExifField === 'film' && (!camera || !CAMERA_DIGITAL_PRESETS.includes(camera)) && (
            <Combobox
              value={filmType || ''}
              onChange={(value) => {
                setFilmType?.(value);
                if (!value) setFilmIso?.(''); // Clear ISO when film is cleared
              }}
              options={FILM_PRESETS}
              placeholder="Film"
              disabled={!hasPreview || processing}
              icon={Image}
              onFocus={() => setActiveExifField('film')}
              onBlur={() => setActiveExifField(null)}
              expanded={true}
            />
          )}
          {activeExifField === 'iso' && filmType && (!camera || !CAMERA_DIGITAL_PRESETS.includes(camera)) && (
            <Combobox
              value={filmIso || ''}
              onChange={setFilmIso || (() => {})}
              options={ISO_PRESETS}
              placeholder="ISO"
              disabled={!hasPreview || processing}
              icon={Gauge}
              onFocus={() => setActiveExifField('iso')}
              onBlur={() => setActiveExifField(null)}
              expanded={true}
            />
          )}
        </div>
      )}
    </div>
  );
}