import { beforeEach, describe, expect, it } from 'vitest';
import { getAllGrammageOptions, useBookStore } from '../store/useBookStore';
import { loadShippedCatalog } from './testCatalog';

const initialState = useBookStore.getState();
const catalog = loadShippedCatalog();

beforeEach(() => {
  useBookStore.setState(initialState);
  useBookStore.getState().initialize(catalog);
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

describe('Signature imposition plan', () => {
  it('produces a non-null selected scheme for the shipped catalog defaults', () => {
    // This is the regression this exact test would have caught: the shipped
    // defaults.sheetSizeId/pressId pair must actually fit a shipped scheme.
    const state = useBookStore.getState();
    expect(state.pressId).toBe('prensa_70x100');
    expect(state.sheetSizeId).toBe('pliego_70x100');
    expect(state.foldingSchemeId).toBeNull();
    expect(state.signaturePlan?.selected).not.toBeNull();
    expect(state.signatureError).toBeNull();
  });

  it('reproduces the plan acceptance numbers for 32 pages once a large-enough sheet is selected', () => {
    useBookStore.getState().setSheetSize('pliego_70x100');
    const selected = useBookStore.getState().signaturePlan?.selected;

    expect(selected?.scheme.id).toBe('esquema_16pp');
    expect(selected?.signatures).toBe(2);
    expect(selected?.blankPages).toBe(0);
    expect(selected?.sheetsPerCopy).toBe(2);
  });

  it('gives 2 blank pages for 30 pages with the same scheme', () => {
    useBookStore.getState().setSheetSize('pliego_70x100');
    useBookStore.getState().setTotalPages(30);
    const selected = useBookStore.getState().signaturePlan?.selected;

    expect(selected?.scheme.id).toBe('esquema_16pp');
    expect(selected?.signatures).toBe(2);
    expect(selected?.blankPages).toBe(2);
  });

  it('recomputes the plan on page size, bleed, sheet, total pages, press, and scheme changes', () => {
    useBookStore.getState().setSheetSize('pliego_70x100');
    const plans: unknown[] = [useBookStore.getState().signaturePlan];

    useBookStore.getState().setPageDimensions(100, 150);
    plans.push(useBookStore.getState().signaturePlan);
    useBookStore.getState().setBleed(5);
    plans.push(useBookStore.getState().signaturePlan);
    useBookStore.getState().setTotalPages(48);
    plans.push(useBookStore.getState().signaturePlan);
    useBookStore.getState().setPress('prensa_sra3');
    plans.push(useBookStore.getState().signaturePlan);
    // tabloide (432×279mm) fits prensa_sra3's press format rotated
    // (279 <= 330, 432 <= 460); pliego_77x110 would not (P3 enforcement).
    useBookStore.getState().setSheetSize('tabloide');
    plans.push(useBookStore.getState().signaturePlan);
    useBookStore.getState().setFoldingScheme('esquema_8pp');
    plans.push(useBookStore.getState().signaturePlan);

    for (let i = 1; i < plans.length; i++) {
      expect(plans[i]).not.toBe(plans[i - 1]);
    }
    expect(useBookStore.getState().signaturePlan?.selected?.scheme.id).toBe('esquema_8pp');
  });

  it('keeps the previous selection and reports an error when the chosen scheme stops fitting', () => {
    useBookStore.getState().setSheetSize('pliego_70x100');
    const previousSelected = useBookStore.getState().signaturePlan?.selected;
    expect(previousSelected).not.toBeNull();

    useBookStore.getState().setFoldingScheme('esquema_16pp');
    expect(useBookStore.getState().signaturePlan?.selected?.scheme.id).toBe('esquema_16pp');

    // Switch to a sheet where esquema_16pp no longer fits.
    useBookStore.getState().setSheetSize('tabloide');
    const state = useBookStore.getState();

    expect(state.foldingSchemeId).toBe('esquema_16pp');
    expect(state.signatureError).toContain('esquema_16pp');
    expect(state.signaturePlan?.selected?.scheme.id).toBe('esquema_16pp');
  });

  it('reports an error for a folding scheme id that does not exist without clearing the selection', () => {
    useBookStore.getState().setSheetSize('pliego_70x100');
    const previousSelected = useBookStore.getState().signaturePlan?.selected;

    useBookStore.getState().setFoldingScheme('missing-scheme');
    const state = useBookStore.getState();

    expect(state.foldingSchemeId).toBe('missing-scheme');
    expect(state.signatureError).toContain('missing-scheme');
    expect(state.signaturePlan?.selected).toBe(previousSelected);
  });
});

describe('Actions before initialize (signature imposition)', () => {
  it('setPress and setFoldingScheme are no-ops while the catalog is null', () => {
    useBookStore.setState(initialState);
    const before = useBookStore.getState();
    expect(before.catalog).toBeNull();

    expect(() => {
      before.setPress('prensa_70x100');
      before.setFoldingScheme('esquema_16pp');
    }).not.toThrow();

    expect(useBookStore.getState()).toBe(before);
  });
});

describe('Binding rules', () => {
  it('computes the binding results for the shipped defaults', () => {
    const state = useBookStore.getState();

    expect(state.bindingId).toBe('grapa');
    expect(state.bindingPageCount).toEqual({ ok: true });
    expect(state.bindingSpine).toEqual({ interior_mm: 1.92, allowance_mm: 0, total_mm: 1.92 });
    expect(state.bindingCreep).toEqual({ nestedSheets: 8, maxShift_mm: 0.96, innermostShift_mm: 0 });
    expect(state.bindingError).toBeNull();
  });

  it('recomputes on total pages, binding, grammage, and folding scheme changes', () => {
    useBookStore.getState().setTotalPages(40);
    let state = useBookStore.getState();
    expect(state.bindingSpine).toEqual({ interior_mm: 2.4, allowance_mm: 0, total_mm: 2.4 });

    useBookStore.getState().setBinding('hotmelt');
    state = useBookStore.getState();
    expect(state.bindingSpine).toEqual({ interior_mm: 2.4, allowance_mm: 2, total_mm: 4.4 });
    expect(state.bindingCreep).toBeNull(); // hotmelt declares no creep

    useBookStore.getState().setGrammage(200);
    state = useBookStore.getState();
    expect(state.bindingSpine).toEqual({ interior_mm: 3.2, allowance_mm: 2, total_mm: 5.2 });

    const beforeScheme = state.bindingPageCount;
    useBookStore.getState().setFoldingScheme('esquema_16pp');
    expect(useBookStore.getState().bindingPageCount).not.toBe(beforeScheme);
  });

  it('produces a displayable invalid page count that keeps the binding selection and does not set bindingError', () => {
    useBookStore.getState().setTotalPages(33); // not a multiple of grapa's pageMultiple (4)
    const state = useBookStore.getState();

    expect(state.bindingId).toBe('grapa');
    expect(state.bindingPageCount).toMatchObject({ ok: false, reason: 'not-multiple' });
    expect(state.bindingError).toBeNull();
    expect(state.bindingSpine).not.toBeNull();
  });

  it('enforces requiresSignatureMultiple against the actually selected scheme, not a fixed size', () => {
    useBookStore.getState().setBinding('cosido');
    useBookStore.getState().setTotalPages(40);
    const state = useBookStore.getState();

    expect(state.signaturePlan?.selected?.scheme.pagesPerSignature).toBe(16);
    expect(state.bindingPageCount).toMatchObject({
      ok: false,
      reason: 'not-signature-multiple',
      nearestBelow: 32,
      nearestAbove: 48,
    });
  });

  it('setBinding is a no-op while the catalog is null', () => {
    useBookStore.setState(initialState);
    const before = useBookStore.getState();
    expect(before.catalog).toBeNull();

    expect(() => before.setBinding('grapa')).not.toThrow();

    expect(useBookStore.getState()).toBe(before);
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
    expect(getAllGrammageOptions(catalog, 'bond', useBookStore.getState().customGrammages))
      .toContainEqual({ substrateId: 'bond', grammage: 160, caliper: 205 });

    useBookStore.getState().setSubstrate('couche_matte');
    expect(getAllGrammageOptions(catalog, 'couche_matte', useBookStore.getState().customGrammages))
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

describe('Actions before initialize', () => {
  it('are no-ops that do not throw while the catalog is null', () => {
    useBookStore.setState(initialState);
    const before = useBookStore.getState();
    expect(before.catalog).toBeNull();

    let addedSheet = true;
    let addedGrammage = true;

    expect(() => {
      before.setFormat('landscape');
      before.setProportion('2:3');
      before.setPageDimensions(100, 100);
      before.setBleed(5);
      before.setUnitSystem('imperial');
      before.setPageOrientation('normal');
      before.setSubstrate('bond');
      before.setGrammage(90);
      before.setSheetSize('carta');
      before.setTotalPages(10);
      addedSheet = before.addCustomSheetSize('Custom', 100, 100);
      before.removeCustomSheetSize('anything');
      addedGrammage = before.addCustomGrammage('bond', 90, 100);
      before.removeCustomGrammage('bond', 90);
      before.clearCustomGrammageError();
      before.recalculate();
    }).not.toThrow();

    expect(addedSheet).toBe(false);
    expect(addedGrammage).toBe(false);
    // A genuine no-op never produces a new state object, not just equal values.
    expect(useBookStore.getState()).toBe(before);
  });
});
