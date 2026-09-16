import type {
  FoldingScheme,
  PrintingMode,
  SignatureOption,
  SignaturePlacement,
  SignaturePlanInput,
  SignaturePlanReason,
  SignaturePlanResult,
} from '../types';

// Tolerance for millimeter comparisons: geometry accumulated through several
// additions/multiplications can be off by float noise far smaller than any
// real press can resolve, and an exact `<=`/`===` would reject or tie-break
// on that noise instead of the real fit.
const EPSILON_MM = 1e-9;
const EPSILON_AREA_MM2 = 1e-6;

function assertPositiveFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} debe ser un número finito mayor que cero`);
  }
}

function assertNonNegativeFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} debe ser un número finito no negativo`);
  }
}

function assertPositiveSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${label} debe ser un entero seguro mayor que cero`);
  }
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${label} debe ser un número finito`);
  }
}

/** Whether a `cols` × `rows` grid of `cellW` × `cellH` cells, separated by `gutter`, fits inside a `printableWidth` × `printableHeight` area, within a small float tolerance. */
function fitsGrid(
  cols: number,
  rows: number,
  cellW: number,
  cellH: number,
  gutter: number,
  printableWidth: number,
  printableHeight: number
): boolean {
  const widthUsed = cols * cellW + (cols - 1) * gutter;
  const heightUsed = rows * cellH + (rows - 1) * gutter;
  return widthUsed <= printableWidth + EPSILON_MM && heightUsed <= printableHeight + EPSILON_MM;
}

/**
 * Detect whether a scheme can be printed from a single plate (work-and-turn):
 * this is a geometric simplification, not a full prepress simulation. Page
 * numbers necessarily differ between front and back (every page appears once
 * across the whole signature), so the only per-slot attribute that can be
 * compared for a left-right mirror is rotation: a scheme qualifies when, for
 * every row, the back slot at the column mirrored around the row's center
 * shares the same rotation as the front slot, for every column.
 */
function detectPrintingMode(scheme: FoldingScheme): PrintingMode {
  const { cols, rows, sides } = scheme;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const frontSlot = sides.front[row * cols + col];
      const mirroredCol = cols - 1 - col;
      const backSlot = sides.back[row * cols + mirroredCol];
      if (!frontSlot || !backSlot || frontSlot.rotation !== backSlot.rotation) {
        return 'planchas-separadas';
      }
    }
  }

  return 'tiro-retiro';
}

/**
 * Evaluate one folding scheme against the printable area and page cell, and
 * return its option when it fits in either orientation, or `null` when it
 * doesn't fit in any orientation or is itself malformed (a malformed scheme
 * in the list must not prevent the other schemes from being evaluated).
 */
