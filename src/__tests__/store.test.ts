import { beforeEach, describe, expect, it } from 'vitest';
import { createBookStore, getAllCovers, getAllGrammageOptions, getAllSubstrates, useBookStore } from '../store/useBookStore';
import { emptyUserLayer, readUserLayer } from '../config/userLayer';
import { loadShippedCatalog } from './testCatalog';
import { FakeStorage } from './fakeStorage';

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
    expect(getAllGrammageOptions(catalog.substrates, 'bond', useBookStore.getState().customGrammages))
      .toContainEqual({ substrateId: 'bond', grammage: 160, caliper: 205 });

    useBookStore.getState().setSubstrate('couche_matte');
    expect(getAllGrammageOptions(catalog.substrates, 'couche_matte', useBookStore.getState().customGrammages))
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

/**
 * An entry of your own has no factory entry behind it, so it cannot be
 * patched and could only be deleted and added again. These are the actions
 * that let a print shop correct a machine it typed wrong instead of starting
 * over, which is the point of being able to add one at all.
 */
describe('Editing an entry of your own (R-8)', () => {
  it('replaces the press in place, keeps it selected, and reaches the imposition engine', () => {
    expect(useBookStore.getState().addCustomPress('Heidelberg SM 74', 740, 1050, 12, 10, 10, 5)).toBe(true);
    const id = useBookStore.getState().pressId;
    const before = useBookStore.getState().signaturePlan?.selected;
    expect(before).toBeTruthy();

    expect(useBookStore.getState().editCustomPress(id, { name: '  Heidelberg SM 102  ', maxSheetWidth_mm: 320, maxSheetHeight_mm: 450 })).toBe(true);

    const [press] = useBookStore.getState().customPresses;
    expect(useBookStore.getState().customPresses).toHaveLength(1);
    expect(press.id).toBe(id);
    // Trimmed, like the adder trims, and the untouched fields survive.
    expect(press.name).toBe('Heidelberg SM 102');
    expect(press.maxSheetWidth_mm).toBe(320);
    expect(press.gripperMargin_mm).toBe(12);
    expect(useBookStore.getState().pressId).toBe(id);
    expect(useBookStore.getState().customPressError).toBeNull();

    /*
     * Not just stored. The shipped sheet is 700x1000, so an SRA3-sized press
     * cannot hold it and no folding scheme fits: the plan goes from a
     * selection to none. A weaker edit passed this assertion while proving
     * nothing, because the engine happened to pick the same plan either way.
     */
    expect(useBookStore.getState().signaturePlan?.selected ?? null).toBeNull();
  });

  it('refuses changes that would leave no printable area, and changes nothing', () => {
    expect(useBookStore.getState().addCustomPress('Prensa propia', 700, 1000, 12, 10, 10, 5)).toBe(true);
    const id = useBookStore.getState().pressId;

    // Gripper plus tail swallowing the sheet is the invariant maquinas.json
    // is validated against; the same one has to hold for an edit.
    expect(useBookStore.getState().editCustomPress(id, { gripperMargin_mm: 600, tailMargin_mm: 500 })).toBe(false);
    expect(useBookStore.getState().customPresses[0].gripperMargin_mm).toBe(12);
    expect(useBookStore.getState().customPressError).toContain('inválidos');
  });

  it('refuses a rename onto another press but allows an entry to keep its own name', () => {
    expect(useBookStore.getState().addCustomPress('Prensa propia', 700, 1000, 12, 10, 10, 5)).toBe(true);
    const id = useBookStore.getState().pressId;

    expect(useBookStore.getState().editCustomPress(id, { name: '  prensa formato sra3 ' })).toBe(false);
    expect(useBookStore.getState().customPresses[0].name).toBe('Prensa propia');
    expect(useBookStore.getState().customPressError).toContain('Ya existe');

    // Editing a number without touching the name must not read as a clash
    // with the entry being edited.
    expect(useBookStore.getState().editCustomPress(id, { gutter_mm: 8 })).toBe(true);
    expect(useBookStore.getState().customPresses[0].gutter_mm).toBe(8);
  });

  it('refuses to edit a factory press through this action: a factory entry is patched, not replaced', () => {
    expect(useBookStore.getState().editCustomPress('prensa_sra3', { name: 'Otra cosa' })).toBe(false);
    expect(useBookStore.getState().customPressError).toContain('no es una de las tuyas');
    expect(useBookStore.getState().pressPatches).toHaveLength(0);
  });

  it('edits a sheet size of your own and recalculates with it', () => {
    expect(useBookStore.getState().addCustomSheetSize('Pliego propio', 500, 700)).toBe(true);
    const id = useBookStore.getState().sheetSizeId;

    expect(useBookStore.getState().editCustomSheetSize(id, { width_mm: 640, height_mm: 880 })).toBe(true);
    expect(useBookStore.getState().customSheetSizes[0]).toMatchObject({ id, name: 'Pliego propio', width_mm: 640, height_mm: 880 });

    expect(useBookStore.getState().editCustomSheetSize(id, { width_mm: 0 })).toBe(false);
    expect(useBookStore.getState().customSheetSizes[0].width_mm).toBe(640);
  });

  it('edits a binding of your own, and refuses a page range that inverts itself', () => {
    expect(useBookStore.getState().addCustomBinding('Cosido propio', 4, 16, 400, 1.5, false, false)).toBe(true);
    const id = useBookStore.getState().bindingId;

    expect(useBookStore.getState().editCustomBinding(id, { spineAllowance_mm: 2.5, maxPages: 500 })).toBe(true);
    expect(useBookStore.getState().customBindings[0]).toMatchObject({ id, spineAllowance_mm: 2.5, maxPages: 500, minPages: 16 });

    expect(useBookStore.getState().editCustomBinding(id, { minPages: 600 })).toBe(false);
    expect(useBookStore.getState().customBindings[0].minPages).toBe(16);
    expect(useBookStore.getState().customBindingError).toContain('inválidos');
  });

  /**
   * A proportion is keyed by its label, so renaming one moves the key. The
   * selection has to move with it, or the app points at a label that is no
   * longer there and silently falls back to a different proportion.
   */
  it('renames a proportion of your own and carries the selection to the new label', () => {
    expect(useBookStore.getState().addCustomProportion('4:5', 4, 5, 'Formato de prueba.')).toBe(true);
    expect(useBookStore.getState().proportionId).toBe('4:5');
    const width = useBookStore.getState().pageWidth_mm;

    expect(useBookStore.getState().editCustomProportion('4:5', { label: 'Panorámico', ratio: [16, 9] })).toBe(true);

    expect(useBookStore.getState().customProportions).toHaveLength(1);
    expect(useBookStore.getState().customProportions[0].label).toBe('Panorámico');
    expect(useBookStore.getState().proportionId).toBe('Panorámico');
    // The new ratio is applied, not just stored.
    expect(useBookStore.getState().pageHeight_mm).toBeCloseTo(width * 9 / 16, 6);
  });

  it('leaves the selection alone when the proportion renamed is not the one selected', () => {
    expect(useBookStore.getState().addCustomProportion('4:5', 4, 5, 'Formato de prueba.')).toBe(true);
    useBookStore.getState().setProportion('2:3');

    expect(useBookStore.getState().editCustomProportion('4:5', { label: '5:4' })).toBe(true);
    expect(useBookStore.getState().proportionId).toBe('2:3');
  });

  it('refuses to rename a proportion of your own onto a factory label', () => {
    expect(useBookStore.getState().addCustomProportion('4:5', 4, 5, 'Formato de prueba.')).toBe(true);

    expect(useBookStore.getState().editCustomProportion('4:5', { label: ' 2:3 ' })).toBe(false);
    expect(useBookStore.getState().customProportions[0].label).toBe('4:5');
    expect(useBookStore.getState().customProportionError).toContain('Ya existe');
  });

  it('writes the edit through to storage, so a reload reads the corrected entry', () => {
    const storage = new FakeStorage();

    const firstMount = createBookStore(storage);
    firstMount.getState().initialize(catalog);
    expect(firstMount.getState().addCustomPress('Prensa propia', 700, 1000, 12, 10, 10, 5)).toBe(true);
    const id = firstMount.getState().pressId;
    expect(firstMount.getState().editCustomPress(id, { name: 'Prensa corregida', gutter_mm: 8 })).toBe(true);

    // A fresh store instance, reading what the first one wrote: the edit has
    // to be in storage and not only in the state that made it.
    const secondMount = createBookStore(storage);
    secondMount.getState().initialize(catalog, readUserLayer(storage));

    expect(secondMount.getState().customPresses).toHaveLength(1);
    expect(secondMount.getState().customPresses[0]).toMatchObject({ id, name: 'Prensa corregida', gutter_mm: 8 });
  });
});

