import { RotateCcw, Circle, Clapperboard, Droplet, Feather, Camera, Sun, Snowflake, Film, Palette, Aperture } from "lucide-react";
import { FILTER_PRESETS, CATEGORY_COLORS, FILTER_COLORS } from "./effectsConfig";

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
