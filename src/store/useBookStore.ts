import { create } from 'zustand';
import type {
  Binding,
  BindingPatch,
  BindingSpineResult,
  BookConfig,
  BookFormat,
  BookStore,
  Catalog,
  CoverPlanResult,
  CustomGrammageOption,
  GrammageOption,
  HardCoverResult,
  ImpositionResult,
  OrphanedUserLayerEntry,
  Press,
  PressPatch,
  Proportion,
  ProportionPatch,
  SheetSize,
  SheetSizePatch,
  SignaturePlanResult,
  SoftCoverResult,
  Cover,
  CoverPatch,
  SpineResult,
  Substrate,
  SubstratePatch,
  UserLayer,
} from '../types';
import { calculateImposition } from '../engine/imposition';
import { calculateSpineAndWeight } from '../engine/spine';
import { planSignatures } from '../engine/signatures';
import { creepCompensation, spineWithBinding, validatePageCount } from '../engine/binding';
import { planCover } from '../engine/cover';
import { MAX_BINDING_PAGES } from '../config/validateCatalog';
import {
  emptyUserLayer,
  getDefaultUserLayerStorage,
  isUserLayerStorageAvailable,
  isValidBinding,
  isValidPress,
  isValidProportion,
  isValidCover,
  isValidSheetSize,
  isValidSubstrate,
  writeUserLayer,
} from '../config/userLayer';

/**
 * Apply a catalog's patches to its factory entries (dropping any patch whose
 * target no longer exists among them — that patch is an orphan, handled
 * separately by `computeOrphanedUserLayerEntries`, not silently applied),
 * exclude hidden entries, and append the user's own additions ("altas").
 * Order matters, per UX-6 (`docs/UX-REVIEW.md` §3.2-3.3): patch, then hide,
 * then add — an alta can never be hidden or patched, and a hide always wins
 * over a patch on the same factory entry.
 */
function mergeCatalogWithPatches<Entry, Patch extends { changes: Partial<Entry> }>(
  factoryEntries: Entry[],
  getKey: (entry: Entry) => string,
  patches: Patch[],
  getPatchKey: (patch: Patch) => string,
  hiddenKeys: readonly string[],
  customEntries: Entry[]
): Entry[] {
  const patchByKey = new Map(patches.map(patch => [getPatchKey(patch), patch]));
  const hidden = new Set(hiddenKeys);

  const effective = factoryEntries
    .filter(entry => !hidden.has(getKey(entry)))
    .map(entry => {
      const patch = patchByKey.get(getKey(entry));
      return patch ? { ...entry, ...patch.changes } : entry;
    });

  return [...effective, ...customEntries];
}

/**
 * Get all sheet sizes (factory, patched and with hidden ones excluded, + custom).
 */
function getAllSheetSizes(
  catalog: Catalog,
  customSheetSizes: SheetSize[],
  sheetSizePatches: SheetSizePatch[],
  hiddenSheetSizeIds: readonly string[]
): SheetSize[] {
  return mergeCatalogWithPatches(
    catalog.sheetSizes, sheet => sheet.id,
    sheetSizePatches, patch => patch.id,
    hiddenSheetSizeIds,
    customSheetSizes
  );
}

/**
 * Get all grammage options for a substrate (catalog + custom). Grammages are
 * options nested per substrate rather than entries with their own id, so
 * UX-6's patch/hide model does not apply to them (see the `UserLayer` doc
 * comment in `src/types/index.ts`); this stays exactly as UX-5 left it.
 */
function getAllGrammageOptions(
  substrates: Substrate[],
  substrateId: string,
  customGrammages: CustomGrammageOption[]
): GrammageOption[] {
  const substrate = substrates.find(s => s.id === substrateId);
  const builtIn = substrate ? substrate.options : [];
  const custom = customGrammages.filter(option => option.substrateId === substrateId);
  return [...builtIn, ...custom];
}

/**
 * Get the caliper for a given substrate + grammage combination.
 */
function getCaliper(catalog: Catalog, state: BookConfig): number {
  // The effective catalog, not the factory one: a paper a print shop added
  // carries its own weights, and looking only at what shipped would report no
  // caliper for it and leave the spine, the weight and the creep unbuilt.
  const substrates = getAllSubstrates(
    catalog, state.customSubstrates, state.substratePatches, state.hiddenSubstrateIds
  );
  const options = getAllGrammageOptions(substrates, state.substrateId, state.customGrammages);
  return options.find(option => option.grammage === state.selectedGrammage)?.caliper ?? 0;
}

/**
 * Get sheet dimensions by ID.
 */
function getSheetDimensions(
  catalog: Catalog,
  sheetSizeId: string,
  customSheetSizes: SheetSize[],
  sheetSizePatches: SheetSizePatch[],
  hiddenSheetSizeIds: readonly string[]
) {
  const allSheets = getAllSheetSizes(catalog, customSheetSizes, sheetSizePatches, hiddenSheetSizeIds);
  const sheet = allSheets.find(s => s.id === sheetSizeId);
  return sheet ? { width: sheet.width_mm, height: sheet.height_mm } : { width: 0, height: 0 };
}

/**
 * Get all presses (factory, patched and with hidden ones excluded, + custom).
 */
/**
 * Every paper the tool offers: factory, with patches applied and hidden ones
 * dropped, plus the ones a print shop added.
 *
 * A paper of your own carries its own grammages; `customGrammages` only ever
 * attaches one to a paper that came from the catalog, which is why the two
 * lists are separate and not merged here.
 */
/**
 * A grammage the chosen paper actually sells: the preferred one when it has
 * it, its first otherwise. A paper with no weights cannot be selected — the
 * user layer refuses to hold one — so the fallback only fires for a factory
 * paper whose options the catalog validator already guarantees.
 */
function resolveGrammage(
  substrates: Substrate[],
  substrateId: string,
  customGrammages: CustomGrammageOption[],
  preferred: number
): number {
  const options = getAllGrammageOptions(substrates, substrateId, customGrammages);
  if (options.some(option => option.grammage === preferred)) return preferred;
  return options[0]?.grammage ?? preferred;
}

function getAllSubstrates(
  catalog: Catalog,
  customSubstrates: Substrate[],
  substratePatches: SubstratePatch[],
  hiddenSubstrateIds: readonly string[]
): Substrate[] {
  return mergeCatalogWithPatches(
    catalog.substrates, substrate => substrate.id,
    substratePatches, patch => patch.id,
    hiddenSubstrateIds,
    customSubstrates
  );
}

/** Every cover the tool offers: factory, patched, minus hidden, plus your own. */
/**
 * Whether the paper a cover names is one the tool has, in a weight that paper
 * sells. A cover carries its material by reference, so it is the one entry
 * that a change in another catalog can invalidate, and saying which of the
 * two is wrong is worth more than "datos inválidos".
 */
function coverMaterialProblem(state: BookConfig & { catalog: Catalog | null }, cover: Cover): string | null {
  if (!state.catalog) return null;
  const substrates = getAllSubstrates(
    state.catalog, state.customSubstrates, state.substratePatches, state.hiddenSubstrateIds
  );
  const paper = substrates.find(item => item.id === cover.substrateId);
  if (!paper) return 'La tapa tiene que estar hecha de un papel del catálogo; el que nombra no está.';

  const options = getAllGrammageOptions(substrates, cover.substrateId, state.customGrammages);
  if (!options.some(option => option.grammage === cover.grammage)) {
    return `El papel "${paper.name}" no se ofrece en ${cover.grammage} g/m². Elige uno de sus gramajes.`;
  }
  return null;
}

/** Which of the kind's rules a cover breaks, in the words the rule is written in. */
function coverShapeProblem(cover: Cover): string {
  if (cover.kind === 'blanda') {
    return 'Una tapa blanda no lleva cartón: la ceja, el canal de bisagra, el doblez de forro y el grosor de cartón tienen que ser exactamente 0.';
  }
  return 'Una tapa dura lleva cartón y no lleva solapas: la ceja, el canal, el doblez y el grosor tienen que ser mayores que cero, y el ancho de solapa exactamente 0.';
}

function getAllCovers(
  catalog: Catalog,
  customCovers: Cover[],
  coverPatches: CoverPatch[],
  hiddenCoverIds: readonly string[]
): Cover[] {
  return mergeCatalogWithPatches(
    catalog.covers, cover => cover.id,
    coverPatches, patch => patch.id,
    hiddenCoverIds,
    customCovers
  );
}

function getAllPresses(
  catalog: Catalog,
  customPresses: Press[],
  pressPatches: PressPatch[],
  hiddenPressIds: readonly string[]
): Press[] {
  return mergeCatalogWithPatches(
    catalog.presses, press => press.id,
    pressPatches, patch => patch.id,
    hiddenPressIds,
    customPresses
  );
}

/**
 * Get all bindings (factory, patched and with hidden ones excluded, + custom).
 */
function getAllBindings(
  catalog: Catalog,
  customBindings: Binding[],
  bindingPatches: BindingPatch[],
  hiddenBindingIds: readonly string[]
): Binding[] {
  return mergeCatalogWithPatches(
    catalog.bindings, binding => binding.id,
    bindingPatches, patch => patch.id,
    hiddenBindingIds,
    customBindings
  );
}

/**
 * Get all proportions (factory, patched and with hidden ones excluded, + custom).
 * Proportions have no id field: their label is their identity.
 */
function getAllProportions(
  catalog: Catalog,
  customProportions: Proportion[],
  proportionPatches: ProportionPatch[],
  hiddenProportionLabels: readonly string[]
): Proportion[] {
  return mergeCatalogWithPatches(
    catalog.proportions, proportion => proportion.label,
    proportionPatches, patch => patch.label,
    hiddenProportionLabels,
    customProportions
  );
}

/**
 * Get a press by ID (catalog + custom).
 */
function getPress(
  catalog: Catalog,
  pressId: string,
  customPresses: Press[],
  pressPatches: PressPatch[],
  hiddenPressIds: readonly string[]
): Press | undefined {
  return getAllPresses(catalog, customPresses, pressPatches, hiddenPressIds).find(p => p.id === pressId);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error desconocido';
}

/** Non-empty integer within JS's safely representable range, and strictly positive. */
function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

/** Case- and surrounding-whitespace-insensitive equality, for duplicate checks on user-typed names/labels. */
function namesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * The checks that are the same for editing any entry of your own, in one
 * place: the result has to be a valid entry of its kind, and its name has to
 * stay distinct from every other entry the dropdown will show — itself
 * excepted, or renaming nothing would collide with the entry being renamed.
 *
 * Written once rather than four times because the four adders and the four
 * patchers already drifted: every `addCustomX` refuses a duplicate name and
 * no `patchX` does, so a factory entry can still be renamed onto another and
 * leave two rows reading the same.
 *
 * `keyOf` rather than `id` because a proportion is keyed by its label, which
 * is also the name being checked and the thing a rename changes.
 */