/**
 * Until R-10 a print shop could add its press but not its paper: papers were
 * read only, so buying a stock the catalog does not list meant editing
 * `public/config/sustratos.json` by hand. This is the half of "machines or
 * materials" that was missing.
 */
describe('Papers a print shop adds (R-10)', () => {
  it('adds a paper with the weight it is bought in, selects it, and computes with it', () => {
    expect(useBookStore.getState().addCustomSubstrate('Verjurado del taller', 'Lo compramos a granel.', 120, 160)).toBe(true);

    const [paper] = useBookStore.getState().customSubstrates;
    expect(useBookStore.getState().customSubstrates).toHaveLength(1);
    expect(paper).toMatchObject({ name: 'Verjurado del taller', description: 'Lo compramos a granel.' });
    expect(paper.options).toEqual([{ grammage: 120, caliper: 160 }]);
    // `type` is required by the catalog schema and read by nothing; a paper of
    // your own carries its own id there, like all seven shipped papers do.
    expect(paper.type).toBe(paper.id);

    expect(useBookStore.getState().substrateId).toBe(paper.id);
    expect(useBookStore.getState().selectedGrammage).toBe(120);
    // Not just stored: the caliper it declares has to reach the spine.
    const spine = useBookStore.getState().spineResult;
    expect(spine).not.toBeNull();
    expect(spine!.thickness_mm).toBeCloseTo(Math.ceil(useBookStore.getState().totalPages / 2) * 160 / 1000, 6);
  });

  it('refuses a paper with no name, no description, or a weight that is not a number', () => {
    expect(useBookStore.getState().addCustomSubstrate('  ', 'Descripción.', 120, 160)).toBe(false);
    expect(useBookStore.getState().customSubstrateError).toContain('nombre');

    expect(useBookStore.getState().addCustomSubstrate('Papel', '  ', 120, 160)).toBe(false);
    expect(useBookStore.getState().customSubstrateError).toContain('descripción');

    expect(useBookStore.getState().addCustomSubstrate('Papel', 'Descripción.', 0, 160)).toBe(false);
    expect(useBookStore.getState().addCustomSubstrate('Papel', 'Descripción.', 120, Number.NaN)).toBe(false);
    expect(useBookStore.getState().customSubstrates).toHaveLength(0);
  });

  it('refuses a name that duplicates a catalog or custom paper, ignoring case and spaces', () => {
    expect(useBookStore.getState().addCustomSubstrate('  bond ', 'Descripción.', 120, 160)).toBe(false);
    expect(useBookStore.getState().customSubstrateError).toContain('Ya existe');

    expect(useBookStore.getState().addCustomSubstrate('Verjurado', 'Descripción.', 120, 160)).toBe(true);
    expect(useBookStore.getState().addCustomSubstrate(' VERJURADO ', 'Otra.', 90, 110)).toBe(false);
    expect(useBookStore.getState().customSubstrates).toHaveLength(1);
  });

  it('adds further weights to a paper of your own, through the same list a factory paper has', () => {
    expect(useBookStore.getState().addCustomSubstrate('Verjurado', 'Descripción.', 120, 160)).toBe(true);
    const { id } = useBookStore.getState().customSubstrates[0];

    expect(useBookStore.getState().addCustomGrammage(id, 200, 250)).toBe(true);
    const substrates = getAllSubstrates(
      catalog,
      useBookStore.getState().customSubstrates,
      useBookStore.getState().substratePatches,
      useBookStore.getState().hiddenSubstrateIds
    );
    expect(getAllGrammageOptions(substrates, id, useBookStore.getState().customGrammages)).toEqual([
      { grammage: 120, caliper: 160 },
      { substrateId: id, grammage: 200, caliper: 250 },
    ]);

    useBookStore.getState().setGrammage(200);
    expect(useBookStore.getState().selectedGrammage).toBe(200);
  });

  it('edits a paper of your own and patches a factory one, each the way its kind allows', () => {
    expect(useBookStore.getState().addCustomSubstrate('Verjurado', 'Descripción.', 120, 160)).toBe(true);
    const { id } = useBookStore.getState().customSubstrates[0];

    expect(useBookStore.getState().editCustomSubstrate(id, { name: 'Verjurado corregido' })).toBe(true);
    expect(useBookStore.getState().customSubstrates[0]).toMatchObject({
      id, name: 'Verjurado corregido', description: 'Descripción.',
    });
    // The weight it was created with survives an edit of its name.
    expect(useBookStore.getState().customSubstrates[0].options).toEqual([{ grammage: 120, caliper: 160 }]);

    expect(useBookStore.getState().patchSubstrate('bond', { name: 'Bond de la casa' })).toBe(true);
    const substrates = getAllSubstrates(
      catalog,
      useBookStore.getState().customSubstrates,
      useBookStore.getState().substratePatches,
      useBookStore.getState().hiddenSubstrateIds
    );
    expect(substrates.find(item => item.id === 'bond')?.name).toBe('Bond de la casa');
    // A patch never touches the weights the paper ships with.
    expect(substrates.find(item => item.id === 'bond')?.options.length).toBeGreaterThan(0);

    useBookStore.getState().unpatchSubstrate('bond');
    expect(useBookStore.getState().substratePatches).toHaveLength(0);
  });

  it('takes the weights with it when a paper of your own is deleted', () => {
    expect(useBookStore.getState().addCustomSubstrate('Verjurado', 'Descripción.', 120, 160)).toBe(true);
    const { id } = useBookStore.getState().customSubstrates[0];
    expect(useBookStore.getState().addCustomGrammage(id, 200, 250)).toBe(true);

    useBookStore.getState().removeCustomSubstrate(id);

    expect(useBookStore.getState().customSubstrates).toHaveLength(0);
    // Left behind, they would name a paper that no longer exists.
    expect(useBookStore.getState().customGrammages).toHaveLength(0);
    // And the selection lands somewhere real, with a weight that paper sells.
    const substrateId = useBookStore.getState().substrateId;
    expect(substrateId).not.toBe(id);
    const paper = catalog.substrates.find(item => item.id === substrateId)!;
    expect(paper.options.some(option => option.grammage === useBookStore.getState().selectedGrammage)).toBe(true);
  });

  /**
   * Deleting an entry that is NOT the one in use must leave the selection
   * alone. The repair logic asks "was this the selected one?", and getting
   * that question backwards would move the book onto a different paper every
   * time a print shop tidied up its catalog.
   */
  it('leaves the book alone when the paper deleted is not the one in use', () => {
    expect(useBookStore.getState().addCustomSubstrate('El que se queda', 'Uno.', 120, 160)).toBe(true);
    const keeper = useBookStore.getState().customSubstrates[0];
    expect(useBookStore.getState().addCustomSubstrate('El que se va', 'Otro.', 200, 260)).toBe(true);
    const doomed = useBookStore.getState().customSubstrates[1];
    // The second alta selected itself; point the book back at the first.
    useBookStore.getState().setSubstrate(keeper.id);
    const grammageBefore = useBookStore.getState().selectedGrammage;

    useBookStore.getState().removeCustomSubstrate(doomed.id);

    expect(useBookStore.getState().substrateId).toBe(keeper.id);
    expect(useBookStore.getState().selectedGrammage).toBe(grammageBefore);
    expect(useBookStore.getState().customSubstrates.map(item => item.id)).toEqual([keeper.id]);
  });

  it('hides a factory paper, moves off it, and brings it back', () => {
    useBookStore.getState().setSubstrate('bond');
    useBookStore.getState().hideSubstrate('bond');

    expect(useBookStore.getState().hiddenSubstrateIds).toEqual(['bond']);
    expect(useBookStore.getState().substrateId).not.toBe('bond');
    const substrates = getAllSubstrates(
      catalog, [], [], useBookStore.getState().hiddenSubstrateIds
    );
    expect(substrates.some(item => item.id === 'bond')).toBe(false);
    // The weight follows the paper: it has to be one the new paper sells.
    const landed = substrates.find(item => item.id === useBookStore.getState().substrateId)!;
    expect(landed.options.some(option => option.grammage === useBookStore.getState().selectedGrammage)).toBe(true);

    useBookStore.getState().showSubstrate('bond');
    expect(useBookStore.getState().hiddenSubstrateIds).toEqual([]);
  });

  it('survives a reload: the paper, its extra weight and the patch all come back', () => {
    const storage = new FakeStorage();

    const firstMount = createBookStore(storage);
    firstMount.getState().initialize(catalog);
    expect(firstMount.getState().addCustomSubstrate('Verjurado', 'Descripción.', 120, 160)).toBe(true);
    const { id } = firstMount.getState().customSubstrates[0];
    expect(firstMount.getState().addCustomGrammage(id, 200, 250)).toBe(true);
    expect(firstMount.getState().patchSubstrate('bond', { name: 'Bond de la casa' })).toBe(true);
    firstMount.getState().hideSubstrate('opalina');

    const secondMount = createBookStore(storage);
    secondMount.getState().initialize(catalog, readUserLayer(storage));

    const state = secondMount.getState();
    expect(state.customSubstrates.map(item => item.name)).toEqual(['Verjurado']);
    // The grammage attached to a paper of your own is not dropped as an
    // unknown substrate, which is what happened before papers could be added.
    expect(state.customGrammages).toEqual([{ substrateId: id, grammage: 200, caliper: 250 }]);
    expect(state.substratePatches).toEqual([{ id: 'bond', changes: { name: 'Bond de la casa' } }]);
    expect(state.hiddenSubstrateIds).toEqual(['opalina']);
    expect(state.orphanedUserLayerEntries).toEqual([]);
  });

  it('reports a patch and a hide for a paper the catalog no longer has, without dropping them', () => {
    const storage = new FakeStorage();
    const firstMount = createBookStore(storage);
    firstMount.getState().initialize(catalog);
    expect(firstMount.getState().patchSubstrate('bond', { name: 'Bond de la casa' })).toBe(true);
    firstMount.getState().hideSubstrate('opalina');

    const withoutThem = {
      ...catalog,
      substrates: catalog.substrates.filter(item => item.id !== 'bond' && item.id !== 'opalina'),
    };
    const secondMount = createBookStore(storage);
    secondMount.getState().initialize(withoutThem, readUserLayer(storage));

    expect(secondMount.getState().orphanedUserLayerEntries).toEqual([
      { kind: 'substratePatch', targetId: 'bond' },
      { kind: 'hiddenSubstrate', targetId: 'opalina' },
    ]);
    // Kept, not dropped, BOTH of them: the paper may come back in a later
    // catalog, and a hide is as much work to lose as a patch.
    expect(secondMount.getState().substratePatches).toEqual([
      { id: 'bond', changes: { name: 'Bond de la casa' } },
    ]);
    expect(secondMount.getState().hiddenSubstrateIds).toEqual(['opalina']);
  });
});

