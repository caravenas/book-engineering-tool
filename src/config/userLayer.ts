import type {
  Binding,
  BindingPatch,
  Cover,
  CoverPatch,
  CustomGrammageOption,
  Press,
  PressPatch,
  Proportion,
  ProportionPatch,
  SheetSize,
  SheetSizePatch,
  Substrate,
  SubstratePatch,
  UserLayer,
} from '../types';
import { MAX_BINDING_PAGES } from './validateCatalog';

/**
 * Schema version of the persisted user layer, stored alongside the data so a
 * later increment (UX-8's import/export) can migrate an older shape instead
 * of guessing which format it found.
 *
 * v1 → v2 (UX-6) added the patch and hide lists for the four catalogs with
 * their own identity (sheet sizes, presses, bindings by id; proportions by
 * label): `readUserLayer` migrates a v1 payload by keeping its five "alta"
 * lists untouched and starting every new patch/hide list empty, so nothing
 * saved under UX-5 is lost. A payload from any other version is treated as
 * absent rather than partially trusted.
 */
export const USER_LAYER_SCHEMA_VERSION = 2;

/** Exported so tests can seed or inspect the exact key this module reads and writes. */
export const USER_LAYER_STORAGE_KEY = 'pliegostack:userLayer';
const PROBE_KEY = `${USER_LAYER_STORAGE_KEY}:probe`;

export function emptyUserLayer(): UserLayer {
  return {
    customProportions: [],
    customGrammages: [],
    customSubstrates: [],
    customCovers: [],
    customSheetSizes: [],
    customPresses: [],
    customBindings: [],
    proportionPatches: [],
    substratePatches: [],
    coverPatches: [],
    sheetSizePatches: [],
    pressPatches: [],
    bindingPatches: [],
    hiddenProportionLabels: [],
    hiddenSubstrateIds: [],
    hiddenCoverIds: [],
    hiddenSheetSizeIds: [],
    hiddenPressIds: [],
    hiddenBindingIds: [],
  };
}

/**
 * Resolve the browser's storage without letting the property access itself
 * throw: in a browser with third-party cookies blocked or in some private
 * modes, reading `window.localStorage` can throw before any method on it is
 * even called. Exported so the store can resolve the same handle once at
 * startup and reuse it for every later write, instead of re-resolving (and
 * risking a different throw) on every call.
 */
export function getDefaultUserLayerStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Check, once, whether the given storage actually works: a browser can expose
 * `localStorage` while still throwing on every read or write (private mode,
 * a full quota). Probes with a throwaway key instead of trusting the mere
 * presence of the object.
 */
