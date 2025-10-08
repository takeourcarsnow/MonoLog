// Shared helpers for mapping user adjustment controls to CSS filter values
export function mapBasicAdjustments({ exposure = 0, contrast = 0, saturation = 0, temperature = 0 }:{ exposure?: number; contrast?: number; saturation?: number; temperature?: number }) {
  // temperature mapped to hue-rotate degrees (-30..30 deg)
  // NOTE: invert sign so that increasing the temperature slider -> warmer (positive hue)
  const hue = Math.round((-temperature / 100) * 30);

  // Convert saturation from -1..1 range to CSS saturation value
  // -1 = desaturated (0.5), 0 = neutral (1.0), 1 = saturated (1.5)
  const cssSaturation = 1 + saturation * 0.5;

  // Calculate very conservative brightness adjustment to prevent highlight clipping
  // Make exposure more responsive: increase brightening multiplier so the slider
  // produces a stronger visible change, but keep some highlight protection.
  // Also make darkening slightly stronger for negative values.
  const brightness = exposure >= 0
    ? 1 + exposure * 0.45 // stronger brightening (was 0.15)
    : Math.pow(0.85, -exposure); // stronger darkening (was 0.9)

  // Adjust contrast to protect highlights when brightening but less aggressively
  // so images retain punch when increased exposure.
  const highlightProtectionContrast = exposure > 0
    ? Math.max(0.7, 1 - exposure * 0.08)
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
