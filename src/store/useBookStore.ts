import { create } from 'zustand';
import type { BookStore } from '../types';
import { SUBSTRATES, SHEET_SIZES, PROPORTIONS } from '../data/substrates';
import { calculateImposition } from '../engine/imposition';
import { calculateSpineAndWeight } from '../engine/spine';

/**
 * Get the caliper for a given substrate + grammage combination.
 */
function getCaliper(substrateId: string, grammage: number): number {
  const substrate = SUBSTRATES.find(s => s.id === substrateId);
  if (!substrate) return 0;
  const option = substrate.options.find(o => o.grammage === grammage);
  return option ? option.caliper : 0;
}

/**
 * Get sheet dimensions by ID.
 */
function getSheetDimensions(sheetSizeId: string) {
  const sheet = SHEET_SIZES.find(s => s.id === sheetSizeId);
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
    // width is shorter side
    return { width: baseWidth, height: baseWidth * (rh / rw) };
  }

  // landscape: width is longer side
  return { width: baseWidth, height: baseWidth * (rw / rh) };
}

// ─── Default values ──────────────────────────────────────────────────────

const DEFAULT_SUBSTRATE = 'couche_matte';
const DEFAULT_GRAMMAGE = 150;
const DEFAULT_SHEET = 'tabloide';
const DEFAULT_WIDTH = 140; // mm
const DEFAULT_PROPORTION = '2:3';

const defaultDims = dimensionsFromProportion(DEFAULT_PROPORTION, 'vertical', DEFAULT_WIDTH);

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

  // Imposition
  sheetSizeId: DEFAULT_SHEET,

  // Spine
  totalPages: 32,

  // Computed (initially null, computed on mount)
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
      set({ substrateId, selectedGrammage: substrate.options[0].grammage });
    } else {
      set({ substrateId });
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
    set({ totalPages: Math.max(4, Math.round(totalPages / 4) * 4) }); // Must be multiple of 4
    get().recalculate();
  },

  recalculate: () => {
    const state = get();

    // Page dimensions with bleed (added to each side)
    const pageWithBleedW = state.pageWidth_mm + (state.bleed_mm * 2);
    const pageWithBleedH = state.pageHeight_mm + (state.bleed_mm * 2);

    // Get sheet dimensions
    const sheet = getSheetDimensions(state.sheetSizeId);

    // Imposition calculation
    const impositionResult = calculateImposition(
      pageWithBleedW,
      pageWithBleedH,
      sheet.width,
      sheet.height
    );

    // Spine & Weight calculation
    const caliper = getCaliper(state.substrateId, state.selectedGrammage);
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
