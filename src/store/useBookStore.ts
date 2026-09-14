import { create } from 'zustand';
import type {
  BookConfig,
  BookStore,
  CustomGrammageOption,
  GrammageOption,
  ImpositionResult,
  SheetSize,
  SpineResult,
} from '../types';
import { SUBSTRATES, SHEET_SIZES, PROPORTIONS } from '../data/substrates';
import { calculateImposition } from '../engine/imposition';
import { calculateSpineAndWeight } from '../engine/spine';

/**
 * Get all sheet sizes (built-in + custom).
 */
function getAllSheetSizes(customSheetSizes: SheetSize[]): SheetSize[] {
  return [...SHEET_SIZES, ...customSheetSizes];
}

/**
 * Get all grammage options for a substrate (built-in + custom).
 */
function getAllGrammageOptions(
  substrateId: string,
  customGrammages: CustomGrammageOption[]
): GrammageOption[] {
  const substrate = SUBSTRATES.find(s => s.id === substrateId);
  const builtIn = substrate ? substrate.options : [];
  const custom = customGrammages.filter(option => option.substrateId === substrateId);
  return [...builtIn, ...custom];
}

/**
 * Get the caliper for a given substrate + grammage combination.
 */
function getCaliper(
  substrateId: string,
  grammage: number,
  customGrammages: CustomGrammageOption[]
): number {
  const allOptions = getAllGrammageOptions(substrateId, customGrammages);
  const option = allOptions.find(o => o.grammage === grammage);
  return option ? option.caliper : 0;
}

/**
 * Get sheet dimensions by ID.
 */
function getSheetDimensions(sheetSizeId: string, customSheetSizes: SheetSize[]) {
  const allSheets = getAllSheetSizes(customSheetSizes);
  const sheet = allSheets.find(s => s.id === sheetSizeId);
  return sheet ? { width: sheet.width_mm, height: sheet.height_mm } : { width: 0, height: 0 };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error desconocido';
}

type CalculationResults = Pick<
  BookStore,
  'impositionResult' | 'impositionError' | 'spineResult' | 'spineError'
>;

function calculateResults(state: BookConfig): CalculationResults {
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

    const sheet = getSheetDimensions(state.sheetSizeId, state.customSheetSizes);

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

  return { impositionResult, impositionError, spineResult, spineError };
}

function withUpdatedCalculations(
  state: BookStore,
  inputPatch: Partial<BookConfig>
): Partial<BookStore> {
  return {
    ...inputPatch,
    ...calculateResults({ ...state, ...inputPatch }),
  };
}

/**
 * Calculate page dimensions from a proportion and base dimension.
 */
