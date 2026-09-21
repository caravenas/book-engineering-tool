import type { FoldingScheme, SlotPlacement } from '../types';

/**
 * Derive a folding scheme from the folds that produce it.
 *
 * A scheme is not a list of numbers a print shop knows; it is the consequence
 * of how they fold the sheet. Asking anyone to type the grid is asking them to
 * do this derivation by hand, in the one catalog where being wrong is
 * invisible until the job is printed and cut.
 *
 * The model is the paper. A fold takes half the packet, turns it over onto the
 * other half, and that moved half ends up on top with its order reversed —
 * what was uppermost within it is now lowest. Turning a half over always
 * changes which of its two sides faces up: that is what a fold is, and it is
 * the step the shipped example schemes were built without (see
 * `docs/PLAN.md`).
 *
 * Folding about a horizontal line also turns the content upside down relative
 * to the packet, which is where a scheme's 180 degree rotations come from; a
 * fold about a vertical line leaves the content upright, because the back of
 * a sheet is registered against its front by turning it about that same axis.
 */
export type FoldAxis = 'vertical' | 'horizontal';

/**
 * Which half of the packet is picked up and folded over the other. Named for
 * what the hand does, because that is what a print shop can answer without
 * translating anything: "I bring the right half over onto the left".
 */
export type FoldBring = 'right-over-left' | 'left-over-right' | 'top-over-bottom' | 'bottom-over-top';

export interface Fold {
  axis: FoldAxis;
  bring: FoldBring;
}

/** A sheet folded more than this yields a signature the catalog will not accept. */
const MAX_FOLDS = 6;

const BRING_BY_AXIS: Record<FoldAxis, FoldBring[]> = {
  vertical: ['right-over-left', 'left-over-right'],
  horizontal: ['top-over-bottom', 'bottom-over-top'],
};

/**
 * One cell of the folded packet: which cell of the flat press sheet it is,
 * which way its local axes now run, which side of the sheet faces up, and how
 * far its content has been turned relative to the packet.
 */
interface Piece {
  row: number;
  col: number;
  rowStep: number;
  colStep: number;
  faceUp: 'front' | 'back';
  rotation: 0 | 180;
}

export type FoldingDerivation =
  | {
      ok: true;
      scheme: Omit<FoldingScheme, 'id' | 'name'>;
      /**
       * Which side of the press sheet ends up outside the folded packet. It
       * is part of the plan and not a property of the grid: the same folds
       * with the other side out give a different, equally correct scheme, and
       * reading one back requires knowing which was used.
       */
      outward: 'front' | 'back';
    }
  | { ok: false; reason: string };

/**
 * Fold the sheet and return the packet, top leaf first.
 *
 * Every piece starts as the whole sheet and is halved by each fold. The half
 * that stays keeps its orientation; the half that moves is mirrored about the
 * fold line, turns over, and — folding about a horizontal line — turns upside
 * down with it.
 */
function foldSheet(folds: Fold[], cols: number, rows: number, outward: 'front' | 'back' = 'front'): Piece[] {
  let width = cols;
  let height = rows;
  let packet: Piece[] = [{ row: 0, col: 0, rowStep: 1, colStep: 1, faceUp: outward, rotation: 0 }];

  for (const { axis, bring } of folds) {
    const staying: Piece[] = [];
    const moving: Piece[] = [];

    if (axis === 'vertical') {
      const half = width / 2;
      const movesRight = bring === 'right-over-left';
      for (const piece of packet) {
        staying.push(movesRight ? { ...piece } : { ...piece, col: piece.col + piece.colStep * half });
        moving.push({
          ...piece,
          col: piece.col + piece.colStep * (movesRight ? 2 * half - 1 : half - 1),
          colStep: -piece.colStep,
          faceUp: piece.faceUp === 'front' ? 'back' : 'front',
        });
      }
      width = half;
    } else {
      const half = height / 2;
      const movesTop = bring === 'top-over-bottom';
      for (const piece of packet) {
        staying.push(movesTop ? { ...piece, row: piece.row + piece.rowStep * half } : { ...piece });
        moving.push({
          ...piece,
          row: piece.row + piece.rowStep * (movesTop ? half - 1 : 2 * half - 1),
          rowStep: -piece.rowStep,
          faceUp: piece.faceUp === 'front' ? 'back' : 'front',
          rotation: piece.rotation === 0 ? 180 : 0,
        });
      }
      height = half;
    }

    // The half that moved lands on top, and turning it over reverses it:
    // what was uppermost inside that half is now lowest.
    packet = [...moving.reverse(), ...staying];
  }

  return packet;
}

