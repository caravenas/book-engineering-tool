import { describe, expect, it } from 'vitest';
import { creepCompensation, spineWithBinding, validatePageCount } from '../engine/binding';
import type { Binding } from '../types';

function makeBinding(overrides: Partial<Binding> = {}): Binding {
  return {
    id: 'test-binding',
    name: 'Encuadernación de prueba',
    pageMultiple: 4,
    minPages: 8,
    maxPages: 64,
    spineAllowance_mm: 2,
    nests: false,
    requiresSignatureMultiple: false,
    ...overrides,
  };
}

describe('validatePageCount', () => {
  it('rejects a count that is not a multiple of pageMultiple, naming the nearest valid counts', () => {
    const binding = makeBinding();
    const result = validatePageCount(binding, 41, null);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('not-multiple');
    expect(result.nearestBelow).toBe(40);
    expect(result.nearestAbove).toBe(44);
    expect(result.message).toContain('40');
    expect(result.message).toContain('44');
  });

  it('rejects a count below minPages, with nearestBelow null and an explicit message', () => {
    const binding = makeBinding();
    const result = validatePageCount(binding, 4, null);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('below-min');
    expect(result.nearestBelow).toBeNull();
    expect(result.nearestAbove).toBe(8);
    expect(result.message.length).toBeGreaterThan(0);
  });

  it('rejects a count above maxPages, with nearestAbove null and an explicit message', () => {
    const binding = makeBinding();
    const result = validatePageCount(binding, 100, null);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('above-max');
    expect(result.nearestBelow).toBe(64);
    expect(result.nearestAbove).toBeNull();
    expect(result.message.length).toBeGreaterThan(0);
  });

  it('rejects a count that is not a multiple of the signature size when the method requires it', () => {
    const binding = makeBinding({ requiresSignatureMultiple: true, minPages: 16, maxPages: 64 });
    const result = validatePageCount(binding, 40, 16);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('not-signature-multiple');
    expect(result.nearestBelow).toBe(32);
    expect(result.nearestAbove).toBe(48);
  });

  it('computes the nearest valid counts from the genuine lcm of pageMultiple and the signature size', () => {
    // pageMultiple=4 and pagesPerSignature=6 share no common multiple below
    // their lcm of 12: neither 4 nor 6 alone would produce this pair.
    const binding = makeBinding({ pageMultiple: 4, minPages: 4, maxPages: 48, requiresSignatureMultiple: true });
    const result = validatePageCount(binding, 20, 6);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('not-signature-multiple');
    expect(result.nearestBelow).toBe(12);
    expect(result.nearestAbove).toBe(24);
  });

  it('accepts the same count when no signature plan is available', () => {
    const binding = makeBinding({ requiresSignatureMultiple: true, minPages: 16, maxPages: 64 });
    const result = validatePageCount(binding, 40, null);
    expect(result).toEqual({ ok: true });
  });

  it('accepts a count that satisfies every applicable rule', () => {
    const binding = makeBinding({ requiresSignatureMultiple: true, minPages: 16, maxPages: 64 });
    const result = validatePageCount(binding, 32, 16);
    expect(result).toEqual({ ok: true });
  });

  it('resolves both nearest values to null and still reports a reason when the step itself cannot fit in range', () => {
    // pageMultiple (100) exceeds maxPages (50): no multiple of it can ever
    // land inside [minPages, maxPages], so neither side has a candidate.
    const binding = makeBinding({ pageMultiple: 100, minPages: 4, maxPages: 50 });
    const result = validatePageCount(binding, 10, null);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('not-multiple');
    expect(result.nearestBelow).toBeNull();
    expect(result.nearestAbove).toBeNull();
  });

  it('prioritizes not-multiple over above-max when a count fails both at once', () => {
    // 101 is both not a multiple of 4 and above maxPages (64): the documented
    // priority (not-multiple first) must win over the range check.
    const binding = makeBinding();
    const result = validatePageCount(binding, 101, null);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('not-multiple');
  });

  it('every non-null nearest value re-validates as ok:true, across a range of counts', () => {
    const binding = makeBinding({ pageMultiple: 4, minPages: 8, maxPages: 64 });
    for (let totalPages = 1; totalPages <= 100; totalPages++) {
      const result = validatePageCount(binding, totalPages, null);
      if (result.ok) continue;
      if (result.nearestBelow !== null) {
        expect(validatePageCount(binding, result.nearestBelow, null)).toEqual({ ok: true });
      }
      if (result.nearestAbove !== null) {
        expect(validatePageCount(binding, result.nearestAbove, null)).toEqual({ ok: true });
      }
    }
  });

  it('throws for a non-finite or non-positive totalPages', () => {
    const binding = makeBinding();
    expect(() => validatePageCount(binding, Number.NaN, null)).toThrow(RangeError);
    expect(() => validatePageCount(binding, -8, null)).toThrow(RangeError);
  });

  it('throws for a non-integer totalPages', () => {
    const binding = makeBinding();
    expect(() => validatePageCount(binding, 32.5, null)).toThrow(RangeError);
  });

  it('throws for a binding whose pageMultiple, minPages, or maxPages are not positive safe integers', () => {
    expect(() => validatePageCount(makeBinding({ pageMultiple: 0 }), 32, null)).toThrow(RangeError);
    expect(() => validatePageCount(makeBinding({ pageMultiple: 3.5 }), 32, null)).toThrow(RangeError);
    expect(() => validatePageCount(makeBinding({ minPages: 0 }), 32, null)).toThrow(RangeError);
    expect(() => validatePageCount(makeBinding({ maxPages: -1 }), 32, null)).toThrow(RangeError);
  });

  it('throws for a binding whose minPages exceeds its maxPages', () => {
    const binding = makeBinding({ minPages: 64, maxPages: 8 });
    expect(() => validatePageCount(binding, 32, null)).toThrow(RangeError);
  });

  it('throws for a pagesPerSignature that is not null and not a positive integer', () => {
    const binding = makeBinding();
    expect(() => validatePageCount(binding, 32, 0)).toThrow(RangeError);
    expect(() => validatePageCount(binding, 32, -4)).toThrow(RangeError);
    expect(() => validatePageCount(binding, 32, 4.5)).toThrow(RangeError);
  });
});

