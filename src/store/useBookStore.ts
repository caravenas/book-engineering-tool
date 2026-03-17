import { create } from 'zustand';
import type { BookStore, SheetSize, GrammageOption } from '../types';
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
function getAllGrammageOptions(substrateId: string, customGrammages: GrammageOption[]): GrammageOption[] {
  const substrate = SUBSTRATES.find(s => s.id === substrateId);
  const builtIn = substrate ? substrate.options : [];
  return [...builtIn, ...customGrammages];
}

/**
 * Get the caliper for a given substrate + grammage combination.
 */
function getCaliper(substrateId: string, grammage: number, customGrammages: GrammageOption[]): number {
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
  spineResult: null,

  // ─── Actions ─────────────────────────────────────────────────────

  setFormat: (format) => {
    const state = get();
    if (state.proportionId) {
      const dims = dimensionsFromProportion(state.proportionId, format, state.pageWidth_mm);
      set({ format, pageWidth_mm: dims.width, pageHeight_mm: dims.height });
    } else {
      set({ format });
    }
    get().recalculate();
  },

  setProportion: (proportionId) => {
    if (proportionId) {
      const state = get();
      const dims = dimensionsFromProportion(proportionId, state.format, state.pageWidth_mm);
      set({ proportionId, pageWidth_mm: dims.width, pageHeight_mm: dims.height });
    } else {
      set({ proportionId });
    }
    get().recalculate();
  },

  setPageDimensions: (width_mm, height_mm) => {
    set({ pageWidth_mm: width_mm, pageHeight_mm: height_mm, proportionId: null });
    get().recalculate();
  },

  setBleed: (bleed_mm) => {
    set({ bleed_mm });
    get().recalculate();
  },

  setUnitSystem: (unitSystem) => {
    set({ unitSystem });
  },

  setSubstrate: (substrateId) => {
    const substrate = SUBSTRATES.find(s => s.id === substrateId);
    if (substrate && substrate.options.length > 0) {
      set({ substrateId, selectedGrammage: substrate.options[0].grammage, customGrammages: [] });
    } else {
      set({ substrateId, customGrammages: [] });
    }
    get().recalculate();
  },

  setGrammage: (grammage) => {
    set({ selectedGrammage: grammage });
    get().recalculate();
  },

  setSheetSize: (sheetSizeId) => {
    set({ sheetSizeId });
    get().recalculate();
  },

  setTotalPages: (totalPages) => {
    set({ totalPages: Math.max(4, Math.round(totalPages / 4) * 4) });
    get().recalculate();
  },

  // ─── Custom Sheet Sizes ──────────────────────────────────────────

  addCustomSheetSize: (name, width_mm, height_mm) => {
    const id = `custom_sheet_${++customSheetCounter}_${Date.now()}`;
    const newSheet: SheetSize = { id, name: name || `${width_mm}×${height_mm}mm`, width_mm, height_mm };
    const state = get();
    set({
      customSheetSizes: [...state.customSheetSizes, newSheet],
      sheetSizeId: id,
    });
    get().recalculate();
  },

  removeCustomSheetSize: (id) => {
    const state = get();
    const updated = state.customSheetSizes.filter(s => s.id !== id);
    const newState: Partial<typeof state> = { customSheetSizes: updated };
    // If removing the currently selected sheet, fall back to first built-in
    if (state.sheetSizeId === id) {
      newState.sheetSizeId = SHEET_SIZES[0].id;
    }
    set(newState);
    get().recalculate();
  },

  // ─── Custom Grammages ────────────────────────────────────────────

  addCustomGrammage: (_substrateId, grammage, caliper) => {
    const state = get();
    const newOption: GrammageOption = { grammage, caliper };
    set({
      customGrammages: [...state.customGrammages, newOption],
      selectedGrammage: grammage,
    });
    get().recalculate();
  },

  removeCustomGrammage: (_substrateId, grammage) => {
    const state = get();
    const updated = state.customGrammages.filter(g => g.grammage !== grammage);
    const newState: Partial<typeof state> = { customGrammages: updated };
    // If removing the currently selected grammage, fall back to first built-in
    if (state.selectedGrammage === grammage) {
      const substrate = SUBSTRATES.find(s => s.id === state.substrateId);
      if (substrate && substrate.options.length > 0) {
        newState.selectedGrammage = substrate.options[0].grammage;
      }
    }
    set(newState);
    get().recalculate();
  },

  // ─── Recalculate ─────────────────────────────────────────────────

  recalculate: () => {
    const state = get();

    const pageWithBleedW = state.pageWidth_mm + (state.bleed_mm * 2);
    const pageWithBleedH = state.pageHeight_mm + (state.bleed_mm * 2);

    const sheet = getSheetDimensions(state.sheetSizeId, state.customSheetSizes);

    const impositionResult = calculateImposition(
      pageWithBleedW,
      pageWithBleedH,
      sheet.width,
      sheet.height
    );

    const caliper = getCaliper(state.substrateId, state.selectedGrammage, state.customGrammages);
    const spineResult = calculateSpineAndWeight(
      state.pageWidth_mm,
      state.pageHeight_mm,
      state.totalPages,
      state.selectedGrammage,
      caliper
    );

    set({ impositionResult, spineResult });
  },
}));

// ─── Exported helpers for components ─────────────────────────────────────

export { getAllSheetSizes, getAllGrammageOptions };
