import type { Binding, CustomGrammageOption, Press, Proportion, SheetSize, UserLayer } from '../types';
import { MAX_BINDING_PAGES } from './validateCatalog';

/**
 * Schema version of the persisted user layer, stored alongside the data so a
 * later increment (UX-6's patches/hides, UX-8's import/export) can migrate an
 * older shape instead of guessing which format it found. A payload with any
 * other version is treated as absent rather than partially trusted.
 */
export const USER_LAYER_SCHEMA_VERSION = 1;

/** Exported so tests can seed or inspect the exact key this module reads and writes. */
export const USER_LAYER_STORAGE_KEY = 'pliegostack:userLayer';
const PROBE_KEY = `${USER_LAYER_STORAGE_KEY}:probe`;

export function emptyUserLayer(): UserLayer {
  return {
    customProportions: [],
    customGrammages: [],
    customSheetSizes: [],
    customPresses: [],
    customBindings: [],
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

function isValidProportion(value: unknown): value is Proportion {
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

function isValidSheetSize(value: unknown): value is SheetSize {
  if (!isPlainObject(value)) return false;
  const { id, name, width_mm, height_mm } = value;
  return isNonEmptyString(id) && isNonEmptyString(name)
    && isFiniteNumber(width_mm) && width_mm > 0
    && isFiniteNumber(height_mm) && height_mm > 0;
}

function isValidPress(value: unknown): value is Press {
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

function isValidBinding(value: unknown): value is Binding {
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

function filterValid<T>(raw: unknown, isValid: (value: unknown) => value is T): T[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isValid);
}

/**
 * Read the persisted user layer, or an empty one if there isn't one, the
 * storage is unavailable, or the saved value is corrupt, hand-tampered, or
 * from an unsupported schema version. Never throws: a manipulated value or an
 * exhausted quota is treated the same as "nothing saved" rather than an error
 * that would break startup. A malformed entry inside an otherwise well-formed
 * catalog list is dropped individually so unrelated valid entries survive.
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

  if (!isPlainObject(parsed) || parsed.version !== USER_LAYER_SCHEMA_VERSION) {
    return emptyUserLayer();
  }

  return {
    customProportions: filterValid(parsed.customProportions, isValidProportion),
    customGrammages: filterValid(parsed.customGrammages, isValidCustomGrammageOption),
    customSheetSizes: filterValid(parsed.customSheetSizes, isValidSheetSize),
    customPresses: filterValid(parsed.customPresses, isValidPress),
    customBindings: filterValid(parsed.customBindings, isValidBinding),
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