function evaluateScheme(
  scheme: FoldingScheme,
  cellW: number,
  cellH: number,
  gutter_mm: number,
  sideMargin_mm: number,
  gripperMargin_mm: number,
  printableWidth: number,
  printableHeight: number,
  printableArea_mm2: number,
  totalPages: number
): SignatureOption | null {
  try {
    assertPositiveSafeInteger(scheme.cols, 'El número de columnas del esquema');
    assertPositiveSafeInteger(scheme.rows, 'El número de filas del esquema');
    assertPositiveSafeInteger(scheme.pagesPerSignature, 'Las páginas por firma del esquema');
  } catch {
    return null;
  }

  const normalFits = fitsGrid(scheme.cols, scheme.rows, cellW, cellH, gutter_mm, printableWidth, printableHeight);
  const rotatedFits = fitsGrid(scheme.cols, scheme.rows, cellH, cellW, gutter_mm, printableWidth, printableHeight);

  if (!normalFits && !rotatedFits) {
    return null;
  }

  // When both orientations fit, the used area is the same product (cols ×
  // rows × cellW × cellH) either way, so the normal orientation is always at
  // least as good; when only one fits, that one must be used.
  const pageRotated = !normalFits;

  const cellWidth_mm = pageRotated ? cellH : cellW;
  const cellHeight_mm = pageRotated ? cellW : cellH;

  const signatures = Math.ceil(totalPages / scheme.pagesPerSignature);
  assertPositiveSafeInteger(signatures, 'El número de firmas por ejemplar');
  const blankPages = signatures * scheme.pagesPerSignature - totalPages;
  assertFinite(blankPages, 'El número de páginas en blanco');

  const usedArea_mm2 = scheme.cols * scheme.rows * cellWidth_mm * cellHeight_mm;
  assertFinite(usedArea_mm2, 'El área utilizada por el esquema');

  const wastePercentage = ((printableArea_mm2 - usedArea_mm2) / printableArea_mm2) * 100;
  assertFinite(wastePercentage, 'El porcentaje de área no utilizada');

  return {
    scheme,
    pageRotated,
    cols: scheme.cols,
    rows: scheme.rows,
    pagesPerSheet: scheme.cols * scheme.rows * 2,
    cellWidth_mm,
    cellHeight_mm,
    gutter_mm,
    sideMargin_mm,
    gripperMargin_mm,
    signatures,
    blankPages,
    sheetsPerCopy: signatures,
    usedArea_mm2,
    printableArea_mm2,
    wastePercentage,
    printingMode: detectPrintingMode(scheme),
  };
}

/**
 * Pick the option that wastes the least printable area. Ties are broken by
 * the larger `pagesPerSignature`, and a further tie (identical waste and
 * identical `pagesPerSignature`, e.g. two schemes with the same grid) is
 * broken by the scheme id so the result never depends on array order.
 * `usedArea_mm2` is compared instead of `wastePercentage` (a ratio) to avoid
 * the extra rounding a division introduces; both are compared with a small
 * epsilon since they are sums of float products.
 */
export function selectBestOption(options: SignatureOption[]): SignatureOption | null {
  let selected: SignatureOption | null = null;

  for (const option of options) {
    if (!selected) {
      selected = option;
      continue;
    }

    const usedAreaDelta = option.usedArea_mm2 - selected.usedArea_mm2;
    if (usedAreaDelta > EPSILON_AREA_MM2) {
      selected = option;
      continue;
    }
    if (usedAreaDelta < -EPSILON_AREA_MM2) {
      continue;
    }

    if (option.scheme.pagesPerSignature > selected.scheme.pagesPerSignature) {
      selected = option;
      continue;
    }
    if (option.scheme.pagesPerSignature < selected.scheme.pagesPerSignature) {
      continue;
    }

    if (option.scheme.id < selected.scheme.id) {
      selected = option;
    }
  }

  return selected;
}

/**
 * Determine which folding schemes fit a page (with bleed) on a press sheet,
 * and select the one that wastes the least paper. A pure function: it never
 * imports catalog data, only receives it as arguments.
 */