/**
 * A cover is the one catalog entry made of another: it names the paper it is
 * printed on and the weight of that paper. It is also the one whose fields
 * mean different things depending on what it is — a soft cover has no boards,
 * a hard one has no flaps — and those are not defaults but rules the engine
 * reads straight.
 */
describe('Covers a print shop adds (R-11)', () => {
  const softCover = {
    name: 'Rústica con solapas anchas',
    kind: 'blanda' as const,
    substrateId: 'couche_matte',
    grammage: 300,
    flapWidth_mm: 120,
    squares_mm: 0,
    hingeGap_mm: 0,
    turnIn_mm: 0,
    boardThickness_mm: 0,
  };

  it('adds a soft cover, selects it, and plans the sheet with its flaps', () => {
    expect(useBookStore.getState().addCustomCover(softCover)).toBe(true);

    const [cover] = useBookStore.getState().customCovers;
    expect(cover).toMatchObject({ name: 'Rústica con solapas anchas', kind: 'blanda', flapWidth_mm: 120 });
    expect(useBookStore.getState().coverId).toBe(cover.id);

    // Not just stored: the flaps have to reach the cover plan.
    const plan = useBookStore.getState().coverPlan;
    expect(plan?.ok).toBe(true);
    if (!plan?.ok || plan.cover.kind !== 'blanda') throw new Error('se esperaba una tapa blanda planificada');
    expect(plan.cover.sections.flapLeft_mm).toBeGreaterThan(120);
  });

  it('refuses a soft cover that claims boards, and a hard one that claims flaps', () => {
    expect(useBookStore.getState().addCustomCover({ ...softCover, boardThickness_mm: 2 })).toBe(false);
    expect(useBookStore.getState().customCoverError).toContain('no lleva cartón');

    expect(useBookStore.getState().addCustomCover({
      ...softCover, name: 'Dura con solapas', kind: 'dura',
      squares_mm: 3, hingeGap_mm: 7, turnIn_mm: 15, boardThickness_mm: 2,
    })).toBe(false);
    expect(useBookStore.getState().customCoverError).toContain('no lleva solapas');

    expect(useBookStore.getState().customCovers).toHaveLength(0);
  });

  it('refuses a hard cover whose boards have no thickness', () => {
    expect(useBookStore.getState().addCustomCover({
      ...softCover, name: 'Dura sin cartón', kind: 'dura', flapWidth_mm: 0,
      squares_mm: 3, hingeGap_mm: 7, turnIn_mm: 15, boardThickness_mm: 0,
    })).toBe(false);
    expect(useBookStore.getState().customCoverError).toContain('mayores que cero');
  });

  /**
   * The check no other catalog needs: a cover names its material, so it can
   * be made invalid by a paper that is missing or does not come in that
   * weight, and saying which of the two is wrong is worth more than "datos
   * inválidos".
   */
  it('refuses a cover made of a paper that does not exist, or a weight it does not sell', () => {
    expect(useBookStore.getState().addCustomCover({ ...softCover, substrateId: 'papel_inventado' })).toBe(false);
    expect(useBookStore.getState().customCoverError).toContain('no está');

    expect(useBookStore.getState().addCustomCover({ ...softCover, grammage: 999 })).toBe(false);
    expect(useBookStore.getState().customCoverError).toContain('999 g/m²');
    expect(useBookStore.getState().customCovers).toHaveLength(0);
  });

  it('accepts a cover made of a paper the shop added, in a weight that paper sells', () => {
    expect(useBookStore.getState().addCustomSubstrate('Cartulina del taller', 'La de siempre.', 350, 420)).toBe(true);
    const paper = useBookStore.getState().customSubstrates[0];

    expect(useBookStore.getState().addCustomCover({
      ...softCover, substrateId: paper.id, grammage: 350,
    })).toBe(true);
    expect(useBookStore.getState().customCovers[0].substrateId).toBe(paper.id);
  });

  /**
   * The soft-cover test proves the flaps reach the plan. This is the hard one,
   * which is the riskier path: it reports boards, a wrap and three areas, and
   * asserting only that it landed in the state array would pass while the
   * engine failed to size a single board.
   */
  it('plans the boards and the wrap for a hard cover of your own', () => {
    // A hard cover needs a binding whose signatures do not nest.
    useBookStore.getState().setBinding('hotmelt');
    expect(useBookStore.getState().addCustomCover({
      ...softCover, name: 'Dura del taller', kind: 'dura', flapWidth_mm: 0,
      squares_mm: 3, hingeGap_mm: 7, turnIn_mm: 15, boardThickness_mm: 2,
    })).toBe(true);

    const plan = useBookStore.getState().coverPlan;
    expect(plan?.ok).toBe(true);
    if (!plan?.ok || plan.cover.kind !== 'dura') throw new Error('se esperaba una tapa dura planificada');
    // The squares widen the board past the page, and the wrap past the board.
    expect(plan.cover.boardHeight_mm).toBeCloseTo(useBookStore.getState().pageHeight_mm + 2 * 3, 6);
    expect(plan.cover.wrapWidth_mm).toBeGreaterThan(plan.cover.boardWidth_mm);
    expect(plan.cover.boardArea_m2).toBeGreaterThan(0);
  });

  it('turns a cover of your own from soft to hard, rewriting every measurement', () => {
    expect(useBookStore.getState().addCustomCover(softCover)).toBe(true);
    const { id } = useBookStore.getState().customCovers[0];

    expect(useBookStore.getState().editCustomCover(id, {
      kind: 'dura', flapWidth_mm: 0, squares_mm: 3, hingeGap_mm: 7, turnIn_mm: 15, boardThickness_mm: 2,
    })).toBe(true);
    expect(useBookStore.getState().customCovers[0]).toMatchObject({
      id, kind: 'dura', flapWidth_mm: 0, boardThickness_mm: 2,
    });

    // Half a change is refused: the kind cannot move without its measurements.
    expect(useBookStore.getState().editCustomCover(id, { kind: 'blanda' })).toBe(false);
    expect(useBookStore.getState().customCovers[0].kind).toBe('dura');
  });

  it('patches a factory cover, hides one, and puts both back', () => {
    expect(useBookStore.getState().patchCover('blanda_simple', { flapWidth_mm: 80 })).toBe(true);
    const covers = getAllCovers(catalog, [], useBookStore.getState().coverPatches, []);
    expect(covers.find(item => item.id === 'blanda_simple')?.flapWidth_mm).toBe(80);

    useBookStore.getState().unpatchCover('blanda_simple');
    expect(useBookStore.getState().coverPatches).toHaveLength(0);

    useBookStore.getState().setCover('blanda_simple');
    useBookStore.getState().hideCover('blanda_simple');
    expect(useBookStore.getState().coverId).not.toBe('blanda_simple');
    useBookStore.getState().showCover('blanda_simple');
    expect(useBookStore.getState().hiddenCoverIds).toEqual([]);
  });

  it('survives a reload, and drops a cover whose paper is gone from the catalog', () => {
    const storage = new FakeStorage();
    const firstMount = createBookStore(storage);
    firstMount.getState().initialize(catalog);
    expect(firstMount.getState().addCustomCover(softCover)).toBe(true);

    const secondMount = createBookStore(storage);
    secondMount.getState().initialize(catalog, readUserLayer(storage));
    expect(secondMount.getState().customCovers).toHaveLength(1);

    // A cover whose paper no longer exists has no material and no weight, so
    // it goes the way a grammage attached to a missing paper does.
    const withoutThePaper = {
      ...catalog,
      substrates: catalog.substrates.filter(item => item.id !== 'couche_matte'),
    };
    const thirdMount = createBookStore(storage);
    thirdMount.getState().initialize(withoutThePaper, readUserLayer(storage));
    expect(thirdMount.getState().customCovers).toHaveLength(0);
  });

  it('reports a patch and a hide for a cover the catalog no longer has', () => {
    const storage = new FakeStorage();
    const firstMount = createBookStore(storage);
    firstMount.getState().initialize(catalog);
    expect(firstMount.getState().patchCover('blanda_simple', { flapWidth_mm: 80 })).toBe(true);
    firstMount.getState().hideCover('dura_estandar');

    const withoutThem = {
      ...catalog,
      covers: catalog.covers.filter(item => item.id !== 'blanda_simple' && item.id !== 'dura_estandar'),
    };
    const secondMount = createBookStore(storage);
    secondMount.getState().initialize(withoutThem, readUserLayer(storage));

    expect(secondMount.getState().orphanedUserLayerEntries).toEqual([
      { kind: 'coverPatch', targetId: 'blanda_simple' },
      { kind: 'hiddenCover', targetId: 'dura_estandar' },
    ]);
    expect(secondMount.getState().coverPatches).toEqual([
      { id: 'blanda_simple', changes: { flapWidth_mm: 80 } },
    ]);
    expect(secondMount.getState().hiddenCoverIds).toEqual(['dura_estandar']);
  });
});

