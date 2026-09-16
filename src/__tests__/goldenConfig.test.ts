import { describe, expect, it } from 'vitest';
import { useBookStore } from '../store/useBookStore';
import { loadShippedCatalog } from './testCatalog';

// Golden values captured by running the pre-increment code (commit 91d321b)
// with its hardcoded defaults, before the catalog moved to runtime JSON.
describe('Golden defaults from the shipped runtime config', () => {
  it('reproduces the exact 91d321b results for the default configuration', () => {
    const catalog = loadShippedCatalog();
    useBookStore.getState().initialize(catalog);
    // Increment 2 changed defaults.sheetSizeId to pliego_70x100 (P2: tabloide
    // is too small for either shipped folding scheme), so the tabloide
    // regression this test guards is now reproduced explicitly instead of
    // relying on it being the default.
    useBookStore.getState().setSheetSize('tabloide');
    const state = useBookStore.getState();

    expect(state.pageWidth_mm).toBe(140);
    expect(state.pageHeight_mm).toBe(210);
    expect(state.bleed_mm).toBe(3);
    expect(state.sheetSizeId).toBe('tabloide');
    expect(state.selectedGrammage).toBe(150);
    expect(state.totalPages).toBe(32);

    expect(state.impositionResult).toEqual(expect.objectContaining({
      pagesPerSide: 2,
      cols: 2,
      rows: 1,
      rotated: false,
      wastePercentage: 47.67025089605735,
      usedArea_mm2: 63072,
      totalArea_mm2: 120528,
    }));

    expect(state.spineResult).toEqual({
      thickness_mm: 1.92,
      totalWeight_g: 70.56,
    });
  });
});
