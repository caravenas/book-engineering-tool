import { create } from 'zustand';
import type {
  Binding,
  BindingSpineResult,
  BookConfig,
  BookFormat,
  BookStore,
  Catalog,
  CustomGrammageOption,
  GrammageOption,
  ImpositionResult,
  Press,
  Proportion,
  SheetSize,
  SignaturePlanResult,
  SpineResult,
} from '../types';
import { calculateImposition } from '../engine/imposition';
import { calculateSpineAndWeight } from '../engine/spine';
import { planSignatures } from '../engine/signatures';
import { creepCompensation, spineWithBinding, validatePageCount } from '../engine/binding';
import { planCover } from '../engine/cover';
import { MAX_BINDING_PAGES } from '../config/validateCatalog';

/**
 * Get all sheet sizes (catalog + custom).
 */
function getAllSheetSizes(catalog: Catalog, customSheetSizes: SheetSize[]): SheetSize[] {
  return [...catalog.sheetSizes, ...customSheetSizes];
}

/**
 * Get all grammage options for a substrate (catalog + custom).
 */
function getAllGrammageOptions(
  catalog: Catalog,
  substrateId: string,
  customGrammages: CustomGrammageOption[]
): GrammageOption[] {
  const substrate = catalog.substrates.find(s => s.id === substrateId);
  const builtIn = substrate ? substrate.options : [];
  const custom = customGrammages.filter(option => option.substrateId === substrateId);
  return [...builtIn, ...custom];
}

/**
 * Get the caliper for a given substrate + grammage combination.
 */
function getCaliper(
  catalog: Catalog,
  substrateId: string,
  grammage: number,
  customGrammages: CustomGrammageOption[]
): number {
  const allOptions = getAllGrammageOptions(catalog, substrateId, customGrammages);
  const option = allOptions.find(o => o.grammage === grammage);
  return option ? option.caliper : 0;
}

/**
 * Get sheet dimensions by ID.
 */
function getSheetDimensions(catalog: Catalog, sheetSizeId: string, customSheetSizes: SheetSize[]) {
  const allSheets = getAllSheetSizes(catalog, customSheetSizes);
  const sheet = allSheets.find(s => s.id === sheetSizeId);
  return sheet ? { width: sheet.width_mm, height: sheet.height_mm } : { width: 0, height: 0 };
}

/**
 * Get all presses (catalog + custom).
 */
function getAllPresses(catalog: Catalog, customPresses: Press[]): Press[] {
  return [...catalog.presses, ...customPresses];
}

/**
 * Get all bindings (catalog + custom).
 */
function getAllBindings(catalog: Catalog, customBindings: Binding[]): Binding[] {
  return [...catalog.bindings, ...customBindings];
}

/**
 * Get all proportions (catalog + custom).
 */
function getAllProportions(catalog: Catalog, customProportions: Proportion[]): Proportion[] {
  return [...catalog.proportions, ...customProportions];
}

/**
 * Get a press by ID (catalog + custom).
 */
function getPress(catalog: Catalog, pressId: string, customPresses: Press[]): Press | undefined {
  return getAllPresses(catalog, customPresses).find(p => p.id === pressId);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error desconocido';
}

/** Non-empty integer within JS's safely representable range, and strictly positive. */
function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

/** Case- and surrounding-whitespace-insensitive equality, for duplicate checks on user-typed names/labels. */
function namesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

type CalculationResults = Pick<
  BookStore,
  | 'impositionResult' | 'impositionError'
  | 'signaturePlan' | 'signatureError'
  | 'spineResult' | 'spineError'
  | 'bindingPageCount' | 'bindingSpine' | 'bindingCreep' | 'bindingError'
  | 'coverPlan' | 'coverError'
>;

/**
 * Compute the signature imposition plan. When `foldingSchemeId` is `null`, the
 * automatic (least-waste) selection from `planSignatures` is used as-is. When
 * it names a specific scheme, that scheme's option is selected if it fits;
 * if it doesn't fit or doesn't exist, the previous `selected` option (from
 * `previousPlan`) is kept instead of silently switching schemes, while
 * `options` still reflects the current inputs and `signatureError` explains why.
 */
