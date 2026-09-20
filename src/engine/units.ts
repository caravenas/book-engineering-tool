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

/**
 * Round a value for display, falling back to exponential notation for a
 * value that can't be rounded to a finite number (e.g. Infinity or NaN),
 * so the interface never shows "NaN" or "Infinity" to the user.
 */
export function formatRoundedValue(value: number, decimals: number): string {
  const roundedValue = roundTo(value, decimals);
  return Number.isFinite(roundedValue) ? String(roundedValue) : value.toExponential();
}

/** Format a millimeter value, rounded to 2 decimals. */
export function formatMm(value: number): string {
  return formatRoundedValue(value, 2);
}

/** Format a weight in grams, switching to kilograms above 1000 g. */
export function formatWeight(grams: number): string {
  return grams >= 1000 ? `${formatMm(grams / 1000)} kg` : `${formatMm(grams)} g`;
}

/** Format an area in square meters, rounded to 4 decimals. */
export function formatArea(area_m2: number): string {
  return formatRoundedValue(area_m2, 4);
}

// Convert a finite mm value for display without passing invalid geometry to number inputs.
function toDisplayValue(value_mm: number, unitSystem: 'metric' | 'imperial', decimals: number): number | '' {
  if (!Number.isFinite(value_mm)) {
    return '';
  }

  const converted = unitSystem === 'imperial' ? mmToInches(value_mm) : value_mm;
  if (!Number.isFinite(converted)) {
    return '';
  }

  const rounded = roundTo(converted, decimals);
  if (!Number.isFinite(rounded) || (converted !== 0 && rounded === 0)) {
    return converted;
  }

  return rounded;
}

/**
 * The page-dimensions panel and the page preview both display the same
 * width/height/bleed converted to the active unit system, with bleed
 * rounded to an extra decimal under imperial units. A single pure function
 * keeps that conversion and its unit label in one place instead of two
 * copies drifting apart.
 */
export function getPageDisplayDimensions(
  pageWidth_mm: number,
  pageHeight_mm: number,
  bleed_mm: number,
  unitSystem: 'metric' | 'imperial'
): { displayW: number | ''; displayH: number | ''; displayBleed: number | ''; unit: string } {
  const dimensionDecimals = unitSystem === 'imperial' ? 2 : 1;
  const bleedDecimals = unitSystem === 'imperial' ? 3 : 1;
  return {
    displayW: toDisplayValue(pageWidth_mm, unitSystem, dimensionDecimals),
    displayH: toDisplayValue(pageHeight_mm, unitSystem, dimensionDecimals),
    displayBleed: toDisplayValue(bleed_mm, unitSystem, bleedDecimals),
    unit: unitSystem === 'imperial' ? '″' : 'mm',
  };
}
