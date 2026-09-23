import {
  useBookStore,
  getSafeSpineResult,
  getPlannedCover,
  getAllSubstrates,
  getAllGrammageOptions,
  getAllCovers,
  getAllBindings,
  getAllPresses,
  getAllSheetSizes,
  getSelectedBindingInfo,
} from '../store/useBookStore';
import type {
  Binding, Cover, Press, SheetSize, SignatureOption, Substrate,
  SoftCoverResult, HardCoverResult,
} from '../types';

/**
 * How much the drawings exaggerate the spine. A 32-page book is two
 * millimetres thick: at true scale it is a line, and a line says nothing about
 * a thickness. Every drawing that shows a spine beside something else uses
 * this same factor and declares it, so the two drawings can be compared.
 */
export const SPINE_EXAGGERATION = 8;

/**
 * Everything the figures view draws, derived once.
 *
 * The four result lists each read the store for themselves, which is right for
 * a list of rows: each one belongs to the engine that produced it. The drawn
 * figures do not work that way — the hero puts the page, the spine and the
 * stack of sheets at one scale, and the spine it draws has to be the spine the
 * spine figure reports. One derivation, read by all of them.
 */
export interface BookFigures {
  pageWidth_mm: number;
  pageHeight_mm: number;
  totalPages: number;
  /** Physical sheets of paper in the block: two pages apiece. */
  sheets: number;
  /** The declared caliper of the chosen paper, in microns. */
  caliper_mm: number;
  substrate: Substrate | null;
  binding: Binding | null;
  cover: Cover | null;
  press: Press | null;
  sheetSize: SheetSize | null;
  /** The paper block alone, and what the binding method adds to it. */
  interiorSpine_mm: number | null;
  spineAllowance_mm: number;
  /** Paper plus the binding's own allowance: the spine a printer is quoted. */
  spineTotal_mm: number | null;
  /** One board of a hard cover, or zero for a soft one. */
  board_mm: number;
  /** Spine plus both boards: the whole edge of the finished book. */
  edgeTotal_mm: number | null;
  interiorWeight_g: number | null;
  coverWeight_g: number | null;
  /** Interior plus cover paper. Board is never in it: see `boardUnweighed`. */
  paperWeight_g: number | null;
  /** True when the cover has board the catalog declares no density for. */
  boardUnweighed: boolean;
  plan: SignatureOption | null;
  coverPlan: SoftCoverResult | HardCoverResult | null;
  hasFlatSpine: boolean;
}

/** The caliper the chosen paper declares at the chosen weight, in microns. */
function selectedCaliper(
  substrates: Substrate[], substrateId: string, customGrammages: { substrateId: string; grammage: number; caliper: number }[], grammage: number
): number {
  return getAllGrammageOptions(substrates, substrateId, customGrammages)
    .find(option => option.grammage === grammage)?.caliper ?? 0;
}

export function useBookFigures(): BookFigures {
  const {
    catalog, totalPages, totalPagesInput, spineResult, bindingSpine, signaturePlan, coverPlan,
    pageWidth_mm, pageHeight_mm,
    substrateId, selectedGrammage, customSubstrates, substratePatches, hiddenSubstrateIds, customGrammages,
    bindingId, customBindings, bindingPatches, hiddenBindingIds,
    coverId, customCovers, coverPatches, hiddenCoverIds,
    pressId, customPresses, pressPatches, hiddenPressIds,
    sheetSizeId, customSheetSizes, sheetSizePatches, hiddenSheetSizeIds,
  } = useBookStore();

  const safeSpine = getSafeSpineResult(totalPagesInput, spineResult);
  const substrates = catalog ? getAllSubstrates(catalog, customSubstrates, substratePatches, hiddenSubstrateIds) : customSubstrates;
  const bindings = catalog ? getAllBindings(catalog, customBindings, bindingPatches, hiddenBindingIds) : customBindings;
  const cover = (catalog ? getAllCovers(catalog, customCovers, coverPatches, hiddenCoverIds) : customCovers)
    .find(item => item.id === coverId) ?? null;
  const plannedCover = getPlannedCover(coverPlan);

  const board_mm = cover?.boardThickness_mm ?? 0;
  const spineTotal_mm = bindingSpine?.total_mm ?? safeSpine?.thickness_mm ?? null;
  const interiorWeight_g = safeSpine?.totalWeight_g ?? null;
  const coverWeight_g = plannedCover?.paperWeight_g ?? null;

  return {
    pageWidth_mm,
    pageHeight_mm,
    totalPages,
    sheets: Math.ceil(totalPages / 2),
    caliper_mm: selectedCaliper(substrates, substrateId, customGrammages, selectedGrammage),
    substrate: substrates.find(item => item.id === substrateId) ?? null,
    binding: bindings.find(item => item.id === bindingId) ?? null,
    cover,
    press: (catalog ? getAllPresses(catalog, customPresses, pressPatches, hiddenPressIds) : customPresses)
      .find(item => item.id === pressId) ?? null,
    sheetSize: (catalog ? getAllSheetSizes(catalog, customSheetSizes, sheetSizePatches, hiddenSheetSizeIds) : customSheetSizes)
      .find(item => item.id === sheetSizeId) ?? null,
    interiorSpine_mm: bindingSpine?.interior_mm ?? safeSpine?.thickness_mm ?? null,
    spineAllowance_mm: bindingSpine?.allowance_mm ?? 0,
    spineTotal_mm,
    board_mm,
    edgeTotal_mm: spineTotal_mm === null ? null : spineTotal_mm + 2 * board_mm,
    interiorWeight_g,
    coverWeight_g,
    /*
     * Both or neither: a total made of one of the two addends would be a
     * smaller book than the one on screen, reported as if it were the book.
     */
    paperWeight_g: interiorWeight_g === null || coverWeight_g === null
      ? null
      : interiorWeight_g + coverWeight_g,
    boardUnweighed: board_mm > 0,
    plan: signaturePlan?.selected ?? null,
    coverPlan: plannedCover,
    hasFlatSpine: getSelectedBindingInfo(bindings, bindingId).hasFlatSpine,
  };
}