function editedOwnEntries<Entry>(
  own: Entry[],
  effective: Entry[],
  key: string,
  keyOf: (entry: Entry) => string,
  nameOf: (entry: Entry) => string,
  candidate: Entry,
  isValid: (value: unknown) => value is Entry,
  messages: { invalid: string; duplicate: (name: string) => string }
): { entries: Entry[] } | { error: string } {
  if (!isValid(candidate)) return { error: messages.invalid };

  const name = nameOf(candidate);
  const collides = effective.some(entry => keyOf(entry) !== key && namesMatch(nameOf(entry), name));
  if (collides) return { error: messages.duplicate(name.trim()) };

  return { entries: own.map(entry => (keyOf(entry) === key ? candidate : entry)) };
}

/**
 * Merge a persisted user layer into a freshly loaded catalog for `initialize`.
 * Only `customGrammages` references another catalog by id (`substrateId`):
 * an entry whose substrate no longer exists is dropped instead of breaking
 * startup, since that isn't a patch or a hide to begin with. The five "alta"
 * catalogs and the eight UX-6 patch/hide lists are otherwise self-contained
 * records, so they pass through unfiltered — a patch or hide whose target no
 * longer exists in `catalog` is kept exactly as read (see
 * `computeOrphanedUserLayerEntries`) rather than dropped here.
 */
function mergeUserLayer(catalog: Catalog, userLayer: UserLayer): Omit<UserLayer, 'customGrammages'> & Pick<UserLayer, 'customGrammages'> {
  // A paper of your own counts as known: dropping grammages attached to it
  // would empty the papers a print shop added the moment they reloaded.
  const knownSubstrateIds = new Set([
    ...catalog.substrates.map(s => s.id),
    ...userLayer.customSubstrates.map(s => s.id),
  ]);
  return {
    ...userLayer,
    customGrammages: userLayer.customGrammages.filter(option => knownSubstrateIds.has(option.substrateId)),
    // A cover names the paper it is made of, so one whose paper is gone has
    // no material and no weight: it is dropped for the same reason a grammage
    // attached to a missing paper is, rather than kept as an orphan nothing
    // could compute with.
    customCovers: userLayer.customCovers.filter(cover => knownSubstrateIds.has(cover.substrateId)),
  };
}

/** Extract the persistable user layer (the thirteen fields UX-5/UX-6 own) from the current book config. */
function extractUserLayer(state: BookConfig): UserLayer {
  return {
    customProportions: state.customProportions,
    customGrammages: state.customGrammages,
    customSubstrates: state.customSubstrates,
    customCovers: state.customCovers,
    customSheetSizes: state.customSheetSizes,
    customPresses: state.customPresses,
    customBindings: state.customBindings,
    proportionPatches: state.proportionPatches,
    substratePatches: state.substratePatches,
    coverPatches: state.coverPatches,
    sheetSizePatches: state.sheetSizePatches,
    pressPatches: state.pressPatches,
    bindingPatches: state.bindingPatches,
    hiddenProportionLabels: state.hiddenProportionLabels,
    hiddenSubstrateIds: state.hiddenSubstrateIds,
    hiddenCoverIds: state.hiddenCoverIds,
    hiddenSheetSizeIds: state.hiddenSheetSizeIds,
    hiddenPressIds: state.hiddenPressIds,
    hiddenBindingIds: state.hiddenBindingIds,
  };
}

/**
 * Find every patch or hide in the user layer that targets a factory id (or,
 * for proportions, a label) no longer present in the loaded catalog. An
 * orphan is never dropped here — it stays in the persisted layer exactly as
 * read — this only reports it so the interface can warn about it once
 * (docs/UX-REVIEW.md §3.3): "un huérfano no se aplica pero tampoco se borra".
 */
function computeOrphanedUserLayerEntries(catalog: Catalog, userLayer: UserLayer): OrphanedUserLayerEntry[] {
  const knownProportionLabels = new Set(catalog.proportions.map(p => p.label));
  const knownSubstrateIds = new Set(catalog.substrates.map(s => s.id));
  const knownCoverIds = new Set(catalog.covers.map(c => c.id));
  const knownSheetSizeIds = new Set(catalog.sheetSizes.map(s => s.id));
  const knownPressIds = new Set(catalog.presses.map(p => p.id));
  const knownBindingIds = new Set(catalog.bindings.map(b => b.id));

  const orphans: OrphanedUserLayerEntry[] = [];
  for (const patch of userLayer.proportionPatches) {
    if (!knownProportionLabels.has(patch.label)) orphans.push({ kind: 'proportionPatch', targetId: patch.label });
  }
  for (const patch of userLayer.substratePatches) {
    if (!knownSubstrateIds.has(patch.id)) orphans.push({ kind: 'substratePatch', targetId: patch.id });
  }
  for (const patch of userLayer.coverPatches) {
    if (!knownCoverIds.has(patch.id)) orphans.push({ kind: 'coverPatch', targetId: patch.id });
  }
  for (const patch of userLayer.sheetSizePatches) {
    if (!knownSheetSizeIds.has(patch.id)) orphans.push({ kind: 'sheetSizePatch', targetId: patch.id });
  }
  for (const patch of userLayer.pressPatches) {
    if (!knownPressIds.has(patch.id)) orphans.push({ kind: 'pressPatch', targetId: patch.id });
  }
  for (const patch of userLayer.bindingPatches) {
    if (!knownBindingIds.has(patch.id)) orphans.push({ kind: 'bindingPatch', targetId: patch.id });
  }
  for (const label of userLayer.hiddenProportionLabels) {
    if (!knownProportionLabels.has(label)) orphans.push({ kind: 'hiddenProportion', targetId: label });
  }
  for (const id of userLayer.hiddenSubstrateIds) {
    if (!knownSubstrateIds.has(id)) orphans.push({ kind: 'hiddenSubstrate', targetId: id });
  }
  for (const id of userLayer.hiddenCoverIds) {
    if (!knownCoverIds.has(id)) orphans.push({ kind: 'hiddenCover', targetId: id });
  }
  for (const id of userLayer.hiddenSheetSizeIds) {
    if (!knownSheetSizeIds.has(id)) orphans.push({ kind: 'hiddenSheetSize', targetId: id });
  }
  for (const id of userLayer.hiddenPressIds) {
    if (!knownPressIds.has(id)) orphans.push({ kind: 'hiddenPress', targetId: id });
  }
  for (const id of userLayer.hiddenBindingIds) {
    if (!knownBindingIds.has(id)) orphans.push({ kind: 'hiddenBinding', targetId: id });
  }
  return orphans;
}

/**
 * Persist the user layer found in `mergedState` (the state a `set` updater is
 * about to return, not the state before it) and report whether the write
 * succeeded, so the caller can fold `userLayerWriteFailed` into that very
 * same update. On failure the caller keeps whatever it just added in memory
 * regardless: this function only reports the outcome, it never undoes a change.
 */
function persistUserLayer(storage: Storage | null, mergedState: BookConfig): { userLayerWriteFailed: boolean } {
  return { userLayerWriteFailed: !writeUserLayer(extractUserLayer(mergedState), storage) };
}

/**
 * Fold a custom-catalog action's patch together with the outcome of
 * persisting it and a fresh orphan check, so every caller returns a single
 * object from its `set` updater. `state` is the state the patch is about to
 * be applied on top of, not the state after it.
 */
function withPersistedCatalogPatch(
  storage: Storage | null,
  catalog: Catalog,
  state: BookConfig,
  patch: Partial<BookStore>
): Partial<BookStore> {
  const mergedState: BookConfig = { ...state, ...patch };
  return {
    ...patch,
    ...persistUserLayer(storage, mergedState),
    orphanedUserLayerEntries: computeOrphanedUserLayerEntries(catalog, extractUserLayer(mergedState)),
  };
}

type CalculationResults = Pick<
  BookStore,
  | 'impositionResult' | 'impositionError'
  | 'signaturePlan' | 'signatureError'
  | 'spineResult' | 'spineError'
  | 'bindingPageCount' | 'bindingSpine' | 'bindingCreep' | 'bindingError'
  | 'coverPlan' | 'coverError'
>;

/**
 * Compute the signature imposition plan. When `foldingSchemeId` is `null`, the
 * automatic (least-waste) selection from `planSignatures` is used as-is. When
 * it names a specific scheme, that scheme's option is selected if it fits;
 * if it doesn't fit or doesn't exist, the previous `selected` option (from
 * `previousPlan`) is kept instead of silently switching schemes, while
 * `options` still reflects the current inputs and `signatureError` explains why.
 */
function calculateSignaturePlan(
  state: BookConfig,
  catalog: Catalog,
  previousPlan: SignaturePlanResult | null
): { signaturePlan: SignaturePlanResult | null; signatureError: string | null } {
  try {
    const press = getPress(catalog, state.pressId, state.customPresses, state.pressPatches, state.hiddenPressIds);
    if (!press) {
      throw new RangeError(`La prensa "${state.pressId}" no existe en la configuración`);
    }

    const sheet = getSheetDimensions(
      catalog, state.sheetSizeId, state.customSheetSizes, state.sheetSizePatches, state.hiddenSheetSizeIds
    );

    const basePlan = planSignatures({
      pageWidth_mm: state.pageWidth_mm,
      pageHeight_mm: state.pageHeight_mm,
      bleed_mm: state.bleed_mm,
      sheetWidth_mm: sheet.width,
      sheetHeight_mm: sheet.height,
      press,
      schemes: catalog.foldingSchemes,
      totalPages: state.totalPages,
    });

    if (!state.foldingSchemeId) {
      return { signaturePlan: basePlan, signatureError: null };
    }

    const chosen = basePlan.options.find(option => option.scheme.id === state.foldingSchemeId);
    if (chosen) {
      return {
        signaturePlan: { options: basePlan.options, selected: chosen, reason: null },
        signatureError: null,
      };
    }

    const schemeExists = catalog.foldingSchemes.some(scheme => scheme.id === state.foldingSchemeId);
    const signatureError = schemeExists
      ? `El esquema de plegado "${state.foldingSchemeId}" no cabe en el pliego con los márgenes actuales de la prensa.`
      : `El esquema de plegado "${state.foldingSchemeId}" no existe en la configuración.`;

    return {
      signaturePlan: {
        options: basePlan.options,
        selected: previousPlan?.selected ?? null,
        reason: basePlan.reason,
      },
      signatureError,
    };
  } catch (error) {
    return {
      signaturePlan: null,
      signatureError: `No se pudo calcular la imposición por firmas: ${getErrorMessage(error)}. Corrige la prensa, el pliego, el sangrado o las páginas.`,
    };
  }
}

type BindingResults = Pick<
  CalculationResults,
  'bindingPageCount' | 'bindingSpine' | 'bindingCreep' | 'bindingError'
>;

