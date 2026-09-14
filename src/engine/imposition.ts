import type { ImpositionResult, PagePlacement } from '../types';

const PREVIEW_PLACEMENT_LIMIT = 250;

interface FitResult {
  cols: number;
  rows: number;
  total: number;
  rotated: boolean;
}

function assertPositiveFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} debe ser un número finito mayor que cero`);
  }
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${label} debe ser un número finito`);
  }
}

function assertSafeCount(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} excede el rango entero seguro`);
  }
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

  assertSafeCount(cols, 'El número de columnas');
  assertSafeCount(rows, 'El número de filas');

  const total = cols * rows;
  assertSafeCount(total, 'El número total de ubicaciones');

  return { cols, rows, total, rotated };
}

/**
 * Generate only the bounded set of positions used by the visual preview.
 */
function generatePlacements(
  total: number,
  cols: number,
  pageW: number,
  pageH: number,
  rotated: boolean
): PagePlacement[] {
  const previewCount = Math.min(total, PREVIEW_PLACEMENT_LIMIT);
  const placements: PagePlacement[] = [];
  const pw = rotated ? pageH : pageW;
  const ph = rotated ? pageW : pageH;

  for (let index = 0; index < previewCount; index++) {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = col * pw;
    const y = row * ph;

    assertFinite(x, 'La posición horizontal de la vista previa');
    assertFinite(y, 'La posición vertical de la vista previa');

    placements.push({ x, y, width: pw, height: ph, rotated });
  }

  return placements;
}

/**
 * Compare normal and rotated uniform grids for a page inside a sheet.
 */
export function calculateImposition(
  pageWidth_mm: number,
  pageHeight_mm: number,
  sheetWidth_mm: number,
  sheetHeight_mm: number,
  orientation: 'auto' | 'normal' | 'rotated' = 'auto'
): ImpositionResult {
  assertPositiveFinite(pageWidth_mm, 'El ancho de página');
  assertPositiveFinite(pageHeight_mm, 'El alto de página');
  assertPositiveFinite(sheetWidth_mm, 'El ancho del pliego');
  assertPositiveFinite(sheetHeight_mm, 'El alto del pliego');

  const totalArea = sheetWidth_mm * sheetHeight_mm;
  const pageArea = pageWidth_mm * pageHeight_mm;
  assertPositiveFinite(totalArea, 'El área total del pliego');
  assertPositiveFinite(pageArea, 'El área de página');

  const normal = fitPages(pageWidth_mm, pageHeight_mm, sheetWidth_mm, sheetHeight_mm, false);
  const rotated = fitPages(pageWidth_mm, pageHeight_mm, sheetWidth_mm, sheetHeight_mm, true);
  const bestOrientation = rotated.total > normal.total ? rotated : normal;

  let selected: FitResult;
  if (orientation === 'normal') {
    selected = normal;
  } else if (orientation === 'rotated') {
    selected = rotated;
  } else {
    selected = bestOrientation;
  }

  const usedArea = pageArea * selected.total;
  assertFinite(usedArea, 'El área utilizada');

  const wastePercentage = selected.total === 0
    ? 100
    : ((totalArea - usedArea) / totalArea) * 100;
  assertFinite(wastePercentage, 'El porcentaje de área no utilizada');

  const placements = generatePlacements(
    selected.total,
    selected.cols,
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
    previewTruncated: placements.length < selected.total,
    usesBestOrientation: selected.total === bestOrientation.total,
  };
}