export function isUserLayerStorageAvailable(storage: Storage | null = getDefaultUserLayerStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(PROBE_KEY, '1');
    storage.removeItem(PROBE_KEY);
    return true;
  } catch {
    return false;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

/** Every key on `changes` must be one this patch's catalog actually declares, so a stray or renamed field is rejected instead of silently carried along. */
function hasOnlyAllowedKeys(value: Record<string, unknown>, allowedKeys: ReadonlySet<string>): boolean {
  return Object.keys(value).every(key => allowedKeys.has(key));
}

export function isValidProportion(value: unknown): value is Proportion {
  if (!isPlainObject(value)) return false;
  const { label, ratio, description } = value;
  return isNonEmptyString(label)
    && isNonEmptyString(description)
    && Array.isArray(ratio) && ratio.length === 2
    && isFiniteNumber(ratio[0]) && ratio[0] > 0
    && isFiniteNumber(ratio[1]) && ratio[1] > 0;
}

function isValidCustomGrammageOption(value: unknown): value is CustomGrammageOption {
  if (!isPlainObject(value)) return false;
  const { substrateId, grammage, caliper } = value;
  return isNonEmptyString(substrateId)
    && isFiniteNumber(grammage) && grammage > 0
    && isFiniteNumber(caliper) && caliper > 0;
}

export function isValidSheetSize(value: unknown): value is SheetSize {
  if (!isPlainObject(value)) return false;
  const { id, name, width_mm, height_mm } = value;
  return isNonEmptyString(id) && isNonEmptyString(name)
    && isFiniteNumber(width_mm) && width_mm > 0
    && isFiniteNumber(height_mm) && height_mm > 0;
}

export function isValidPress(value: unknown): value is Press {
  if (!isPlainObject(value)) return false;
  const {
    id, name, maxSheetWidth_mm, maxSheetHeight_mm, gripperMargin_mm, sideMargin_mm, tailMargin_mm, gutter_mm,
  } = value;
  if (!isNonEmptyString(id) || !isNonEmptyString(name)) return false;
  if (!isFiniteNumber(maxSheetWidth_mm) || maxSheetWidth_mm <= 0) return false;
  if (!isFiniteNumber(maxSheetHeight_mm) || maxSheetHeight_mm <= 0) return false;
  if (!isFiniteNumber(gripperMargin_mm) || gripperMargin_mm < 0) return false;
  if (!isFiniteNumber(sideMargin_mm) || sideMargin_mm < 0) return false;
  if (!isFiniteNumber(tailMargin_mm) || tailMargin_mm < 0) return false;
  if (!isFiniteNumber(gutter_mm) || gutter_mm < 0) return false;
  // Same invariants validateCatalog enforces on maquinas.json: a manipulated
  // or stale value here would otherwise leave no printable area and break
  // the imposition engine's assumptions.
  if (gripperMargin_mm + tailMargin_mm >= maxSheetHeight_mm) return false;
  if (2 * sideMargin_mm >= maxSheetWidth_mm) return false;
  return true;
}

export function isValidBinding(value: unknown): value is Binding {
  if (!isPlainObject(value)) return false;
  const {
    id, name, pageMultiple, minPages, maxPages, spineAllowance_mm, nests, requiresSignatureMultiple,
  } = value;
  if (!isNonEmptyString(id) || !isNonEmptyString(name)) return false;
  if (!isPositiveSafeInteger(pageMultiple) || pageMultiple % 2 !== 0) return false;
  if (!isPositiveSafeInteger(minPages) || minPages % pageMultiple !== 0) return false;
  if (!isPositiveSafeInteger(maxPages) || maxPages % pageMultiple !== 0 || maxPages > MAX_BINDING_PAGES) return false;
  if (minPages > maxPages) return false;
  if (!isFiniteNumber(spineAllowance_mm) || spineAllowance_mm < 0) return false;
  if (typeof nests !== 'boolean') return false;
  if (nests && pageMultiple % 4 !== 0) return false;
  if (typeof requiresSignatureMultiple !== 'boolean') return false;
  return true;
}

/**
 * Validate a persisted proportion patch's shape and each present field's own
 * range, independent of any factory entry: the full cross-field rules only
 * make sense once the store merges this patch onto its target at apply time
 * (`useBookStore`'s `patchProportion`), which is also where a merge that
 * fails those rules is rejected outright rather than persisted.
 */
const PROPORTION_PATCH_KEYS = new Set(['ratio', 'description']);

function isValidProportionPatch(value: unknown): value is ProportionPatch {
  if (!isPlainObject(value)) return false;
  const { label, changes } = value;
  if (!isNonEmptyString(label)) return false;
  if (!isPlainObject(changes) || !hasOnlyAllowedKeys(changes, PROPORTION_PATCH_KEYS)) return false;

  if ('description' in changes && !isNonEmptyString(changes.description)) return false;
  if ('ratio' in changes) {
    const { ratio } = changes;
    if (!Array.isArray(ratio) || ratio.length !== 2) return false;
    const [rw, rh] = ratio;
    if (!isFiniteNumber(rw) || rw <= 0 || !isFiniteNumber(rh) || rh <= 0) return false;
  }
  return true;
}

/**
 * A paper of your own. Its grammages travel inside it rather than in
 * `customGrammages`, which only ever attaches a grammage to a paper that came
 * from the catalog, and it must have at least one: a paper nobody can buy in
 * any weight is not a paper, and selecting one would leave the tool with no
 * caliper to compute a spine from.
 *
 * `type` is carried because the catalog schema requires it and is never read
 * by anything; a paper of your own gets its id there, which is what all seven
 * shipped papers do.
 */
export function isValidSubstrate(value: unknown): value is Substrate {
  if (!isPlainObject(value)) return false;
  const { id, name, type, description, options } = value;
  if (!isNonEmptyString(id) || !isNonEmptyString(name) || !isNonEmptyString(type)) return false;
  if (!isNonEmptyString(description)) return false;
  if (!Array.isArray(options) || options.length === 0) return false;
  return options.every(option => {
    if (!isPlainObject(option)) return false;
    return isFiniteNumber(option.grammage) && option.grammage > 0
      && isFiniteNumber(option.caliper) && option.caliper > 0;
  });
}

/**
 * The rules that make a cover's measurements consistent with what it is.
 *
 * A soft cover has no boards, so its squares, hinge, turn-in and board
 * thickness are exactly zero; a hard cover in this model has no flaps, and
 * those same four must be positive. They are not style: the cover engine
 * reads them straight, so a hard cover with a board thickness of zero reports
 * boards with no thickness and a template nobody can cut.
 *
 * Written here rather than only in `validateCatalog` because a cover a print
 * shop adds has to satisfy exactly what a shipped one does, and the two would
 * otherwise drift.
 */
export function coverMeasurementsMatchKind(cover: Cover): boolean {
  const boardParts = [cover.squares_mm, cover.hingeGap_mm, cover.turnIn_mm, cover.boardThickness_mm];
  if (cover.kind === 'blanda') return boardParts.every(part => part === 0);
  return boardParts.every(part => part > 0) && cover.flapWidth_mm === 0;
}

export function isValidCover(value: unknown): value is Cover {
  if (!isPlainObject(value)) return false;
  const {
    id, name, kind, substrateId, grammage, flapWidth_mm, squares_mm, hingeGap_mm, turnIn_mm, boardThickness_mm,
  } = value;
  if (!isNonEmptyString(id) || !isNonEmptyString(name)) return false;
  if (kind !== 'blanda' && kind !== 'dura') return false;
  if (!isNonEmptyString(substrateId)) return false;
  if (!isFiniteNumber(grammage) || grammage <= 0) return false;
  for (const measurement of [flapWidth_mm, squares_mm, hingeGap_mm, turnIn_mm, boardThickness_mm]) {
    if (!isFiniteNumber(measurement) || measurement < 0) return false;
  }
  return coverMeasurementsMatchKind(value as unknown as Cover);
}

const COVER_PATCH_KEYS = new Set([
  'name', 'kind', 'substrateId', 'grammage',
  'flapWidth_mm', 'squares_mm', 'hingeGap_mm', 'turnIn_mm', 'boardThickness_mm',
]);

/*
 * A patch is validated field by field and not against the kind rules: it
 * carries only what changed, so the squares of a cover turning soft arrive in
 * the same patch as its kind and the pair is only coherent once applied.
 * `patchCover` checks the applied result, which is where the rule belongs.
 */
function isValidCoverPatch(value: unknown): value is CoverPatch {
  if (!isPlainObject(value)) return false;
  const { id, changes } = value;
  if (!isNonEmptyString(id)) return false;
  if (!isPlainObject(changes) || !hasOnlyAllowedKeys(changes, COVER_PATCH_KEYS)) return false;

  if ('name' in changes && !isNonEmptyString(changes.name)) return false;
  if ('kind' in changes && changes.kind !== 'blanda' && changes.kind !== 'dura') return false;
  if ('substrateId' in changes && !isNonEmptyString(changes.substrateId)) return false;
  if ('grammage' in changes && (!isFiniteNumber(changes.grammage) || changes.grammage <= 0)) return false;
  for (const key of ['flapWidth_mm', 'squares_mm', 'hingeGap_mm', 'turnIn_mm', 'boardThickness_mm'] as const) {
    if (key in changes && (!isFiniteNumber(changes[key]) || (changes[key] as number) < 0)) return false;
  }
  return true;
}

const SUBSTRATE_PATCH_KEYS = new Set(['name', 'description']);

function isValidSubstratePatch(value: unknown): value is SubstratePatch {
  if (!isPlainObject(value)) return false;
  const { id, changes } = value;
  if (!isNonEmptyString(id)) return false;
  if (!isPlainObject(changes) || !hasOnlyAllowedKeys(changes, SUBSTRATE_PATCH_KEYS)) return false;

  if ('name' in changes && !isNonEmptyString(changes.name)) return false;
  if ('description' in changes && !isNonEmptyString(changes.description)) return false;
  return true;
}

const SHEET_SIZE_PATCH_KEYS = new Set(['name', 'width_mm', 'height_mm']);

function isValidSheetSizePatch(value: unknown): value is SheetSizePatch {
  if (!isPlainObject(value)) return false;
  const { id, changes } = value;
  if (!isNonEmptyString(id)) return false;
  if (!isPlainObject(changes) || !hasOnlyAllowedKeys(changes, SHEET_SIZE_PATCH_KEYS)) return false;

  if ('name' in changes && !isNonEmptyString(changes.name)) return false;
  if ('width_mm' in changes && (!isFiniteNumber(changes.width_mm) || changes.width_mm <= 0)) return false;
  if ('height_mm' in changes && (!isFiniteNumber(changes.height_mm) || changes.height_mm <= 0)) return false;
  return true;
}

const PRESS_PATCH_KEYS = new Set([
  'name', 'maxSheetWidth_mm', 'maxSheetHeight_mm', 'gripperMargin_mm', 'sideMargin_mm', 'tailMargin_mm', 'gutter_mm',
]);

function isValidPressPatch(value: unknown): value is PressPatch {
  if (!isPlainObject(value)) return false;
  const { id, changes } = value;
  if (!isNonEmptyString(id)) return false;
  if (!isPlainObject(changes) || !hasOnlyAllowedKeys(changes, PRESS_PATCH_KEYS)) return false;

  if ('name' in changes && !isNonEmptyString(changes.name)) return false;
  if ('maxSheetWidth_mm' in changes && (!isFiniteNumber(changes.maxSheetWidth_mm) || changes.maxSheetWidth_mm <= 0)) return false;
  if ('maxSheetHeight_mm' in changes && (!isFiniteNumber(changes.maxSheetHeight_mm) || changes.maxSheetHeight_mm <= 0)) return false;
  if ('gripperMargin_mm' in changes && (!isFiniteNumber(changes.gripperMargin_mm) || changes.gripperMargin_mm < 0)) return false;
  if ('sideMargin_mm' in changes && (!isFiniteNumber(changes.sideMargin_mm) || changes.sideMargin_mm < 0)) return false;
  if ('tailMargin_mm' in changes && (!isFiniteNumber(changes.tailMargin_mm) || changes.tailMargin_mm < 0)) return false;
  if ('gutter_mm' in changes && (!isFiniteNumber(changes.gutter_mm) || changes.gutter_mm < 0)) return false;
  return true;
}

const BINDING_PATCH_KEYS = new Set([
  'name', 'pageMultiple', 'minPages', 'maxPages', 'spineAllowance_mm', 'nests', 'requiresSignatureMultiple',
]);

function isValidBindingPatch(value: unknown): value is BindingPatch {
  if (!isPlainObject(value)) return false;
  const { id, changes } = value;
  if (!isNonEmptyString(id)) return false;
  if (!isPlainObject(changes) || !hasOnlyAllowedKeys(changes, BINDING_PATCH_KEYS)) return false;

  if ('name' in changes && !isNonEmptyString(changes.name)) return false;
  if ('pageMultiple' in changes
    && (!isPositiveSafeInteger(changes.pageMultiple) || (changes.pageMultiple as number) % 2 !== 0)) return false;
  if ('minPages' in changes && !isPositiveSafeInteger(changes.minPages)) return false;
  if ('maxPages' in changes
    && (!isPositiveSafeInteger(changes.maxPages) || (changes.maxPages as number) > MAX_BINDING_PAGES)) return false;
  if ('spineAllowance_mm' in changes
    && (!isFiniteNumber(changes.spineAllowance_mm) || changes.spineAllowance_mm < 0)) return false;
  if ('nests' in changes && typeof changes.nests !== 'boolean') return false;
  if ('requiresSignatureMultiple' in changes && typeof changes.requiresSignatureMultiple !== 'boolean') return false;
  return true;
}

function filterValid<T>(raw: unknown, isValid: (value: unknown) => value is T): T[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isValid);
}

