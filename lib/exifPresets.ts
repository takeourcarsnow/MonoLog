// Camera, lens, and film type presets for EXIF input
import type { User } from './types';

// Default presets are now empty - users build their own lists
export const CAMERA_DIGITAL_PRESETS: string[] = [];

export const CAMERA_FILM_PRESETS: string[] = [];

// Build a grouped camera list with manufacturer separators for the dropdown.
// The Combobox treats options that start with '───' as separators.
const ALL_CAMERAS = [...CAMERA_DIGITAL_PRESETS, ...CAMERA_FILM_PRESETS];
const grouped = new Map<string, string[]>();
for (const cam of (ALL_CAMERAS || []).sort()) {
  // Derive a manufacturer key by taking the first token and extracting
  // the alphabetic prefix. This maps 'Zenit-E' and 'Zenit 3M' -> 'Zenit',
  // and turns variants like 'Canon' or 'Nikon' into their base keys.
  const first = (cam.split(' ')[0] || 'Other').toString();
  const m = first.match(/[A-Za-zÀ-ÖØ-öø-ÿ]+/);
  const key = m ? m[0] : first;
  if (!grouped.has(key)) grouped.set(key, []);
  grouped.get(key)!.push(cam);
}

export const CAMERA_PRESETS: string[] = [];
for (const mfg of Array.from(grouped.keys()).sort()) {
  CAMERA_PRESETS.push(`─── ${mfg} ───`);
  CAMERA_PRESETS.push(...(grouped.get(mfg) || []));
}

export const LENS_PRESETS: string[] = [];

export const FILM_TYPE_PRESETS: string[] = [];

export const FILM_PRESETS: string[] = [];

export const ISO_PRESETS: string[] = [];

export function getMergedExifPresets(user?: User | null) {
  const rawUserPresets = user?.exifPresets || {};
  // Accept both camelCase and snake_case shapes that may exist in the DB
  const userPresets = normalizeExifPresets(rawUserPresets);
  return {
    cameras: [...new Set([...(userPresets.cameras), ...CAMERA_PRESETS])],
    lenses: [...new Set([...(userPresets.lenses), ...LENS_PRESETS])],
    filmTypes: [...new Set([...(userPresets.filmTypes), ...FILM_PRESETS])],
    filmIsos: [...new Set([...(userPresets.filmIsos), ...ISO_PRESETS])],
  };
}

// Normalize an incoming presets object to the canonical camelCase shape
export function normalizeExifPresets(raw: any) {
  const cameras = Array.isArray(raw?.cameras) ? raw.cameras : Array.isArray(raw?.camera) ? raw.camera : Array.isArray(raw?.camera_list) ? raw.camera_list : [];
  const lenses = Array.isArray(raw?.lenses) ? raw.lenses : Array.isArray(raw?.lens) ? raw.lens : [];
  // Accept both filmTypes and film_types
  const filmTypes = Array.isArray(raw?.filmTypes) ? raw.filmTypes : Array.isArray(raw?.film_types) ? raw.film_types : Array.isArray(raw?.film) ? raw.film : [];
  const filmIsos = Array.isArray(raw?.filmIsos) ? raw.filmIsos : Array.isArray(raw?.film_isos) ? raw.film_isos : Array.isArray(raw?.isos) ? raw.isos : [];

  return {
    cameras: cameras || [],
    lenses: lenses || [],
    filmTypes: filmTypes || [],
    filmIsos: filmIsos || [],
  };
}