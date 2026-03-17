// ─── Book Format & Proportions ───────────────────────────────────────────

export type BookFormat = 'vertical' | 'landscape' | 'square';

export interface Proportion {
  label: string;
  ratio: [number, number]; // [width, height]
  description: string;
}

// ─── Paper / Substrate ───────────────────────────────────────────────────

export type PaperType =
  | 'bond'
  | 'couche_matte'
  | 'couche_gloss'
  | 'opalina'
  | 'cardboard_sulfate'
  | 'cardboard_c1s'
  | 'cardboard_c2s';

export interface GrammageOption {
  grammage: number;   // g/m²
  caliper: number;    // microns (μm) per sheet
}

export interface Substrate {
  id: string;
  name: string;
  type: PaperType;
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

  // Substrate
  substrateId: string;
  selectedGrammage: number;      // g/m² (selecciona de las opciones del sustrato)
  customGrammages: GrammageOption[];  // User-added grammage options per substrate

  // Imposition
  sheetSizeId: string;
  customSheetSizes: SheetSize[];      // User-added sheet sizes

  // Spine & Weight
  totalPages: number;
}

export interface BookStore extends BookConfig {
  // Computed results
  impositionResult: ImpositionResult | null;
  spineResult: SpineResult | null;

  // Actions
  setFormat: (format: BookFormat) => void;
  setProportion: (proportionId: string | null) => void;
  setPageDimensions: (width_mm: number, height_mm: number) => void;
  setBleed: (bleed_mm: number) => void;
  setUnitSystem: (system: UnitSystem) => void;
  setSubstrate: (substrateId: string) => void;
  setGrammage: (grammage: number) => void;
  setSheetSize: (sheetSizeId: string) => void;
  setTotalPages: (pages: number) => void;
  addCustomSheetSize: (name: string, width_mm: number, height_mm: number) => void;
  removeCustomSheetSize: (id: string) => void;
  addCustomGrammage: (substrateId: string, grammage: number, caliper: number) => void;
  removeCustomGrammage: (substrateId: string, grammage: number) => void;
  recalculate: () => void;
}
