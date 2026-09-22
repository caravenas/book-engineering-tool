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
 * The two schemes in `public/config/esquemas.json` were built by hand and
 * have always carried a note saying they must be confirmed against a folded
 * sheet. Folding them says what is wrong with them, and it is one thing: the
 * model they were built with turns the content of a horizontal fold upside
 * down without turning the paper over, so every leaf that went through an odd
 * number of those has its two pages on the wrong sides.
 *
 * They are read with the back of the sheet facing out, which is the more
 * favourable of the two orientations: it is the one that at least brings page
 * 1 out first. Even read that way they are out of order.
 *
 * This is pinned as a test rather than left in a document because the day the
 * file is corrected, this test fails and says so.
 */
describe('The shipped schemes, folded', () => {
  const catalog = loadShippedCatalog();
  const eightUp = catalog.foldingSchemes.find(scheme => scheme.id === 'esquema_8pp')!;
  const sixteenUp = catalog.foldingSchemes.find(scheme => scheme.id === 'esquema_16pp')!;

  const eightUpFolds: Fold[] = [H('bottom-over-top'), V('right-over-left')];
  const sixteenUpFolds: Fold[] = [H('bottom-over-top'), H('bottom-over-top'), V('right-over-left')];

  it('reads the 8-page scheme with the pages of two leaves swapped', () => {
    expect(readByFolding(eightUp, eightUpFolds, 'back')).toEqual([1, 2, 4, 3, 6, 5, 7, 8]);
  });

  it('reads the 16-page scheme with the pages of four leaves swapped', () => {
    expect(readByFolding(sixteenUp, sixteenUpFolds, 'back')).toEqual(
      [1, 2, 4, 3, 5, 6, 8, 7, 10, 9, 11, 12, 14, 13, 15, 16]
    );
  });

  /**
   * They are wrong in one way and right in every other: the leaves are in the
   * right places in the packet, so the derived scheme differs from the shipped
   * one only by which side of the sheet each of those pages is printed on.
   */
  it('puts every leaf in the cell the derivation puts it in', () => {
    const derived = foldingSchemeFromFolds(eightUpFolds);
    if (!derived.ok) throw new Error(derived.reason);

    const leafAt = (scheme: { cols: number; sides: { front: { page: number }[] } }, index: number) =>
      Math.ceil(scheme.sides.front[index].page / 2);

    for (let index = 0; index < eightUp.cols * eightUp.rows; index += 1) {
      expect(leafAt(derived.scheme, index)).toBe(leafAt(eightUp, index));
    }
  });
});
