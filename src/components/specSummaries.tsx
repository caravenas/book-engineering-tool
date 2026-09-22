import { useBookStore, getAllBindings, getAllCovers, getAllPresses, getAllSubstrates, parsePositiveSafeInteger } from '../store/useBookStore';
import { getPageDisplayDimensions } from '../engine/units';

/**
 * What each step of the spec sheet currently says, in one line apiece.
 *
 * It lives apart from the steps because since R-18 two places say it: the
 * step's own summary row, and the running summary in the header. Reading it
 * twice from the store would be two derivations of one sentence, free to
 * drift the day either is changed; there is one, and both render it.
 */
export function useStepSummaries(): string[] {
  const {
    catalog,
    pageWidth_mm,
    pageHeight_mm,
    bleed_mm,
    unitSystem,
    proportionId,
    substrateId,
    customSubstrates,
    substratePatches,
    hiddenSubstrateIds,
    selectedGrammage,
    totalPagesInput,
    bindingId,
    customBindings,
    bindingPatches,
    hiddenBindingIds,
    pressId,
    customPresses,
    pressPatches,
    hiddenPressIds,
    coverId,
    customCovers,
    coverPatches,
    hiddenCoverIds,
  } = useBookStore();

  const { displayW, displayH, unit } = getPageDisplayDimensions(pageWidth_mm, pageHeight_mm, bleed_mm, unitSystem);
  // Those come back empty for a value that isn't finite, which would leave the
  // step reading " ×  mm" and looking like a rendering fault instead of a
  // dimension waiting to be fixed.
  const hasDimensions = displayW !== '' && displayH !== '';
  const substrate = (catalog ? getAllSubstrates(catalog, customSubstrates, substratePatches, hiddenSubstrateIds) : customSubstrates)
    .find(item => item.id === substrateId) ?? null;
  const binding = (catalog ? getAllBindings(catalog, customBindings, bindingPatches, hiddenBindingIds) : customBindings)
    .find(item => item.id === bindingId) ?? null;
  const press = (catalog ? getAllPresses(catalog, customPresses, pressPatches, hiddenPressIds) : customPresses)
    .find(item => item.id === pressId) ?? null;
  const cover = (catalog ? getAllCovers(catalog, customCovers, coverPatches, hiddenCoverIds) : customCovers)
    .find(item => item.id === coverId) ?? null;

  // A summary reports the field as typed, not as last understood: showing the
  // last valid page count beside a field holding something else would say the
  // step is settled when it is not. Judged by the same parser the field uses,
  // because comparing the text to the number called "0" settled, which errors
  // everywhere downstream, and called "032" undefined, which is just 32.
  const typedPages = parsePositiveSafeInteger(totalPagesInput);
  const pages = typedPages === null ? 'páginas sin definir' : `${typedPages} págs`;

  return [
    hasDimensions
      ? `${displayW} × ${displayH} ${unit} · ${proportionId ?? 'manual'}`
      : 'dimensiones sin definir',
    `${substrate?.name ?? 'sin papel'} · ${selectedGrammage} g/m²`,
    `${pages} · ${binding?.name ?? 'sin método'}`,
    press?.name ?? 'sin prensa',
    cover?.name ?? 'sin tapa',
  ];
}

/**
 * The header's running summary: the first three steps, which are what the
 * book is — its format, its paper and its length. The press and the cover are
 * left out because they are how it is made rather than what it is, and the
 * line has to stay readable at a glance.
 */
export function SpecSummary() {
  const summaries = useStepSummaries();
  return <span className="header-summary">{summaries.slice(0, 3).join(' · ')}</span>;
}
