import type { SpineResult } from '../types';

/**
 * Spine & Weight Calculator
 * 
 * Calculates the physical properties of the finished book:
 * - Spine thickness (lomo) based on page count and paper caliper
 * - Total weight based on page area, count, and paper grammage
 */

/**
 * Calculate spine thickness.
 * 
 * Formula: Lomo = (totalPages / 2) × (caliper_microns / 1000)
 * 
 * totalPages / 2 = number of physical sheets (each sheet has 2 pages)
 * caliper / 1000 = convert microns to millimeters
 * 
 * @param totalPages     - Total number of pages (front + back of each sheet)
 * @param caliper_microns - Caliper (thickness) per sheet in microns (μm)
 * @returns Spine thickness in mm
 */
export function calculateSpineThickness(
  totalPages: number,
  caliper_microns: number
): number {
  if (totalPages <= 0 || caliper_microns <= 0) return 0;
  return (totalPages / 2) * (caliper_microns / 1000);
}

/**
 * Calculate the total weight of the book's interior pages.
 * 
 * Formula: Weight_g = (width_m × height_m) × totalPages × grammage_g_m2
 * 
 * Note: grammage is grams per square METER, so we convert mm → m.
 * Each page is one side of a sheet, but the grammage applies to the
 * whole sheet. Since each sheet has 2 pages, we use totalPages/2
 * for the number of sheets, and each sheet has area = width × height.
 * But actually, for weight calculation each page counts individually
 * because the user selects "totalPages" as the total number of
 * printed sides, and the weight of paper is per sheet (2 pages).
 * 
 * Corrected formula:
 * Sheets = totalPages / 2
 * Area_per_sheet = (width_mm / 1000) × (height_mm / 1000) [in m²]
 * Weight = Sheets × Area_per_sheet × grammage
 * 
 * @param pageWidth_mm   - Page width in mm (trim size, no bleed)
 * @param pageHeight_mm  - Page height in mm (trim size, no bleed)
 * @param totalPages     - Total number of pages
 * @param grammage       - Paper grammage in g/m²
 * @returns Total weight in grams
 */
export function calculateWeight(
  pageWidth_mm: number,
  pageHeight_mm: number,
  totalPages: number,
  grammage: number
): number {
  if (pageWidth_mm <= 0 || pageHeight_mm <= 0 || totalPages <= 0 || grammage <= 0) return 0;

  const sheets = totalPages / 2;
  const areaPerSheet_m2 = (pageWidth_mm / 1000) * (pageHeight_mm / 1000);
  return sheets * areaPerSheet_m2 * grammage;
}

/**
 * Calculate both spine thickness and weight at once.
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