/**
 * Evaluate the selected binding method against the freshly computed interior
 * spine and signature plan of this same calculation pass, never against
 * stale previous results.
 *
 * `validatePageCount` returning `{ ok: false, ... }` for a page count that
 * doesn't fit the method is a normal, displayable result, not an exception.
 * The three engine calls are wrapped independently, not in one shared
 * try/catch: a nesting method's page count that isn't a multiple of 4 makes
 * `creepCompensation` throw even though `validatePageCount` already reports
 * that very problem as a normal `not-multiple` result, and a shared catch
 * would wipe out that already-valid result and mislabel a displayable
 * mismatch as an error. Creep failures are therefore absorbed as "nothing to
 * show" (`null`) rather than surfaced in `bindingError`: either the page
 * count mismatch is already explained by `bindingPageCount`, or the caliper
 * is unavailable because the interior spine itself failed, which the spine
 * branch below already reports.
 */
function calculateBindingResults(
  state: BookConfig,
  catalog: Catalog,
  spineResult: SpineResult | null,
  pagesPerSignature: number | null
): BindingResults {
  const binding = getAllBindings(catalog, state.customBindings, state.bindingPatches, state.hiddenBindingIds)
    .find(b => b.id === state.bindingId);
  if (!binding) {
    return {
      bindingPageCount: null,
      bindingSpine: null,
      bindingCreep: null,
      bindingError: `No se pudo calcular la encuadernación: la encuadernación "${state.bindingId}" no existe en la configuración.`,
    };
  }

  let bindingPageCount: BindingResults['bindingPageCount'] = null;
  let bindingError: string | null = null;
  try {
    bindingPageCount = validatePageCount(binding, state.totalPages, pagesPerSignature);
  } catch (error) {
    bindingError = `No se pudo validar el número de páginas para la encuadernación: ${getErrorMessage(error)}.`;
  }

  let bindingSpine: BindingResults['bindingSpine'] = null;
  try {
    if (!spineResult) {
      throw new RangeError('No hay un lomo de papel interior calculado para sumarle la encuadernación');
    }
    bindingSpine = spineWithBinding(spineResult.thickness_mm, binding);
  } catch (error) {
    bindingError = bindingError ?? `No se pudo calcular el lomo con encuadernación: ${getErrorMessage(error)}.`;
  }

  let bindingCreep: BindingResults['bindingCreep'] = null;
  try {
    const caliper = getCaliper(catalog, state);
    bindingCreep = creepCompensation(binding, state.totalPages, caliper);
  } catch {
    bindingCreep = null;
  }

  return { bindingPageCount, bindingSpine, bindingCreep, bindingError };
}

type CoverResults = Pick<CalculationResults, 'coverPlan' | 'coverError'>;

/**
 * Compute the cover geometry and weight from this same calculation pass'
 * freshly computed binding spine, never a stale previous one.
 *
 * `planCover` returning `{ ok: false, reason, message }` for a hard cover
 * paired with a binding that has no flat spine is a normal, displayable
 * result (the same precedent as `validatePageCount`), not an exception: it
 * is returned as `coverPlan` with `coverError` left `null`. The try/catch
 * here only guards genuine input problems (a missing cover/binding id, a
 * spine that failed to compute, or a `planCover` validation failure).
 */
function calculateCoverResult(
  state: BookConfig,
  catalog: Catalog,
  bindingSpine: BindingSpineResult | null
): CoverResults {
  try {
    const cover = getAllCovers(catalog, state.customCovers, state.coverPatches, state.hiddenCoverIds)
      .find(c => c.id === state.coverId);
    if (!cover) {
      throw new RangeError(`La tapa "${state.coverId}" no existe en la configuración`);
    }

    const binding = getAllBindings(catalog, state.customBindings, state.bindingPatches, state.hiddenBindingIds)
      .find(b => b.id === state.bindingId);
    if (!binding) {
      throw new RangeError(`La encuadernación "${state.bindingId}" no existe en la configuración`);
    }

    if (!bindingSpine) {
      throw new RangeError('No hay un lomo final calculado para dimensionar la tapa');
    }

    const coverPlan = planCover({
      pageWidth_mm: state.pageWidth_mm,
      pageHeight_mm: state.pageHeight_mm,
      bleed_mm: state.bleed_mm,
      spineTotal_mm: bindingSpine.total_mm,
      bindingHasFlatSpine: !binding.nests,
      cover,
    });

    return { coverPlan, coverError: null };
  } catch (error) {
    return {
      coverPlan: null,
      coverError: `No se pudo calcular la tapa: ${getErrorMessage(error)}. Corrige dimensiones, sangrado, encuadernación o tapa.`,
    };
  }
}

function calculateResults(state: BookStore, catalog: Catalog): CalculationResults {
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

    const sheet = getSheetDimensions(
      catalog, state.sheetSizeId, state.customSheetSizes, state.sheetSizePatches, state.hiddenSheetSizeIds
    );

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
    const caliper = getCaliper(catalog, state);
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

  const { signaturePlan, signatureError } = calculateSignaturePlan(state, catalog, state.signaturePlan);

  const pagesPerSignature = signaturePlan?.selected?.scheme.pagesPerSignature ?? null;
  const { bindingPageCount, bindingSpine, bindingCreep, bindingError } = calculateBindingResults(
    state,
    catalog,
    spineResult,
    pagesPerSignature
  );

  const { coverPlan, coverError } = calculateCoverResult(state, catalog, bindingSpine);

  return {
    impositionResult, impositionError,
    signaturePlan, signatureError,
    spineResult, spineError,
    bindingPageCount, bindingSpine, bindingCreep, bindingError,
    coverPlan, coverError,
  };
}

