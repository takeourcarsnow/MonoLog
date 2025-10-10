// Shared helpers for mapping user adjustment controls to CSS filter values
export function mapBasicAdjustments({ exposure = 0, contrast = 0, saturation = 0, temperature = 0 }:{ exposure?: number; contrast?: number; saturation?: number; temperature?: number }) {
  // temperature mapped to hue-rotate degrees (-30..30 deg)
  // NOTE: invert sign so that increasing the temperature slider -> warmer (positive hue)
  const hue = Math.round((-temperature / 100) * 30);

  // Convert saturation from -1..1 range to CSS saturation value
  // -1 = desaturated (0.5), 0 = neutral (1.0), 1 = saturated (1.5)
  const cssSaturation = 1 + saturation * 0.5;

  // Map exposure to a brightness multiplier with a smooth exponential curve.
  // This makes small slider movements in the + direction produce gentle increases
  // while still allowing stronger brightening near the end of the range without
  // immediately clipping highlights.
  // exposure is expected in roughly -1..1 range; we map that to a multiplier
  // using an exponential-like function (softplus-ish). For positive exposure
  // we use (1 + k*exposure) ^ p to provide a smooth ramp; for negative we
  // use a reciprocal to darken smoothly.
  const brightenK = 0.9; // scale for how strong brightening can be
  const brightenPow = 1.6; // curvature for brightening
  let brightness: number;
  if (exposure >= 0) {
    brightness = Math.pow(1 + brightenK * exposure, brightenPow);
  } else {
    // For darkening use a milder exponential so shadows preserve detail.
    brightness = 1 / Math.pow(1 + 0.6 * Math.abs(exposure), 1.2);
  }

  // Highlight protection: when brightening, slightly reduce contrast in highlights
  // to avoid immediate clipping. This uses a gentle curve so contrast isn't lost
  // entirely for moderate exposure values.
  const highlightProtectionContrast = exposure > 0
    ? Math.max(0.78, 1 - Math.pow(exposure, 0.9) * 0.12)
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
