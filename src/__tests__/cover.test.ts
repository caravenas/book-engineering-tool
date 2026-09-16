import { describe, expect, it } from 'vitest';
import { planCover } from '../engine/cover';
import type { Cover, CoverPlanInput } from '../types';

function makeCover(overrides: Partial<Cover> = {}): Cover {
  return {
    id: 'test-cover',
    name: 'Tapa de prueba',
    kind: 'blanda',
    substrateId: 'test-substrate',
    grammage: 300,
    flapWidth_mm: 0,
    squares_mm: 0,
    hingeGap_mm: 0,
    turnIn_mm: 0,
    boardThickness_mm: 0,
    ...overrides,
  };
}

function baseInput(overrides: Partial<CoverPlanInput> = {}): CoverPlanInput {
  return {
    pageWidth_mm: 140,
    pageHeight_mm: 210,
    bleed_mm: 3,
    spineTotal_mm: 10,
    bindingHasFlatSpine: true,
    cover: makeCover(),
    ...overrides,
  };
}

describe('planCover: soft cover geometry', () => {
  it('computes the sheet size and section widths for a cover without flaps', () => {
    // sheetHeight = 210 + 2*3 = 216
    // sheetWidth = 2*0 + 2*140 + 10 + 2*3 = 280 + 10 + 6 = 296
    // back = front = pageWidth + bleed = 143; flaps are 0
    const result = planCover(baseInput());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.cover.kind).toBe('blanda');
    if (result.cover.kind !== 'blanda') return;
    expect(result.cover.sheetWidth_mm).toBe(296);
    expect(result.cover.sheetHeight_mm).toBe(216);
    expect(result.cover.sections).toEqual({
      flapLeft_mm: 0,
      back_mm: 143,
      spine_mm: 10,
      front_mm: 143,
      flapRight_mm: 0,
    });
  });

  it('bleed_mm: 0 leaves the sheet at exactly page size plus spine, with no flaps', () => {
    const result = planCover(baseInput({ bleed_mm: 0 }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    if (result.cover.kind !== 'blanda') return;
    expect(result.cover.sheetHeight_mm).toBe(210);
    expect(result.cover.sheetWidth_mm).toBe(290); // 2*140 + 10
    expect(result.cover.sections).toEqual({
      flapLeft_mm: 0, back_mm: 140, spine_mm: 10, front_mm: 140, flapRight_mm: 0,
    });
  });

  it('puts the bleed on the flap, not on the flap/cover fold, when the cover has flaps', () => {
    // With flaps, the sheet's outer edges are the flaps' fore-edges and the
    // flap/cover boundary is a fold, not a trim: flapLeft = flapRight =
    // flapWidth + bleed = 80 + 3 = 83; back = front = pageWidth = 140.
    // sheetWidth = 2*83 + 2*140 + 10 = 166 + 280 + 10 = 456
    const result = planCover(baseInput({ cover: makeCover({ flapWidth_mm: 80 }) }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    if (result.cover.kind !== 'blanda') return;
    expect(result.cover.sheetWidth_mm).toBe(456);
    expect(result.cover.sections).toEqual({
      flapLeft_mm: 83, back_mm: 140, spine_mm: 10, front_mm: 140, flapRight_mm: 83,
    });

    // Cumulative crease positions left to right: 83, 223, 233, 373.
    const { flapLeft_mm, back_mm, spine_mm, front_mm } = result.cover.sections;
    const crease1 = flapLeft_mm;
    const crease2 = crease1 + back_mm;
    const crease3 = crease2 + spine_mm;
    const crease4 = crease3 + front_mm;
    expect([crease1, crease2, crease3, crease4]).toEqual([83, 223, 233, 373]);

    // The five sections must still sum to the total sheet width.
    const { flapRight_mm } = result.cover.sections;
    expect(flapLeft_mm + back_mm + spine_mm + front_mm + flapRight_mm).toBe(result.cover.sheetWidth_mm);
  });

  it('the five sections sum to the sheet width for a cover without flaps too', () => {
    const result = planCover(baseInput());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    if (result.cover.kind !== 'blanda') return;
    const { flapLeft_mm, back_mm, spine_mm, front_mm, flapRight_mm } = result.cover.sections;
    expect(flapLeft_mm + back_mm + spine_mm + front_mm + flapRight_mm).toBe(result.cover.sheetWidth_mm);
  });

  it('rejects a flap as wide as or wider than the page', () => {
    const result = planCover(baseInput({ cover: makeCover({ flapWidth_mm: 140 }) }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('flap-exceeds-page');
    expect(result.message.length).toBeGreaterThan(0);
  });

  it('omits the spine panel for a binding without a flat spine (saddle stitch)', () => {
    // A single stapled sheet folds down the centre: no separate spine panel.
    // sheetWidth = 2*0 + 2*140 + 0 + 2*3 = 286
    const result = planCover(baseInput({ bindingHasFlatSpine: false }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    if (result.cover.kind !== 'blanda') return;
    expect(result.cover.sections.spine_mm).toBe(0);
    expect(result.cover.sheetWidth_mm).toBe(286);
  });

  it('keeps the flap attribution unchanged when there is no flat spine', () => {
    const result = planCover(baseInput({
      bindingHasFlatSpine: false,
      cover: makeCover({ flapWidth_mm: 80 }),
    }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    if (result.cover.kind !== 'blanda') return;
    // sheetWidth = 2*83 + 2*140 + 0 = 446
    expect(result.cover.sections).toEqual({
      flapLeft_mm: 83, back_mm: 140, spine_mm: 0, front_mm: 140, flapRight_mm: 83,
    });
    expect(result.cover.sheetWidth_mm).toBe(446);
  });
});

describe('planCover: hard cover geometry', () => {
  const hardCover = makeCover({
    kind: 'dura', squares_mm: 3, hingeGap_mm: 6, turnIn_mm: 15, boardThickness_mm: 2.5,
  });

  it('computes each board and wrap dimension separately', () => {
    // boardHeight = 210 + 2*3 = 216
    // boardWidth = 140 + 3 - 6 = 137
    // spineBoardWidth = 10 + 2*2.5 = 15
    // wrapWidth = 2*137 + 15 + 2*6 + 2*15 = 274 + 15 + 12 + 30 = 331
    // wrapHeight = 216 + 2*15 = 246
    const result = planCover(baseInput({ cover: hardCover }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    if (result.cover.kind !== 'dura') return;
    expect(result.cover.boardHeight_mm).toBe(216);
    expect(result.cover.boardWidth_mm).toBe(137);
    expect(result.cover.spineBoardWidth_mm).toBe(15);
    expect(result.cover.wrapWidth_mm).toBe(331);
    expect(result.cover.wrapHeight_mm).toBe(246);
  });

  it('ignores the bleed entirely: the turn-in absorbs the trim tolerance instead', () => {
    const withoutBleed = planCover(baseInput({ cover: hardCover, bleed_mm: 0 }));
    const withBleed = planCover(baseInput({ cover: hardCover, bleed_mm: 8 }));
    expect(withoutBleed.ok).toBe(true);
    expect(withBleed.ok).toBe(true);
    if (!withoutBleed.ok || !withBleed.ok) return;
    expect(withBleed.cover).toEqual(withoutBleed.cover);
  });

  it('rejects a hard cover against a binding without a flat spine', () => {
    const result = planCover(baseInput({ cover: hardCover, bindingHasFlatSpine: false }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('binding-has-no-flat-spine');
    expect(result.message.length).toBeGreaterThan(0);
  });

  it('accepts the same hard cover against a binding with a flat spine', () => {
    const result = planCover(baseInput({ cover: hardCover, bindingHasFlatSpine: true }));
    expect(result.ok).toBe(true);
  });

  it('rejects a hinge gap larger than the page width plus the square', () => {
    // boardWidth = 140 + 3 - 200 = -57 <= 0
    const result = planCover(baseInput({
      cover: makeCover({ kind: 'dura', squares_mm: 3, hingeGap_mm: 200, turnIn_mm: 15, boardThickness_mm: 2.5 }),
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('hinge-exceeds-board');
    expect(result.message.length).toBeGreaterThan(0);
  });

  it('rejects a hinge gap exactly equal to the page width plus the square (boardWidth exactly 0)', () => {
    // boardWidth = 140 + 3 - 143 = 0
    const result = planCover(baseInput({
      cover: makeCover({ kind: 'dura', squares_mm: 3, hingeGap_mm: 143, turnIn_mm: 15, boardThickness_mm: 2.5 }),
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('hinge-exceeds-board');
  });
});

describe('planCover: weight', () => {
  it('computes the paper area and weight for a soft cover from cover.grammage', () => {
    // paperArea_m2 = (296 * 216) / 1e6 = 63936 / 1e6 = 0.063936
    // paperWeight_g = 0.063936 * 300 = 19.1808
    const result = planCover(baseInput({ cover: makeCover({ grammage: 300 }) }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.cover.paperArea_m2).toBeCloseTo(0.063936, 9);
    expect(result.cover.paperWeight_g).toBeCloseTo(19.1808, 9);
  });

  it('computes the paper area, paper weight, and split board areas for a hard cover', () => {
    const hardCover = makeCover({
      kind: 'dura', grammage: 150, squares_mm: 3, hingeGap_mm: 6, turnIn_mm: 15, boardThickness_mm: 2.5,
    });
    // wrapWidth = 331, wrapHeight = 246 (see geometry test above)
    // paperArea_m2 = (331 * 246) / 1e6 = 81426 / 1e6 = 0.081426
    // paperWeight_g = 0.081426 * 150 = 12.2139
    // sideBoardArea_m2 = (2 * 137 * 216) / 1e6 = 59184 / 1e6 = 0.059184
    // spineBoardArea_m2 = (15 * 216) / 1e6 = 3240 / 1e6 = 0.00324
    // boardArea_m2 = 0.059184 + 0.00324 = 0.062424
    const result = planCover(baseInput({ cover: hardCover }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    if (result.cover.kind !== 'dura') return;
    expect(result.cover.paperArea_m2).toBeCloseTo(0.081426, 9);
    expect(result.cover.paperWeight_g).toBeCloseTo(12.2139, 9);
    expect(result.cover.sideBoardArea_m2).toBeCloseTo(0.059184, 9);
    expect(result.cover.spineBoardArea_m2).toBeCloseTo(0.00324, 9);
    expect(result.cover.boardArea_m2).toBeCloseTo(0.062424, 9);
  });
});

describe('planCover: input validation', () => {
  it('throws for a non-finite page width', () => {
    expect(() => planCover(baseInput({ pageWidth_mm: Number.NaN }))).toThrow(RangeError);
  });

  it('throws for a non-positive page height', () => {
    expect(() => planCover(baseInput({ pageHeight_mm: 0 }))).toThrow(RangeError);
  });

  it('throws for a negative bleed', () => {
    expect(() => planCover(baseInput({ bleed_mm: -1 }))).toThrow(RangeError);
  });

  it('throws for a non-positive spine total', () => {
    expect(() => planCover(baseInput({ spineTotal_mm: 0 }))).toThrow(RangeError);
  });

  it('throws for a non-positive grammage on the cover', () => {
    expect(() => planCover(baseInput({ cover: makeCover({ grammage: 0 }) }))).toThrow(RangeError);
  });

  it('throws for a non-finite millimetre field on the cover', () => {
    expect(() => planCover(baseInput({ cover: makeCover({ flapWidth_mm: Number.NaN }) }))).toThrow(RangeError);
  });

  it('throws for an unknown cover kind', () => {
    const invalidCover = { ...makeCover(), kind: 'rigida' } as unknown as Cover;
    expect(() => planCover(baseInput({ cover: invalidCover }))).toThrow(RangeError);
  });
});