export function parsePositiveSafeInteger(rawValue: string): number | null {
  if (!/^\d+$/.test(rawValue)) {
    return null;
  }

  const parsedValue = Number(rawValue);
  return Number.isSafeInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

/**
 * The spine panel and its results component both need to know whether the
 * calculated spine is safe to display: valid page-count text and a
 * positive, finite thickness and weight. A single pure function keeps that
 * definition in one place instead of two copies drifting apart.
 */
export function getSafeSpineResult(
  totalPagesInput: string,
  spineResult: SpineResult | null
): SpineResult | null {
  if (parsePositiveSafeInteger(totalPagesInput) === null || !spineResult) {
    return null;
  }
  if (!Number.isFinite(spineResult.thickness_mm) || spineResult.thickness_mm <= 0) {
    return null;
  }
  if (!Number.isFinite(spineResult.totalWeight_g) || spineResult.totalWeight_g <= 0) {
    return null;
  }
  return spineResult;
}

/**
 * The cover panel's preview and its results component both need the same
 * successful cover plan, narrowed out of the `ok`/`ok: false` union. A
 * single pure function keeps that narrowing in one place instead of two
 * copies drifting apart.
 */
export function getPlannedCover(coverPlan: CoverPlanResult | null): SoftCoverResult | HardCoverResult | null {
  return coverPlan?.ok ? coverPlan.cover : null;
}

/**
 * The binding panel and its spine results component both need the selected
 * binding (the panel, for its edit form; the results, only for its label)
 * and whether it has a flat spine, derived from that same binding not
 * nesting its folded sheets. A single pure function keeps that lookup and
 * derivation in one place instead of two copies drifting apart.
 */
export function getSelectedBindingInfo(
  allBindings: Binding[],
  bindingId: string
): { selectedBinding: Binding | null; hasFlatSpine: boolean } {
  const selectedBinding = allBindings.find(binding => binding.id === bindingId) ?? null;
  return { selectedBinding, hasFlatSpine: selectedBinding ? !selectedBinding.nests : true };
}

function withUpdatedCalculations(
  state: BookStore,
  catalog: Catalog,
  inputPatch: Partial<BookConfig>
): Partial<BookStore> {
  return {
    ...inputPatch,
    ...calculateResults({ ...state, ...inputPatch }, catalog),
  };
}

/**
 * Calculate page dimensions from a proportion and base dimension.
 */
function dimensionsFromProportion(
  proportions: Proportion[],
  proportionId: string,
  format: BookFormat,
  baseWidth: number
): { width: number; height: number } {
  const prop = proportions.find(p => p.label === proportionId);
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

/**
 * Resolve a selected id against its effective catalog: keep it if it is
 * still visible there, otherwise fall back to the first visible entry —
 * the same least-destructive criterion hideX/removeCustomX already apply
 * when the entry they act on happens to be the current selection.
 */
function resolveVisibleId<T extends { id: string }>(effective: T[], selectedId: string): string {
  return effective.some(item => item.id === selectedId) ? selectedId : (effective[0]?.id ?? selectedId);
}

let customSheetCounter = 0;
let customPressCounter = 0;
let customSubstrateCounter = 0;
let customCoverCounter = 0;
let customBindingCounter = 0;

/**
 * Build a book store bound to the given storage for the user layer.
 * `storage` defaults to the real browser storage, resolved once here (not
 * re-resolved on every write), so tests can inject one that fails without
 * touching `window.localStorage`.
 */
export function createBookStore(storage: Storage | null = getDefaultUserLayerStorage()) {
  return create<BookStore>((set, get) => ({
  // Runtime configuration catalog
  catalog: null,

  // Canvas Designer
  format: 'vertical',
  proportionId: null,
  customProportions: [],
  proportionPatches: [],
  hiddenProportionLabels: [],
  pageWidth_mm: 0,
  pageHeight_mm: 0,
  bleed_mm: 0,
  unitSystem: 'metric',
  pageOrientation: 'auto',

  // Substrate
  substrateId: '',
  selectedGrammage: 0,
  customGrammages: [],
  customSubstrates: [],
  substratePatches: [],
  hiddenSubstrateIds: [],
  customCovers: [],
  coverPatches: [],
  hiddenCoverIds: [],

  // Imposition
  sheetSizeId: '',
  customSheetSizes: [],
  sheetSizePatches: [],
  hiddenSheetSizeIds: [],

  // Signature imposition
  pressId: '',
  customPresses: [],
  pressPatches: [],
  hiddenPressIds: [],
  foldingSchemeId: null,

  // Spine
  totalPages: 0,
  totalPagesInput: '0',

  // Binding
  bindingId: '',
  customBindings: [],
  bindingPatches: [],
  hiddenBindingIds: [],

  // Cover
  coverId: '',

  // Computed
  impositionResult: null,
  impositionError: null,
  signaturePlan: null,
  signatureError: null,
  spineResult: null,
  spineError: null,
  bindingPageCount: null,
  bindingSpine: null,
  bindingCreep: null,
  bindingError: null,
  coverPlan: null,
  coverError: null,
  customGrammageError: null,
  customSubstrateError: null,
  customCoverError: null,
  customSheetSizeError: null,
  customPressError: null,
  customBindingError: null,
  customProportionError: null,

  // User layer persistence
  userLayerStorageAvailable: isUserLayerStorageAvailable(storage),
  userLayerWriteFailed: false,
  orphanedUserLayerEntries: [],

  // ─── Actions ─────────────────────────────────────────────────────

  initialize: (catalog, userLayer = emptyUserLayer()) => {
    set(state => {
      const { defaults } = catalog;
      const merged = mergeUserLayer(catalog, userLayer);

      // Resolve every default selection against its effective catalog, not
      // the raw factory one: a default the user hid must not come back
      // selected after a reload just because it is still factory's default.
      const effectiveProportions = getAllProportions(
        catalog, merged.customProportions, merged.proportionPatches, merged.hiddenProportionLabels
      );
      const effectiveSubstrates = getAllSubstrates(
        catalog, merged.customSubstrates, merged.substratePatches, merged.hiddenSubstrateIds
      );
      const effectiveCovers = getAllCovers(
        catalog, merged.customCovers, merged.coverPatches, merged.hiddenCoverIds
      );
      const effectiveSheetSizes = getAllSheetSizes(
        catalog, merged.customSheetSizes, merged.sheetSizePatches, merged.hiddenSheetSizeIds
      );
      const effectivePresses = getAllPresses(
        catalog, merged.customPresses, merged.pressPatches, merged.hiddenPressIds
      );
      const effectiveBindings = getAllBindings(
        catalog, merged.customBindings, merged.bindingPatches, merged.hiddenBindingIds
      );

      const resolvedProportionId = effectiveProportions.some(p => p.label === defaults.proportionId)
        ? defaults.proportionId
        : (effectiveProportions[0]?.label ?? null);
      // Every proportion hidden: there is no visible entry to fall back to,
      // so land on Manual with a square base, the same result
      // dimensionsFromProportion already returns when a label isn't found.
      const dimensions = resolvedProportionId
        ? dimensionsFromProportion(effectiveProportions, resolvedProportionId, state.format, defaults.pageWidth_mm)
        : { width: defaults.pageWidth_mm, height: defaults.pageWidth_mm };

      const totalPages = defaults.totalPages;
      const inputPatch: Partial<BookConfig> = {
        proportionId: resolvedProportionId,
        pageWidth_mm: dimensions.width,
        pageHeight_mm: dimensions.height,
        bleed_mm: defaults.bleed_mm,
        substrateId: resolveVisibleId(effectiveSubstrates, defaults.substrateId),
        // The grammage has to follow the paper: the default weight belongs to
        // the default paper, and landing on another one because that paper was
        // hidden would select a weight it does not sell.
        selectedGrammage: resolveGrammage(
          effectiveSubstrates,
          resolveVisibleId(effectiveSubstrates, defaults.substrateId),
          merged.customGrammages,
          defaults.grammage
        ),
        sheetSizeId: resolveVisibleId(effectiveSheetSizes, defaults.sheetSizeId),
        pressId: resolveVisibleId(effectivePresses, defaults.pressId),
        foldingSchemeId: null,
        totalPages,
        bindingId: resolveVisibleId(effectiveBindings, defaults.bindingId),
        coverId: resolveVisibleId(effectiveCovers, defaults.coverId),
        ...merged,
      };

      return {
        catalog,
        orphanedUserLayerEntries: computeOrphanedUserLayerEntries(catalog, userLayer),
        ...withUpdatedCalculations(state, catalog, inputPatch),
        totalPagesInput: String(totalPages),
      };
    });
  },

  setFormat: (format) => {
    set(state => {
      if (!state.catalog) return state;

      if (!state.proportionId) {
        return withUpdatedCalculations(state, state.catalog, { format });
      }

      const dimensions = dimensionsFromProportion(
        getAllProportions(state.catalog, state.customProportions, state.proportionPatches, state.hiddenProportionLabels),
        state.proportionId,
        format,
        state.pageWidth_mm
      );
      return withUpdatedCalculations(state, state.catalog, {
        format,
        pageWidth_mm: dimensions.width,
        pageHeight_mm: dimensions.height,
      });
    });
  },

  setProportion: (proportionId) => {
    set(state => {
      if (!state.catalog) return state;

      if (!proportionId) {
        return withUpdatedCalculations(state, state.catalog, { proportionId });
      }

      const dimensions = dimensionsFromProportion(
        getAllProportions(state.catalog, state.customProportions, state.proportionPatches, state.hiddenProportionLabels),
        proportionId,
        state.format,
        state.pageWidth_mm
      );
      return withUpdatedCalculations(state, state.catalog, {
        proportionId,
        pageWidth_mm: dimensions.width,
        pageHeight_mm: dimensions.height,
      });
    });
  },

  setPageDimensions: (width_mm, height_mm) => {
    set(state => {
      if (!state.catalog) return state;
      return withUpdatedCalculations(state, state.catalog, {
        pageWidth_mm: width_mm,
        pageHeight_mm: height_mm,
        proportionId: null,
      });
    });
  },

  setBleed: (bleed_mm) => {
    set(state => {
      if (!state.catalog) return state;
      return withUpdatedCalculations(state, state.catalog, { bleed_mm });
    });
  },

  setUnitSystem: (unitSystem) => {
    set(state => (state.catalog ? { unitSystem } : state));
  },

  setPageOrientation: (pageOrientation) => {
    set(state => {
      if (!state.catalog) return state;
      return withUpdatedCalculations(state, state.catalog, { pageOrientation });
    });
  },

  setSubstrate: (substrateId) => {
    set(state => {
      if (!state.catalog) return state;

      const substrates = getAllSubstrates(
        state.catalog, state.customSubstrates, state.substratePatches, state.hiddenSubstrateIds
      );
      const options = getAllGrammageOptions(substrates, substrateId, state.customGrammages);
      const inputPatch: Partial<BookConfig> = options.length > 0
        ? { substrateId, selectedGrammage: options[0].grammage }
        : { substrateId };

      return {
        ...withUpdatedCalculations(state, state.catalog, inputPatch),
        customGrammageError: null,
      };
    });
  },

  setGrammage: (selectedGrammage) => {
    set(state => {
      if (!state.catalog) return state;
      return withUpdatedCalculations(state, state.catalog, { selectedGrammage });
    });
  },

  setSheetSize: (sheetSizeId) => {
    set(state => {
      if (!state.catalog) return state;
      return withUpdatedCalculations(state, state.catalog, { sheetSizeId });
    });
  },

  setPress: (pressId) => {
    set(state => {
      if (!state.catalog) return state;
      return withUpdatedCalculations(state, state.catalog, { pressId });
    });
  },

  setFoldingScheme: (foldingSchemeId) => {
    set(state => {
      if (!state.catalog) return state;
      return withUpdatedCalculations(state, state.catalog, { foldingSchemeId });
    });
  },

  setTotalPages: (totalPages) => {
    set(state => {
      if (!state.catalog) return state;
      return { ...withUpdatedCalculations(state, state.catalog, { totalPages }), totalPagesInput: String(totalPages) };
    });
  },

  setTotalPagesInput: (rawValue) => {
    set(state => {
      if (!state.catalog) return state;

      const parsed = parsePositiveSafeInteger(rawValue);
      return { ...withUpdatedCalculations(state, state.catalog, { totalPages: parsed ?? 0 }), totalPagesInput: rawValue };
    });
  },

  setBinding: (bindingId) => {
    set(state => {
      if (!state.catalog) return state;
      return withUpdatedCalculations(state, state.catalog, { bindingId });
    });
  },

  setCover: (coverId) => {
    set(state => {
      if (!state.catalog) return state;
      return withUpdatedCalculations(state, state.catalog, { coverId });
    });
  },

  // ─── Custom Sheet Sizes ──────────────────────────────────────────

  addCustomSheetSize: (name, width_mm, height_mm) => {
    if (!get().catalog) return false;

    if (!Number.isFinite(width_mm) || width_mm <= 0
      || !Number.isFinite(height_mm) || height_mm <= 0) {
      // Said here rather than by whoever calls it: refusing in silence left
      // the form that moved into the catalog with nothing to show, and every
      // other catalog reports its own refusals this way.
      set({ customSheetSizeError: 'Introduce ancho y alto como números finitos mayores que cero para crear el pliego.' });
      return false;
    }

    const id = `custom_sheet_${++customSheetCounter}_${Date.now()}`;
    const newSheet: SheetSize = {
      id,
      name: name || `${width_mm}×${height_mm}mm`,
      width_mm,
      height_mm,
    };

    set(state => {
      if (!state.catalog) return state;
      const patch = {
        ...withUpdatedCalculations(state, state.catalog, {
          customSheetSizes: [...state.customSheetSizes, newSheet],
          sheetSizeId: id,
        }),
        // Whatever the last refusal complained about no longer applies.
        customSheetSizeError: null,
      };
      return withPersistedCatalogPatch(storage, state.catalog, state, patch);
    });
    return true;
  },

  removeCustomSheetSize: (id) => {
    set(state => {
      if (!state.catalog) return state;
      if (!state.customSheetSizes.some(sheet => sheet.id === id)) {
        return state;
      }

      const remainingCustomSheetSizes = state.customSheetSizes.filter(sheet => sheet.id !== id);
      const inputPatch: Partial<BookConfig> = {
        customSheetSizes: remainingCustomSheetSizes,
      };
      if (state.sheetSizeId === id) {
        const effective = getAllSheetSizes(
          state.catalog, remainingCustomSheetSizes, state.sheetSizePatches, state.hiddenSheetSizeIds
        );
        inputPatch.sheetSizeId = effective[0]?.id ?? state.catalog.sheetSizes[0].id;
      }

      const patch = withUpdatedCalculations(state, state.catalog, inputPatch);
      return withPersistedCatalogPatch(storage, state.catalog, state, patch);
    });
  },

  /** Editing an entry of your own replaces it; see `editCustomPress`. */
  editCustomSheetSize: (id, changes) => {
    const state = get();
    if (!state.catalog) return false;

    const existing = state.customSheetSizes.find(sheet => sheet.id === id);
    if (!existing) {
      set({ customSheetSizeError: `El pliego "${id}" no es uno de los tuyos, así que no se puede editar.` });
      return false;
    }

    const result = editedOwnEntries<SheetSize>(
      state.customSheetSizes,
      getAllSheetSizes(state.catalog, state.customSheetSizes, state.sheetSizePatches, state.hiddenSheetSizeIds),
      id,
      sheet => sheet.id,
      sheet => sheet.name,
      { ...existing, ...changes, name: (changes.name ?? existing.name).trim() },
      isValidSheetSize,
      {
        invalid: 'Los cambios dejarían el pliego con datos inválidos: el ancho y el alto como números finitos mayores que cero.',
        duplicate: name => `Ya existe un pliego llamado "${name}". Introduce otro nombre o cancela.`,
      }
    );
    if ('error' in result) {
      set({ customSheetSizeError: result.error });
      return false;
    }

    set(currentState => {
      if (!currentState.catalog) return currentState;
      const patch = {
        ...withUpdatedCalculations(currentState, currentState.catalog, { customSheetSizes: result.entries }),
        customSheetSizeError: null,
      };
      return withPersistedCatalogPatch(storage, currentState.catalog, currentState, patch);
    });
    return true;
  },

  patchSheetSize: (id, changes) => {
    const state = get();
    if (!state.catalog) return false;

    const factoryEntry = state.catalog.sheetSizes.find(sheet => sheet.id === id);
    if (!factoryEntry) {
      set({ customSheetSizeError: `El pliego "${id}" no existe en la configuración de fábrica.` });
      return false;
    }

    const candidate: SheetSize = { ...factoryEntry, ...changes };
    if (!isValidSheetSize(candidate)) {
      set({ customSheetSizeError: 'Los cambios dejarían el pliego con datos inválidos.' });
      return false;
    }

    set(currentState => {
      if (!currentState.catalog) return currentState;
      const remainingPatches = currentState.sheetSizePatches.filter(p => p.id !== id);
      const patch = {
        ...withUpdatedCalculations(currentState, currentState.catalog, {
          sheetSizePatches: [...remainingPatches, { id, changes }],
        }),
        customSheetSizeError: null,
      };
      return withPersistedCatalogPatch(storage, currentState.catalog, currentState, patch);
    });
    return true;
  },

  unpatchSheetSize: (id) => {
    set(state => {
      if (!state.catalog) return state;
      if (!state.sheetSizePatches.some(p => p.id === id)) return state;

      const patch = {
        ...withUpdatedCalculations(state, state.catalog, {
          sheetSizePatches: state.sheetSizePatches.filter(p => p.id !== id),
        }),
        customSheetSizeError: null,
      };
      return withPersistedCatalogPatch(storage, state.catalog, state, patch);
    });
  },

  hideSheetSize: (id) => {
    set(state => {
      if (!state.catalog) return state;
      if (!state.catalog.sheetSizes.some(sheet => sheet.id === id)) return state;
      if (state.hiddenSheetSizeIds.includes(id)) return state;

      const hiddenSheetSizeIds = [...state.hiddenSheetSizeIds, id];
      const inputPatch: Partial<BookConfig> = { hiddenSheetSizeIds };
      if (state.sheetSizeId === id) {
        const effective = getAllSheetSizes(state.catalog, state.customSheetSizes, state.sheetSizePatches, hiddenSheetSizeIds);
        inputPatch.sheetSizeId = effective[0]?.id ?? id;
      }

      const patch = withUpdatedCalculations(state, state.catalog, inputPatch);
      return withPersistedCatalogPatch(storage, state.catalog, state, patch);
    });
  },

  showSheetSize: (id) => {
    set(state => {
      if (!state.catalog) return state;
      if (!state.hiddenSheetSizeIds.includes(id)) return state;

      const patch = withUpdatedCalculations(state, state.catalog, {
        hiddenSheetSizeIds: state.hiddenSheetSizeIds.filter(hiddenId => hiddenId !== id),
      });
      return withPersistedCatalogPatch(storage, state.catalog, state, patch);
    });
  },

  clearCustomSheetSizeError: () => {
    set(state => (state.catalog ? { customSheetSizeError: null } : state));
  },

  // ─── Custom Covers ───────────────────────────────────────────────

  addCustomCover: (cover) => {
    const state = get();
    if (!state.catalog) return false;

    const name = cover.name.trim();
    if (!name) {
      set({ customCoverError: 'El nombre de la tapa debe ser un texto no vacío.' });
      return false;
    }

    const covers = getAllCovers(state.catalog, state.customCovers, state.coverPatches, state.hiddenCoverIds);
    if (covers.some(item => namesMatch(item.name, name))) {
      set({ customCoverError: `Ya existe una tapa llamada "${name}". Introduce otro nombre o cancela.` });
      return false;
    }

    const id = `custom_cover_${++customCoverCounter}_${Date.now()}`;
    const candidate: Cover = { ...cover, name, id };

    const material = coverMaterialProblem(state, candidate);
    if (material) {
      set({ customCoverError: material });
      return false;
    }
    if (!isValidCover(candidate)) {
      set({ customCoverError: coverShapeProblem(candidate) });
      return false;
    }

    set(currentState => {
      if (!currentState.catalog) return currentState;
      const patch = {
        ...withUpdatedCalculations(currentState, currentState.catalog, {
          customCovers: [...currentState.customCovers, candidate],
          coverId: id,
        }),
        customCoverError: null,
      };
      return withPersistedCatalogPatch(storage, currentState.catalog, currentState, patch);
    });
    return true;
  },

  /** Editing an entry of your own replaces it; see `editCustomPress`. */
  editCustomCover: (id, changes) => {
    const state = get();
    if (!state.catalog) return false;

    const existing = state.customCovers.find(item => item.id === id);
    if (!existing) {
      set({ customCoverError: `La tapa "${id}" no es una de las tuyas, así que no se puede editar.` });
      return false;
    }

    const candidate: Cover = { ...existing, ...changes, name: (changes.name ?? existing.name).trim() };
    const material = coverMaterialProblem(state, candidate);
    if (material) {
      set({ customCoverError: material });
      return false;
    }

    const result = editedOwnEntries<Cover>(
      state.customCovers,
      getAllCovers(state.catalog, state.customCovers, state.coverPatches, state.hiddenCoverIds),
      id,
      item => item.id,
      item => item.name,
      candidate,
      isValidCover,
      {
        invalid: coverShapeProblem(candidate),
        duplicate: name => `Ya existe una tapa llamada "${name}". Introduce otro nombre o cancela.`,
      }
    );
    if ('error' in result) {
      set({ customCoverError: result.error });
      return false;
    }

    set(currentState => {
      if (!currentState.catalog) return currentState;
      const patch = {
        ...withUpdatedCalculations(currentState, currentState.catalog, { customCovers: result.entries }),
        customCoverError: null,
      };
      return withPersistedCatalogPatch(storage, currentState.catalog, currentState, patch);
    });
    return true;
  },

  removeCustomCover: (id) => {
    set(state => {
      if (!state.catalog) return state;
      if (!state.customCovers.some(item => item.id === id)) return state;

      const remaining = state.customCovers.filter(item => item.id !== id);
      const inputPatch: Partial<BookConfig> = { customCovers: remaining };
      if (state.coverId === id) {
        const effective = getAllCovers(state.catalog, remaining, state.coverPatches, state.hiddenCoverIds);
        inputPatch.coverId = effective[0]?.id ?? state.catalog.covers[0].id;
      }

      const patch = {
        ...withUpdatedCalculations(state, state.catalog, inputPatch),
        customCoverError: null,
      };
      return withPersistedCatalogPatch(storage, state.catalog, state, patch);
    });
  },

  patchCover: (id, changes) => {
    const state = get();
    if (!state.catalog) return false;

    const factoryEntry = state.catalog.covers.find(item => item.id === id);
    if (!factoryEntry) {
      set({ customCoverError: `La tapa "${id}" no existe en la configuración de fábrica.` });
      return false;
    }

    const candidate: Cover = { ...factoryEntry, ...changes };
    const material = coverMaterialProblem(state, candidate);
    if (material) {
      set({ customCoverError: material });
      return false;
    }
    if (!isValidCover(candidate)) {
      set({ customCoverError: coverShapeProblem(candidate) });
      return false;
    }

    set(currentState => {
      if (!currentState.catalog) return currentState;
      const remainingPatches = currentState.coverPatches.filter(patch => patch.id !== id);
      const patch = {
        ...withUpdatedCalculations(currentState, currentState.catalog, {
          coverPatches: [...remainingPatches, { id, changes }],
        }),
        customCoverError: null,
      };
      return withPersistedCatalogPatch(storage, currentState.catalog, currentState, patch);
    });
    return true;
  },

  unpatchCover: (id) => {
    set(state => {
      if (!state.catalog) return state;
      if (!state.coverPatches.some(patch => patch.id === id)) return state;

      const patch = {
        ...withUpdatedCalculations(state, state.catalog, {
          coverPatches: state.coverPatches.filter(item => item.id !== id),
        }),
        customCoverError: null,
      };
      return withPersistedCatalogPatch(storage, state.catalog, state, patch);
    });
  },

  hideCover: (id) => {
    set(state => {
      if (!state.catalog) return state;
      if (!state.catalog.covers.some(item => item.id === id)) return state;
      if (state.hiddenCoverIds.includes(id)) return state;

      const hidden = [...state.hiddenCoverIds, id];
      const effective = getAllCovers(state.catalog, state.customCovers, state.coverPatches, hidden);
      const inputPatch: Partial<BookConfig> = { hiddenCoverIds: hidden };
      if (state.coverId === id && effective.length > 0) inputPatch.coverId = effective[0].id;

      const patch = {
        ...withUpdatedCalculations(state, state.catalog, inputPatch),
        customCoverError: null,
      };
      return withPersistedCatalogPatch(storage, state.catalog, state, patch);
    });
  },

  showCover: (id) => {
    set(state => {
      if (!state.catalog) return state;
      if (!state.hiddenCoverIds.includes(id)) return state;

      const patch = {
        ...withUpdatedCalculations(state, state.catalog, {
          hiddenCoverIds: state.hiddenCoverIds.filter(item => item !== id),
        }),
        customCoverError: null,
      };
      return withPersistedCatalogPatch(storage, state.catalog, state, patch);
    });
  },

  clearCustomCoverError: () => {
    set(state => (state.catalog ? { customCoverError: null } : state));
  },

  // ─── Custom Substrates ───────────────────────────────────────────

  /*
   * A paper is added with the one weight it is bought in, because a paper
   * nobody can buy in any weight is not a paper: selecting it would leave the
   * tool with no caliper to compute a spine from. Further weights are added
   * afterwards, through the grammage list that hangs off it, which is the
   * same list a factory paper already has.
   */
  addCustomSubstrate: (name, description, grammage, caliper) => {
    const state = get();
    if (!state.catalog) return false;

    const trimmedName = name.trim();
    if (!trimmedName) {
      set({ customSubstrateError: 'El nombre del papel debe ser un texto no vacío.' });
      return false;
    }
    if (!description.trim()) {
      set({ customSubstrateError: 'La descripción del papel debe ser un texto no vacío.' });
      return false;
    }
    if (!Number.isFinite(grammage) || grammage <= 0 || !Number.isFinite(caliper) || caliper <= 0) {
      set({ customSubstrateError: 'Introduce gramaje y calibre como números finitos mayores que cero.' });
      return false;
    }

    const substrates = getAllSubstrates(
      state.catalog, state.customSubstrates, state.substratePatches, state.hiddenSubstrateIds
    );
    if (substrates.some(item => namesMatch(item.name, trimmedName))) {
      set({ customSubstrateError: `Ya existe un papel llamado "${trimmedName}". Introduce otro nombre o cancela.` });
      return false;
    }

    const id = `custom_substrate_${++customSubstrateCounter}_${Date.now()}`;
    // `type` is required by the catalog schema and read by nothing; the seven
    // shipped papers all set it to their own id, so a paper of yours does too.
    const substrate: Substrate = {
      id, name: trimmedName, type: id, description: description.trim(), options: [{ grammage, caliper }],
    };

    set(currentState => {
      if (!currentState.catalog) return currentState;
      const patch = {
        ...withUpdatedCalculations(currentState, currentState.catalog, {
          customSubstrates: [...currentState.customSubstrates, substrate],
          substrateId: id,
          selectedGrammage: grammage,
        }),
        customSubstrateError: null,
      };
      return withPersistedCatalogPatch(storage, currentState.catalog, currentState, patch);
    });
    return true;
  },

  /** Editing an entry of your own replaces it; see `editCustomPress`. */
  editCustomSubstrate: (id, changes) => {
    const state = get();
    if (!state.catalog) return false;

    const existing = state.customSubstrates.find(item => item.id === id);
    if (!existing) {
      set({ customSubstrateError: `El papel "${id}" no es uno de los tuyos, así que no se puede editar.` });
      return false;
    }

    const result = editedOwnEntries<Substrate>(
      state.customSubstrates,
      getAllSubstrates(state.catalog, state.customSubstrates, state.substratePatches, state.hiddenSubstrateIds),
      id,
      item => item.id,
      item => item.name,
      { ...existing, ...changes, name: (changes.name ?? existing.name).trim() },
      isValidSubstrate,
      {
        invalid: 'Los cambios dejarían el papel con datos inválidos: un nombre y una descripción no vacíos.',
        duplicate: name => `Ya existe un papel llamado "${name}". Introduce otro nombre o cancela.`,
      }
    );
    if ('error' in result) {
      set({ customSubstrateError: result.error });
      return false;
    }

    set(currentState => {
      if (!currentState.catalog) return currentState;
      const patch = {
        ...withUpdatedCalculations(currentState, currentState.catalog, { customSubstrates: result.entries }),
        customSubstrateError: null,
      };
      return withPersistedCatalogPatch(storage, currentState.catalog, currentState, patch);
    });
    return true;
  },

  removeCustomSubstrate: (id) => {
    set(state => {
      if (!state.catalog) return state;
      if (!state.customSubstrates.some(item => item.id === id)) return state;

      const remaining = state.customSubstrates.filter(item => item.id !== id);
      // The weights added to it go with it: they name a paper that no longer
      // exists, and keeping them would leave orphans nothing can reach.
      const remainingGrammages = state.customGrammages.filter(option => option.substrateId !== id);
      const inputPatch: Partial<BookConfig> = {
        customSubstrates: remaining,
        customGrammages: remainingGrammages,
      };

      if (state.substrateId === id) {
        const effective = getAllSubstrates(state.catalog, remaining, state.substratePatches, state.hiddenSubstrateIds);
        const fallback = effective[0] ?? state.catalog.substrates[0];
        inputPatch.substrateId = fallback.id;
        inputPatch.selectedGrammage = resolveGrammage(effective, fallback.id, remainingGrammages, state.selectedGrammage);
      }

      const patch = {
        ...withUpdatedCalculations(state, state.catalog, inputPatch),
        customSubstrateError: null,
      };
      return withPersistedCatalogPatch(storage, state.catalog, state, patch);
    });
  },

  patchSubstrate: (id, changes) => {
    const state = get();
    if (!state.catalog) return false;

    const factoryEntry = state.catalog.substrates.find(item => item.id === id);
    if (!factoryEntry) {
      set({ customSubstrateError: `El papel "${id}" no existe en la configuración de fábrica.` });
      return false;
    }

    const candidate: Substrate = { ...factoryEntry, ...changes };
    if (!isValidSubstrate(candidate)) {
      set({ customSubstrateError: 'Los cambios dejarían el papel con datos inválidos.' });
      return false;
    }

    set(currentState => {
      if (!currentState.catalog) return currentState;
      const remainingPatches = currentState.substratePatches.filter(patch => patch.id !== id);
      const patch = {
        ...withUpdatedCalculations(currentState, currentState.catalog, {
          substratePatches: [...remainingPatches, { id, changes }],
        }),
        customSubstrateError: null,
      };
      return withPersistedCatalogPatch(storage, currentState.catalog, currentState, patch);
    });
    return true;
  },

  unpatchSubstrate: (id) => {
    set(state => {
      if (!state.catalog) return state;
      if (!state.substratePatches.some(patch => patch.id === id)) return state;

      const patch = {
        ...withUpdatedCalculations(state, state.catalog, {
          substratePatches: state.substratePatches.filter(item => item.id !== id),
        }),
        customSubstrateError: null,
      };
      return withPersistedCatalogPatch(storage, state.catalog, state, patch);
    });
  },

  hideSubstrate: (id) => {
    set(state => {
      if (!state.catalog) return state;
      if (!state.catalog.substrates.some(item => item.id === id)) return state;
      if (state.hiddenSubstrateIds.includes(id)) return state;

      const hidden = [...state.hiddenSubstrateIds, id];
      const effective = getAllSubstrates(state.catalog, state.customSubstrates, state.substratePatches, hidden);
      const inputPatch: Partial<BookConfig> = { hiddenSubstrateIds: hidden };

      /*
       * Hiding every paper is allowed, and then there is nothing to fall back
       * to: the selection stays where it was rather than becoming undefined,
       * the same way a proportion behaves when all of them are hidden.
       */
      if (state.substrateId === id && effective.length > 0) {
        inputPatch.substrateId = effective[0].id;
        inputPatch.selectedGrammage = resolveGrammage(
          effective, effective[0].id, state.customGrammages, state.selectedGrammage
        );
      }

      const patch = {
        ...withUpdatedCalculations(state, state.catalog, inputPatch),
        customSubstrateError: null,
      };
      return withPersistedCatalogPatch(storage, state.catalog, state, patch);
    });
  },

  showSubstrate: (id) => {
    set(state => {
      if (!state.catalog) return state;
      if (!state.hiddenSubstrateIds.includes(id)) return state;

      const patch = {
        ...withUpdatedCalculations(state, state.catalog, {
          hiddenSubstrateIds: state.hiddenSubstrateIds.filter(item => item !== id),
        }),
        customSubstrateError: null,
      };
      return withPersistedCatalogPatch(storage, state.catalog, state, patch);
    });
  },

  clearCustomSubstrateError: () => {
    set(state => (state.catalog ? { customSubstrateError: null } : state));
  },

  // ─── Custom Grammages ────────────────────────────────────────────

  addCustomGrammage: (substrateId, grammage, caliper) => {
    const state = get();
    if (!state.catalog) return false;

    const substrates = getAllSubstrates(
      state.catalog, state.customSubstrates, state.substratePatches, state.hiddenSubstrateIds
    );

    const substrate = substrates.find(item => item.id === substrateId);
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

    const duplicate = getAllGrammageOptions(substrates, substrateId, state.customGrammages)
      .some(option => option.grammage === grammage);
    if (duplicate) {
      set({
        customGrammageError: `Ya existe el gramaje ${grammage} g/m² para ${substrate.name}. Introduce otro gramaje o cancela.`,
      });
      return false;
    }

    const newOption: CustomGrammageOption = { substrateId, grammage, caliper };
    set(currentState => {
      if (!currentState.catalog) return currentState;
      const patch = {
        ...withUpdatedCalculations(currentState, currentState.catalog, {
          substrateId,
          customGrammages: [...currentState.customGrammages, newOption],
          selectedGrammage: grammage,
        }),
        customGrammageError: null,
      };
      return withPersistedCatalogPatch(storage, currentState.catalog, currentState, patch);
    });
    return true;
  },

  clearCustomGrammageError: () => {
    set(state => (state.catalog ? { customGrammageError: null } : state));
  },

  removeCustomGrammage: (substrateId, grammage) => {
    set(state => {
      if (!state.catalog) return state;

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
        const substrates = getAllSubstrates(
          state.catalog, state.customSubstrates, state.substratePatches, state.hiddenSubstrateIds
        );
        const remaining = getAllGrammageOptions(substrates, substrateId, inputPatch.customGrammages!);
        if (remaining.length > 0) inputPatch.selectedGrammage = remaining[0].grammage;
      }

      const patch = {
        ...withUpdatedCalculations(state, state.catalog, inputPatch),
        customGrammageError: null,
      };
      return withPersistedCatalogPatch(storage, state.catalog, state, patch);
    });
  },

  // ─── Custom Presses ──────────────────────────────────────────────

  addCustomPress: (
    name,
    maxSheetWidth_mm,
    maxSheetHeight_mm,
    gripperMargin_mm,
    sideMargin_mm,
    tailMargin_mm,
    gutter_mm
  ) => {
    const state = get();
    if (!state.catalog) return false;

    if (!name.trim()) {
      set({ customPressError: 'El nombre de la prensa debe ser un texto no vacío.' });
      return false;
    }

    if (!Number.isFinite(maxSheetWidth_mm) || maxSheetWidth_mm <= 0
      || !Number.isFinite(maxSheetHeight_mm) || maxSheetHeight_mm <= 0
      || !Number.isFinite(gripperMargin_mm) || gripperMargin_mm < 0
      || !Number.isFinite(sideMargin_mm) || sideMargin_mm < 0
      || !Number.isFinite(tailMargin_mm) || tailMargin_mm < 0
      || !Number.isFinite(gutter_mm) || gutter_mm < 0) {
      set({
        customPressError: 'Introduce las medidas de la prensa como números finitos: el ancho y el alto máximo de pliego mayores que cero, y los márgenes y la calle no negativos.',
      });
      return false;
    }

    if (gripperMargin_mm + tailMargin_mm >= maxSheetHeight_mm) {
      set({
        customPressError: 'La pinza y el margen de cola no dejan área imprimible: su suma debe ser menor que el alto máximo de pliego.',
      });
      return false;
    }

    if (2 * sideMargin_mm >= maxSheetWidth_mm) {
      set({
        customPressError: 'Los márgenes laterales no dejan área imprimible: el doble del margen lateral debe ser menor que el ancho máximo de pliego.',
      });
      return false;
    }

    const duplicate = getAllPresses(state.catalog, state.customPresses, state.pressPatches, state.hiddenPressIds)
      .some(press => namesMatch(press.name, name));
    if (duplicate) {
      set({ customPressError: `Ya existe una prensa llamada "${name}". Introduce otro nombre o cancela.` });
      return false;
    }

    const id = `custom_press_${++customPressCounter}_${Date.now()}`;
    const newPress: Press = {
      id, name: name.trim(), maxSheetWidth_mm, maxSheetHeight_mm, gripperMargin_mm, sideMargin_mm, tailMargin_mm, gutter_mm,
    };

    set(currentState => {
      if (!currentState.catalog) return currentState;
      const patch = {
        ...withUpdatedCalculations(currentState, currentState.catalog, {
          customPresses: [...currentState.customPresses, newPress],
          pressId: id,
        }),
        customPressError: null,
      };
      return withPersistedCatalogPatch(storage, currentState.catalog, currentState, patch);
    });
    return true;
  },

  clearCustomPressError: () => {
    set(state => (state.catalog ? { customPressError: null } : state));
  },

  removeCustomPress: (id) => {
    set(state => {
      if (!state.catalog) return state;
      if (!state.customPresses.some(press => press.id === id)) {
        return state;
      }

      const remainingCustomPresses = state.customPresses.filter(press => press.id !== id);
      const inputPatch: Partial<BookConfig> = {
        customPresses: remainingCustomPresses,
      };
      if (state.pressId === id) {
        const effective = getAllPresses(state.catalog, remainingCustomPresses, state.pressPatches, state.hiddenPressIds);
        inputPatch.pressId = effective[0]?.id ?? state.catalog.presses[0].id;
      }

      const patch = {
        ...withUpdatedCalculations(state, state.catalog, inputPatch),
        customPressError: null,
      };
      return withPersistedCatalogPatch(storage, state.catalog, state, patch);
    });
  },

  /*
   * An entry of your own has no factory entry behind it, so there is nothing
   * to diff against and nothing to revert to: editing one replaces it. That
   * is why this is a separate action from `patchPress` rather than a flag on
   * it — a patch is a difference, and this is not.
   */
  editCustomPress: (id, changes) => {
    const state = get();
    if (!state.catalog) return false;

    const existing = state.customPresses.find(press => press.id === id);
    if (!existing) {
      set({ customPressError: `La prensa "${id}" no es una de las tuyas, así que no se puede editar.` });
      return false;
    }

    const result = editedOwnEntries<Press>(
      state.customPresses,
      getAllPresses(state.catalog, state.customPresses, state.pressPatches, state.hiddenPressIds),
      id,
      press => press.id,
      press => press.name,
      { ...existing, ...changes, name: (changes.name ?? existing.name).trim() },
      isValidPress,
      {
        invalid: 'Los cambios dejarían la prensa con datos inválidos: el ancho y el alto máximo de pliego mayores que cero, los márgenes y la calle no negativos, y ambos dejando área imprimible.',
        duplicate: name => `Ya existe una prensa llamada "${name}". Introduce otro nombre o cancela.`,
      }
    );
    if ('error' in result) {
      set({ customPressError: result.error });
      return false;
    }

    set(currentState => {
      if (!currentState.catalog) return currentState;
      const patch = {
        ...withUpdatedCalculations(currentState, currentState.catalog, { customPresses: result.entries }),
        customPressError: null,
      };
      return withPersistedCatalogPatch(storage, currentState.catalog, currentState, patch);
    });
    return true;
  },

  patchPress: (id, changes) => {
    const state = get();
    if (!state.catalog) return false;

    const factoryEntry = state.catalog.presses.find(press => press.id === id);
    if (!factoryEntry) {
      set({ customPressError: `La prensa "${id}" no existe en la configuración de fábrica.` });
      return false;
    }

    const candidate: Press = { ...factoryEntry, ...changes };
    if (!isValidPress(candidate)) {
      set({ customPressError: 'Los cambios dejarían la prensa con datos inválidos.' });
      return false;
    }

    set(currentState => {
      if (!currentState.catalog) return currentState;
      const remainingPatches = currentState.pressPatches.filter(p => p.id !== id);
      const patch = {
        ...withUpdatedCalculations(currentState, currentState.catalog, {
          pressPatches: [...remainingPatches, { id, changes }],
        }),
        customPressError: null,
      };
      return withPersistedCatalogPatch(storage, currentState.catalog, currentState, patch);
    });
    return true;
  },

  unpatchPress: (id) => {
    set(state => {
      if (!state.catalog) return state;
      if (!state.pressPatches.some(p => p.id === id)) return state;

      const patch = {
        ...withUpdatedCalculations(state, state.catalog, {
          pressPatches: state.pressPatches.filter(p => p.id !== id),
        }),
        customPressError: null,
      };
      return withPersistedCatalogPatch(storage, state.catalog, state, patch);
    });
  },

  hidePress: (id) => {
    set(state => {
      if (!state.catalog) return state;
      if (!state.catalog.presses.some(press => press.id === id)) return state;
      if (state.hiddenPressIds.includes(id)) return state;

      const hiddenPressIds = [...state.hiddenPressIds, id];
      const inputPatch: Partial<BookConfig> = { hiddenPressIds };
      if (state.pressId === id) {
        const effective = getAllPresses(state.catalog, state.customPresses, state.pressPatches, hiddenPressIds);
        inputPatch.pressId = effective[0]?.id ?? id;
      }

      const patch = withUpdatedCalculations(state, state.catalog, inputPatch);
      return withPersistedCatalogPatch(storage, state.catalog, state, patch);
    });
  },

  showPress: (id) => {
    set(state => {
      if (!state.catalog) return state;
      if (!state.hiddenPressIds.includes(id)) return state;

      const patch = withUpdatedCalculations(state, state.catalog, {
        hiddenPressIds: state.hiddenPressIds.filter(hiddenId => hiddenId !== id),
      });
      return withPersistedCatalogPatch(storage, state.catalog, state, patch);
    });
  },

  // ─── Custom Bindings ─────────────────────────────────────────────

  addCustomBinding: (name, pageMultiple, minPages, maxPages, spineAllowance_mm, nests, requiresSignatureMultiple) => {
    const state = get();
    if (!state.catalog) return false;

    if (!name.trim()) {
      set({ customBindingError: 'El nombre de la encuadernación debe ser un texto no vacío.' });
      return false;
    }

    if (!isPositiveSafeInteger(pageMultiple) || pageMultiple % 2 !== 0) {
      set({
        customBindingError: 'El múltiplo de páginas debe ser un entero seguro mayor que cero y par, porque un pliego siempre aporta dos páginas.',
      });
      return false;
    }

    if (!isPositiveSafeInteger(minPages) || minPages % pageMultiple !== 0) {
      set({
        customBindingError: `El mínimo de páginas debe ser un entero seguro mayor que cero y múltiplo de ${pageMultiple}.`,
      });
      return false;
    }

    if (!isPositiveSafeInteger(maxPages) || maxPages % pageMultiple !== 0 || maxPages > MAX_BINDING_PAGES) {
      set({
        customBindingError: `El máximo de páginas debe ser un entero seguro mayor que cero, múltiplo de ${pageMultiple}, y como máximo ${MAX_BINDING_PAGES}.`,
      });
      return false;
    }

    if (minPages > maxPages) {
      set({ customBindingError: 'El mínimo de páginas debe ser menor o igual que el máximo.' });
      return false;
    }

    if (!Number.isFinite(spineAllowance_mm) || spineAllowance_mm < 0) {
      set({ customBindingError: 'El aporte al lomo debe ser un número finito no negativo.' });
      return false;
    }

    if (nests && pageMultiple % 4 !== 0) {
      set({
        customBindingError: 'Un método cuyas hojas se anidan debe tener un múltiplo de páginas que sea también múltiplo de 4, porque el plegado que anida se hace de a cuatro páginas.',
      });
      return false;
    }

    const duplicate = getAllBindings(state.catalog, state.customBindings, state.bindingPatches, state.hiddenBindingIds)
      .some(binding => namesMatch(binding.name, name));
    if (duplicate) {
      set({ customBindingError: `Ya existe una encuadernación llamada "${name}". Introduce otro nombre o cancela.` });
      return false;
    }

    const id = `custom_binding_${++customBindingCounter}_${Date.now()}`;
    const newBinding: Binding = {
      id, name: name.trim(), pageMultiple, minPages, maxPages, spineAllowance_mm, nests, requiresSignatureMultiple,
    };

    set(currentState => {
      if (!currentState.catalog) return currentState;
      const patch = {
        ...withUpdatedCalculations(currentState, currentState.catalog, {
          customBindings: [...currentState.customBindings, newBinding],
          bindingId: id,
        }),
        customBindingError: null,
      };
      return withPersistedCatalogPatch(storage, currentState.catalog, currentState, patch);
    });
    return true;
  },

  clearCustomBindingError: () => {
    set(state => (state.catalog ? { customBindingError: null } : state));
  },

  removeCustomBinding: (id) => {
    set(state => {
      if (!state.catalog) return state;
      if (!state.customBindings.some(binding => binding.id === id)) {
        return state;
      }

      const remainingCustomBindings = state.customBindings.filter(binding => binding.id !== id);
      const inputPatch: Partial<BookConfig> = {
        customBindings: remainingCustomBindings,
      };
      if (state.bindingId === id) {
        const effective = getAllBindings(state.catalog, remainingCustomBindings, state.bindingPatches, state.hiddenBindingIds);
        inputPatch.bindingId = effective[0]?.id ?? state.catalog.bindings[0].id;
      }

      const patch = {
        ...withUpdatedCalculations(state, state.catalog, inputPatch),
        customBindingError: null,
      };
      return withPersistedCatalogPatch(storage, state.catalog, state, patch);
    });
  },

  /** Editing an entry of your own replaces it; see `editCustomPress`. */
  editCustomBinding: (id, changes) => {
    const state = get();
    if (!state.catalog) return false;

    const existing = state.customBindings.find(binding => binding.id === id);
    if (!existing) {
      set({ customBindingError: `La encuadernación "${id}" no es una de las tuyas, así que no se puede editar.` });
      return false;
    }

    const result = editedOwnEntries<Binding>(
      state.customBindings,
      getAllBindings(state.catalog, state.customBindings, state.bindingPatches, state.hiddenBindingIds),
      id,
      binding => binding.id,
      binding => binding.name,
      { ...existing, ...changes, name: (changes.name ?? existing.name).trim() },
      isValidBinding,
      {
        invalid: 'Los cambios dejarían la encuadernación con datos inválidos: el múltiplo y los límites de páginas como enteros mayores que cero, el mínimo no mayor que el máximo, y el aporte al lomo no negativo.',
        duplicate: name => `Ya existe una encuadernación llamada "${name}". Introduce otro nombre o cancela.`,
      }
    );
    if ('error' in result) {
      set({ customBindingError: result.error });
      return false;
    }

    set(currentState => {
      if (!currentState.catalog) return currentState;
      const patch = {
        ...withUpdatedCalculations(currentState, currentState.catalog, { customBindings: result.entries }),
        customBindingError: null,
      };
      return withPersistedCatalogPatch(storage, currentState.catalog, currentState, patch);
    });
    return true;
  },

  patchBinding: (id, changes) => {
    const state = get();
    if (!state.catalog) return false;

    const factoryEntry = state.catalog.bindings.find(binding => binding.id === id);
    if (!factoryEntry) {
      set({ customBindingError: `La encuadernación "${id}" no existe en la configuración de fábrica.` });
      return false;
    }

    const candidate: Binding = { ...factoryEntry, ...changes };
    if (!isValidBinding(candidate)) {
      set({ customBindingError: 'Los cambios dejarían la encuadernación con datos inválidos.' });
      return false;
    }

    set(currentState => {
      if (!currentState.catalog) return currentState;
      const remainingPatches = currentState.bindingPatches.filter(p => p.id !== id);
      const patch = {
        ...withUpdatedCalculations(currentState, currentState.catalog, {
          bindingPatches: [...remainingPatches, { id, changes }],
        }),
        customBindingError: null,
      };
      return withPersistedCatalogPatch(storage, currentState.catalog, currentState, patch);
    });
    return true;
  },

  unpatchBinding: (id) => {
    set(state => {
      if (!state.catalog) return state;
      if (!state.bindingPatches.some(p => p.id === id)) return state;

      const patch = {
        ...withUpdatedCalculations(state, state.catalog, {
          bindingPatches: state.bindingPatches.filter(p => p.id !== id),
        }),
        customBindingError: null,
      };
      return withPersistedCatalogPatch(storage, state.catalog, state, patch);
    });
  },

  hideBinding: (id) => {
    set(state => {
      if (!state.catalog) return state;
      if (!state.catalog.bindings.some(binding => binding.id === id)) return state;
      if (state.hiddenBindingIds.includes(id)) return state;

      const hiddenBindingIds = [...state.hiddenBindingIds, id];
      const inputPatch: Partial<BookConfig> = { hiddenBindingIds };
      if (state.bindingId === id) {
        const effective = getAllBindings(state.catalog, state.customBindings, state.bindingPatches, hiddenBindingIds);
        inputPatch.bindingId = effective[0]?.id ?? id;
      }

      const patch = withUpdatedCalculations(state, state.catalog, inputPatch);
      return withPersistedCatalogPatch(storage, state.catalog, state, patch);
    });
  },

  showBinding: (id) => {
    set(state => {
      if (!state.catalog) return state;
      if (!state.hiddenBindingIds.includes(id)) return state;

      const patch = withUpdatedCalculations(state, state.catalog, {
        hiddenBindingIds: state.hiddenBindingIds.filter(hiddenId => hiddenId !== id),
      });
      return withPersistedCatalogPatch(storage, state.catalog, state, patch);
    });
  },

  // ─── Custom Proportions ──────────────────────────────────────────

  addCustomProportion: (label, ratioWidth, ratioHeight, description) => {
    const state = get();
    if (!state.catalog) return false;

    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      set({ customProportionError: 'Introduce una etiqueta para la proporción.' });
      return false;
    }

    if (!description.trim()) {
      set({ customProportionError: 'La descripción de la proporción debe ser un texto no vacío.' });
      return false;
    }

    if (!Number.isFinite(ratioWidth) || ratioWidth <= 0 || !Number.isFinite(ratioHeight) || ratioHeight <= 0) {
      set({
        customProportionError: 'Introduce las dos medidas de la proporción como números finitos mayores que cero.',
      });
      return false;
    }

    const duplicate = getAllProportions(state.catalog, state.customProportions, state.proportionPatches, state.hiddenProportionLabels)
      .some(proportion => namesMatch(proportion.label, trimmedLabel));
    if (duplicate) {
      set({ customProportionError: `Ya existe la proporción "${trimmedLabel}". Introduce otra etiqueta o cancela.` });
      return false;
    }

    const newProportion: Proportion = { label: trimmedLabel, ratio: [ratioWidth, ratioHeight], description };

    set(currentState => {
      if (!currentState.catalog) return currentState;
      const dimensions = dimensionsFromProportion(
        [newProportion],
        trimmedLabel,
        currentState.format,
        currentState.pageWidth_mm
      );
      const patch = {
        ...withUpdatedCalculations(currentState, currentState.catalog, {
          customProportions: [...currentState.customProportions, newProportion],
          proportionId: trimmedLabel,
          pageWidth_mm: dimensions.width,
          pageHeight_mm: dimensions.height,
        }),
        customProportionError: null,
      };
      return withPersistedCatalogPatch(storage, currentState.catalog, currentState, patch);
    });
    return true;
  },

  clearCustomProportionError: () => {
    set(state => (state.catalog ? { customProportionError: null } : state));
  },

  removeCustomProportion: (label) => {
    set(state => {
      if (!state.catalog) return state;
      if (!state.customProportions.some(proportion => proportion.label === label)) {
        return state;
      }

      const remainingCustomProportions = state.customProportions.filter(proportion => proportion.label !== label);
      const inputPatch: Partial<BookConfig> = {
        customProportions: remainingCustomProportions,
      };

      if (state.proportionId === label) {
        const effective = getAllProportions(
          state.catalog, remainingCustomProportions, state.proportionPatches, state.hiddenProportionLabels
        );
        const fallback = effective[0] ?? state.catalog.proportions[0];
        const dimensions = dimensionsFromProportion(effective, fallback.label, state.format, state.pageWidth_mm);
        inputPatch.proportionId = fallback.label;
        inputPatch.pageWidth_mm = dimensions.width;
        inputPatch.pageHeight_mm = dimensions.height;
      }

      const patch = {
        ...withUpdatedCalculations(state, state.catalog, inputPatch),
        customProportionError: null,
      };
      return withPersistedCatalogPatch(storage, state.catalog, state, patch);
    });
  },

  /*
   * A proportion is keyed by its label, so renaming one of your own moves the
   * key: the selection has to follow it, or the app would be pointing at a
   * label that no longer exists and fall back to a different proportion.
   * See `editCustomPress` for why this is not a patch.
   */
  editCustomProportion: (label, changes) => {
    const state = get();
    if (!state.catalog) return false;

    const existing = state.customProportions.find(proportion => proportion.label === label);
    if (!existing) {
      set({ customProportionError: `La proporción "${label}" no es una de las tuyas, así que no se puede editar.` });
      return false;
    }

    const candidate: Proportion = { ...existing, ...changes, label: (changes.label ?? existing.label).trim() };
    const result = editedOwnEntries<Proportion>(
      state.customProportions,
      getAllProportions(state.catalog, state.customProportions, state.proportionPatches, state.hiddenProportionLabels),
      label,
      proportion => proportion.label,
      proportion => proportion.label,
      candidate,
      isValidProportion,
      {
        invalid: 'Los cambios dejarían la proporción con datos inválidos: una etiqueta y una descripción no vacías, y las dos medidas de la razón como números finitos mayores que cero.',
        duplicate: name => `Ya existe la proporción "${name}". Introduce otra etiqueta o cancela.`,
      }
    );
    if ('error' in result) {
      set({ customProportionError: result.error });
      return false;
    }

    set(currentState => {
      if (!currentState.catalog) return currentState;
      const inputPatch: Partial<BookConfig> = { customProportions: result.entries };

      if (currentState.proportionId === label) {
        const effective = getAllProportions(
          currentState.catalog, result.entries, currentState.proportionPatches, currentState.hiddenProportionLabels
        );
        const dimensions = dimensionsFromProportion(effective, candidate.label, currentState.format, currentState.pageWidth_mm);
        inputPatch.proportionId = candidate.label;
        inputPatch.pageWidth_mm = dimensions.width;
        inputPatch.pageHeight_mm = dimensions.height;
      }

      const patch = {
        ...withUpdatedCalculations(currentState, currentState.catalog, inputPatch),
        customProportionError: null,
      };
      return withPersistedCatalogPatch(storage, currentState.catalog, currentState, patch);
    });
    return true;
  },

  patchProportion: (label, changes) => {
    const state = get();
    if (!state.catalog) return false;

    const factoryEntry = state.catalog.proportions.find(proportion => proportion.label === label);
    if (!factoryEntry) {
      set({ customProportionError: `La proporción "${label}" no existe en la configuración de fábrica.` });
      return false;
    }

    const candidate: Proportion = { ...factoryEntry, ...changes };
    if (!isValidProportion(candidate)) {
      set({ customProportionError: 'Los cambios dejarían la proporción con datos inválidos.' });
      return false;
    }

    set(currentState => {
      if (!currentState.catalog) return currentState;
      const remainingPatches = currentState.proportionPatches.filter(p => p.label !== label);
      const inputPatch: Partial<BookConfig> = {
        proportionPatches: [...remainingPatches, { label, changes }],
      };
      if (currentState.proportionId === label) {
        const dimensions = dimensionsFromProportion([candidate], label, currentState.format, currentState.pageWidth_mm);
        inputPatch.pageWidth_mm = dimensions.width;
        inputPatch.pageHeight_mm = dimensions.height;
      }

      const patch = {
        ...withUpdatedCalculations(currentState, currentState.catalog, inputPatch),
        customProportionError: null,
      };
      return withPersistedCatalogPatch(storage, currentState.catalog, currentState, patch);
    });
    return true;
  },

  unpatchProportion: (label) => {
    set(state => {
      if (!state.catalog) return state;
      if (!state.proportionPatches.some(p => p.label === label)) return state;

      const inputPatch: Partial<BookConfig> = {
        proportionPatches: state.proportionPatches.filter(p => p.label !== label),
      };
      if (state.proportionId === label) {
        const factoryEntry = state.catalog.proportions.find(proportion => proportion.label === label);
        if (factoryEntry) {
          const dimensions = dimensionsFromProportion([factoryEntry], label, state.format, state.pageWidth_mm);
          inputPatch.pageWidth_mm = dimensions.width;
          inputPatch.pageHeight_mm = dimensions.height;
        }
      }

      const patch = {
        ...withUpdatedCalculations(state, state.catalog, inputPatch),
        customProportionError: null,
      };
      return withPersistedCatalogPatch(storage, state.catalog, state, patch);
    });
  },

  hideProportion: (label) => {
    set(state => {
      if (!state.catalog) return state;
      if (!state.catalog.proportions.some(proportion => proportion.label === label)) return state;
      if (state.hiddenProportionLabels.includes(label)) return state;

      const hiddenProportionLabels = [...state.hiddenProportionLabels, label];
      const inputPatch: Partial<BookConfig> = { hiddenProportionLabels };
      if (state.proportionId === label) {
        const effective = getAllProportions(
          state.catalog, state.customProportions, state.proportionPatches, hiddenProportionLabels
        );
        const fallback = effective[0];
        if (fallback) {
          const dimensions = dimensionsFromProportion(effective, fallback.label, state.format, state.pageWidth_mm);
          inputPatch.proportionId = fallback.label;
          inputPatch.pageWidth_mm = dimensions.width;
          inputPatch.pageHeight_mm = dimensions.height;
        } else {
          inputPatch.proportionId = null;
        }
      }

      const patch = withUpdatedCalculations(state, state.catalog, inputPatch);
      return withPersistedCatalogPatch(storage, state.catalog, state, patch);
    });
  },

  showProportion: (label) => {
    set(state => {
      if (!state.catalog) return state;
      if (!state.hiddenProportionLabels.includes(label)) return state;

      const patch = withUpdatedCalculations(state, state.catalog, {
        hiddenProportionLabels: state.hiddenProportionLabels.filter(hiddenLabel => hiddenLabel !== label),
      });
      return withPersistedCatalogPatch(storage, state.catalog, state, patch);
    });
  },

  // ─── Recalculate ─────────────────────────────────────────────────

  recalculate: () => {
    set(state => (state.catalog ? calculateResults(state, state.catalog) : state));
  },
  }));
}

// Resolved once and reused by the interface for its own startup read
// (`readUserLayer(userLayerStorage)` in App.tsx), so the app never resolves
// `window.localStorage` a second, independent time.
export const userLayerStorage = getDefaultUserLayerStorage();
export const useBookStore = createBookStore(userLayerStorage);

// ─── Exported helpers for components ─────────────────────────────────────

export { getAllSheetSizes, getAllGrammageOptions, getAllSubstrates, getAllCovers, getAllPresses, getAllBindings, getAllProportions };
