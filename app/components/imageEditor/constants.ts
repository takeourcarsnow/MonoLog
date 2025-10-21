import { RotateCcw, Circle, Clapperboard, Droplet, Feather, Camera, Sun, Snowflake, Film, Palette, Aperture } from "lucide-react";

// Filter icon mapping
export const FILTER_ICONS: Record<string, React.ComponentType<any>> = {
  none: RotateCcw,
  sepia: Circle,
  mono: Circle,
  cinema: Clapperboard,
  bleach: Droplet,
  vintage: Feather,
  lomo: Camera,
  warm: Sun,
  cool: Snowflake,
  default: Film,
  // Film emulation icons
  portra400: Palette,
  velvia50: Aperture,
  trix400: Circle,
  hp5: Circle,
  provia: Palette,
  ektar: Aperture
};

// central filter presets map (CSS filter fragments). Add new presets here.
export const FILTER_PRESETS: Record<string, string> = {
  none: '',
  sepia: 'sepia(0.45)',
  mono: 'grayscale(0.95)',
  cinema: 'contrast(1.15) saturate(1.05) hue-rotate(-5deg)',
  bleach: 'saturate(1.3) contrast(0.95) brightness(1.02)',
  vintage: 'sepia(0.35) contrast(0.95) saturate(0.9) brightness(0.98)',
  lomo: 'contrast(1.25) saturate(1.35) brightness(1.02) sepia(0.08)',
  warm: 'saturate(1.05) hue-rotate(-6deg) brightness(1.01)',
  cool: 'saturate(0.95) hue-rotate(6deg) brightness(0.99)',
  invert: 'invert(1)',
  film: 'contrast(1.08) saturate(0.92) brightness(0.98)',
  // Film emulation presets
  portra400: 'contrast(1.2) brightness(1.1) saturate(1.1) sepia(0.1) hue-rotate(-5deg)',
  velvia50: 'contrast(1.15) saturate(1.3) brightness(0.95)',
  trix400: 'grayscale(1) contrast(1.5) brightness(0.9)',
  hp5: 'grayscale(1) contrast(1.4) brightness(0.95) sepia(0.2)',
  provia: 'contrast(1.1) saturate(1.05) brightness(1.02)',
  ektar: 'contrast(1.2) saturate(1.4) brightness(0.95)'
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
  sepia: '#d97706',   // amber
  mono: '#374151',    // slate
  cinema: '#0ea5a5',  // teal
  bleach: '#ef4444',  // red
  vintage: '#8b5cf6', // violet
  lomo: '#fb923c',    // orange
  warm: '#ffb86b',    // warm
  cool: '#60a5fa',    // cool blue
  invert: '#64748b',  // gray-blue
  film: '#16a34a',    // green
  // Film emulation colors
  portra400: '#f59e0b', // warm amber
  velvia50: '#10b981',  // emerald green
  trix400: '#1f2937',   // dark gray
  hp5: '#92400e',       // warm brown
  provia: '#3b82f6',    // blue
  ektar: '#dc2626'      // red
};
