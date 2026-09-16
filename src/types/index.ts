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

// ─── Presses ──────────────────────────────────────────────────────────────

export interface Press {
  id: string;
  name: string;
  maxSheetWidth_mm: number;
  maxSheetHeight_mm: number;
  gripperMargin_mm: number;
  sideMargin_mm: number;
  tailMargin_mm: number;
  gutter_mm: number;
}

// ─── Folding Schemes ──────────────────────────────────────────────────────

export interface SlotPlacement {
  page: number;
  rotation: 0 | 180;
}

export interface FoldingScheme {
  id: string;
  name: string;
  pagesPerSignature: number;
  cols: number;
  rows: number;
  sides: {
    front: SlotPlacement[];
    back: SlotPlacement[];
  };
}

// ─── Binding Methods ──────────────────────────────────────────────────────

export interface Binding {
  id: string;
  name: string;
  pageMultiple: number;
  minPages: number;
  maxPages: number;
  spineAllowance_mm: number;
  nests: boolean;
  requiresSignatureMultiple: boolean;
}

// ─── Binding Engine Results ──────────────────────────────────────────────

export type BindingPageCountReason = 'below-min' | 'above-max' | 'not-multiple' | 'not-signature-multiple';

export type BindingPageCountResult =
  | { ok: true }
  | {
      ok: false;
      reason: BindingPageCountReason;
      message: string;
      nearestBelow: number | null;
      nearestAbove: number | null;
    };

export interface BindingSpineResult {
  interior_mm: number;
  allowance_mm: number;
  total_mm: number;
}

export interface CreepCompensationResult {
  nestedSheets: number;
  maxShift_mm: number;
  innermostShift_mm: number;
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
  pressId: string;
  bindingId: string;
}

export interface Catalog {
  substrates: Substrate[];
  substratesSource: string;
  sheetSizes: SheetSize[];
  sheetSizesSource: string;
  presses: Press[];
  pressesSource: string;
  foldingSchemes: FoldingScheme[];
  foldingSchemesSource: string;
  bindings: Binding[];
  bindingsSource: string;
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

// ─── Signature Imposition Engine Results ─────────────────────────────────

// 'tiro-retiro' means the scheme can be printed from a single plate
// (work-and-turn); 'planchas-separadas' means front and back need separate
// plates. Detection is a geometric simplification, documented where computed.
export type PrintingMode = 'tiro-retiro' | 'planchas-separadas';

// Why no scheme was selected, for a UI that wants to explain it precisely
// instead of a generic "nothing fits": `null` means something did fit.
export type SignaturePlanReason = 'sheet-exceeds-press' | 'margins-exceed-sheet' | 'no-scheme-fits' | null;

export interface SignaturePlanInput {
  pageWidth_mm: number;
  pageHeight_mm: number;
  bleed_mm: number;
  sheetWidth_mm: number;
  sheetHeight_mm: number;
  press: Press;
  schemes: FoldingScheme[];
  totalPages: number;
}

export interface SignatureOption {
  scheme: FoldingScheme;
  pageRotated: boolean; // the page is turned 90° to fit the scheme's grid
  cols: number;
  rows: number;
  pagesPerSheet: number;  // cols × rows × 2 (front and back together)
  cellWidth_mm: number;  // trimmed page + bleed, in the orientation actually used
  cellHeight_mm: number;
  gutter_mm: number;
  sideMargin_mm: number;
  gripperMargin_mm: number;
  signatures: number;
  blankPages: number;
  sheetsPerCopy: number;
  usedArea_mm2: number;
  printableArea_mm2: number;
  wastePercentage: number;
  printingMode: PrintingMode;
}

export interface SignaturePlanResult {
  options: SignatureOption[];
  selected: SignatureOption | null;
  reason: SignaturePlanReason;
}

export interface SignaturePlacement {
  page: number;
  rotation: 0 | 90 | 180 | 270;
  x_mm: number;
  y_mm: number;
  width_mm: number;
  height_mm: number;
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

  // Signature imposition
  pressId: string;
  foldingSchemeId: string | null;   // null = automatic selection (least waste)

  // Spine & Weight
  totalPages: number;

  // Binding
  bindingId: string;
}

export interface BookStore extends BookConfig {
  // Runtime configuration catalog (null until loaded)
  catalog: Catalog | null;

  // Computed results
  impositionResult: ImpositionResult | null;
  impositionError: string | null;
  signaturePlan: SignaturePlanResult | null;
  signatureError: string | null;
  spineResult: SpineResult | null;
  spineError: string | null;
  bindingPageCount: BindingPageCountResult | null;
  bindingSpine: BindingSpineResult | null;
  bindingCreep: CreepCompensationResult | null;
  bindingError: string | null;
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
  setPress: (pressId: string) => void;
  setFoldingScheme: (foldingSchemeId: string | null) => void;
  setTotalPages: (pages: number) => void;
  setBinding: (bindingId: string) => void;
  addCustomSheetSize: (name: string, width_mm: number, height_mm: number) => boolean;
  removeCustomSheetSize: (id: string) => void;
  addCustomGrammage: (substrateId: string, grammage: number, caliper: number) => boolean;
  removeCustomGrammage: (substrateId: string, grammage: number) => void;
  clearCustomGrammageError: () => void;
  recalculate: () => void;
}
