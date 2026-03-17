import type { ImpositionResult, PagePlacement } from '../types';

/**
 * Core Imposition Engine
 * 
 * Calculates how many book pages fit on each side of a press sheet,
 * choosing optimal orientation to minimize waste (merma).
 * This is the critical algorithm of PliegoStack.
 */

interface FitResult {
  cols: number;
  rows: number;
  total: number;
  rotated: boolean;
}

/**
 * Calculate how many pages fit in a given orientation.
 */
function fitPages(
  pageW: number,
  pageH: number,
  sheetW: number,
  sheetH: number,
  rotated: boolean
): FitResult {
  const pw = rotated ? pageH : pageW;
  const ph = rotated ? pageW : pageH;

  const cols = Math.floor(sheetW / pw);
  const rows = Math.floor(sheetH / ph);

  return {
    cols,
    rows,
    total: cols * rows,
    rotated,
  };
}

/**
 * Generate placement positions for each page on the sheet.
 */
function generatePlacements(
  cols: number,
  rows: number,
  pageW: number,
  pageH: number,
  rotated: boolean
): PagePlacement[] {
  const placements: PagePlacement[] = [];
  const pw = rotated ? pageH : pageW;
  const ph = rotated ? pageW : pageH;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      placements.push({
        x: col * pw,
        y: row * ph,
        width: pw,
        height: ph,
        rotated,
      });
    }
  }

  return placements;
}

/**
 * Calculate imposition — the main function of the engine.
 * 
 * Takes the page dimensions (including bleed) and the press sheet size,
 * then determines the optimal layout to minimize paper waste.
 * 
 * @param pageWidth_mm  - Finished page width INCLUDING bleed on both sides
 * @param pageHeight_mm - Finished page height INCLUDING bleed on both sides
 * @param sheetWidth_mm - Press sheet width
 * @param sheetHeight_mm - Press sheet height
 * @param orientation - 'auto' chooses best, 'normal' forces unrotated, 'rotated' forces 90°
 * @returns ImpositionResult with layout details and waste percentage
 */
export function calculateImposition(
  pageWidth_mm: number,
  pageHeight_mm: number,
  sheetWidth_mm: number,
  sheetHeight_mm: number,
  orientation: 'auto' | 'normal' | 'rotated' = 'auto'
): ImpositionResult {
  // Validate inputs
  if (pageWidth_mm <= 0 || pageHeight_mm <= 0) {
    throw new Error('Page dimensions must be positive');
  }
  if (sheetWidth_mm <= 0 || sheetHeight_mm <= 0) {
    throw new Error('Sheet dimensions must be positive');
  }

  // Calculate both orientations
  const normal = fitPages(pageWidth_mm, pageHeight_mm, sheetWidth_mm, sheetHeight_mm, false);
  const rotated = fitPages(pageWidth_mm, pageHeight_mm, sheetWidth_mm, sheetHeight_mm, true);

  // The true optimum is whichever fits the most pages
  const optimum = rotated.total > normal.total ? rotated : normal;

  // Apply user restriction
  let selected;
  if (orientation === 'normal') {
    selected = normal;
  } else if (orientation === 'rotated') {
    selected = rotated;
  } else {
    selected = optimum;
  }

  // Check if chosen one is optimal
  const isOptimal = selected.total >= optimum.total && selected.total > 0;

  // If no pages fit at all in the chosen orientation
  if (selected.total === 0) {
    return {
      pagesPerSide: 0,
      cols: 0,
      rows: 0,
      rotated: selected.rotated,
      wastePercentage: 100,
      usedArea_mm2: 0,
      totalArea_mm2: sheetWidth_mm * sheetHeight_mm,
      placements: [],
      optimal: false,
    };
  }

  // Calculate areas
  const totalArea = sheetWidth_mm * sheetHeight_mm;
  const pageArea = pageWidth_mm * pageHeight_mm;
  const usedArea = pageArea * selected.total;
  const wastePercentage = ((totalArea - usedArea) / totalArea) * 100;

  // Generate placements for visualization
  const placements = generatePlacements(
    selected.cols,
    selected.rows,
    pageWidth_mm,
    pageHeight_mm,
    selected.rotated
  );

  return {
    pagesPerSide: selected.total,
    cols: selected.cols,
    rows: selected.rows,
    rotated: selected.rotated,
    wastePercentage,
    usedArea_mm2: usedArea,
    totalArea_mm2: totalArea,
    placements,
    optimal: isOptimal,
  };
}
