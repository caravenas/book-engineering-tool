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

/**
 * A patch stores only the fields the user changed on a factory proportion,
 * identified by its label (a proportion's id). Never a copy of the whole
 * entry: an update to `formatos.json` that adds a field, or changes a field
 * the user never touched, is inherited automatically because that field
 * simply isn't in `changes`.
 */
export interface ProportionPatch {
  label: string;
  changes: Partial<Pick<Proportion, 'ratio' | 'description'>>;
}

/**
 * A patch on a factory substrate, identified by its id. Its grammages are not
 * patchable: they hang off the paper as their own list, with their own alta
 * and their own removal, exactly as they did before papers became editable.
 * See {@link ProportionPatch}.
 */
export interface SubstratePatch {
  id: string;
  changes: Partial<Pick<Substrate, 'name' | 'description'>>;
}

/**
 * A patch on a factory cover, identified by its id. Every field is patchable,
 * including its kind: a soft cover and a hard one are the same record with
 * different rules about which of its measurements may be non-zero. See
 * {@link ProportionPatch}.
 */
export interface CoverPatch {
  id: string;
  changes: Partial<Omit<Cover, 'id'>>;
}

/** A patch on a factory sheet size, identified by its id. See {@link ProportionPatch}. */
export interface SheetSizePatch {
  id: string;
  changes: Partial<Pick<SheetSize, 'name' | 'width_mm' | 'height_mm'>>;
}

/** A patch on a factory press, identified by its id. See {@link ProportionPatch}. */
export interface PressPatch {
  id: string;
  changes: Partial<Omit<Press, 'id'>>;
}

/** A patch on a factory binding, identified by its id. See {@link ProportionPatch}. */
export interface BindingPatch {
  id: string;
  changes: Partial<Omit<Binding, 'id'>>;
}

/**
 * The five user-added catalogs, plus (UX-6) the patches and hides for the
 * four catalogs that have their own identity: sheet sizes, presses and
 * bindings by id, and proportions by label. Grammages are options nested per
 * substrate rather than entries with their own id, so patching them is a
 * different shape of problem; covers and folding schemes have no editing
 * surface at all. All three are intentionally left for UX-7's full catalog
 * screen, not an oversight here.
 *
 * Exactly as persisted to and read from browser storage: the effective
 * catalog (factory + patches - hides + altas) is computed on every load and
 * is never itself written back here.
 */
export interface UserLayer {
  customProportions: Proportion[];
  customGrammages: CustomGrammageOption[];
  customSubstrates: Substrate[];
  customCovers: Cover[];
  customSheetSizes: SheetSize[];
  customPresses: Press[];
  customBindings: Binding[];

  proportionPatches: ProportionPatch[];
  substratePatches: SubstratePatch[];
  coverPatches: CoverPatch[];
  sheetSizePatches: SheetSizePatch[];
  pressPatches: PressPatch[];
  bindingPatches: BindingPatch[];

  hiddenProportionLabels: string[];
  hiddenSubstrateIds: string[];
  hiddenCoverIds: string[];
  hiddenSheetSizeIds: string[];
  hiddenPressIds: string[];
  hiddenBindingIds: string[];
}

/**
 * A patch or a hide whose target (a factory id, or a label for proportions)
 * no longer exists in the loaded catalog. Detected fresh on every load and
 * after every user-layer write; never causes the orphaned record itself to
 * be dropped from storage, so the work survives if the id comes back in a
 * later catalog update.
 */
export type OrphanedUserLayerEntryKind =
  | 'substratePatch'
  | 'hiddenSubstrate'
  | 'coverPatch'
  | 'hiddenCover'
  | 'proportionPatch' | 'sheetSizePatch' | 'pressPatch' | 'bindingPatch'
  | 'hiddenProportion' | 'hiddenSheetSize' | 'hiddenPress' | 'hiddenBinding';

export interface OrphanedUserLayerEntry {
  kind: OrphanedUserLayerEntryKind;
  /** The factory id (or, for proportions, label) this entry pointed to that no longer exists. */
  targetId: string;
}

// ─── Global Book Configuration (Store State) ─────────────────────────────

export interface BookConfig {
  // Canvas Designer
  format: BookFormat;
  proportionId: string | null;   // null = custom dimensions
  customProportions: Proportion[];  // User-added proportions
  proportionPatches: ProportionPatch[];      // Edits to factory proportions, by label
  hiddenProportionLabels: string[];          // Factory proportions hidden by the user
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
  customSubstrates: Substrate[];      // User-added papers
  substratePatches: SubstratePatch[]; // Edits to factory papers, by id
  hiddenSubstrateIds: string[];       // Factory papers hidden by the user

  // Imposition
  sheetSizeId: string;
  customSheetSizes: SheetSize[];      // User-added sheet sizes
  sheetSizePatches: SheetSizePatch[]; // Edits to factory sheet sizes, by id
  hiddenSheetSizeIds: string[];       // Factory sheet sizes hidden by the user

