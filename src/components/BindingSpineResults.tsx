import { useBookStore, getAllBindings, getSelectedBindingInfo } from '../store/useBookStore';
import { formatRoundedValue } from '../engine/units';
import { ResultList, ResultRow } from './ResultList';

/**
 * The binding panel's spine stat cards, read straight from the store instead
 * of taking props: R-3 moves this into its own column, where the panel that
 * draws it today won't be able to pass it anything.
 */
export function BindingSpineResults() {
  const { catalog, bindingId, customBindings, bindingPatches, hiddenBindingIds, bindingSpine, bindingCreep } = useBookStore();

  const allBindings = catalog ? getAllBindings(catalog, customBindings, bindingPatches, hiddenBindingIds) : customBindings;
  const { hasFlatSpine } = getSelectedBindingInfo(allBindings, bindingId);

  if (!bindingSpine) return null;

  return (
    <ResultList>
      <ResultRow label="Lomo del papel interior (mm)">{formatRoundedValue(bindingSpine.interior_mm, 2)}</ResultRow>
      <ResultRow label="Aporte de la encuadernación (mm)">{formatRoundedValue(bindingSpine.allowance_mm, 2)}</ResultRow>
      <ResultRow label={hasFlatSpine ? 'Lomo final con encuadernación (mm)' : 'Grosor del papel en el pliegue (mm)'}>
        {formatRoundedValue(bindingSpine.total_mm, 2)}
      </ResultRow>
      {/* A method that nests its sheets shifts the outermost one; one that does
          not has no creep to report, and reporting a zero would suggest it was
          measured rather than inapplicable. The paragraph that explains it is
          in "Cómo se calcula", at the foot of this column. */}
      {bindingCreep && (
        <ResultRow label="Corrimiento máx. (mm)">{formatRoundedValue(bindingCreep.maxShift_mm, 3)}</ResultRow>
      )}
    </ResultList>
  );
}
