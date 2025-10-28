import { useState, useEffect, useRef } from "react";
import { Combobox } from "../Combobox";
import { CameraScopeSelector } from "./CameraScopeSelector";
import { CAMERA_DIGITAL_PRESETS, LENS_PRESETS, FILM_PRESETS, ISO_PRESETS, getMergedExifPresets } from "@/src/lib/exifPresets";
import { Settings, Image, Gauge } from "lucide-react";
import type { User } from "@/src/lib/types";
import { api } from "@/src/lib/api";

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
  user?: User | null;
  setUser?: (user: User) => void;
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
  processing,
  user,
  setUser
}: ExifInputsProps) {
  const [activeExifField, setActiveExifField] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeExifField && inputRef.current) {
      inputRef.current.focus();
      // Select all text for easy replacement
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [activeExifField]);

  const mergedPresets = getMergedExifPresets(user);

  const handleRemovePreset = async (field: 'cameras' | 'lenses' | 'filmTypes' | 'filmIsos', value: string) => {
    if (!user) return;
    const currentClean = {
      cameras: Array.isArray(user.exifPresets?.cameras) ? user.exifPresets.cameras : [],
      lenses: Array.isArray(user.exifPresets?.lenses) ? user.exifPresets.lenses : [],
      filmTypes: Array.isArray(user.exifPresets?.filmTypes) ? user.exifPresets.filmTypes : [],
      filmIsos: Array.isArray(user.exifPresets?.filmIsos) ? user.exifPresets.filmIsos : [],
    };
    const current = currentClean[field] || [];
    const updated = { ...currentClean, [field]: current.filter(o => o !== value) };
    try {
      const updatedUser = await api.updateCurrentUser({ exifPresets: updated });
      setUser?.(updatedUser);
    } catch (e) {
      console.error('Failed to remove EXIF preset', e);
    }
  };

  const saveNewPreset = async (field: 'cameras' | 'lenses' | 'filmTypes' | 'filmIsos', value: string) => {
    if (!user || !value.trim()) return;
    const trimmed = value.trim();
    const defaults = {
      cameras: CAMERA_DIGITAL_PRESETS,
      lenses: LENS_PRESETS,
      filmTypes: FILM_PRESETS,
      filmIsos: ISO_PRESETS,
    };
    if (defaults[field].includes(trimmed)) return; // already in defaults
    // Build clean current presets, ignoring corrupted data
    const currentClean = {
      cameras: Array.isArray(user.exifPresets?.cameras) ? user.exifPresets.cameras : [],
      lenses: Array.isArray(user.exifPresets?.lenses) ? user.exifPresets.lenses : [],
      filmTypes: Array.isArray(user.exifPresets?.filmTypes) ? user.exifPresets.filmTypes : [],
      filmIsos: Array.isArray(user.exifPresets?.filmIsos) ? user.exifPresets.filmIsos : [],
    };
    const current = currentClean[field] || [];
    if (current.includes(trimmed)) return; // already saved
    const updated = { ...currentClean, [field]: [...current, trimmed] };
    try {
      const updatedUser = await api.updateCurrentUser({ exifPresets: updated });
      setUser?.(updatedUser);
    } catch (e) {
      console.error('Failed to save EXIF preset', e);
    }
  };

  const handleCameraChange = (value: string) => {
    setCamera?.(value);
  };

  const handleCameraBlur = () => {
    if (camera) saveNewPreset('cameras', camera);
    setActiveExifField(null);
  };

  const handleLensChange = (value: string) => {
    setLens?.(value);
  };

  const handleLensBlur = () => {
    if (lens) saveNewPreset('lenses', lens);
    setActiveExifField(null);
  };

  const handleFilmTypeChange = (value: string) => {
    setFilmType?.(value);
  };

  const handleFilmTypeBlur = () => {
    if (filmType) saveNewPreset('filmTypes', filmType);
    setActiveExifField(null);
  };

  const handleFilmIsoChange = (value: string) => {
    setFilmIso?.(value);
  };

  const handleFilmIsoBlur = () => {
    if (filmIso) saveNewPreset('filmIsos', filmIso);
    setActiveExifField(null);
  };

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', marginTop: 8 }}>
      {activeExifField === null ? (
        // Show all fields when none is active
        <>
          <CameraScopeSelector
            camera={camera}
            setCamera={handleCameraChange}
            disabled={!hasPreview || processing}
            onFocus={() => setActiveExifField('camera')}
            onBlur={handleCameraBlur}
            user={user}
            removableOptions={user?.exifPresets?.cameras || []}
            onRemoveOption={(option) => handleRemovePreset('cameras', option)}
          />
          <Combobox
            value={lens || ''}
            onChange={handleLensChange}
            options={mergedPresets.lenses}
            placeholder="Lens"
            disabled={!hasPreview || processing}
            icon={Settings}
            onFocus={() => setActiveExifField('lens')}
            onBlur={handleLensBlur}
            removableOptions={user?.exifPresets?.lenses || []}
            onRemoveOption={(option) => handleRemovePreset('lenses', option)}
          />
          {!camera || !CAMERA_DIGITAL_PRESETS.includes(camera) ? (
            <>
              <Combobox
                value={filmType || ''}
                onChange={(value) => {
                  handleFilmTypeChange(value);
                  if (!value) setFilmIso?.(''); // Clear ISO when film is cleared
                }}
                options={mergedPresets.filmTypes}
                placeholder="Film"
                disabled={!hasPreview || processing}
                icon={Image}
                onFocus={() => setActiveExifField('film')}
                onBlur={handleFilmTypeBlur}
                removableOptions={user?.exifPresets?.filmTypes || []}
                onRemoveOption={(option) => handleRemovePreset('filmTypes', option)}
              />
              {filmType && (
                <Combobox
                  value={filmIso || ''}
                  onChange={handleFilmIsoChange}
                  options={mergedPresets.filmIsos}
                  placeholder="ISO"
                  disabled={!hasPreview || processing}
                  icon={Gauge}
                  onFocus={() => setActiveExifField('iso')}
                  onBlur={handleFilmIsoBlur}
                  removableOptions={user?.exifPresets?.filmIsos || []}
                  onRemoveOption={(option) => handleRemovePreset('filmIsos', option)}
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
              setCamera={handleCameraChange}
              disabled={!hasPreview || processing}
              onFocus={() => setActiveExifField('camera')}
              onBlur={handleCameraBlur}
              expanded={true}
              user={user}
              removableOptions={user?.exifPresets?.cameras || []}
              onRemoveOption={(option) => handleRemovePreset('cameras', option)}
              inputRef={inputRef}
            />
          )}
          {activeExifField === 'lens' && (
            <Combobox
              value={lens || ''}
              onChange={handleLensChange}
              options={mergedPresets.lenses}
              placeholder="Lens"
              disabled={!hasPreview || processing}
              icon={Settings}
              onFocus={() => setActiveExifField('lens')}
              onBlur={handleLensBlur}
              expanded={true}
              removableOptions={user?.exifPresets?.lenses || []}
              onRemoveOption={(option) => handleRemovePreset('lenses', option)}
              inputRef={inputRef}
            />
          )}
          {activeExifField === 'film' && (!camera || !CAMERA_DIGITAL_PRESETS.includes(camera)) && (
            <Combobox
              value={filmType || ''}
              onChange={(value) => {
                handleFilmTypeChange(value);
                if (!value) setFilmIso?.(''); // Clear ISO when film is cleared
              }}
              options={mergedPresets.filmTypes}
              placeholder="Film"
              disabled={!hasPreview || processing}
              icon={Image}
              onFocus={() => setActiveExifField('film')}
              onBlur={handleFilmTypeBlur}
              expanded={true}
              removableOptions={user?.exifPresets?.filmTypes || []}
              onRemoveOption={(option) => handleRemovePreset('filmTypes', option)}
              inputRef={inputRef}
            />
          )}
          {activeExifField === 'iso' && filmType && (!camera || !CAMERA_DIGITAL_PRESETS.includes(camera)) && (
            <Combobox
              value={filmIso || ''}
              onChange={handleFilmIsoChange}
              options={mergedPresets.filmIsos}
              placeholder="ISO"
              disabled={!hasPreview || processing}
              icon={Gauge}
              onFocus={() => setActiveExifField('iso')}
              onBlur={handleFilmIsoBlur}
              expanded={true}
              removableOptions={user?.exifPresets?.filmIsos || []}
              onRemoveOption={(option) => handleRemovePreset('filmIsos', option)}
              inputRef={inputRef}
            />
          )}
        </div>
      )}
    </div>
  );
}