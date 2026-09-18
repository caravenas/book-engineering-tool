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

// ─── Cover (Tapa) ─────────────────────────────────────────────────────────

export type CoverKind = 'blanda' | 'dura';

export interface Cover {
  id: string;
  name: string;
  kind: CoverKind;
  substrateId: string;
  grammage: number;
  flapWidth_mm: number;
  squares_mm: number;
  hingeGap_mm: number;
  turnIn_mm: number;
  boardThickness_mm: number;
}

// ─── Cover Engine Results ─────────────────────────────────────────────────

export interface CoverPlanInput {
  pageWidth_mm: number;
  pageHeight_mm: number;
  bleed_mm: number;
  spineTotal_mm: number;
  bindingHasFlatSpine: boolean;
  cover: Cover;
}

export type CoverPlanReason = 'binding-has-no-flat-spine' | 'hinge-exceeds-board' | 'flap-exceeds-page';

export interface SoftCoverSections {
  flapLeft_mm: number;
  back_mm: number;
  spine_mm: number;
  front_mm: number;
  flapRight_mm: number;
}

export interface SoftCoverResult {
  kind: 'blanda';
  sheetWidth_mm: number;
  sheetHeight_mm: number;
  sections: SoftCoverSections;
  paperArea_m2: number;
  paperWeight_g: number;
}

export interface HardCoverResult {
  kind: 'dura';
  boardWidth_mm: number;
  boardHeight_mm: number;
  spineBoardWidth_mm: number;
  wrapWidth_mm: number;
  wrapHeight_mm: number;
  paperArea_m2: number;
  paperWeight_g: number;
  // Areas in m², split because the spine inlay is usually a different
  // material from the side boards and increment 5 will cost them
  // separately. No board weight is derived from any of them: the catalog
  // does not declare a board density, and inventing one would be a
  // fabricated number.
  sideBoardArea_m2: number;
  spineBoardArea_m2: number;
  boardArea_m2: number;
}

export type CoverPlanResult =
  | { ok: true; cover: SoftCoverResult | HardCoverResult }
  | { ok: false; reason: CoverPlanReason; message: string };

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
  coverId: string;
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
  covers: Cover[];
  coversSource: string;
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

// ─── User Layer Persistence ───────────────────────────────────────────────

/** The five user-added catalogs, exactly as persisted to and read from browser storage. */
export interface UserLayer {
  customProportions: Proportion[];
  customGrammages: CustomGrammageOption[];
  customSheetSizes: SheetSize[];
  customPresses: Press[];
  customBindings: Binding[];
}

// ─── Global Book Configuration (Store State) ─────────────────────────────

export interface BookConfig {
  // Canvas Designer
  format: BookFormat;
  proportionId: string | null;   // null = custom dimensions
  customProportions: Proportion[];  // User-added proportions
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
  customPresses: Press[];      // User-added presses
  foldingSchemeId: string | null;   // null = automatic selection (least waste)

  // Spine & Weight
  totalPages: number;

  // Binding
  bindingId: string;
  customBindings: Binding[];      // User-added bindings

  // Cover
  coverId: string;
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
  coverPlan: CoverPlanResult | null;
  coverError: string | null;
  customGrammageError: string | null;
  customPressError: string | null;
  customBindingError: string | null;
  customProportionError: string | null;

  // User layer persistence (checked once at startup; the write flag updates
  // after every alta/baja of the five custom catalogs)
  userLayerStorageAvailable: boolean;
  userLayerWriteFailed: boolean;

  // Actions
  initialize: (catalog: Catalog, userLayer?: UserLayer) => void;
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
  setCover: (coverId: string) => void;
  addCustomSheetSize: (name: string, width_mm: number, height_mm: number) => boolean;
  removeCustomSheetSize: (id: string) => void;
  addCustomGrammage: (substrateId: string, grammage: number, caliper: number) => boolean;
  removeCustomGrammage: (substrateId: string, grammage: number) => void;
  clearCustomGrammageError: () => void;
  addCustomPress: (
    name: string,
    maxSheetWidth_mm: number,
    maxSheetHeight_mm: number,
    gripperMargin_mm: number,
    sideMargin_mm: number,
    tailMargin_mm: number,
    gutter_mm: number
  ) => boolean;
  removeCustomPress: (id: string) => void;
  clearCustomPressError: () => void;
  addCustomBinding: (
    name: string,
    pageMultiple: number,
    minPages: number,
    maxPages: number,
    spineAllowance_mm: number,
    nests: boolean,
    requiresSignatureMultiple: boolean
  ) => boolean;
  removeCustomBinding: (id: string) => void;
  clearCustomBindingError: () => void;
  addCustomProportion: (label: string, ratioWidth: number, ratioHeight: number, description: string) => boolean;
  removeCustomProportion: (label: string) => void;
  clearCustomProportionError: () => void;
  recalculate: () => void;
}
