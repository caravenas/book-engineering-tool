import { useBookStore, getSafeSpineResult } from '../store/useBookStore';
import { formatRoundedValue, formatWeight } from '../engine/units';
import { ResultList, ResultRow } from './ResultList';

/**
 * The spine panel's summary stats, read straight from the store instead of
 * taking props: R-2 moves this into its own component, where the panel that
 * draws the spine preview today won't be able to pass it anything.
 */
export function SpineResults() {
  const { totalPagesInput, spineResult, totalPages, selectedGrammage } = useBookStore();

  const safeResult = getSafeSpineResult(totalPagesInput, spineResult);
  const sheetCount = Math.ceil(totalPages / 2);

  if (!safeResult) return null;

  return (
    <ResultList>
      <ResultRow label="Lomo estimado (mm)">{formatRoundedValue(safeResult.thickness_mm, 2)}</ResultRow>
      <ResultRow label="Peso estimado del papel interior">{formatWeight(safeResult.totalWeight_g)}</ResultRow>
      <ResultRow label="Hojas de papel (interior)">{sheetCount}</ResultRow>
      <ResultRow label="Gramaje">{selectedGrammage} g/m²</ResultRow>
    </ResultList>
  );
}
