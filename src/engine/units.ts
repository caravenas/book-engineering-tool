// ─── Unit Conversion Utilities ───────────────────────────────────────────
// Precision target: < 0.5% error on roundtrip conversions

const MM_PER_INCH = 25.4;
const POINTS_PER_INCH = 72;
const MM_PER_POINT = MM_PER_INCH / POINTS_PER_INCH;

/** Millimeters → Inches */
export function mmToInches(mm: number): number {
  return mm / MM_PER_INCH;
}

/** Inches → Millimeters */
export function inchesToMm(inches: number): number {
  return inches * MM_PER_INCH;
}

/** Millimeters → Points (PostScript) */
export function mmToPoints(mm: number): number {
  return mm / MM_PER_POINT;
}

/** Points → Millimeters */
export function pointsToMm(points: number): number {
  return points * MM_PER_POINT;
}

/**
 * Round a number to a specified number of decimal places.
 * Used to present clean values to the user.
 */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Format a measurement value for display, with the appropriate unit suffix.
 */
export function formatMeasurement(
  value_mm: number,
  system: 'metric' | 'imperial',
  decimals: number = 1
): string {
  if (system === 'imperial') {
    return `${roundTo(mmToInches(value_mm), decimals + 1)}″`;
  }
  return `${roundTo(value_mm, decimals)} mm`;
}
