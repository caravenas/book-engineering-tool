import { SpineResults } from './SpineResults';
import { BindingSpineResults } from './BindingSpineResults';
import { ImpositionResults } from './ImpositionResults';
import { CoverResults } from './CoverResults';
import { HowItIsCalculated } from './HowItIsCalculated';

/**
 * Everything the engines work out, in the middle of the screen.
 *
 * It is the same four lists and the same derivations it was in the right-hand
 * column; what changed in R-22 is where they are read. The column was 336px
 * wide and the figures were read down it while the drawing sat beside them;
 * the canvas gives them the middle and the drawings a view of their own, so
 * the rows keep a column's width and take the centre of it rather than
 * stretching a label and its figure to a metre apart.
 */
export function ResultsView() {
  return (
    <div className="results-view">
      <SpineResults />
      <BindingSpineResults />
      <ImpositionResults />
      <CoverResults />
      <HowItIsCalculated />
    </div>
  );
}
