import { RotateCcw, Circle, Clapperboard, Droplet, Feather, Camera, Sun, Snowflake, Film, Palette, Aperture } from "lucide-react";

// Filter icon mapping
export const FILTER_ICONS: Record<string, React.ComponentType<any>> = {
  none: RotateCcw,
  default: Film,
  // Film emulation icons
  portra: Palette,
  velvia: Aperture,
  trix: Circle,
  hp5: Circle,
  provia: Palette,
  ektar: Aperture,
  astia: Palette,
  ektachrome: Aperture,
  delta: Circle,
  gold: Palette,
  scala: Circle,
  fp4: Circle,
  tmax: Circle,
  panatomic: Circle
};

// central filter presets map (CSS filter fragments). Add new presets here.
export const FILTER_PRESETS: Record<string, string> = {
  none: '',
  invert: 'invert(1)',
  // Film emulation presets
  portra: 'contrast(1.2) brightness(1.1) saturate(1.1) sepia(0.1) hue-rotate(-5deg)',
  velvia: 'contrast(1.15) saturate(1.3) brightness(0.95)',
  trix: 'grayscale(1) contrast(1.5) brightness(0.9)',
  hp5: 'grayscale(1) contrast(1.4) brightness(0.95) sepia(0.2)',
  provia: 'contrast(1.1) saturate(1.05) brightness(1.02)',
  ektar: 'contrast(1.2) saturate(1.4) brightness(0.95)',
  astia: 'contrast(1.1) saturate(1.15) brightness(1.08) sepia(0.1)',
  ektachrome: 'contrast(1.3) saturate(1.6) brightness(0.88) hue-rotate(12deg)',
  delta: 'grayscale(1) contrast(1.4) brightness(0.8)',
  gold: 'contrast(1.2) saturate(1.25) brightness(1.05) sepia(0.12)',
  scala: 'grayscale(1) contrast(1.7) brightness(0.92)',
  fp4: 'grayscale(1) contrast(1.2) brightness(0.95)',
  tmax: 'grayscale(1) contrast(1.3) brightness(0.9)',
  panatomic: 'grayscale(1) contrast(1.1) brightness(1.0)'
};

// unique colors for each category button when selected
export const CATEGORY_COLORS: Record<string, string> = {
  basic: '#2d9cff',    // blue
  color: '#ff6b6b',    // red/pink
  effects: '#9b5cff',  // purple
  crop: '#00c48c',     // green
  frame: '#ffb703'     // warm yellow
};

// unique colors for each filter button when selected
export const FILTER_COLORS: Record<string, string> = {
  none: '#94a3b8',    // neutral
  invert: '#64748b',  // gray-blue
  // Film emulation colors
  portra: '#f59e0b', // warm amber
  velvia: '#10b981',  // emerald green
  trix: '#1f2937',   // dark gray
  hp5: '#92400e',       // warm brown
  provia: '#3b82f6',    // blue
  ektar: '#dc2626',     // red
  astia: '#8b5cf6',  // purple
  ektachrome: '#06b6d4', // cyan
  delta: '#6b7280',  // gray
  gold: '#fbbf24',   // yellow
  scala: '#374151',     // dark slate
  fp4: '#2d3748',       // dark gray
  tmax: '#4a5568',   // medium gray
  panatomic: '#718096'  // light gray
};
