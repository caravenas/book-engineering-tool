import type { Cover, CoverKind, CoverPlanInput, CoverPlanResult, HardCoverResult, SoftCoverResult } from '../types';

const MM2_PER_M2 = 1_000_000;

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

function isCoverKind(value: unknown): value is CoverKind {
  return value === 'blanda' || value === 'dura';
}

function assertCover(cover: Cover): void {
  assertNonNegativeFinite(cover.flapWidth_mm, 'El ancho de solapa de la tapa');
  assertNonNegativeFinite(cover.squares_mm, 'La ceja de la tapa');
  assertNonNegativeFinite(cover.hingeGap_mm, 'El canal de bisagra de la tapa');
  assertNonNegativeFinite(cover.turnIn_mm, 'El doblez de forro de la tapa');
  assertNonNegativeFinite(cover.boardThickness_mm, 'El grosor de cartón de la tapa');
  assertPositiveFinite(cover.grammage, 'El gramaje del material de tapa');
  if (!isCoverKind(cover.kind)) {
    throw new RangeError('El tipo de tapa debe ser "blanda" o "dura"');
  }
}

function planSoftCover(input: CoverPlanInput): SoftCoverResult {
  const { pageWidth_mm, bleed_mm, pageHeight_mm, spineTotal_mm, bindingHasFlatSpine, cover } = input;

  const sheetHeight_mm = pageHeight_mm + 2 * bleed_mm;

  // A binding without a flat spine (e.g. saddle stitch) folds a single
  // sheet down its centre: there is no separate spine panel to draw or
  // account for in the width.
  const spine_mm = bindingHasFlatSpine ? spineTotal_mm : 0;

  // With flaps, the sheet's outer edges are the flaps' fore-edges and the
  // flap/cover boundary is a FOLD, not a trim, so the bleed belongs on the
  // flap's outer edge. Without flaps, the cover panel's own fore-edge is
  // the sheet's outer (trimmed) edge, so it keeps the bleed instead.
  const hasFlaps = cover.flapWidth_mm > 0;
  const flap_mm = hasFlaps ? cover.flapWidth_mm + bleed_mm : 0;
  const coverPanel_mm = hasFlaps ? pageWidth_mm : pageWidth_mm + bleed_mm;

  const sheetWidth_mm = 2 * flap_mm + 2 * coverPanel_mm + spine_mm;

  const paperArea_m2 = (sheetWidth_mm * sheetHeight_mm) / MM2_PER_M2;

  return {
    kind: 'blanda',
    sheetWidth_mm,
    sheetHeight_mm,
    sections: {
      flapLeft_mm: flap_mm,
      back_mm: coverPanel_mm,
      spine_mm,
      front_mm: coverPanel_mm,
      flapRight_mm: flap_mm,
    },
    paperArea_m2,
    paperWeight_g: paperArea_m2 * cover.grammage,
  };
}

function planHardCover(input: CoverPlanInput): CoverPlanResult {
  // The bleed is deliberately ignored here: the turn-in (`turnIn_mm`)
  // wraps and absorbs the trim tolerance around the board's edge, so a
  // hard cover's geometry does not vary with the book's bleed.
  const { pageWidth_mm, pageHeight_mm, spineTotal_mm, cover } = input;

  const boardHeight_mm = pageHeight_mm + 2 * cover.squares_mm;
  const boardWidth_mm = pageWidth_mm + cover.squares_mm - cover.hingeGap_mm;

  if (boardWidth_mm <= 0) {
    return {
      ok: false,
      reason: 'hinge-exceeds-board',
      message: 'El canal de bisagra de la tapa supera el ancho de página más la ceja: el cartón lateral quedaría con ancho cero o negativo.',
    };
  }

  const spineBoardWidth_mm = spineTotal_mm + 2 * cover.boardThickness_mm;
  const wrapWidth_mm = 2 * boardWidth_mm + spineBoardWidth_mm + 2 * cover.hingeGap_mm + 2 * cover.turnIn_mm;
  const wrapHeight_mm = boardHeight_mm + 2 * cover.turnIn_mm;

  const paperArea_m2 = (wrapWidth_mm * wrapHeight_mm) / MM2_PER_M2;
  // Split by material because a spine inlay is usually a different board
  // than the two side boards (increment 5 will cost them separately). No
  // board weight is derived from either: the catalog does not declare a
  // board density, and inventing one would be a fabricated number.
  const sideBoardArea_m2 = (2 * boardWidth_mm * boardHeight_mm) / MM2_PER_M2;
  const spineBoardArea_m2 = (spineBoardWidth_mm * boardHeight_mm) / MM2_PER_M2;

  const result: HardCoverResult = {
    kind: 'dura',
    boardWidth_mm,
    boardHeight_mm,
    spineBoardWidth_mm,
    wrapWidth_mm,
    wrapHeight_mm,
    paperArea_m2,
    paperWeight_g: paperArea_m2 * cover.grammage,
    sideBoardArea_m2,
    spineBoardArea_m2,
    boardArea_m2: sideBoardArea_m2 + spineBoardArea_m2,
  };

  return { ok: true, cover: result };
}

/**
 * Compute the cover geometry and paper weight for a given page size, final
 * spine thickness, and cover type. Compatibility between a hard case and its
 * binding method is a normal result, not an exception (the increment-3
 * precedent for `validatePageCount`): a binding whose sheets nest produces a
 * fold, not a square spine, so it cannot take a hard case, and that is
 * reported as `ok: false` instead of thrown. A soft cover whose flap is at
 * least as wide as the page is geometrically impossible to fold and is
 * reported the same way, since the catalog validator has no page size to
 * catch it against.
 */
export function planCover(input: CoverPlanInput): CoverPlanResult {
  const { pageWidth_mm, pageHeight_mm, bleed_mm, spineTotal_mm, cover } = input;

  assertPositiveFinite(pageWidth_mm, 'El ancho de página');
  assertPositiveFinite(pageHeight_mm, 'El alto de página');
  assertNonNegativeFinite(bleed_mm, 'El sangrado');
  assertPositiveFinite(spineTotal_mm, 'El lomo final');
  assertCover(cover);

  if (cover.kind === 'dura' && !input.bindingHasFlatSpine) {
    return {
      ok: false,
      reason: 'binding-has-no-flat-spine',
      message: 'Un método de encuadernación cuyos pliegos se anidan produce un pliegue, no un lomo cuadrado, así que no admite una tapa dura.',
    };
  }

  if (cover.kind === 'blanda' && cover.flapWidth_mm >= pageWidth_mm) {
    return {
      ok: false,
      reason: 'flap-exceeds-page',
      message: 'El ancho de solapa es igual o mayor que el ancho de página: la solapa no se puede doblar sobre una tapa de ese tamaño.',
    };
  }

  if (cover.kind === 'dura') {
    return planHardCover(input);
  }

  return { ok: true, cover: planSoftCover(input) };
}