function dimensionsFromProportion(
  proportionId: string,
  format: 'vertical' | 'landscape' | 'square',
  baseWidth: number
): { width: number; height: number } {
  const prop = PROPORTIONS.find(p => p.label === proportionId);
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

// ─── Default values ──────────────────────────────────────────────────────

const DEFAULT_SUBSTRATE = 'couche_matte';
const DEFAULT_GRAMMAGE = 150;
const DEFAULT_SHEET = 'tabloide';
const DEFAULT_WIDTH = 140;
const DEFAULT_PROPORTION = '2:3';

const defaultDims = dimensionsFromProportion(DEFAULT_PROPORTION, 'vertical', DEFAULT_WIDTH);

let customSheetCounter = 0;

export const useBookStore = create<BookStore>((set, get) => ({
  // Canvas Designer
  format: 'vertical',
  proportionId: DEFAULT_PROPORTION,
  pageWidth_mm: defaultDims.width,
  pageHeight_mm: defaultDims.height,
  bleed_mm: 3,
  unitSystem: 'metric',
  pageOrientation: 'auto',

  // Substrate
  substrateId: DEFAULT_SUBSTRATE,
  selectedGrammage: DEFAULT_GRAMMAGE,
  customGrammages: [],

  // Imposition
  sheetSizeId: DEFAULT_SHEET,
  customSheetSizes: [],

  // Spine
  totalPages: 32,

  // Computed
  impositionResult: null,
  impositionError: null,
  spineResult: null,
  spineError: null,
  customGrammageError: null,

  // ─── Actions ─────────────────────────────────────────────────────

  setFormat: (format) => {
    set(state => {
      if (!state.proportionId) {
        return withUpdatedCalculations(state, { format });
      }

      const dimensions = dimensionsFromProportion(
        state.proportionId,
        format,
        state.pageWidth_mm
      );
      return withUpdatedCalculations(state, {
        format,
        pageWidth_mm: dimensions.width,
        pageHeight_mm: dimensions.height,
      });
    });
  },

  setProportion: (proportionId) => {
    set(state => {
      if (!proportionId) {
        return withUpdatedCalculations(state, { proportionId });
      }

      const dimensions = dimensionsFromProportion(
        proportionId,
        state.format,
        state.pageWidth_mm
      );
      return withUpdatedCalculations(state, {
        proportionId,
        pageWidth_mm: dimensions.width,
        pageHeight_mm: dimensions.height,
      });
    });
  },

  setPageDimensions: (width_mm, height_mm) => {
    set(state => withUpdatedCalculations(state, {
      pageWidth_mm: width_mm,
      pageHeight_mm: height_mm,
      proportionId: null,
    }));
  },

  setBleed: (bleed_mm) => {
    set(state => withUpdatedCalculations(state, { bleed_mm }));
  },

  setUnitSystem: (unitSystem) => {
    set({ unitSystem });
  },

  setPageOrientation: (pageOrientation) => {
    set(state => withUpdatedCalculations(state, { pageOrientation }));
  },

  setSubstrate: (substrateId) => {
    set(state => {
      const substrate = SUBSTRATES.find(s => s.id === substrateId);
      const inputPatch: Partial<BookConfig> = substrate && substrate.options.length > 0
        ? { substrateId, selectedGrammage: substrate.options[0].grammage }
        : { substrateId };

      return {
        ...withUpdatedCalculations(state, inputPatch),
        customGrammageError: null,
      };
    });
  },

  setGrammage: (selectedGrammage) => {
    set(state => withUpdatedCalculations(state, { selectedGrammage }));
  },

  setSheetSize: (sheetSizeId) => {
    set(state => withUpdatedCalculations(state, { sheetSizeId }));
  },

  setTotalPages: (totalPages) => {
    set(state => withUpdatedCalculations(state, { totalPages }));
  },

  // ─── Custom Sheet Sizes ──────────────────────────────────────────

  addCustomSheetSize: (name, width_mm, height_mm) => {
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

    set(state => withUpdatedCalculations(state, {
      customSheetSizes: [...state.customSheetSizes, newSheet],
      sheetSizeId: id,
    }));
    return true;
  },

  removeCustomSheetSize: (id) => {
    set(state => {
      if (!state.customSheetSizes.some(sheet => sheet.id === id)) {
        return state;
      }

      const inputPatch: Partial<BookConfig> = {
        customSheetSizes: state.customSheetSizes.filter(sheet => sheet.id !== id),
      };
      if (state.sheetSizeId === id) {
        inputPatch.sheetSizeId = SHEET_SIZES[0].id;
      }

      return withUpdatedCalculations(state, inputPatch);
    });
  },

  // ─── Custom Grammages ────────────────────────────────────────────

  addCustomGrammage: (substrateId, grammage, caliper) => {
    const state = get();
    const substrate = SUBSTRATES.find(s => s.id === substrateId);

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

    const duplicate = getAllGrammageOptions(substrateId, state.customGrammages)
      .some(option => option.grammage === grammage);
    if (duplicate) {
      set({
        customGrammageError: `Ya existe el gramaje ${grammage} g/m² para ${substrate.name}. Introduce otro gramaje o cancela.`,
      });
      return false;
    }

    const newOption: CustomGrammageOption = { substrateId, grammage, caliper };
    set(currentState => ({
      ...withUpdatedCalculations(currentState, {
        substrateId,
        customGrammages: [...currentState.customGrammages, newOption],
        selectedGrammage: grammage,
      }),
      customGrammageError: null,
    }));
    return true;
  },

  clearCustomGrammageError: () => {
    set({ customGrammageError: null });
  },

  removeCustomGrammage: (substrateId, grammage) => {
    set(state => {
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
        const substrate = SUBSTRATES.find(s => s.id === substrateId);
        if (substrate && substrate.options.length > 0) {
          inputPatch.selectedGrammage = substrate.options[0].grammage;
        }
      }

      return {
        ...withUpdatedCalculations(state, inputPatch),
        customGrammageError: null,
      };
    });
  },

  // ─── Recalculate ─────────────────────────────────────────────────

  recalculate: () => {
    set(state => calculateResults(state));
  },
}));

// ─── Exported helpers for components ─────────────────────────────────────

export { getAllSheetSizes, getAllGrammageOptions };