/** The shape every v1 or v2 payload shares: the five "alta" lists, validated entry by entry. */
function readAltaLists(parsed: Record<string, unknown>) {
  return {
    customProportions: filterValid(parsed.customProportions, isValidProportion),
    customGrammages: filterValid(parsed.customGrammages, isValidCustomGrammageOption),
    customSubstrates: filterValid(parsed.customSubstrates, isValidSubstrate),
    customCovers: filterValid(parsed.customCovers, isValidCover),
    customSheetSizes: filterValid(parsed.customSheetSizes, isValidSheetSize),
    customPresses: filterValid(parsed.customPresses, isValidPress),
    customBindings: filterValid(parsed.customBindings, isValidBinding),
  };
}

/**
 * Read the persisted user layer, or an empty one if there isn't one, the
 * storage is unavailable, or the saved value is corrupt, hand-tampered, or
 * from an unsupported schema version. Never throws: a manipulated value or an
 * exhausted quota is treated the same as "nothing saved" rather than an error
 * that would break startup. A malformed entry inside an otherwise well-formed
 * catalog list is dropped individually so unrelated valid entries survive.
 *
 * A v1 payload (UX-5, before patches/hides existed) is migrated in place:
 * its five "alta" lists are kept as they were saved, and every patch/hide
 * list starts empty. Any other unrecognized version is discarded like a
 * corrupt payload.
 */
