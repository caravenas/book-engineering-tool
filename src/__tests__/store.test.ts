import { beforeEach, describe, expect, it } from 'vitest';
import { getAllGrammageOptions, useBookStore } from '../store/useBookStore';

const initialState = useBookStore.getState();

beforeEach(() => {
  useBookStore.setState(initialState);
});

describe('Book store recovery', () => {
  it('clears stale results and recovers after valid, invalid, and valid dimensions', () => {
    useBookStore.getState().recalculate();
    const firstValidResult = useBookStore.getState().impositionResult;

    expect(firstValidResult).not.toBeNull();
    expect(useBookStore.getState().spineResult).not.toBeNull();

    useBookStore.getState().setPageDimensions(0, 210);
    let state = useBookStore.getState();

    expect(state.impositionResult).toBeNull();
    expect(state.spineResult).toBeNull();
    expect(state.impositionError).toContain('Corrige');
    expect(state.spineError).toContain('Corrige');

    useBookStore.getState().setPageDimensions(140, 210);
    state = useBookStore.getState();

    expect(state.impositionResult).not.toBeNull();
    expect(state.impositionResult).not.toBe(firstValidResult);
    expect(state.spineResult).not.toBeNull();
    expect(state.impositionError).toBeNull();
    expect(state.spineError).toBeNull();
  });

  it('publishes invalid calculation inputs with cleared corresponding results', () => {
    useBookStore.getState().recalculate();
    const snapshots: Array<{
      pageWidth_mm: number;
      totalPages: number;
      impositionResult: unknown;
      spineResult: unknown;
    }> = [];
    const unsubscribe = useBookStore.subscribe(state => {
      snapshots.push({
        pageWidth_mm: state.pageWidth_mm,
        totalPages: state.totalPages,
        impositionResult: state.impositionResult,
        spineResult: state.spineResult,
      });
    });

    useBookStore.getState().setPageDimensions(0, 210);
    useBookStore.getState().setPageDimensions(140, 210);
    useBookStore.getState().setTotalPages(0);
    unsubscribe();

    expect(snapshots).toHaveLength(3);
    expect(snapshots[0].pageWidth_mm).toBe(0);
    expect(snapshots[0].impositionResult).toBeNull();
    expect(snapshots[2].totalPages).toBe(0);
    expect(snapshots[2].spineResult).toBeNull();
  });

  it('preserves invalid page values and recovers the spine result with a valid safe integer', () => {
    useBookStore.getState().recalculate();
    useBookStore.getState().setTotalPages(1.5);

    let state = useBookStore.getState();
    expect(state.totalPages).toBe(1.5);
    expect(state.impositionResult).not.toBeNull();
    expect(state.spineResult).toBeNull();
    expect(state.spineError).toContain('entero seguro mayor que cero');

    useBookStore.getState().setTotalPages(33);
    state = useBookStore.getState();
    expect(state.totalPages).toBe(33);
    expect(state.spineResult).not.toBeNull();
    expect(state.spineError).toBeNull();
  });

  it('rejects finite bleed arithmetic that loses page dimensions and recovers imposition independently', () => {
    const extremeBleed = Number.MAX_VALUE / 2;
    const bleedSpan = extremeBleed * 2;

    expect(Number.isFinite(bleedSpan)).toBe(true);
    expect(1 + bleedSpan).toBe(bleedSpan);

    useBookStore.getState().setPageDimensions(1, 1);
    useBookStore.getState().setBleed(extremeBleed);
    let state = useBookStore.getState();

    expect(state.impositionResult).toBeNull();
    expect(state.impositionError).toContain('pierde la dimensión de página');
    expect(state.spineResult).not.toBeNull();
    expect(state.spineError).toBeNull();

    useBookStore.getState().setBleed(3);
    state = useBookStore.getState();

    expect(state.impositionResult).not.toBeNull();
    expect(state.impositionError).toBeNull();
    expect(state.spineResult).not.toBeNull();
    expect(state.spineError).toBeNull();
  });

  it('rejects finite page dimensions that lose the bleed contribution and recovers imposition independently', () => {
    expect(useBookStore.getState().addCustomSheetSize('Pliego extremo', 1e100, 1e100)).toBe(true);
    useBookStore.getState().setPageDimensions(1e100, 1e100);

    let state = useBookStore.getState();
    expect(state.impositionResult).toBeNull();
    expect(state.impositionError).toContain('pierde su contribución');
    expect(state.spineResult).not.toBeNull();
    expect(state.spineError).toBeNull();

    useBookStore.getState().setSheetSize('tabloide');
    useBookStore.getState().setPageDimensions(140, 210);
    state = useBookStore.getState();

    expect(state.impositionResult).not.toBeNull();
    expect(state.impositionError).toBeNull();
    expect(state.spineResult).not.toBeNull();
    expect(state.spineError).toBeNull();
  });

  it('keeps layout and spine failures independent', () => {
    useBookStore.getState().setSheetSize('missing-sheet');
    let state = useBookStore.getState();

    expect(state.impositionResult).toBeNull();
    expect(state.impositionError).not.toBeNull();
    expect(state.spineResult).not.toBeNull();
    expect(state.spineError).toBeNull();

    useBookStore.getState().setSheetSize('tabloide');
    useBookStore.getState().setGrammage(999);
    state = useBookStore.getState();

    expect(state.impositionResult).not.toBeNull();
    expect(state.impositionError).toBeNull();
    expect(state.spineResult).toBeNull();
    expect(state.spineError).not.toBeNull();

    useBookStore.getState().setGrammage(150);
    state = useBookStore.getState();
    expect(state.impositionResult).not.toBeNull();
    expect(state.spineResult).not.toBeNull();
    expect(state.impositionError).toBeNull();
    expect(state.spineError).toBeNull();
  });
});