function calculateSignaturePlan(
  state: BookConfig,
  catalog: Catalog,
  previousPlan: SignaturePlanResult | null
): { signaturePlan: SignaturePlanResult | null; signatureError: string | null } {
  try {
    const press = getPress(catalog, state.pressId, state.customPresses);
    if (!press) {
      throw new RangeError(`La prensa "${state.pressId}" no existe en la configuración`);
    }

    const sheet = getSheetDimensions(catalog, state.sheetSizeId, state.customSheetSizes);

    const basePlan = planSignatures({
      pageWidth_mm: state.pageWidth_mm,
      pageHeight_mm: state.pageHeight_mm,
      bleed_mm: state.bleed_mm,
      sheetWidth_mm: sheet.width,
      sheetHeight_mm: sheet.height,
      press,
      schemes: catalog.foldingSchemes,
      totalPages: state.totalPages,
    });

    if (!state.foldingSchemeId) {
      return { signaturePlan: basePlan, signatureError: null };
    }

    const chosen = basePlan.options.find(option => option.scheme.id === state.foldingSchemeId);
    if (chosen) {
      return {
        signaturePlan: { options: basePlan.options, selected: chosen, reason: null },
        signatureError: null,
      };
    }

    const schemeExists = catalog.foldingSchemes.some(scheme => scheme.id === state.foldingSchemeId);
    const signatureError = schemeExists
      ? `El esquema de plegado "${state.foldingSchemeId}" no cabe en el pliego con los márgenes actuales de la prensa.`
      : `El esquema de plegado "${state.foldingSchemeId}" no existe en la configuración.`;

    return {
      signaturePlan: {
        options: basePlan.options,
        selected: previousPlan?.selected ?? null,
        reason: basePlan.reason,
      },
      signatureError,
    };
  } catch (error) {
    return {
      signaturePlan: null,
      signatureError: `No se pudo calcular la imposición por firmas: ${getErrorMessage(error)}. Corrige la prensa, el pliego, el sangrado o las páginas.`,
    };
  }
}

type BindingResults = Pick<
  CalculationResults,
  'bindingPageCount' | 'bindingSpine' | 'bindingCreep' | 'bindingError'
>;

/**
 * Evaluate the selected binding method against the freshly computed interior
 * spine and signature plan of this same calculation pass, never against
 * stale previous results.
 *
 * `validatePageCount` returning `{ ok: false, ... }` for a page count that
 * doesn't fit the method is a normal, displayable result, not an exception.
 * The three engine calls are wrapped independently, not in one shared
 * try/catch: a nesting method's page count that isn't a multiple of 4 makes
 * `creepCompensation` throw even though `validatePageCount` already reports
 * that very problem as a normal `not-multiple` result, and a shared catch
 * would wipe out that already-valid result and mislabel a displayable
 * mismatch as an error. Creep failures are therefore absorbed as "nothing to
 * show" (`null`) rather than surfaced in `bindingError`: either the page
 * count mismatch is already explained by `bindingPageCount`, or the caliper
 * is unavailable because the interior spine itself failed, which the spine
 * branch below already reports.
 */
function calculateBindingResults(
  state: BookConfig,
  catalog: Catalog,
  spineResult: SpineResult | null,
  pagesPerSignature: number | null
): BindingResults {
  const binding = getAllBindings(catalog, state.customBindings).find(b => b.id === state.bindingId);
  if (!binding) {
    return {
      bindingPageCount: null,
      bindingSpine: null,
      bindingCreep: null,
      bindingError: `No se pudo calcular la encuadernación: la encuadernación "${state.bindingId}" no existe en la configuración.`,
    };
  }

  let bindingPageCount: BindingResults['bindingPageCount'] = null;
  let bindingError: string | null = null;
  try {
    bindingPageCount = validatePageCount(binding, state.totalPages, pagesPerSignature);
  } catch (error) {
    bindingError = `No se pudo validar el número de páginas para la encuadernación: ${getErrorMessage(error)}.`;
  }

  let bindingSpine: BindingResults['bindingSpine'] = null;
  try {
    if (!spineResult) {
      throw new RangeError('No hay un lomo de papel interior calculado para sumarle la encuadernación');
    }
    bindingSpine = spineWithBinding(spineResult.thickness_mm, binding);
  } catch (error) {
    bindingError = bindingError ?? `No se pudo calcular el lomo con encuadernación: ${getErrorMessage(error)}.`;
  }

  let bindingCreep: BindingResults['bindingCreep'] = null;
  try {
    const caliper = getCaliper(catalog, state.substrateId, state.selectedGrammage, state.customGrammages);
    bindingCreep = creepCompensation(binding, state.totalPages, caliper);
  } catch {
    bindingCreep = null;
  }

  return { bindingPageCount, bindingSpine, bindingCreep, bindingError };
}

