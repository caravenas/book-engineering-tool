import { describe, it, expect } from 'vitest';
import { mmToInches, inchesToMm, mmToPoints, pointsToMm, roundTo } from '../engine/units';

describe('Unit Conversions', () => {
  it('mmToInches: 25.4mm → exactly 1 inch', () => {
    expect(mmToInches(25.4)).toBe(1.0);
  });

  it('inchesToMm: 1 inch → exactly 25.4mm', () => {
    expect(inchesToMm(1)).toBe(25.4);
  });

  it('mmToInches: 0mm → 0 inches', () => {
    expect(mmToInches(0)).toBe(0);
  });

  it('roundtrip conversion mm → inches → mm has < 0.5% error', () => {
    const original = 297; // A4 height
    const converted = inchesToMm(mmToInches(original));
    const error = Math.abs(converted - original) / original;
    expect(error).toBeLessThan(0.005);
  });

  it('should convert common paper sizes correctly', () => {
    // Letter width: 8.5″ = 215.9mm
    expect(inchesToMm(8.5)).toBeCloseTo(215.9, 1);
    
    // A4 width: 210mm ≈ 8.27″
    expect(mmToInches(210)).toBeCloseTo(8.268, 2);
  });

  it('mmToPoints: 25.4mm → 72pt', () => {
    expect(mmToPoints(25.4)).toBeCloseTo(72, 4);
  });

  it('pointsToMm: 72pt → 25.4mm', () => {
    expect(pointsToMm(72)).toBeCloseTo(25.4, 4);
  });

  it('roundtrip conversion mm → points → mm has < 0.5% error', () => {
    const original = 148; // A5 width
    const converted = pointsToMm(mmToPoints(original));
    const error = Math.abs(converted - original) / original;
    expect(error).toBeLessThan(0.005);
  });
});

describe('roundTo utility', () => {
  it('rounds to specified decimal places', () => {
    expect(roundTo(3.14159, 2)).toBe(3.14);
    expect(roundTo(3.145, 2)).toBe(3.15);
    expect(roundTo(3.1, 0)).toBe(3);
  });
});
