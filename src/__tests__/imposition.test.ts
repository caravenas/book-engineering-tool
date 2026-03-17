import { describe, it, expect } from 'vitest';
import { calculateImposition } from '../engine/imposition';

describe('Imposition Engine', () => {
  it('should calculate pages on Carta sheet (14×21cm page)', () => {
    // Page 140×210mm on Carta sheet 216×279mm (no bleed for simplicity)
    const result = calculateImposition(140, 210, 216, 279);
    
    // Normal: cols=floor(216/140)=1, rows=floor(279/210)=1 → 1 page
    // Rotated: cols=floor(216/210)=1, rows=floor(279/140)=1 → 1 page
    // Both orientations fit only 1 page
    expect(result.pagesPerSide).toBe(1);
    expect(result.wastePercentage).toBeGreaterThan(0);
  });

  it('should calculate pages on Carta sheet with bleed (14×21cm + 3mm bleed)', () => {
    // Page with bleed: 146×216mm on Carta 216×279mm
    const result = calculateImposition(146, 216, 216, 279);
    
    expect(result.pagesPerSide).toBe(1);
  });

  it('should calculate pages on Doble Carta (Tabloid) sheet', () => {
    // Page 140×210mm on Tabloid 432×279mm
    const result = calculateImposition(140, 210, 432, 279);
    
    // Normal: cols=floor(432/140)=3, rows=floor(279/210)=1 → 3 pages
    // Rotated: cols=floor(432/210)=2, rows=floor(279/140)=1 → 2 pages
    // Best = 3 pages normal
    expect(result.pagesPerSide).toBe(3);
    expect(result.rotated).toBe(false);
    expect(result.cols).toBe(3);
    expect(result.rows).toBe(1);
  });

  it('should choose rotated orientation when more efficient', () => {
    // Page 100×250mm on sheet 260×220mm
    // Normal: cols=floor(260/100)=2, rows=floor(220/250)=0 → 0 pages
    // Rotated: cols=floor(260/250)=1, rows=floor(220/100)=2 → 2 pages
    const result = calculateImposition(100, 250, 260, 220);
    
    expect(result.pagesPerSide).toBe(2);
    expect(result.rotated).toBe(true);
  });

  it('should calculate pages on large press sheet (77×110cm)', () => {
    // Page 200×200mm (square) on 770×1100mm
    const result = calculateImposition(200, 200, 770, 1100);
    
    // cols=floor(770/200)=3, rows=floor(1100/200)=5 → 15 pages
    expect(result.pagesPerSide).toBe(15);
    expect(result.cols).toBe(3);
    expect(result.rows).toBe(5);
  });

  it('should calculate waste percentage correctly', () => {
    // Page 200×200mm on 770×1100mm
    const result = calculateImposition(200, 200, 770, 1100);
    
    const expectedUsed = 200 * 200 * 15; // 15 pages
    const expectedTotal = 770 * 1100;
    const expectedWaste = ((expectedTotal - expectedUsed) / expectedTotal) * 100;
    
    expect(result.wastePercentage).toBeCloseTo(expectedWaste, 2);
    expect(result.usedArea_mm2).toBe(expectedUsed);
    expect(result.totalArea_mm2).toBe(expectedTotal);
  });

  it('should return 0 pages when page is larger than sheet', () => {
    const result = calculateImposition(500, 500, 200, 200);
    
    expect(result.pagesPerSide).toBe(0);
    expect(result.wastePercentage).toBe(100);
    expect(result.placements).toHaveLength(0);
  });

  it('should generate correct placement positions', () => {
    // 2 cols × 2 rows on a large sheet
    const result = calculateImposition(100, 100, 250, 250);
    
    expect(result.pagesPerSide).toBe(4);
    expect(result.placements).toHaveLength(4);
    
    // Check first placement
    expect(result.placements[0]).toEqual({
      x: 0, y: 0, width: 100, height: 100, rotated: false
    });
    
    // Check second placement (next column)
    expect(result.placements[1]).toEqual({
      x: 100, y: 0, width: 100, height: 100, rotated: false
    });
  });

  it('should throw on invalid inputs', () => {
    expect(() => calculateImposition(0, 210, 216, 279)).toThrow();
    expect(() => calculateImposition(140, 0, 216, 279)).toThrow();
    expect(() => calculateImposition(140, 210, -1, 279)).toThrow();
  });
});