export function readUserLayer(storage: Storage | null = getDefaultUserLayerStorage()): UserLayer {
  if (!storage) return emptyUserLayer();

  let raw: string | null;
  try {
    raw = storage.getItem(USER_LAYER_STORAGE_KEY);
  } catch {
    return emptyUserLayer();
  }
  if (raw === null) return emptyUserLayer();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyUserLayer();
  }

  if (!isPlainObject(parsed)) return emptyUserLayer();

  if (parsed.version === 1) {
    return {
      ...readAltaLists(parsed),
      proportionPatches: [],
      substratePatches: [],
      coverPatches: [],
      sheetSizePatches: [],
      pressPatches: [],
      bindingPatches: [],
      hiddenProportionLabels: [],
      hiddenSubstrateIds: [],
      hiddenCoverIds: [],
      hiddenSheetSizeIds: [],
      hiddenPressIds: [],
      hiddenBindingIds: [],
    };
  }

  if (parsed.version !== USER_LAYER_SCHEMA_VERSION) {
    return emptyUserLayer();
  }

  return {
    ...readAltaLists(parsed),
    proportionPatches: filterValid(parsed.proportionPatches, isValidProportionPatch),
    substratePatches: filterValid(parsed.substratePatches, isValidSubstratePatch),
    coverPatches: filterValid(parsed.coverPatches, isValidCoverPatch),
    sheetSizePatches: filterValid(parsed.sheetSizePatches, isValidSheetSizePatch),
    pressPatches: filterValid(parsed.pressPatches, isValidPressPatch),
    bindingPatches: filterValid(parsed.bindingPatches, isValidBindingPatch),
    hiddenProportionLabels: filterValid(parsed.hiddenProportionLabels, isNonEmptyString),
    hiddenSubstrateIds: filterValid(parsed.hiddenSubstrateIds, isNonEmptyString),
    hiddenCoverIds: filterValid(parsed.hiddenCoverIds, isNonEmptyString),
    hiddenSheetSizeIds: filterValid(parsed.hiddenSheetSizeIds, isNonEmptyString),
    hiddenPressIds: filterValid(parsed.hiddenPressIds, isNonEmptyString),
    hiddenBindingIds: filterValid(parsed.hiddenBindingIds, isNonEmptyString),
  };
}

/**
 * Persist the user layer, returning whether it actually got saved. Never
 * throws: a full quota or an unavailable storage is reported as `false` so
 * the caller can keep the just-added entry in memory and warn the user,
 * instead of losing it.
 */
export function writeUserLayer(layer: UserLayer, storage: Storage | null = getDefaultUserLayerStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(USER_LAYER_STORAGE_KEY, JSON.stringify({ version: USER_LAYER_SCHEMA_VERSION, ...layer }));
    return true;
  } catch {
    return false;
  }
}