type CoverResults = Pick<CalculationResults, 'coverPlan' | 'coverError'>;

/**
 * Compute the cover geometry and weight from this same calculation pass'
 * freshly computed binding spine, never a stale previous one.
 *
 * `planCover` returning `{ ok: false, reason, message }` for a hard cover
 * paired with a binding that has no flat spine is a normal, displayable
 * result (the same precedent as `validatePageCount`), not an exception: it
 * is returned as `coverPlan` with `coverError` left `null`. The try/catch
 * here only guards genuine input problems (a missing cover/binding id, a
 * spine that failed to compute, or a `planCover` validation failure).
 */
function calculateCoverResult(
  state: BookConfig,
  catalog: Catalog,
  bindingSpine: BindingSpineResult | null
): CoverResults {
  try {
    const cover = catalog.covers.find(c => c.id === state.coverId);
    if (!cover) {
      throw new RangeError(`La tapa "${state.coverId}" no existe en la configuración`);
    }

    const binding = getAllBindings(catalog, state.customBindings).find(b => b.id === state.bindingId);
    if (!binding) {
      throw new RangeError(`La encuadernación "${state.bindingId}" no existe en la configuración`);
    }

    if (!bindingSpine) {
      throw new RangeError('No hay un lomo final calculado para dimensionar la tapa');
    }

    const coverPlan = planCover({
      pageWidth_mm: state.pageWidth_mm,
      pageHeight_mm: state.pageHeight_mm,
      bleed_mm: state.bleed_mm,
      spineTotal_mm: bindingSpine.total_mm,
      bindingHasFlatSpine: !binding.nests,
      cover,
    });

    return { coverPlan, coverError: null };
  } catch (error) {
    return {
      coverPlan: null,
      coverError: `No se pudo calcular la tapa: ${getErrorMessage(error)}. Corrige dimensiones, sangrado, encuadernación o tapa.`,
    };
  }
}

function calculateResults(state: BookStore, catalog: Catalog): CalculationResults {
  let impositionResult: ImpositionResult | null = null;
  let impositionError: string | null = null;
  let spineResult: SpineResult | null = null;
  let spineError: string | null = null;

  try {
    if (!Number.isFinite(state.pageWidth_mm) || state.pageWidth_mm <= 0
      || !Number.isFinite(state.pageHeight_mm) || state.pageHeight_mm <= 0) {
      throw new RangeError('Las dimensiones de página deben ser números finitos mayores que cero');
    }
    if (!Number.isFinite(state.bleed_mm) || state.bleed_mm < 0) {
      throw new RangeError('El sangrado debe ser un número finito no negativo');
    }

    const bleedSpan = state.bleed_mm * 2;
    if (!Number.isFinite(bleedSpan) || (state.bleed_mm > 0 && bleedSpan <= 0)) {
      throw new RangeError('El sangrado es demasiado grande o pequeño para calcular sus dimensiones derivadas');
    }

    const pageWithBleedW = state.pageWidth_mm + bleedSpan;
    const pageWithBleedH = state.pageHeight_mm + bleedSpan;
    if (!Number.isFinite(pageWithBleedW) || !Number.isFinite(pageWithBleedH)) {
      throw new RangeError('Las dimensiones con sangrado deben ser números finitos');
    }
    if (pageWithBleedW <= bleedSpan || pageWithBleedH <= bleedSpan) {
      throw new RangeError('El sangrado pierde la dimensión de página por precisión numérica');
    }
    if (state.bleed_mm > 0
      && (pageWithBleedW <= state.pageWidth_mm || pageWithBleedH <= state.pageHeight_mm)) {
      throw new RangeError('El sangrado pierde su contribución por precisión numérica');
    }

    const sheet = getSheetDimensions(catalog, state.sheetSizeId, state.customSheetSizes);

    impositionResult = calculateImposition(
      pageWithBleedW,
      pageWithBleedH,
      sheet.width,
      sheet.height,
      state.pageOrientation
    );
  } catch (error) {
    impositionError = `No se pudo calcular el aprovechamiento geométrico: ${getErrorMessage(error)}. Corrige las dimensiones de página, sangrado y pliego.`;
  }

  try {
    const caliper = getCaliper(
      catalog,
      state.substrateId,
      state.selectedGrammage,
      state.customGrammages
    );
    spineResult = calculateSpineAndWeight(
      state.pageWidth_mm,
      state.pageHeight_mm,
      state.totalPages,
      state.selectedGrammage,
      caliper
    );
  } catch (error) {
    spineError = `No se pudieron calcular las referencias de lomo y peso: ${getErrorMessage(error)}. Corrige dimensiones, páginas, gramaje y calibre.`;
  }

  const { signaturePlan, signatureError } = calculateSignaturePlan(state, catalog, state.signaturePlan);

  const pagesPerSignature = signaturePlan?.selected?.scheme.pagesPerSignature ?? null;
  const { bindingPageCount, bindingSpine, bindingCreep, bindingError } = calculateBindingResults(
    state,
    catalog,
    spineResult,
    pagesPerSignature
  );

  const { coverPlan, coverError } = calculateCoverResult(state, catalog, bindingSpine);

  return {
    impositionResult, impositionError,
    signaturePlan, signatureError,
    spineResult, spineError,
    bindingPageCount, bindingSpine, bindingCreep, bindingError,
    coverPlan, coverError,
  };
}

