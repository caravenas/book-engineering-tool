import { describe, it, expect } from 'vitest';
import { calculateSpineThickness, calculateWeight, calculateSpineAndWeight } from '../engine/spine';

describe('Spine Calculator', () => {
  it('should calculate spine for 32 pages Bond 90g (caliper 115μm)', () => {
    // Lomo = (32 / 2) × (115 / 1000) = 16 × 0.115 = 1.84mm
    const thickness = calculateSpineThickness(32, 115);
    expect(thickness).toBeCloseTo(1.84, 4);
  });

  it('should calculate spine for 64 pages Couché 150g (caliper 120μm)', () => {
    // Lomo = (64 / 2) × (120 / 1000) = 32 × 0.12 = 3.84mm
    const thickness = calculateSpineThickness(64, 120);
    expect(thickness).toBeCloseTo(3.84, 4);
  });

  it('should calculate spine for thick book (200 pages Opalina 180g)', () => {
    // Lomo = (200 / 2) × (230 / 1000) = 100 × 0.23 = 23mm
    const thickness = calculateSpineThickness(200, 230);
    expect(thickness).toBeCloseTo(23.0, 4);
  });

  it('should return 0 for invalid inputs', () => {
    expect(calculateSpineThickness(0, 115)).toBe(0);
    expect(calculateSpineThickness(32, 0)).toBe(0);
    expect(calculateSpineThickness(-5, 115)).toBe(0);
  });
});

describe('Weight Calculator', () => {
  it('should calculate weight for a typical picture book', () => {
    // 32 pages, 210×280mm, Couché 150g
    // Sheets = 32/2 = 16
    // Area per sheet = 0.210 × 0.280 = 0.0588 m²
    // Weight = 16 × 0.0588 × 150 = 141.12g
    const weight = calculateWeight(210, 280, 32, 150);
    expect(weight).toBeCloseTo(141.12, 2);
  });

  it('should calculate weight for a small book', () => {
    // 24 pages, 140×210mm, Bond 90g
    // Sheets = 12
    // Area = 0.140 × 0.210 = 0.0294 m²
    // Weight = 12 × 0.0294 × 90 = 31.752g
    const weight = calculateWeight(140, 210, 24, 90);
    expect(weight).toBeCloseTo(31.752, 2);
  });

  it('should return 0 for invalid inputs', () => {
    expect(calculateWeight(0, 210, 32, 150)).toBe(0);
    expect(calculateWeight(140, 0, 32, 150)).toBe(0);
    expect(calculateWeight(140, 210, 0, 150)).toBe(0);
    expect(calculateWeight(140, 210, 32, 0)).toBe(0);
  });
});

describe('Combined Spine & Weight', () => {
  it('should return both spine and weight in one call', () => {
    const result = calculateSpineAndWeight(210, 280, 32, 150, 120);
    
    expect(result.thickness_mm).toBeCloseTo(1.92, 4);  // (32/2) × 0.120
    expect(result.totalWeight_g).toBeCloseTo(141.12, 2);
  });
});
