// Shared helpers for mapping user adjustment controls to CSS filter values
export function mapBasicAdjustments({ exposure = 0, contrast = 0, saturation = 0, temperature = 0 }:{ exposure?: number; contrast?: number; saturation?: number; temperature?: number }) {
  // temperature mapped to hue-rotate degrees (-30..30 deg)
  const hue = Math.round((temperature / 100) * 30);

  // Convert saturation from -1..1 range to CSS saturation value
  // -1 = desaturated (0.5), 0 = neutral (1.0), 1 = saturated (1.5)
  const cssSaturation = 1 + saturation * 0.5;

  // Calculate very conservative brightness adjustment to prevent highlight clipping
  // Use smaller multipliers and add highlight protection through contrast
  const brightness = exposure >= 0
    ? 1 + exposure * 0.15 // very conservative brightening
    : Math.pow(0.9, -exposure); // conservative darkening

  // Adjust contrast to protect highlights when brightening
  const highlightProtectionContrast = exposure > 0
    ? Math.max(0.85, 1 - exposure * 0.15)
    : 1.0;

  // Convert user contrast from -1..1 range to CSS contrast value
  const cssContrast = 1 + contrast * 0.5;
  const finalContrast = cssContrast * highlightProtectionContrast;

  const baseFilter = `brightness(${brightness}) contrast(${finalContrast}) saturate(${cssSaturation}) hue-rotate(${hue}deg)`;

  return {
    brightness,
    finalContrast,
    cssSaturation,
    hue,
    baseFilter,
  };
}