describe('Custom grammages', () => {
  it('rejects built-in and custom duplicates in the same substrate', () => {
    expect(useBookStore.getState().addCustomGrammage('couche_matte', 150, 130)).toBe(false);
    expect(useBookStore.getState().customGrammages).toHaveLength(0);
    expect(useBookStore.getState().customGrammageError).toContain('Ya existe');

    expect(useBookStore.getState().addCustomGrammage('couche_matte', 160, 130)).toBe(true);
    expect(useBookStore.getState().addCustomGrammage('couche_matte', 160, 140)).toBe(false);
    expect(useBookStore.getState().customGrammages).toEqual([
      { substrateId: 'couche_matte', grammage: 160, caliper: 130 },
    ]);
  });

  it('allows the same grammage in different substrates and preserves both on switches', () => {
    expect(useBookStore.getState().addCustomGrammage('bond', 160, 205)).toBe(true);
    expect(useBookStore.getState().addCustomGrammage('couche_matte', 160, 130)).toBe(true);

    useBookStore.getState().setSubstrate('bond');
    expect(getAllGrammageOptions('bond', useBookStore.getState().customGrammages))
      .toContainEqual({ substrateId: 'bond', grammage: 160, caliper: 205 });

    useBookStore.getState().setSubstrate('couche_matte');
    expect(getAllGrammageOptions('couche_matte', useBookStore.getState().customGrammages))
      .toContainEqual({ substrateId: 'couche_matte', grammage: 160, caliper: 130 });
    expect(useBookStore.getState().customGrammages).toHaveLength(2);
  });

  it('selects the declared caliper and removes only the matching substrate option', () => {
    useBookStore.getState().addCustomGrammage('bond', 160, 205);
    let state = useBookStore.getState();

    expect(state.substrateId).toBe('bond');
    expect(state.selectedGrammage).toBe(160);
    expect(state.spineResult?.thickness_mm).toBeCloseTo(3.28, 4);

    useBookStore.getState().addCustomGrammage('couche_matte', 160, 130);
    useBookStore.getState().removeCustomGrammage('bond', 160);
    state = useBookStore.getState();

    expect(state.substrateId).toBe('couche_matte');
    expect(state.selectedGrammage).toBe(160);
    expect(state.spineResult?.thickness_mm).toBeCloseTo(2.08, 4);
    expect(state.customGrammages).toEqual([
      { substrateId: 'couche_matte', grammage: 160, caliper: 130 },
    ]);

    useBookStore.getState().removeCustomGrammage('couche_matte', 160);
    state = useBookStore.getState();

    expect(state.selectedGrammage).toBe(90);
    expect(state.spineResult?.thickness_mm).toBeCloseTo(1.2, 4);
    expect(state.customGrammages).toHaveLength(0);
    expect(state.customGrammageError).toBeNull();
  });

  it('does not alter a built-in grammage when no matching custom option exists', () => {
    useBookStore.setState({ customGrammageError: 'Conservar este error.' });
    const before = useBookStore.getState();
    let notificationCount = 0;
    const unsubscribe = useBookStore.subscribe(() => {
      notificationCount += 1;
    });

    useBookStore.getState().removeCustomGrammage('couche_matte', 150);
    unsubscribe();

    expect(useBookStore.getState()).toBe(before);
    expect(useBookStore.getState().selectedGrammage).toBe(150);
    expect(useBookStore.getState().customGrammageError).toBe('Conservar este error.');
    expect(notificationCount).toBe(0);
  });

  it('rejects non-finite custom values with a recoverable error', () => {
    expect(useBookStore.getState().addCustomGrammage('bond', Number.NaN, 100)).toBe(false);
    expect(useBookStore.getState().customGrammageError).toContain('finitos mayores que cero');

    expect(useBookStore.getState().addCustomGrammage('bond', 160, 205)).toBe(true);
    expect(useBookStore.getState().customGrammageError).toBeNull();
  });
});

describe('Custom sheet sizes', () => {
  it('rejects invalid dimensions without changing the selected sheet or calculations', () => {
    useBookStore.getState().recalculate();
    const before = useBookStore.getState();

    expect(useBookStore.getState().addCustomSheetSize('Inválido', 0, 700)).toBe(false);
    expect(useBookStore.getState().addCustomSheetSize('Inválido', Number.NaN, 700)).toBe(false);
    expect(useBookStore.getState().sheetSizeId).toBe(before.sheetSizeId);
    expect(useBookStore.getState().impositionResult).toBe(before.impositionResult);
    expect(useBookStore.getState().customSheetSizes).toEqual([]);

    expect(useBookStore.getState().addCustomSheetSize('Válido', 500, 700)).toBe(true);
    expect(useBookStore.getState().sheetSizeId).toMatch(/^custom_sheet_/);
    expect(useBookStore.getState().customSheetSizes).toHaveLength(1);
    expect(useBookStore.getState().impositionResult).not.toBeNull();
  });
});
