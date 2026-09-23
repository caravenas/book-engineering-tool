import { describe, expect, it } from 'vitest';
import { foldingSchemeFromFolds, readByFolding, type Fold } from '../engine/folding';
import { loadShippedCatalog } from './testCatalog';

const V = (bring: 'right-over-left' | 'left-over-right'): Fold => ({ axis: 'vertical', bring });
const H = (bring: 'top-over-bottom' | 'bottom-over-top'): Fold => ({ axis: 'horizontal', bring });

/** Every fold sequence of `count` folds, in both directions on both axes. */
function everySequence(count: number): Fold[][] {
  if (count === 0) return [[]];
  const rest = everySequence(count - 1);
  const first: Fold[] = [
    V('right-over-left'), V('left-over-right'), H('top-over-bottom'), H('bottom-over-top'),
  ];
  return first.flatMap(fold => rest.map(tail => [fold, ...tail]));
}

function pagesOf(slots: { page: number }[]): number[] {
  return slots.map(slot => slot.page);
}

describe('Deriving a folding scheme from the folds that make it', () => {
  /**
   * The folio is the case with no room for interpretation. One sheet, one
   * fold: the outer side carries the back cover and the front cover side by
   * side, and the inner side carries pages 2 and 3. Every other claim in this
   * file rests on the model that gets this one right.
   */
  it('derives the four-page folio that every printer already knows', () => {
    const result = foldingSchemeFromFolds([V('right-over-left')]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.scheme.pagesPerSignature).toBe(4);
    expect(result.scheme.cols).toBe(2);
    expect(result.scheme.rows).toBe(1);
    expect(pagesOf(result.scheme.sides.front)).toEqual([4, 1]);
    expect(pagesOf(result.scheme.sides.back)).toEqual([2, 3]);
    // A single fold about a vertical line leaves everything upright.
    expect(result.scheme.sides.front.every(slot => slot.rotation === 0)).toBe(true);
  });

  /**
   * The same folio, folded the other way, and the test that pins the one
   * thing the round trip below cannot see. Fold a sheet bottom over top and
   * the outer side still carries the two covers, 4 and 1, because folding a
   * half over turns that half over — which is what a fold is.
   *
   * A model that turns the content upside down without turning the paper
   * (the one the shipped schemes were built with) puts pages 1 and 3 on the
   * same side here, and no invariant about leaves or coverage notices.
   */
  it('derives the same folio from a horizontal fold, with the covers still together', () => {
    const result = foldingSchemeFromFolds([H('bottom-over-top')]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.scheme.cols).toBe(1);
    expect(result.scheme.rows).toBe(2);
    // Stacked rather than side by side, and the half that came up is upside
    // down, which is where a scheme's 180 degree rotations come from.
    expect(result.scheme.sides.front).toEqual([{ page: 4, rotation: 0 }, { page: 1, rotation: 180 }]);
    expect(result.scheme.sides.back).toEqual([{ page: 3, rotation: 0 }, { page: 2, rotation: 180 }]);
  });

  /**
   * The other two directions, derived by hand and not read off the engine.
   * Without these, a coordinate-mapping error specific to one direction would
   * survive: the round trip would put a page in the wrong cell and then read
   * it back from that same wrong cell, and say nothing.
   *
   * Left over right: the crease ends up on the right, so the half that was on
   * top is the left one and page 1 is on the left of the outer face. A
   * vertical fold turns nothing.
   *
   * Top over bottom: the crease ends up at the bottom, so page 1 is on the
   * top half — and that is the half that moved, so its content is upside down
   * in the packet and must be printed turned.
   */
  it('derives the folio the other way round on each axis', () => {
    const leftOverRight = foldingSchemeFromFolds([V('left-over-right')]);
    expect(leftOverRight.ok).toBe(true);
    if (!leftOverRight.ok) return;
    expect(leftOverRight.scheme.sides.front).toEqual([{ page: 1, rotation: 0 }, { page: 4, rotation: 0 }]);
    expect(leftOverRight.scheme.sides.back).toEqual([{ page: 3, rotation: 0 }, { page: 2, rotation: 0 }]);

    const topOverBottom = foldingSchemeFromFolds([H('top-over-bottom')]);
    expect(topOverBottom.ok).toBe(true);
    if (!topOverBottom.ok) return;
    expect(topOverBottom.scheme.sides.front).toEqual([{ page: 1, rotation: 180 }, { page: 4, rotation: 0 }]);
    expect(topOverBottom.scheme.sides.back).toEqual([{ page: 2, rotation: 180 }, { page: 3, rotation: 0 }]);
  });

  it('gives the sheet the shape the catalog requires of it', () => {
    for (const folds of [1, 2, 3, 4].flatMap(count => everySequence(count))) {
      const result = foldingSchemeFromFolds(folds);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { cols, rows, pagesPerSignature, sides } = result.scheme;
      expect(cols * rows).toBe(pagesPerSignature / 2);
      expect(sides.front).toHaveLength(cols * rows);
      expect(sides.back).toHaveLength(cols * rows);
      expect(pagesPerSignature % 4).toBe(0);
    }
  });

  it('places every page exactly once, across both sides', () => {
    for (const folds of [1, 2, 3, 4].flatMap(count => everySequence(count))) {
      const result = foldingSchemeFromFolds(folds);
      if (!result.ok) throw new Error(result.reason);

      const { pagesPerSignature, sides } = result.scheme;
      const placed = [...pagesOf(sides.front), ...pagesOf(sides.back)].sort((a, b) => a - b);
      expect(placed).toEqual(Array.from({ length: pagesPerSignature }, (_, index) => index + 1));
    }
  });

  /**
   * The invariant the catalog validator enforces, asserted here on everything
   * the engine can produce: a slot and the slot it backs onto are the two
   * faces of one leaf, and both faces of a leaf are turned the same way,
   * because they are the same piece of paper.
   */
  it('pairs every slot with the other face of its own leaf, turned the same way', () => {
    for (const folds of [1, 2, 3, 4].flatMap(count => everySequence(count))) {
      const result = foldingSchemeFromFolds(folds);
      if (!result.ok) throw new Error(result.reason);
      const { cols, rows, sides } = result.scheme;

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const front = sides.front[row * cols + col];
          const back = sides.back[row * cols + (cols - 1 - col)];
          const lower = Math.min(front.page, back.page);
          expect(Math.abs(front.page - back.page)).toBe(1);
          expect(lower % 2).toBe(1);
          expect(front.rotation).toBe(back.rotation);
        }
      }
    }
  });

  /**
   * Fold the sheet the engine produced and read the pages off the packet,
   * for every sequence up to four folds — every signature from 4 to 32 pages.
   *
   * This is a consistency check and not an independent proof: it folds with
   * the same model it imposed with, so an error in the model itself survives
   * it. Breaking the model on purpose — making a fold turn the content
   * without turning the paper — leaves this test green. What catches that is
   * the two folio tests above, where the answer is known from outside.
   */
  it('folds back into the pages in order, for every sequence up to four folds', () => {
    for (const folds of [1, 2, 3, 4].flatMap(count => everySequence(count))) {
      const result = foldingSchemeFromFolds(folds);
      if (!result.ok) throw new Error(result.reason);

      const read = readByFolding(result.scheme, folds, result.outward);
      expect(read).toEqual(Array.from({ length: result.scheme.pagesPerSignature }, (_, index) => index + 1));
    }
  });

  it('refuses a sequence with no folds, and one with more than it allows', () => {
    expect(foldingSchemeFromFolds([])).toEqual({ ok: false, reason: expect.stringContaining('al menos un pliegue') });

    const tooMany = Array.from({ length: 7 }, () => V('right-over-left'));
    expect(foldingSchemeFromFolds(tooMany)).toEqual({ ok: false, reason: expect.stringContaining('más de 6 pliegues') });
  });

  it('refuses a fold whose direction does not belong to its axis', () => {
    const wrong = foldingSchemeFromFolds([{ axis: 'vertical', bring: 'top-over-bottom' }]);
    expect(wrong.ok).toBe(false);
  });
});

