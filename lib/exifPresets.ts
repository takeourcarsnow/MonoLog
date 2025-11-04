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
  // Filter to only valid keys to handle corrupted data
  const userPresets = {
    cameras: Array.isArray(rawUserPresets.cameras) ? rawUserPresets.cameras : [],
    lenses: Array.isArray(rawUserPresets.lenses) ? rawUserPresets.lenses : [],
    filmTypes: Array.isArray(rawUserPresets.filmTypes) ? rawUserPresets.filmTypes : [],
    filmIsos: Array.isArray(rawUserPresets.filmIsos) ? rawUserPresets.filmIsos : [],
  };
  return {
    cameras: [...new Set([...(userPresets.cameras), ...CAMERA_PRESETS])],
    lenses: [...new Set([...(userPresets.lenses), ...LENS_PRESETS])],
    filmTypes: [...new Set([...(userPresets.filmTypes), ...FILM_PRESETS])],
    filmIsos: [...new Set([...(userPresets.filmIsos), ...ISO_PRESETS])],
  };
}