describe('spineWithBinding', () => {
  it('keeps the interior and allowance visible and sums them exactly', () => {
    const binding = makeBinding({ spineAllowance_mm: 2.5 });
    const result = spineWithBinding(5, binding);
    expect(result).toEqual({ interior_mm: 5, allowance_mm: 2.5, total_mm: 7.5 });
  });

  it('handles a zero allowance', () => {
    const binding = makeBinding({ spineAllowance_mm: 0 });
    const result = spineWithBinding(5, binding);
    expect(result).toEqual({ interior_mm: 5, allowance_mm: 0, total_mm: 5 });
  });

  it('throws for a negative interior spine', () => {
    const binding = makeBinding();
    expect(() => spineWithBinding(-1, binding)).toThrow(RangeError);
  });

  it('throws for a binding whose spineAllowance_mm is not finite or is negative', () => {
    expect(() => spineWithBinding(5, makeBinding({ spineAllowance_mm: Number.NaN }))).toThrow(RangeError);
    expect(() => spineWithBinding(5, makeBinding({ spineAllowance_mm: -1 }))).toThrow(RangeError);
  });
});

describe('creepCompensation', () => {
  it('returns null for a method that does not nest', () => {
    const binding = makeBinding({ nests: false });
    expect(creepCompensation(binding, 32, 200)).toBeNull();
  });

  it('pins the shipped grapa case: 32 pages at 120 microns gives 8 nested sheets and 0.96 mm', () => {
    const binding = makeBinding({ nests: true });
    const result = creepCompensation(binding, 32, 120);
    expect(result).toEqual({ nestedSheets: 8, maxShift_mm: 0.96, innermostShift_mm: 0 });
  });

  it('pins the shipped grapa case at double length: 64 pages at 120 microns gives 16 nested sheets and 1.92 mm', () => {
    const binding = makeBinding({ nests: true });
    const result = creepCompensation(binding, 64, 120);
    expect(result).toEqual({ nestedSheets: 16, maxShift_mm: 1.92, innermostShift_mm: 0 });
  });

  it('throws for a non-positive caliper_microns when the method nests', () => {
    const binding = makeBinding({ nests: true });
    expect(() => creepCompensation(binding, 32, 0)).toThrow(RangeError);
    expect(() => creepCompensation(binding, 32, -10)).toThrow(RangeError);
  });

  it('throws when a nesting method is given a page count that is not a multiple of 4', () => {
    const binding = makeBinding({ nests: true });
    expect(() => creepCompensation(binding, 30, 120)).toThrow(RangeError);
  });

  it('throws for a non-finite or non-positive totalPages', () => {
    const binding = makeBinding({ nests: true });
    expect(() => creepCompensation(binding, 0, 120)).toThrow(RangeError);
    expect(() => creepCompensation(binding, Number.NaN, 120)).toThrow(RangeError);
  });
});