/**
 * The two schemes in `public/config/esquemas.json` used to be built by hand,
 * and folding them said what was wrong with them: the model they were written
 * with turned the content of a horizontal fold upside down without turning
 * the paper over, so every leaf that went through an odd number of those had
 * its two pages on the wrong sides.
 *
 * Chris folded a sheet on 2026-09-23 and read the sixteen-page signature off
 * it: bottom over top, then the left half over the right, then top over
 * bottom, with the back of the press sheet facing out of the packet. The file
 * now holds what `foldingSchemeFromFolds` derives from exactly those folds,
 * rather than numbers anyone typed, and what is asserted here is the round
 * trip: fold the shipped scheme and the pages come out 1, 2, 3, …
 *
 * The eight-page scheme is the same sequence one fold short. It reads in
 * order, so it is a correct imposition; which of the two folds a shop drops
 * to make an eight-page signature is the part still to confirm, and the
 * file's own `source` says so.
 */
describe('The shipped schemes, folded', () => {
  const catalog = loadShippedCatalog();
  const eightUp = catalog.foldingSchemes.find(scheme => scheme.id === 'esquema_8pp')!;
  const sixteenUp = catalog.foldingSchemes.find(scheme => scheme.id === 'esquema_16pp')!;

  /** The folds Chris read the sixteen-page signature off, and one short. */
  const sixteenUpFolds: Fold[] = [H('bottom-over-top'), V('left-over-right'), H('top-over-bottom')];
  const eightUpFolds: Fold[] = sixteenUpFolds.slice(0, 2);
  const inOrder = (pages: number) => Array.from({ length: pages }, (_, index) => index + 1);

  it('folds the 8-page scheme back into its pages, in order', () => {
    expect(readByFolding(eightUp, eightUpFolds, 'back')).toEqual(inOrder(8));
  });

  it('folds the 16-page scheme back into its pages, in order', () => {
    expect(readByFolding(sixteenUp, sixteenUpFolds, 'back')).toEqual(inOrder(16));
  });

  /**
   * And the file holds the derivation itself, not a grid that happens to fold
   * correctly: every cell, every page, every rotation. Reading in order is a
   * weaker claim — it says nothing about which way up a page is printed,
   * because folding a sheet back up does not turn its pages the right way
   * round for you.
   */
  it('holds exactly what the folds derive, rotations included', () => {
    for (const [scheme, folds] of [[eightUp, eightUpFolds], [sixteenUp, sixteenUpFolds]] as const) {
      const derived = foldingSchemeFromFolds(folds);
      if (!derived.ok) throw new Error(derived.reason);

      expect(derived.outward, scheme.id).toBe('back');
      expect(derived.scheme.cols, scheme.id).toBe(scheme.cols);
      expect(derived.scheme.rows, scheme.id).toBe(scheme.rows);
      expect(derived.scheme.pagesPerSignature, scheme.id).toBe(scheme.pagesPerSignature);
      expect(derived.scheme.sides.front, scheme.id).toEqual(scheme.sides.front);
      expect(derived.scheme.sides.back, scheme.id).toEqual(scheme.sides.back);
    }
  });

  /** The numbers Chris read off the folded sheet, cell by cell. */
  it('lays the sixteen-page signature out the way the folded sheet reads', () => {
    expect(sixteenUp.sides.front.map(slot => slot.page)).toEqual([8, 1, 9, 16, 12, 13, 5, 4]);
    expect(sixteenUp.sides.back.map(slot => slot.page)).toEqual([2, 7, 15, 10, 14, 11, 3, 6]);
  });
});
