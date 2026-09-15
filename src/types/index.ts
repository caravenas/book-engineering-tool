// ─── Book Format & Proportions ───────────────────────────────────────────

export type BookFormat = 'vertical' | 'landscape' | 'square';

export interface Proportion {
  label: string;
  ratio: [number, number]; // [width, height]
  description: string;
}

// ─── Paper / Substrate ───────────────────────────────────────────────────

export interface GrammageOption {
  grammage: number;   // g/m²
  caliper: number;    // microns (μm) per sheet
}

export interface CustomGrammageOption extends GrammageOption {
  substrateId: string;
}

export interface Substrate {
  id: string;
  name: string;
  type: string;
  description: string;
  options: GrammageOption[];
}

// ─── Press Sheet Sizes ───────────────────────────────────────────────────

export interface SheetSize {
  id: string;
  name: string;
  width_mm: number;
  height_mm: number;
}

// ─── Runtime Catalog Configuration ───────────────────────────────────────

export interface CatalogDefaults {
  substrateId: string;
  grammage: number;
  sheetSizeId: string;
  pageWidth_mm: number;
  proportionId: string;
  bleed_mm: number;
  totalPages: number;
}

export interface Catalog {
  substrates: Substrate[];
  substratesSource: string;
  sheetSizes: SheetSize[];
  sheetSizesSource: string;
  proportions: Proportion[];
  defaults: CatalogDefaults;
}

// ─── Imposition Engine Results ───────────────────────────────────────────

export interface PagePlacement {
  x: number;       // mm from left edge
  y: number;       // mm from top edge
  width: number;   // mm
  height: number;  // mm
  rotated: boolean;
}

export interface ImpositionResult {
  pagesPerSide: number;
  cols: number;
  rows: number;
  rotated: boolean;
  wastePercentage: number;
  usedArea_mm2: number;
  totalArea_mm2: number;
  placements: PagePlacement[];
  previewTruncated: boolean;
  usesBestOrientation: boolean; // Best only between the normal and rotated uniform grids
}

// ─── Spine & Weight Results ──────────────────────────────────────────────

export interface SpineResult {
  thickness_mm: number;
  totalWeight_g: number;
}

// ─── Unit System ─────────────────────────────────────────────────────────

export type UnitSystem = 'metric' | 'imperial';

// ─── Global Book Configuration (Store State) ─────────────────────────────

export interface BookConfig {
  // Canvas Designer
  format: BookFormat;
  proportionId: string | null;   // null = custom dimensions
  pageWidth_mm: number;
  pageHeight_mm: number;
  bleed_mm: number;
  unitSystem: UnitSystem;

  // Manual Rotation
  pageOrientation: 'auto' | 'normal' | 'rotated';

  // Substrate
  substrateId: string;
  selectedGrammage: number;      // g/m² (selecciona de las opciones del sustrato)
  customGrammages: CustomGrammageOption[];  // User-added grammage options per substrate

  // Imposition
  sheetSizeId: string;
  customSheetSizes: SheetSize[];      // User-added sheet sizes

  // Spine & Weight
  totalPages: number;
}

export interface BookStore extends BookConfig {
  // Runtime configuration catalog (null until loaded)
  catalog: Catalog | null;

  // Computed results
  impositionResult: ImpositionResult | null;
  impositionError: string | null;
  spineResult: SpineResult | null;
  spineError: string | null;
  customGrammageError: string | null;

  // Actions
  initialize: (catalog: Catalog) => void;
  setFormat: (format: BookFormat) => void;
  setProportion: (proportionId: string | null) => void;
  setPageDimensions: (width_mm: number, height_mm: number) => void;
  setBleed: (bleed_mm: number) => void;
  setUnitSystem: (system: UnitSystem) => void;
  setPageOrientation: (orientation: 'auto' | 'normal' | 'rotated') => void;
  setSubstrate: (substrateId: string) => void;
  setGrammage: (grammage: number) => void;
  setSheetSize: (sheetSizeId: string) => void;
  setTotalPages: (pages: number) => void;
  addCustomSheetSize: (name: string, width_mm: number, height_mm: number) => boolean;
  removeCustomSheetSize: (id: string) => void;
  addCustomGrammage: (substrateId: string, grammage: number, caliper: number) => boolean;
  removeCustomGrammage: (substrateId: string, grammage: number) => void;
  clearCustomGrammageError: () => void;
  recalculate: () => void;
}