export function planSignatures(input: SignaturePlanInput): SignaturePlanResult {
  const {
    pageWidth_mm, pageHeight_mm, bleed_mm, sheetWidth_mm, sheetHeight_mm, press, schemes, totalPages,
  } = input;

  assertPositiveFinite(pageWidth_mm, 'El ancho de página');
  assertPositiveFinite(pageHeight_mm, 'El alto de página');
  assertNonNegativeFinite(bleed_mm, 'El sangrado');
  assertPositiveFinite(sheetWidth_mm, 'El ancho del pliego');
  assertPositiveFinite(sheetHeight_mm, 'El alto del pliego');
  assertPositiveSafeInteger(totalPages, 'El número de páginas totales');

  assertPositiveFinite(press.maxSheetWidth_mm, 'El ancho máximo de pliego de la prensa');
  assertPositiveFinite(press.maxSheetHeight_mm, 'El alto máximo de pliego de la prensa');
  assertNonNegativeFinite(press.sideMargin_mm, 'El margen lateral de la prensa');
  assertNonNegativeFinite(press.gripperMargin_mm, 'El margen de pinza de la prensa');
  assertNonNegativeFinite(press.tailMargin_mm, 'El margen de cola de la prensa');
  assertNonNegativeFinite(press.gutter_mm, 'La calle entre páginas de la prensa');

  const fitsNormalOnPress = sheetWidth_mm <= press.maxSheetWidth_mm + EPSILON_MM
    && sheetHeight_mm <= press.maxSheetHeight_mm + EPSILON_MM;
  const fitsRotatedOnPress = sheetWidth_mm <= press.maxSheetHeight_mm + EPSILON_MM
    && sheetHeight_mm <= press.maxSheetWidth_mm + EPSILON_MM;
  if (!fitsNormalOnPress && !fitsRotatedOnPress) {
    const reason: SignaturePlanReason = 'sheet-exceeds-press';
    return { options: [], selected: null, reason };
  }

  const printableWidth = sheetWidth_mm - 2 * press.sideMargin_mm;
  const printableHeight = sheetHeight_mm - press.gripperMargin_mm - press.tailMargin_mm;
  if (!Number.isFinite(printableWidth) || !Number.isFinite(printableHeight)
    || printableWidth <= 0 || printableHeight <= 0) {
    const reason: SignaturePlanReason = 'margins-exceed-sheet';
    return { options: [], selected: null, reason };
  }

  const printableArea_mm2 = printableWidth * printableHeight;
  assertPositiveFinite(printableArea_mm2, 'El área imprimible del pliego');

  const cellW = pageWidth_mm + 2 * bleed_mm;
  const cellH = pageHeight_mm + 2 * bleed_mm;
  assertPositiveFinite(cellW, 'El ancho de la página con sangrado');
  assertPositiveFinite(cellH, 'El alto de la página con sangrado');

  const options: SignatureOption[] = [];
  for (const scheme of schemes) {
    const option = evaluateScheme(
      scheme,
      cellW,
      cellH,
      press.gutter_mm,
      press.sideMargin_mm,
      press.gripperMargin_mm,
      printableWidth,
      printableHeight,
      printableArea_mm2,
      totalPages
    );
    if (option) {
      options.push(option);
    }
  }

  const selected = selectBestOption(options);
  const reason: SignaturePlanReason = selected ? null : 'no-scheme-fits';

  return { options, selected, reason };
}

/**
 * Compute the placement of every slot on one side (`front` or `back`) of a
 * selected signature option, in the scheme's row-major order. The returned
 * `rotation` composes the slot's own printed rotation (0 or 180, from the
 * scheme) with the option's 90° page rotation (when the page had to be
 * turned to fit the press sheet), so each placement is self-contained: a
 * consumer never needs `option.pageRotated` to know how to draw it.
 */
export function layoutSide(option: SignatureOption, side: 'front' | 'back'): SignaturePlacement[] {
  const slots = option.scheme.sides[side];
  const { cols, rows, cellWidth_mm, cellHeight_mm, gutter_mm, sideMargin_mm, gripperMargin_mm, pageRotated } = option;

  if (slots.length !== cols * rows) {
    throw new RangeError(`El número de posiciones de "${side}" (${slots.length}) no coincide con cols × rows (${cols * rows})`);
  }

  return slots.map((slot, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x_mm = sideMargin_mm + col * (cellWidth_mm + gutter_mm);
    const y_mm = gripperMargin_mm + row * (cellHeight_mm + gutter_mm);

    assertFinite(x_mm, 'La posición horizontal de la ubicación');
    assertFinite(y_mm, 'La posición vertical de la ubicación');

    const rotation = ((slot.rotation + (pageRotated ? 90 : 0)) % 360) as SignaturePlacement['rotation'];

    return {
      page: slot.page,
      rotation,
      x_mm,
      y_mm,
      width_mm: cellWidth_mm,
      height_mm: cellHeight_mm,
    };
  });
}
