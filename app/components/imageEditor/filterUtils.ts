// Shared helpers for mapping user adjustment controls to CSS filter values
export function mapBasicAdjustments({ exposure = 0, contrast = 0, saturation = 0, temperature = 0 }:{ exposure?: number; contrast?: number; saturation?: number; temperature?: number }) {
  // temperature mapped to hue-rotate degrees (-30..30 deg)
  // NOTE: invert sign so that increasing the temperature slider -> warmer (positive hue)
  const hue = Math.round((-temperature / 100) * 30);

  // Convert saturation from -1..1 range to CSS saturation value.
  // Use a mildly non-linear mapping so small adjustments near 0 are subtle
  // while larger adjustments become progressively stronger.
  // -1 => ~0.6, 0 => 1.0, 1 => ~1.6
  const satSign = Math.sign(saturation || 0);
  const satMag = Math.abs(saturation);
  const cssSaturation = 1 + satSign * (0.4 + 0.6 * Math.pow(satMag, 0.9)) * satMag;

  // Simple brightness multiplier for exposure with gentle curve to prevent highlight clipping
  // exposure range: -2 to 2, mapped to brightness multiplier range: ~0.44 to ~2.25
  // Using a gentler exponential curve (base 1.5) to give better control and avoid clipping
  const brightness = Math.pow(1.5, exposure);

  // Convert user contrast from -1..1 range to CSS contrast value
  // Map contrast more gently to avoid overly punchy results at small slider values.
  // Use a mild exponential mapping so +contrast yields a pleasing ramp while
  // -contrast darkens in a predictable way.
  const cssContrastBase = 1 + contrast * 0.45;
  const cssContrast = contrast >= 0 ? Math.pow(cssContrastBase, 1.06) : 1 / Math.pow(1 - contrast * 0.35, 1.02);

  const baseFilter = `brightness(${brightness}) contrast(${cssContrast}) saturate(${cssSaturation}) hue-rotate(${hue}deg)`;

  // Temperature tint: provide a small normalized tint value (-1..1) which
  // the renderer/shader can use to apply a warm/cool color cast. We keep the
  // tint subtle by default so temperature behaves predictably.
  const tempTint = Math.max(-1, Math.min(1, temperature / 100));

  return {
    brightness,
    finalContrast: cssContrast,
    cssSaturation,
    hue,
    baseFilter,
  };
}
