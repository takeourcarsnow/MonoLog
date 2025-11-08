// Shared palettes and helper to resolve a palette name or parse a custom palette string
import { palettes } from "./palettesConfig";

export function parseCustomPalette(customPaletteStr?: string): number[] | null {
  if (!customPaletteStr) return null;
  const parts = customPaletteStr.split(',').map(s => s.trim()).filter(Boolean);
  const arr: number[] = [];
  for (const hex of parts) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) continue;
    const v = parseInt(m[1], 16);
    arr.push((v >> 16) & 255, (v >> 8) & 255, v & 255);
  }
  return arr.length >= 3 ? arr : null;
}

export function getPaletteFromChoice(paletteName: string | undefined, customPaletteStr?: string): number[] | null {
  if (!paletteName || paletteName === 'auto') return null;
  if ((palettes as any)[paletteName]) return (palettes as any)[paletteName];
  return parseCustomPalette(customPaletteStr);
}
