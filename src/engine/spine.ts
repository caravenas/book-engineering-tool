import type { SpineResult } from '../types';

function assertPositiveFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} debe ser un número finito mayor que cero`);
  }
}

function assertPositiveSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${label} debe ser un entero seguro mayor que cero`);
  }
}

/**
 * Formula: ceil(totalPages / 2) × (caliper_microns / 1000).
 * An odd final page consumes a complete physical sheet.
 */
export function calculateSpineThickness(
  totalPages: number,
  caliper_microns: number
): number {
  assertPositiveSafeInteger(totalPages, 'El número de páginas');
  assertPositiveFinite(caliper_microns, 'El calibre');

  const sheets = Math.ceil(totalPages / 2);
  const caliper_mm = caliper_microns / 1000;
  assertPositiveFinite(sheets, 'El número derivado de hojas');
  assertPositiveFinite(caliper_mm, 'El calibre convertido');

  const thickness = sheets * caliper_mm;
  assertPositiveFinite(thickness, 'El espesor de lomo calculado');
  return thickness;
}

/**
 * Formula: ceil(totalPages / 2) × width_m × height_m × grammage_g_m2.
 * An odd final page consumes a complete physical sheet.
 */
export function calculateWeight(
  pageWidth_mm: number,
  pageHeight_mm: number,
  totalPages: number,
  grammage: number
): number {
  assertPositiveFinite(pageWidth_mm, 'El ancho de página');
  assertPositiveFinite(pageHeight_mm, 'El alto de página');
  assertPositiveSafeInteger(totalPages, 'El número de páginas');
  assertPositiveFinite(grammage, 'El gramaje');

  const sheets = Math.ceil(totalPages / 2);
  const width_m = pageWidth_mm / 1000;
  const height_m = pageHeight_mm / 1000;
  const areaPerSheet_m2 = width_m * height_m;
  assertPositiveFinite(sheets, 'El número derivado de hojas');
  assertPositiveFinite(width_m, 'El ancho convertido');
  assertPositiveFinite(height_m, 'El alto convertido');
  assertPositiveFinite(areaPerSheet_m2, 'El área derivada por hoja');

  const weight = sheets * areaPerSheet_m2 * grammage;
  assertPositiveFinite(weight, 'El peso interior calculado');
  return weight;
}

/**
 * Calculate the preliminary spine and interior-paper weight references.
 */
export function calculateSpineAndWeight(
  pageWidth_mm: number,
  pageHeight_mm: number,
  totalPages: number,
  grammage: number,
  caliper_microns: number
): SpineResult {
  return {
    thickness_mm: calculateSpineThickness(totalPages, caliper_microns),
    totalWeight_g: calculateWeight(pageWidth_mm, pageHeight_mm, totalPages, grammage),
  };
}
