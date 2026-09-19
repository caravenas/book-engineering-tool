import { beforeEach, describe, expect, it } from 'vitest';
import { getAllGrammageOptions, useBookStore } from '../store/useBookStore';
import { emptyUserLayer } from '../config/userLayer';
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

describe('Cover rules', () => {
  it('computes the cover plan for the shipped defaults', () => {
    const state = useBookStore.getState();

    expect(state.coverId).toBe('blanda_simple');
    expect(state.coverError).toBeNull();
    expect(state.coverPlan?.ok).toBe(true);
    if (!state.coverPlan?.ok) return;
    expect(state.coverPlan.cover.kind).toBe('blanda');
    if (state.coverPlan.cover.kind !== 'blanda') return;

    // The shipped default binding is grapa (saddle stitch, nests: true),
    // so the cover has no spine panel: sheetWidth = 2*0 + 2*140 + 0 + 2*3 = 286
    expect(state.coverPlan.cover.sheetWidth_mm).toBe(286);
    expect(state.coverPlan.cover.sheetHeight_mm).toBe(216);
    expect(state.coverPlan.cover.sections).toEqual({
      flapLeft_mm: 0, back_mm: 143, spine_mm: 0, front_mm: 143, flapRight_mm: 0,
    });
    // paperArea_m2 = (286 * 216) / 1e6 = 0.061776; paperWeight_g = *300
    expect(state.coverPlan.cover.paperArea_m2).toBeCloseTo(0.061776, 9);
    expect(state.coverPlan.cover.paperWeight_g).toBeCloseTo(18.5328, 9);
  });

  it('recomputes the cover plan on page size, bleed, total pages, binding, and cover changes', () => {
    const initialPlan = useBookStore.getState().coverPlan;

    useBookStore.getState().setBleed(5);
    let state = useBookStore.getState();
    expect(state.coverPlan).not.toBe(initialPlan);
    expect(state.coverPlan?.ok && state.coverPlan.cover.kind === 'blanda'
      ? state.coverPlan.cover.sheetHeight_mm : null).toBe(220); // 210 + 2*5

    const afterBleed = state.coverPlan;
    useBookStore.getState().setPageDimensions(150, 220);
    state = useBookStore.getState();
    expect(state.coverPlan).not.toBe(afterBleed);
    expect(state.coverPlan?.ok && state.coverPlan.cover.kind === 'blanda'
      ? state.coverPlan.cover.sheetHeight_mm : null).toBe(230); // 220 + 2*5

    const afterDimensions = state.coverPlan;
    useBookStore.getState().setTotalPages(40);
    state = useBookStore.getState();
    expect(state.coverPlan).not.toBe(afterDimensions);

    const afterPages = state.coverPlan;
    useBookStore.getState().setBinding('hotmelt');
    state = useBookStore.getState();
    expect(state.coverPlan).not.toBe(afterPages);

    const afterBinding = state.coverPlan;
    useBookStore.getState().setCover('dura_estandar');
    state = useBookStore.getState();
    expect(state.coverPlan).not.toBe(afterBinding);
    expect(state.coverPlan?.ok).toBe(true); // hotmelt declares nests: false
  });

  it('reports a hard cover paired with the saddle-stitch binding as a normal incompatible result, not an error, and keeps the selection', () => {
    useBookStore.getState().setCover('dura_estandar');
    const state = useBookStore.getState();

    expect(state.coverId).toBe('dura_estandar');
    expect(state.coverPlan).toEqual({
      ok: false,
      reason: 'binding-has-no-flat-spine',
      message: expect.any(String),
    });
    expect(state.coverError).toBeNull();
  });

  it('setCover is a no-op while the catalog is null', () => {
    useBookStore.setState(initialState);
    const before = useBookStore.getState();
    expect(before.catalog).toBeNull();

    expect(() => before.setCover('blanda_simple')).not.toThrow();

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

describe('Custom presses', () => {
  it('rejects a blank or whitespace-only name with the same message the shipped catalog validator uses', () => {
    expect(useBookStore.getState().addCustomPress('', 200, 300, 5, 5, 5, 2)).toBe(false);
    expect(useBookStore.getState().customPresses).toHaveLength(0);
    expect(useBookStore.getState().customPressError).toBe('El nombre de la prensa debe ser un texto no vacío.');

    expect(useBookStore.getState().addCustomPress('   ', 200, 300, 5, 5, 5, 2)).toBe(false);
    expect(useBookStore.getState().customPresses).toHaveLength(0);
  });

  it('rejects a name that duplicates a catalog or custom press, ignoring case and surrounding spaces', () => {
    expect(useBookStore.getState().addCustomPress('  prensa formato sra3 ', 200, 300, 5, 5, 5, 2)).toBe(false);
    expect(useBookStore.getState().customPresses).toHaveLength(0);
    expect(useBookStore.getState().customPressError).toContain('Ya existe');

    expect(useBookStore.getState().addCustomPress('Prensa X', 200, 300, 5, 5, 5, 2)).toBe(true);
    expect(useBookStore.getState().addCustomPress('prensa x  ', 250, 350, 5, 5, 5, 2)).toBe(false);
    expect(useBookStore.getState().customPresses).toHaveLength(1);
    expect(useBookStore.getState().customPressError).toContain('Ya existe');
  });

  it('rejects non-finite or non-positive dimensions with a recoverable error', () => {
    expect(useBookStore.getState().addCustomPress('Prensa inválida', 0, 300, 5, 5, 5, 2)).toBe(false);
    expect(useBookStore.getState().customPressError).toContain('finitos');

    expect(useBookStore.getState().addCustomPress('Prensa inválida', 200, Number.NaN, 5, 5, 5, 2)).toBe(false);
    expect(useBookStore.getState().customPresses).toHaveLength(0);
  });

  it('rejects margins that leave no printable area', () => {
    // gripperMargin_mm (30) + tailMargin_mm (30) >= maxSheetHeight_mm (60)
    expect(useBookStore.getState().addCustomPress('Prensa sin área', 200, 60, 30, 5, 30, 2)).toBe(false);
    expect(useBookStore.getState().customPressError).toContain('área imprimible');

    // 2 * sideMargin_mm (100) >= maxSheetWidth_mm (200)
    expect(useBookStore.getState().addCustomPress('Prensa sin área lateral', 200, 300, 5, 100, 5, 2)).toBe(false);
    expect(useBookStore.getState().customPresses).toHaveLength(0);
  });

  it('adds, selects, and recalculates the signature plan for the new press', () => {
    expect(useBookStore.getState().addCustomPress('Prensa pequeña', 100, 100, 1, 1, 1, 1)).toBe(true);
    const state = useBookStore.getState();

    expect(state.pressId).toMatch(/^custom_press_/);
    expect(state.customPresses).toHaveLength(1);
    // The shipped default sheet (pliego_70x100, 700×1000mm) cannot fit a 100×100mm press.
    expect(state.signaturePlan?.selected).toBeNull();
    expect(state.signaturePlan?.reason).toBe('sheet-exceeds-press');
    expect(state.signatureError).toBeNull();
    expect(state.customPressError).toBeNull();
  });

  it('removes the custom press and falls back to the first catalog press when it was selected', () => {
    useBookStore.getState().addCustomPress('Prensa pequeña', 100, 100, 1, 1, 1, 1);
    const beforeRemoval = useBookStore.getState();
    const addedId = beforeRemoval.pressId;

    useBookStore.getState().removeCustomPress(addedId);
    const state = useBookStore.getState();

    expect(state.pressId).toBe(catalog.presses[0].id);
    expect(state.customPresses).toHaveLength(0);
    // The signature plan is recomputed against the fallback press, not left stale.
    expect(state.signaturePlan).not.toBe(beforeRemoval.signaturePlan);
    expect(state.customPressError).toBeNull();
  });
});

describe('Custom bindings', () => {
  it('rejects a blank or whitespace-only name with the same message the shipped catalog validator uses', () => {
    expect(useBookStore.getState().addCustomBinding('', 2, 2, 2000, 5, false, false)).toBe(false);
    expect(useBookStore.getState().customBindings).toHaveLength(0);
    expect(useBookStore.getState().customBindingError).toBe('El nombre de la encuadernación debe ser un texto no vacío.');

    expect(useBookStore.getState().addCustomBinding('   ', 2, 2, 2000, 5, false, false)).toBe(false);
    expect(useBookStore.getState().customBindings).toHaveLength(0);
  });

  it('rejects a name that duplicates a catalog or custom binding, ignoring case and surrounding spaces', () => {
    expect(useBookStore.getState().addCustomBinding(' GRAPA (caballete) ', 2, 2, 2000, 5, false, false)).toBe(false);
    expect(useBookStore.getState().customBindings).toHaveLength(0);
    expect(useBookStore.getState().customBindingError).toContain('Ya existe');

    expect(useBookStore.getState().addCustomBinding('Encuadernación X', 2, 2, 2000, 5, false, false)).toBe(true);
    expect(useBookStore.getState().addCustomBinding('encuadernación x  ', 2, 2, 2000, 5, false, false)).toBe(false);
    expect(useBookStore.getState().customBindings).toHaveLength(1);
    expect(useBookStore.getState().customBindingError).toContain('Ya existe');
  });

  it('rejects a page count out of range with a recoverable error', () => {
    // minPages (4) is above maxPages (2)
    expect(useBookStore.getState().addCustomBinding('Encuadernación inválida', 2, 4, 2, 5, false, false)).toBe(false);
    expect(useBookStore.getState().customBindingError).toContain('menor o igual que el máximo');

    expect(useBookStore.getState().addCustomBinding('Encuadernación inválida', 2, 2, 2000, Number.NaN, false, false)).toBe(false);
    expect(useBookStore.getState().customBindings).toHaveLength(0);
  });

  it('adds, selects, and recalculates the binding spine for the new binding', () => {
    expect(useBookStore.getState().addCustomBinding('Encuadernación nueva', 2, 2, 2000, 5, false, false)).toBe(true);
    const state = useBookStore.getState();

    expect(state.bindingId).toMatch(/^custom_binding_/);
    expect(state.customBindings).toHaveLength(1);
    // Shipped defaults: 32 pages, couche_matte @150g (caliper 120µm) -> interior 1.92mm; +5mm allowance.
    expect(state.bindingSpine).toEqual({ interior_mm: 1.92, allowance_mm: 5, total_mm: 6.92 });
    expect(state.bindingError).toBeNull();
    expect(state.customBindingError).toBeNull();
  });

  it('removes the custom binding and falls back to the first catalog binding when it was selected', () => {
    useBookStore.getState().addCustomBinding('Encuadernación nueva', 2, 2, 2000, 5, false, false);
    const addedId = useBookStore.getState().bindingId;

    useBookStore.getState().removeCustomBinding(addedId);
    const state = useBookStore.getState();

    expect(state.bindingId).toBe(catalog.bindings[0].id);
    expect(state.customBindings).toHaveLength(0);
    expect(state.bindingSpine).toEqual({ interior_mm: 1.92, allowance_mm: 0, total_mm: 1.92 });
    expect(state.customBindingError).toBeNull();
  });
});

describe('Custom proportions', () => {
  it('rejects a blank or whitespace-only description with the same message the shipped catalog validator uses', () => {
    expect(useBookStore.getState().addCustomProportion('Formato sin descripción', 1, 2, '')).toBe(false);
    expect(useBookStore.getState().customProportions).toHaveLength(0);
    expect(useBookStore.getState().customProportionError).toBe('La descripción de la proporción debe ser un texto no vacío.');

    expect(useBookStore.getState().addCustomProportion('Formato sin descripción', 1, 2, '   ')).toBe(false);
    expect(useBookStore.getState().customProportions).toHaveLength(0);
  });

  it('rejects a label that duplicates a catalog or custom proportion, ignoring case and surrounding spaces', () => {
    expect(useBookStore.getState().addCustomProportion(' 2:3 ', 4, 5, 'Duplicada')).toBe(false);
    expect(useBookStore.getState().customProportions).toHaveLength(0);
    expect(useBookStore.getState().customProportionError).toContain('Ya existe');

    expect(useBookStore.getState().addCustomProportion('Formato X', 1, 2, 'Nueva proporción')).toBe(true);
    expect(useBookStore.getState().addCustomProportion('formato x  ', 3, 4, 'Otra vez')).toBe(false);
    expect(useBookStore.getState().customProportions).toHaveLength(1);
    expect(useBookStore.getState().customProportionError).toContain('Ya existe');
  });

  it('rejects a non-finite or non-positive ratio with a recoverable error', () => {
    expect(useBookStore.getState().addCustomProportion('Formato inválido', 0, 5, 'Inválida')).toBe(false);
    expect(useBookStore.getState().customProportionError).toContain('finitos mayores que cero');

    expect(useBookStore.getState().addCustomProportion('Formato inválido', 4, Number.NaN, 'Inválida')).toBe(false);
    expect(useBookStore.getState().customProportions).toHaveLength(0);
  });

  it('adds, selects, and recalculates the page dimensions for the new proportion', () => {
    expect(useBookStore.getState().addCustomProportion('Mi formato', 1, 2, 'Ratio 1:2')).toBe(true);
    const state = useBookStore.getState();

    expect(state.proportionId).toBe('Mi formato');
    expect(state.customProportions).toHaveLength(1);
    // format is 'vertical' and pageWidth_mm stays 140 (the shipped default);
    // height = 140 * (2/1) = 280.
    expect(state.pageWidth_mm).toBe(140);
    expect(state.pageHeight_mm).toBe(280);
    expect(state.customProportionError).toBeNull();
  });

  it('removes the custom proportion and falls back to the first catalog proportion when it was selected', () => {
    useBookStore.getState().addCustomProportion('Mi formato', 1, 2, 'Ratio 1:2');

    useBookStore.getState().removeCustomProportion('Mi formato');
    const state = useBookStore.getState();

    expect(state.proportionId).toBe(catalog.proportions[0].label);
    expect(state.customProportions).toHaveLength(0);
    // catalog.proportions[0] is '1:1' (ratio [1, 1]); pageWidth_mm stays 140, height becomes 140.
    expect(state.pageWidth_mm).toBe(140);
    expect(state.pageHeight_mm).toBe(140);
    expect(state.customProportionError).toBeNull();
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
      before.setTotalPagesInput('10');
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

describe('Initialize resolves default selections against the effective catalog (UX-6)', () => {
  it('falls back to a visible sheet size when the default one is hidden', () => {
    useBookStore.setState(initialState);
    useBookStore.getState().initialize(catalog, {
      ...emptyUserLayer(),
      hiddenSheetSizeIds: [catalog.defaults.sheetSizeId],
    });

    const state = useBookStore.getState();
    expect(state.sheetSizeId).not.toBe(catalog.defaults.sheetSizeId);
    expect(state.hiddenSheetSizeIds).not.toContain(state.sheetSizeId);
  });

  it('falls back to a visible press when the default one is hidden', () => {
    useBookStore.setState(initialState);
    useBookStore.getState().initialize(catalog, {
      ...emptyUserLayer(),
      hiddenPressIds: [catalog.defaults.pressId],
    });

    const state = useBookStore.getState();
    expect(state.pressId).not.toBe(catalog.defaults.pressId);
    expect(state.hiddenPressIds).not.toContain(state.pressId);
  });

  it('falls back to a visible binding when the default one is hidden', () => {
    useBookStore.setState(initialState);
    useBookStore.getState().initialize(catalog, {
      ...emptyUserLayer(),
      hiddenBindingIds: [catalog.defaults.bindingId],
    });

    const state = useBookStore.getState();
    expect(state.bindingId).not.toBe(catalog.defaults.bindingId);
    expect(state.hiddenBindingIds).not.toContain(state.bindingId);
  });

  it('falls back to a visible proportion when the default one is hidden', () => {
    useBookStore.setState(initialState);
    useBookStore.getState().initialize(catalog, {
      ...emptyUserLayer(),
      hiddenProportionLabels: [catalog.defaults.proportionId],
    });

    const state = useBookStore.getState();
    expect(state.proportionId).not.toBe(catalog.defaults.proportionId);
    expect(state.proportionId).not.toBeNull();
    expect(state.hiddenProportionLabels).not.toContain(state.proportionId as string);
  });

  it('falls back to Manual when every proportion is hidden', () => {
    useBookStore.setState(initialState);
    useBookStore.getState().initialize(catalog, {
      ...emptyUserLayer(),
      hiddenProportionLabels: catalog.proportions.map(proportion => proportion.label),
    });

    expect(useBookStore.getState().proportionId).toBeNull();
  });
});

describe('totalPagesInput', () => {
  it('updates totalPagesInput and recalculates totalPages and the spine result for valid text', () => {
    useBookStore.getState().setTotalPagesInput('33');

    const state = useBookStore.getState();
    expect(state.totalPagesInput).toBe('33');
    expect(state.totalPages).toBe(33);
    expect(state.spineResult).not.toBeNull();
    expect(state.spineError).toBeNull();
  });

  it('updates totalPagesInput and resets totalPages to zero for invalid text, so dependent panels show the error', () => {
    useBookStore.getState().setTotalPagesInput('33');

    useBookStore.getState().setTotalPagesInput('30x');
    let state = useBookStore.getState();
    expect(state.totalPagesInput).toBe('30x');
    // Zeroing totalPages on invalid input is today's behavior; keeping the
    // last valid value instead is a pending product decision, not this fix.
    expect(state.totalPages).toBe(0);
    expect(state.spineResult).toBeNull();

    useBookStore.getState().setTotalPagesInput('');
    state = useBookStore.getState();
    expect(state.totalPagesInput).toBe('');
    expect(state.totalPages).toBe(0);
    expect(state.spineResult).toBeNull();
  });

  it('keeps totalPagesInput in sync with totalPages when setTotalPages is called directly', () => {
    useBookStore.getState().setTotalPages(48);

    expect(useBookStore.getState().totalPagesInput).toBe('48');
  });

  it('sets totalPagesInput to the catalog default total pages after initialize', () => {
    expect(useBookStore.getState().totalPagesInput).toBe(String(catalog.defaults.totalPages));
  });
});
