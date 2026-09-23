import { BookHero } from './BookHero';
import { ResultFigures } from './ResultFigures';
import { SpineResults } from './SpineResults';
import { BindingSpineResults } from './BindingSpineResults';
import { ImpositionResults } from './ImpositionResults';
import { CoverResults } from './CoverResults';
import { HowItIsCalculated } from './HowItIsCalculated';

/**
 * Everything the engines work out, in the middle of the screen, in the order
 * the design canvas puts it: the book itself first, then the six figures that
 * answer "what does this come out as", then what those six are made of, then
 * how any of it is worked out.
 *
 * The six are drawn and the rest are rows, which is a division of labour
 * rather than a ranking: a spine is worth drawing because it is a thickness
 * nobody can picture from a number, and "páginas en blanco: 0" is worth
 * exactly one line. Nothing the engines report left the page in R-23; five of
 * the old labels became three, and both of each pair's numbers are still
 * printed — the two weights inside one weight, the cover's width and height
 * inside one measurement.
 */
export function ResultsView() {
  return (
    <div className="results-view">
      <BookHero />
      <ResultFigures />

      {/* The breakdown, under a rule: the addends of the figures above, and
          the results that are a line and nothing more. */}
      <div className="result-detail">
        <div className="detail-group"><SpineResults /></div>
        <div className="detail-group"><BindingSpineResults /></div>
        <div className="detail-group"><ImpositionResults /></div>
        <div className="detail-group"><CoverResults /></div>
      </div>

      <HowItIsCalculated />
    </div>
  );
}
