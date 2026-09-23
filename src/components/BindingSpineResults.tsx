import { useBookStore } from '../store/useBookStore';
import { formatRoundedValue } from '../engine/units';
import { ResultList, ResultRow } from './ResultList';

/**
 * The binding panel's spine stat cards, read straight from the store instead
 * of taking props: R-3 moves this into its own column, where the panel that
 * draws it today won't be able to pass it anything.
 */
export function BindingSpineResults() {
  const { bindingSpine, bindingCreep } = useBookStore();

  if (!bindingSpine) return null;

  return (
    <ResultList>
      {/*
        * What the method adds, and nothing else. `interior_mm` is the spine
        * engine's own `thickness_mm` passed straight through, so the row that
        * reported it here said «Lomo del papel interior 1.92» beside «Lomo
        * estimado 1.92» — one number under two names, side by side since R-22
        * put the breakdown in one grid. The sum of the two is the drawn
        * figure above, where it is measured against the spines of known books.
        */}
      <ResultRow label="Aporte de la encuadernación" unit="mm">{formatRoundedValue(bindingSpine.allowance_mm, 2)}</ResultRow>
      {/* A method that nests its sheets shifts the outermost one; one that does
          not has no creep to report, and reporting a zero would suggest it was
          measured rather than inapplicable. The paragraph that explains it is
          in "Cómo se calcula", at the foot of this column. */}
      {bindingCreep && (
        <ResultRow label="Corrimiento máx." unit="mm">{formatRoundedValue(bindingCreep.maxShift_mm, 3)}</ResultRow>
      )}
    </ResultList>
  );
}
