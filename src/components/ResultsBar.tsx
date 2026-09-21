import { useBookStore, getSafeSpineResult } from '../store/useBookStore';
import { formatRoundedValue, formatWeight } from '../engine/units';

/**
 * The three figures worth keeping in view on a phone, pinned to the top of
 * the page while everything else scrolls under them.
 *
 * Stacked into one column, the results sit below five steps and a drawing, so
 * changing a page count and seeing what it does to the spine means scrolling
 * the length of the tool and back. These three are the ones that answer "did
 * that help?": the spine you quote, the press sheets you pay for, and the
 * weight you ship. The full column is still below, unabridged.
 *
 * Above the breakpoint the three columns already sit side by side, so there
 * is nothing to pin and the bar does not render.
 */
export function ResultsBar() {
  const { bindingSpine, signaturePlan, totalPagesInput, spineResult } = useBookStore();

  const safeResult = getSafeSpineResult(totalPagesInput, spineResult);
  const sheets = signaturePlan?.selected?.sheetsPerCopy ?? null;

  /*
   * An em dash rather than a hidden row: the bar has to keep its height and
   * its three places whatever the state, or it would jump the page under the
   * reader's thumb every time a figure came or went.
   */
  const figures: { label: string; value: string }[] = [
    { label: 'Lomo', value: bindingSpine ? `${formatRoundedValue(bindingSpine.total_mm, 2)} mm` : '—' },
    { label: 'Pliegos', value: sheets === null ? '—' : String(sheets) },
    { label: 'Peso interior', value: safeResult ? formatWeight(safeResult.totalWeight_g) : '—' },
  ];

  return (
    <section className="results-bar" aria-label="Resumen">
      {figures.map(({ label, value }) => (
        <div key={label} className="results-bar-figure">
          <span className="results-bar-label">{label}</span>
          <span className="results-bar-value">{value}</span>
        </div>
      ))}
    </section>
  );
}