function withUpdatedCalculations(
  state: BookStore,
  catalog: Catalog,
  inputPatch: Partial<BookConfig>
): Partial<BookStore> {
  return {
    ...inputPatch,
    ...calculateResults({ ...state, ...inputPatch }, catalog),
  };
}

/**
 * Calculate page dimensions from a proportion and base dimension.
 */
function dimensionsFromProportion(
  proportions: Proportion[],
  proportionId: string,
  format: BookFormat,
  baseWidth: number
): { width: number; height: number } {
  const prop = proportions.find(p => p.label === proportionId);
  if (!prop) return { width: baseWidth, height: baseWidth };

  const [rw, rh] = prop.ratio;

  if (format === 'square') {
    return { width: baseWidth, height: baseWidth };
  }

  if (format === 'vertical') {
    return { width: baseWidth, height: baseWidth * (rh / rw) };
  }

  return { width: baseWidth, height: baseWidth * (rw / rh) };
}

let customSheetCounter = 0;
let customPressCounter = 0;
let customBindingCounter = 0;

export const useBookStore = create<BookStore>((set, get) => ({
  // Runtime configuration catalog
  catalog: null,

  // Canvas Designer
  format: 'vertical',
  proportionId: null,
  customProportions: [],
  pageWidth_mm: 0,
  pageHeight_mm: 0,
  bleed_mm: 0,
  unitSystem: 'metric',
  pageOrientation: 'auto',

  // Substrate
  substrateId: '',
  selectedGrammage: 0,
  customGrammages: [],

  // Imposition
  sheetSizeId: '',
  customSheetSizes: [],

  // Signature imposition
  pressId: '',
  customPresses: [],
  foldingSchemeId: null,

  // Spine
  totalPages: 0,

  // Binding
  bindingId: '',
  customBindings: [],

  // Cover
  coverId: '',

  // Computed
  impositionResult: null,
  impositionError: null,
  signaturePlan: null,
  signatureError: null,
  spineResult: null,
  spineError: null,
  bindingPageCount: null,
  bindingSpine: null,
  bindingCreep: null,
  bindingError: null,
  coverPlan: null,
  coverError: null,
  customGrammageError: null,
  customPressError: null,
  customBindingError: null,
  customProportionError: null,

  // ─── Actions ─────────────────────────────────────────────────────

  initialize: (catalog) => {
    set(state => {
      const { defaults } = catalog;
      const dimensions = dimensionsFromProportion(
        catalog.proportions,
        defaults.proportionId,
        state.format,
        defaults.pageWidth_mm
      );
      const inputPatch: Partial<BookConfig> = {
        proportionId: defaults.proportionId,
        customProportions: [],
        pageWidth_mm: dimensions.width,
        pageHeight_mm: dimensions.height,
        bleed_mm: defaults.bleed_mm,
        substrateId: defaults.substrateId,
        selectedGrammage: defaults.grammage,
        customGrammages: [],
        sheetSizeId: defaults.sheetSizeId,
        customSheetSizes: [],
        pressId: defaults.pressId,
        customPresses: [],
        foldingSchemeId: null,
        totalPages: defaults.totalPages,
        bindingId: defaults.bindingId,
        customBindings: [],
        coverId: defaults.coverId,
      };

      return {
        catalog,
        ...withUpdatedCalculations(state, catalog, inputPatch),
      };
    });
  },

  setFormat: (format) => {
    set(state => {
      if (!state.catalog) return state;

      if (!state.proportionId) {
        return withUpdatedCalculations(state, state.catalog, { format });
      }

      const dimensions = dimensionsFromProportion(
        getAllProportions(state.catalog, state.customProportions),
        state.proportionId,
        format,
        state.pageWidth_mm
      );
      return withUpdatedCalculations(state, state.catalog, {
        format,
        pageWidth_mm: dimensions.width,
        pageHeight_mm: dimensions.height,
      });
    });
  },

  setProportion: (proportionId) => {
    set(state => {
      if (!state.catalog) return state;

      if (!proportionId) {
        return withUpdatedCalculations(state, state.catalog, { proportionId });
      }

      const dimensions = dimensionsFromProportion(
        getAllProportions(state.catalog, state.customProportions),
        proportionId,
        state.format,
        state.pageWidth_mm
      );
      return withUpdatedCalculations(state, state.catalog, {
        proportionId,
        pageWidth_mm: dimensions.width,
        pageHeight_mm: dimensions.height,
      });
    });
  },

  setPageDimensions: (width_mm, height_mm) => {
    set(state => {
      if (!state.catalog) return state;
      return withUpdatedCalculations(state, state.catalog, {
        pageWidth_mm: width_mm,
        pageHeight_mm: height_mm,
        proportionId: null,
      });
    });
  },

  setBleed: (bleed_mm) => {
    set(state => {
      if (!state.catalog) return state;
      return withUpdatedCalculations(state, state.catalog, { bleed_mm });
    });
  },

  setUnitSystem: (unitSystem) => {
    set(state => (state.catalog ? { unitSystem } : state));
  },

  setPageOrientation: (pageOrientation) => {
    set(state => {
      if (!state.catalog) return state;
      return withUpdatedCalculations(state, state.catalog, { pageOrientation });
    });
  },

  setSubstrate: (substrateId) => {
    set(state => {
      if (!state.catalog) return state;

      const substrate = state.catalog.substrates.find(s => s.id === substrateId);
      const inputPatch: Partial<BookConfig> = substrate && substrate.options.length > 0
        ? { substrateId, selectedGrammage: substrate.options[0].grammage }
        : { substrateId };

      return {
        ...withUpdatedCalculations(state, state.catalog, inputPatch),
        customGrammageError: null,
      };
    });
  },

  setGrammage: (selectedGrammage) => {
    set(state => {
      if (!state.catalog) return state;
      return withUpdatedCalculations(state, state.catalog, { selectedGrammage });
    });
  },

  setSheetSize: (sheetSizeId) => {
    set(state => {
      if (!state.catalog) return state;
      return withUpdatedCalculations(state, state.catalog, { sheetSizeId });
    });
  },

  setPress: (pressId) => {
    set(state => {
      if (!state.catalog) return state;
      return withUpdatedCalculations(state, state.catalog, { pressId });
    });
  },

  setFoldingScheme: (foldingSchemeId) => {
    set(state => {
      if (!state.catalog) return state;
      return withUpdatedCalculations(state, state.catalog, { foldingSchemeId });
    });
  },

  setTotalPages: (totalPages) => {
    set(state => {
      if (!state.catalog) return state;
      return withUpdatedCalculations(state, state.catalog, { totalPages });
    });
  },

  setBinding: (bindingId) => {
    set(state => {
      if (!state.catalog) return state;
      return withUpdatedCalculations(state, state.catalog, { bindingId });
    });
  },

  setCover: (coverId) => {
    set(state => {
      if (!state.catalog) return state;
      return withUpdatedCalculations(state, state.catalog, { coverId });
    });
  },

  // ─── Custom Sheet Sizes ──────────────────────────────────────────

  addCustomSheetSize: (name, width_mm, height_mm) => {
    if (!get().catalog) return false;

    if (!Number.isFinite(width_mm) || width_mm <= 0
      || !Number.isFinite(height_mm) || height_mm <= 0) {
      return false;
    }

    const id = `custom_sheet_${++customSheetCounter}_${Date.now()}`;
    const newSheet: SheetSize = {
      id,
      name: name || `${width_mm}×${height_mm}mm`,
      width_mm,
      height_mm,
    };

    set(state => {
      if (!state.catalog) return state;
      return withUpdatedCalculations(state, state.catalog, {
        customSheetSizes: [...state.customSheetSizes, newSheet],
        sheetSizeId: id,
      });
    });
    return true;
  },

  removeCustomSheetSize: (id) => {
    set(state => {
      if (!state.catalog) return state;
      if (!state.customSheetSizes.some(sheet => sheet.id === id)) {
        return state;
      }

      const inputPatch: Partial<BookConfig> = {
        customSheetSizes: state.customSheetSizes.filter(sheet => sheet.id !== id),
      };
      if (state.sheetSizeId === id) {
        inputPatch.sheetSizeId = state.catalog.sheetSizes[0].id;
      }

      return withUpdatedCalculations(state, state.catalog, inputPatch);
    });
  },

  // ─── Custom Grammages ────────────────────────────────────────────

  addCustomGrammage: (substrateId, grammage, caliper) => {
    const state = get();
    if (!state.catalog) return false;

    const substrate = state.catalog.substrates.find(s => s.id === substrateId);

    if (!substrate) {
      set({ customGrammageError: 'Selecciona un sustrato válido y vuelve a intentarlo.' });
      return false;
    }

    if (!Number.isFinite(grammage) || grammage <= 0 || !Number.isFinite(caliper) || caliper <= 0) {
      set({
        customGrammageError: 'Introduce gramaje y calibre como números finitos mayores que cero.',
      });
      return false;
    }

    const duplicate = getAllGrammageOptions(state.catalog, substrateId, state.customGrammages)
      .some(option => option.grammage === grammage);
    if (duplicate) {
      set({
        customGrammageError: `Ya existe el gramaje ${grammage} g/m² para ${substrate.name}. Introduce otro gramaje o cancela.`,
      });
      return false;
    }

    const newOption: CustomGrammageOption = { substrateId, grammage, caliper };
    set(currentState => {
      if (!currentState.catalog) return currentState;
      return {
        ...withUpdatedCalculations(currentState, currentState.catalog, {
          substrateId,
          customGrammages: [...currentState.customGrammages, newOption],
          selectedGrammage: grammage,
        }),
        customGrammageError: null,
      };
    });
    return true;
  },

  clearCustomGrammageError: () => {
    set(state => (state.catalog ? { customGrammageError: null } : state));
  },

  removeCustomGrammage: (substrateId, grammage) => {
    set(state => {
      if (!state.catalog) return state;

      const hasExactCustomOption = state.customGrammages.some(option => (
        option.substrateId === substrateId && option.grammage === grammage
      ));
      if (!hasExactCustomOption) {
        return state;
      }

      const inputPatch: Partial<BookConfig> = {
        customGrammages: state.customGrammages.filter(option => (
          option.substrateId !== substrateId || option.grammage !== grammage
        )),
      };

      if (state.substrateId === substrateId && state.selectedGrammage === grammage) {
        const substrate = state.catalog.substrates.find(s => s.id === substrateId);
        if (substrate && substrate.options.length > 0) {
          inputPatch.selectedGrammage = substrate.options[0].grammage;
        }
      }

      return {
        ...withUpdatedCalculations(state, state.catalog, inputPatch),
        customGrammageError: null,
      };
    });
  },

  // ─── Custom Presses ──────────────────────────────────────────────

  addCustomPress: (
    name,
    maxSheetWidth_mm,
    maxSheetHeight_mm,
    gripperMargin_mm,
    sideMargin_mm,
    tailMargin_mm,
    gutter_mm
  ) => {
    const state = get();
    if (!state.catalog) return false;

    if (!name.trim()) {
      set({ customPressError: 'El nombre de la prensa debe ser un texto no vacío.' });
      return false;
    }

    if (!Number.isFinite(maxSheetWidth_mm) || maxSheetWidth_mm <= 0
      || !Number.isFinite(maxSheetHeight_mm) || maxSheetHeight_mm <= 0
      || !Number.isFinite(gripperMargin_mm) || gripperMargin_mm < 0
      || !Number.isFinite(sideMargin_mm) || sideMargin_mm < 0
      || !Number.isFinite(tailMargin_mm) || tailMargin_mm < 0
      || !Number.isFinite(gutter_mm) || gutter_mm < 0) {
      set({
        customPressError: 'Introduce las medidas de la prensa como números finitos: el ancho y el alto máximo de pliego mayores que cero, y los márgenes y la calle no negativos.',
      });
      return false;
    }

    if (gripperMargin_mm + tailMargin_mm >= maxSheetHeight_mm) {
      set({
        customPressError: 'La pinza y el margen de cola no dejan área imprimible: su suma debe ser menor que el alto máximo de pliego.',
      });
      return false;
    }

    if (2 * sideMargin_mm >= maxSheetWidth_mm) {
      set({
        customPressError: 'Los márgenes laterales no dejan área imprimible: el doble del margen lateral debe ser menor que el ancho máximo de pliego.',
      });
      return false;
    }

    const duplicate = getAllPresses(state.catalog, state.customPresses).some(press => namesMatch(press.name, name));
    if (duplicate) {
      set({ customPressError: `Ya existe una prensa llamada "${name}". Introduce otro nombre o cancela.` });
      return false;
    }

    const id = `custom_press_${++customPressCounter}_${Date.now()}`;
    const newPress: Press = {
      id, name: name.trim(), maxSheetWidth_mm, maxSheetHeight_mm, gripperMargin_mm, sideMargin_mm, tailMargin_mm, gutter_mm,
    };

    set(currentState => {
      if (!currentState.catalog) return currentState;
      return {
        ...withUpdatedCalculations(currentState, currentState.catalog, {
          customPresses: [...currentState.customPresses, newPress],
          pressId: id,
        }),
        customPressError: null,
      };
    });
    return true;
  },

  clearCustomPressError: () => {
    set(state => (state.catalog ? { customPressError: null } : state));
  },

  removeCustomPress: (id) => {
    set(state => {
      if (!state.catalog) return state;
      if (!state.customPresses.some(press => press.id === id)) {
        return state;
      }

      const inputPatch: Partial<BookConfig> = {
        customPresses: state.customPresses.filter(press => press.id !== id),
      };
      if (state.pressId === id) {
        inputPatch.pressId = state.catalog.presses[0].id;
      }

      return {
        ...withUpdatedCalculations(state, state.catalog, inputPatch),
        customPressError: null,
      };
    });
  },

  // ─── Custom Bindings ─────────────────────────────────────────────

  addCustomBinding: (name, pageMultiple, minPages, maxPages, spineAllowance_mm, nests, requiresSignatureMultiple) => {
    const state = get();
    if (!state.catalog) return false;

    if (!name.trim()) {
      set({ customBindingError: 'El nombre de la encuadernación debe ser un texto no vacío.' });
      return false;
    }

    if (!isPositiveSafeInteger(pageMultiple) || pageMultiple % 2 !== 0) {
      set({
        customBindingError: 'El múltiplo de páginas debe ser un entero seguro mayor que cero y par, porque un pliego siempre aporta dos páginas.',
      });
      return false;
    }

    if (!isPositiveSafeInteger(minPages) || minPages % pageMultiple !== 0) {
      set({
        customBindingError: `El mínimo de páginas debe ser un entero seguro mayor que cero y múltiplo de ${pageMultiple}.`,
      });
      return false;
    }

    if (!isPositiveSafeInteger(maxPages) || maxPages % pageMultiple !== 0 || maxPages > MAX_BINDING_PAGES) {
      set({
        customBindingError: `El máximo de páginas debe ser un entero seguro mayor que cero, múltiplo de ${pageMultiple}, y como máximo ${MAX_BINDING_PAGES}.`,
      });
      return false;
    }

    if (minPages > maxPages) {
      set({ customBindingError: 'El mínimo de páginas debe ser menor o igual que el máximo.' });
      return false;
    }

    if (!Number.isFinite(spineAllowance_mm) || spineAllowance_mm < 0) {
      set({ customBindingError: 'El aporte al lomo debe ser un número finito no negativo.' });
      return false;
    }

    if (nests && pageMultiple % 4 !== 0) {
      set({
        customBindingError: 'Un método cuyas hojas se anidan debe tener un múltiplo de páginas que sea también múltiplo de 4, porque el plegado que anida se hace de a cuatro páginas.',
      });
      return false;
    }

    const duplicate = getAllBindings(state.catalog, state.customBindings)
      .some(binding => namesMatch(binding.name, name));
    if (duplicate) {
      set({ customBindingError: `Ya existe una encuadernación llamada "${name}". Introduce otro nombre o cancela.` });
      return false;
    }

    const id = `custom_binding_${++customBindingCounter}_${Date.now()}`;
    const newBinding: Binding = {
      id, name: name.trim(), pageMultiple, minPages, maxPages, spineAllowance_mm, nests, requiresSignatureMultiple,
    };

    set(currentState => {
      if (!currentState.catalog) return currentState;
      return {
        ...withUpdatedCalculations(currentState, currentState.catalog, {
          customBindings: [...currentState.customBindings, newBinding],
          bindingId: id,
        }),
        customBindingError: null,
      };
    });
    return true;
  },

  clearCustomBindingError: () => {
    set(state => (state.catalog ? { customBindingError: null } : state));
  },

  removeCustomBinding: (id) => {
    set(state => {
      if (!state.catalog) return state;
      if (!state.customBindings.some(binding => binding.id === id)) {
        return state;
      }

      const inputPatch: Partial<BookConfig> = {
        customBindings: state.customBindings.filter(binding => binding.id !== id),
      };
      if (state.bindingId === id) {
        inputPatch.bindingId = state.catalog.bindings[0].id;
      }

      return {
        ...withUpdatedCalculations(state, state.catalog, inputPatch),
        customBindingError: null,
      };
    });
  },

  // ─── Custom Proportions ──────────────────────────────────────────

  addCustomProportion: (label, ratioWidth, ratioHeight, description) => {
    const state = get();
    if (!state.catalog) return false;

    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      set({ customProportionError: 'Introduce una etiqueta para la proporción.' });
      return false;
    }

    if (!description.trim()) {
      set({ customProportionError: 'La descripción de la proporción debe ser un texto no vacío.' });
      return false;
    }

    if (!Number.isFinite(ratioWidth) || ratioWidth <= 0 || !Number.isFinite(ratioHeight) || ratioHeight <= 0) {
      set({
        customProportionError: 'Introduce las dos medidas de la proporción como números finitos mayores que cero.',
      });
      return false;
    }

    const duplicate = getAllProportions(state.catalog, state.customProportions)
      .some(proportion => namesMatch(proportion.label, trimmedLabel));
    if (duplicate) {
      set({ customProportionError: `Ya existe la proporción "${trimmedLabel}". Introduce otra etiqueta o cancela.` });
      return false;
    }

    const newProportion: Proportion = { label: trimmedLabel, ratio: [ratioWidth, ratioHeight], description };

    set(currentState => {
      if (!currentState.catalog) return currentState;
      const dimensions = dimensionsFromProportion(
        [newProportion],
        trimmedLabel,
        currentState.format,
        currentState.pageWidth_mm
      );
      return {
        ...withUpdatedCalculations(currentState, currentState.catalog, {
          customProportions: [...currentState.customProportions, newProportion],
          proportionId: trimmedLabel,
          pageWidth_mm: dimensions.width,
          pageHeight_mm: dimensions.height,
        }),
        customProportionError: null,
      };
    });
    return true;
  },

  clearCustomProportionError: () => {
    set(state => (state.catalog ? { customProportionError: null } : state));
  },

  removeCustomProportion: (label) => {
    set(state => {
      if (!state.catalog) return state;
      if (!state.customProportions.some(proportion => proportion.label === label)) {
        return state;
      }

      const inputPatch: Partial<BookConfig> = {
        customProportions: state.customProportions.filter(proportion => proportion.label !== label),
      };

      if (state.proportionId === label) {
        const fallbackLabel = state.catalog.proportions[0].label;
        const dimensions = dimensionsFromProportion(
          state.catalog.proportions,
          fallbackLabel,
          state.format,
          state.pageWidth_mm
        );
        inputPatch.proportionId = fallbackLabel;
        inputPatch.pageWidth_mm = dimensions.width;
        inputPatch.pageHeight_mm = dimensions.height;
      }

      return {
        ...withUpdatedCalculations(state, state.catalog, inputPatch),
        customProportionError: null,
      };
    });
  },

  // ─── Recalculate ─────────────────────────────────────────────────

  recalculate: () => {
    set(state => (state.catalog ? calculateResults(state, state.catalog) : state));
  },
}));

// ─── Exported helpers for components ─────────────────────────────────────

export { getAllSheetSizes, getAllGrammageOptions, getAllPresses, getAllBindings, getAllProportions };