/**
 * What an independent review of R-8 to R-11 found. Every one of these passed
 * unnoticed because no test walked the path: a cross-catalog reference going
 * stale, and a fallback resolved against the wrong list.
 */
describe('What the review of the catalog layer found', () => {
  const softCover = {
    name: 'Rústica del taller',
    kind: 'blanda' as const,
    substrateId: 'couche_matte',
    grammage: 300,
    flapWidth_mm: 120,
    squares_mm: 0,
    hingeGap_mm: 0,
    turnIn_mm: 0,
    boardThickness_mm: 0,
  };

  /**
   * Deleting the paper left the cover made of it in place, still usable for
   * the rest of the session, and then gone on the next reload — because that
   * is where `mergeUserLayer` drops it. Work lost silently, one reload later.
   */
  it('takes the covers made of a paper with the paper', () => {
    expect(useBookStore.getState().addCustomSubstrate('Cartulina del taller', 'La de siempre.', 350, 420)).toBe(true);
    const paper = useBookStore.getState().customSubstrates[0];
    expect(useBookStore.getState().addCustomCover({ ...softCover, substrateId: paper.id, grammage: 350 })).toBe(true);
    expect(useBookStore.getState().coverId).toBe(useBookStore.getState().customCovers[0].id);

    useBookStore.getState().removeCustomSubstrate(paper.id);

    expect(useBookStore.getState().customCovers).toEqual([]);
    // And the selection follows, rather than naming a cover that is gone.
    expect(useBookStore.getState().customCovers.some(cover => cover.id === useBookStore.getState().coverId)).toBe(false);
    expect(catalog.covers.some(cover => cover.id === useBookStore.getState().coverId)).toBe(true);
  });

  it('leaves alone the covers made of a different paper', () => {
    expect(useBookStore.getState().addCustomSubstrate('Cartulina del taller', 'La de siempre.', 350, 420)).toBe(true);
    const paper = useBookStore.getState().customSubstrates[0];
    expect(useBookStore.getState().addCustomCover(softCover)).toBe(true);

    useBookStore.getState().removeCustomSubstrate(paper.id);

    expect(useBookStore.getState().customCovers).toHaveLength(1);
  });

  /**
   * Hiding every paper is allowed, and then there is nothing visible to fall
   * back to. Resolving the weight against the visible papers alone returned
   * the deleted paper's own weight, which the paper landed on need not sell.
   */
  it('lands on a weight the paper sells even when every paper is hidden', () => {
    /*
     * On its own store, not the shared one: hiding all seven papers is a
     * sweeping change, and the shared instance outlives this file. Run on it,
     * this test left every paper hidden and App.test.tsx failed with an empty
     * paper dropdown, which is a leak between test files rather than a fault
     * in either test.
     */
    const store = createBookStore(new FakeStorage());
    store.getState().initialize(catalog);

    for (const paper of catalog.substrates) store.getState().hideSubstrate(paper.id);
    expect(store.getState().addCustomSubstrate('El único', 'Todo lo demás está oculto.', 137, 195)).toBe(true);
    const paper = store.getState().customSubstrates[0];
    expect(store.getState().selectedGrammage).toBe(137);

    store.getState().removeCustomSubstrate(paper.id);

    const landedOn = catalog.substrates.find(item => item.id === store.getState().substrateId);
    expect(landedOn).toBeDefined();
    // 137 g/m² was that paper's weight and nobody else's.
    expect(landedOn!.options.some(option => option.grammage === store.getState().selectedGrammage)).toBe(true);
  });

  /**
   * A cover needs its paper AND a weight of that paper. Checking only the
   * paper left a cover claiming a weight nobody sells, which the store then
   * refused to let anyone edit: stuck, permanently, with no way to say why.
   */
  it('drops on reload a cover whose weight its paper no longer sells', () => {
    const storage = new FakeStorage();
    const firstMount = createBookStore(storage);
    firstMount.getState().initialize(catalog);

    expect(firstMount.getState().addCustomGrammage('bond', 250, 320)).toBe(true);
    expect(firstMount.getState().addCustomCover({ ...softCover, substrateId: 'bond', grammage: 250 })).toBe(true);
    // Reloading with it still there keeps the cover.
    const withIt = createBookStore(storage);
    withIt.getState().initialize(catalog, readUserLayer(storage));
    expect(withIt.getState().customCovers).toHaveLength(1);

    // Now take the weight away and reload again.
    firstMount.getState().removeCustomGrammage('bond', 250);
    const withoutIt = createBookStore(storage);
    withoutIt.getState().initialize(catalog, readUserLayer(storage));
    expect(withoutIt.getState().customCovers).toEqual([]);
  });
});
