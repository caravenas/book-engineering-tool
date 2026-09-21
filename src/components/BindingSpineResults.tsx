import { useBookStore, getAllBindings, getSelectedBindingInfo } from '../store/useBookStore';
import { formatRoundedValue } from '../engine/units';
import { ResultList, ResultRow } from './ResultList';

/**
 * The binding panel's spine stat cards, read straight from the store instead
 * of taking props: R-3 moves this into its own column, where the panel that
 * draws it today won't be able to pass it anything.
 */
export function BindingSpineResults() {
  const { catalog, bindingId, customBindings, bindingPatches, hiddenBindingIds, bindingSpine } = useBookStore();

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
    </ResultList>
  );
}