/**
 * The imposition a fold sequence produces: which page goes in which cell of
 * each side of the press sheet, and how far it is turned.
 *
 * The back of the sheet is indexed as the sheet is turned to print it, about
 * its vertical axis, so the cell at (row, col) on the front backs onto
 * (row, cols - 1 - col) on the back. The signature engine already assumes
 * exactly that mirror, and the catalog validator now states it.
 *
 * Which physical side of the sheet is called the front is a label, not a
 * fact, so it is chosen rather than asked for: the side page 1 lands on is
 * the front. Swapping the two sides of a correct scheme leaves it correct.
 */
export function foldingSchemeFromFolds(folds: Fold[]): FoldingDerivation {
  if (folds.length === 0) {
    return { ok: false, reason: 'Un esquema necesita al menos un pliegue.' };
  }
  if (folds.length > MAX_FOLDS) {
    return { ok: false, reason: `Un esquema no admite más de ${MAX_FOLDS} pliegues.` };
  }
  for (const fold of folds) {
    if (!BRING_BY_AXIS[fold.axis]?.includes(fold.bring)) {
      return { ok: false, reason: `El pliegue "${fold.bring}" no corresponde a un pliegue ${fold.axis === 'vertical' ? 'vertical' : 'horizontal'}.` };
    }
  }

  const cols = 2 ** folds.filter(fold => fold.axis === 'vertical').length;
  const rows = 2 ** folds.filter(fold => fold.axis === 'horizontal').length;
  const pagesPerSignature = cols * rows * 2;

  /*
   * Page 1 names the front: the side it lands on is the one printed first.
   * Which side that is depends on which faces out, so the answer is reached
   * by folding the other way round rather than by swapping the two arrays —
   * turning the sheet over to call its other side the front also mirrors its
   * columns, so a swap alone would give a scheme whose page numbers are right
   * and whose geometry is inside out.
   */
  const outward = foldSheet(folds, cols, rows, 'front')[0].faceUp === 'front' ? 'front' : 'back';
  const sides = imposeOn(foldSheet(folds, cols, rows, outward), cols, rows);
  if (!sides) {
    // Unreachable for a well-formed sequence, and cheaper to state than to
    // leave a null to surface later as a page that is neither present nor
    // missing.
    return { ok: false, reason: 'El plegado no cubrió todas las posiciones del pliego.' };
  }

  return { ok: true, scheme: { pagesPerSignature, cols, rows, sides }, outward };
}

/** Lay the packet's leaves back onto the two sides of the flat sheet. */
function imposeOn(
  packet: Piece[],
  cols: number,
  rows: number
): { front: SlotPlacement[]; back: SlotPlacement[] } | null {
  const front: (SlotPlacement | null)[] = Array(cols * rows).fill(null);
  const back: (SlotPlacement | null)[] = Array(cols * rows).fill(null);

  packet.forEach((piece, index) => {
    const recto = 2 * index + 1;
    const verso = 2 * index + 2;
    front[piece.row * cols + piece.col] = {
      page: piece.faceUp === 'front' ? recto : verso,
      rotation: piece.rotation,
    };
    back[piece.row * cols + (cols - 1 - piece.col)] = {
      page: piece.faceUp === 'front' ? verso : recto,
      rotation: piece.rotation,
    };
  });

  if (front.some(slot => slot === null) || back.some(slot => slot === null)) return null;
  return { front: front as SlotPlacement[], back: back as SlotPlacement[] };
}

/**
 * Read a scheme back by folding it: the pages in the order they come out of
 * the packet, recto then verso of each leaf from the top down.
 *
 * This is the check that does not trust the derivation, because it goes the
 * other way: it takes the printed sheet as given and reports what folding it
 * actually yields. A correct scheme reads 1, 2, 3, … and anything else names
 * the pages that come out in the wrong place.
 *
 * `outward` says which side of the sheet faces out of the packet, because
 * that is a decision about how the job is printed and folded, not something
 * the grid reveals. `foldingSchemeFromFolds` returns the one it used.
 */
export function readByFolding(
  scheme: Pick<FoldingScheme, 'cols' | 'rows' | 'sides'>,
  folds: Fold[],
  outward: 'front' | 'back' = 'front'
): number[] {
  const { cols, sides } = scheme;
  const packet = foldSheet(folds, cols, scheme.rows, outward);
  const pages: number[] = [];

  for (const piece of packet) {
    const frontSlot = sides.front[piece.row * cols + piece.col];
    const backSlot = sides.back[piece.row * cols + (cols - 1 - piece.col)];
    if (!frontSlot || !backSlot) return pages;
    const up = piece.faceUp === 'front' ? frontSlot.page : backSlot.page;
    const down = piece.faceUp === 'front' ? backSlot.page : frontSlot.page;
    pages.push(up, down);
  }

  return pages;
}