  // Signature imposition
  pressId: string;
  customPresses: Press[];      // User-added presses
  pressPatches: PressPatch[];  // Edits to factory presses, by id
  hiddenPressIds: string[];    // Factory presses hidden by the user
  foldingSchemeId: string | null;   // null = automatic selection (least waste)

  // Spine & Weight
  totalPages: number;

  // Binding
  bindingId: string;
  customBindings: Binding[];      // User-added bindings
  bindingPatches: BindingPatch[]; // Edits to factory bindings, by id
  hiddenBindingIds: string[];     // Factory bindings hidden by the user

  // Cover
  coverId: string;
  customCovers: Cover[];      // User-added covers
  coverPatches: CoverPatch[]; // Edits to factory covers, by id
  hiddenCoverIds: string[];   // Factory covers hidden by the user
}

export interface BookStore extends BookConfig {
  // Runtime configuration catalog (null until loaded)
  catalog: Catalog | null;

  // Raw text of the "number of pages" input; `totalPages` is derived from it.
  totalPagesInput: string;

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
  customSubstrateError: string | null;
  customCoverError: string | null;
  customSheetSizeError: string | null;
  customPressError: string | null;
  customBindingError: string | null;
  customProportionError: string | null;

  // User layer persistence (checked once at startup; the write flag updates
  // after every alta/baja/patch/hide of the four catalogs with an editing
  // surface, plus grammages)
  userLayerStorageAvailable: boolean;
  userLayerWriteFailed: boolean;

  // Patches or hides whose target no longer exists in the loaded catalog,
  // recomputed on every load and every user-layer write, for the interface
  // to warn about (UX-6, see the `UserLayer`/`OrphanedUserLayerEntry` docs).
  orphanedUserLayerEntries: OrphanedUserLayerEntry[];

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
  setTotalPagesInput: (rawValue: string) => void;
  setBinding: (bindingId: string) => void;
  setCover: (coverId: string) => void;
  addCustomSheetSize: (name: string, width_mm: number, height_mm: number) => boolean;
  removeCustomSheetSize: (id: string) => void;
  editCustomSheetSize: (id: string, changes: Partial<Pick<SheetSize, 'name' | 'width_mm' | 'height_mm'>>) => boolean;
  patchSheetSize: (id: string, changes: Partial<Pick<SheetSize, 'name' | 'width_mm' | 'height_mm'>>) => boolean;
  unpatchSheetSize: (id: string) => void;
  hideSheetSize: (id: string) => void;
  showSheetSize: (id: string) => void;
  clearCustomSheetSizeError: () => void;
  addCustomCover: (cover: Omit<Cover, 'id'>) => boolean;
  editCustomCover: (id: string, changes: Partial<Omit<Cover, 'id'>>) => boolean;
  removeCustomCover: (id: string) => void;
  patchCover: (id: string, changes: Partial<Omit<Cover, 'id'>>) => boolean;
  unpatchCover: (id: string) => void;
  hideCover: (id: string) => void;
  showCover: (id: string) => void;
  clearCustomCoverError: () => void;
  addCustomSubstrate: (name: string, description: string, grammage: number, caliper: number) => boolean;
  editCustomSubstrate: (id: string, changes: Partial<Pick<Substrate, 'name' | 'description'>>) => boolean;
  removeCustomSubstrate: (id: string) => void;
  patchSubstrate: (id: string, changes: Partial<Pick<Substrate, 'name' | 'description'>>) => boolean;
  unpatchSubstrate: (id: string) => void;
  hideSubstrate: (id: string) => void;
  showSubstrate: (id: string) => void;
  clearCustomSubstrateError: () => void;
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
  editCustomPress: (id: string, changes: Partial<Omit<Press, 'id'>>) => boolean;
  patchPress: (id: string, changes: Partial<Omit<Press, 'id'>>) => boolean;
  unpatchPress: (id: string) => void;
  hidePress: (id: string) => void;
  showPress: (id: string) => void;
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
  editCustomBinding: (id: string, changes: Partial<Omit<Binding, 'id'>>) => boolean;
  patchBinding: (id: string, changes: Partial<Omit<Binding, 'id'>>) => boolean;
  unpatchBinding: (id: string) => void;
  hideBinding: (id: string) => void;
  showBinding: (id: string) => void;
  clearCustomBindingError: () => void;
  addCustomProportion: (label: string, ratioWidth: number, ratioHeight: number, description: string) => boolean;
  removeCustomProportion: (label: string) => void;
  editCustomProportion: (label: string, changes: Partial<Omit<Proportion, 'label'>> & { label?: string }) => boolean;
  patchProportion: (label: string, changes: Partial<Pick<Proportion, 'ratio' | 'description'>>) => boolean;
  unpatchProportion: (label: string) => void;
  hideProportion: (label: string) => void;
  showProportion: (label: string) => void;
  clearCustomProportionError: () => void;
  recalculate: () => void;
}
