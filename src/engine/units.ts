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
 * Whether a measurement can be drawn or divided at all. Written twice already
 * in two components before it was needed a third time, so it lives once here:
 * every geometry in this app has to reject an infinity or a NaN before it
 * reaches a viewBox, where it turns into an invisible drawing.
 */
export function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/** The same, for a measurement a zero is legitimate for, such as a bleed. */
export function isNonNegativeFinite(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
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

/**
 * Format a weight in grams, switching to kilograms above 1000 g.
 *
 * One decimal of a gram, not two: the cover weight printed 18.53 g beside an
 * interior weight that printed 70.6 g, the same quantity written two ways in
 * one column, and the second decimal claims a precision a tool that calls
 * every figure a preliminary reference does not have.
 */
export function formatWeight(grams: number): string {
  const { value, unit } = formatWeightParts(grams);
  return `${value} ${unit}`;
}

/**
 * The same weight, split into the figure and the unit it is in, for the
 * results column, which writes the unit small beside the figure rather than
 * inside it. One rule decides the unit, and both callers ask it.
 */
export function formatWeightParts(grams: number): { value: string; unit: string } {
  // The threshold is decided on the value as it will be shown, not as it
  // arrives: 999.95 g rounds to 1000 at one decimal, and printing "1000 g"
  // beside a scale that switches at a kilo reads like the switch is broken.
  const shown = roundTo(grams, 1);
  return shown >= 1000
    ? { value: formatRoundedValue(grams / 1000, 2), unit: 'kg' }
    : { value: formatRoundedValue(grams, 1), unit: 'g' };
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
