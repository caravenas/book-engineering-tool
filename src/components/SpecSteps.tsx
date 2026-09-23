import { useStepSummaries } from './specSummaries';
import { useIsPhone } from './useIsPhone';
import { StepOptions } from './StepOptions';
import { CanvasDesigner } from './CanvasDesigner';
import { SubstrateSelector } from './SubstrateSelector';
import { SpineCalculator } from './SpineCalculator';
import { BindingPanel } from './BindingPanel';
import { ImpositionVisualizer } from './ImpositionVisualizer';
import { CoverPanel } from './CoverPanel';
import type { CatalogId } from './CatalogPanel';

/**
 * The five steps, each with the catalog it leans on most and the name that
 * catalog is reached by. A step touches more than one catalog — imposition
 * alone has presses, sheets and schemes — and the rest are one click away
 * inside the catalog itself.
 */
const STEPS: { title: string; catalog: CatalogId; options: string }[] = [
  { title: 'Formato', catalog: 'proportions', options: 'formato' },
  { title: 'Papel interior', catalog: 'substrates', options: 'papel' },
  { title: 'Páginas y encuadernación', catalog: 'bindings', options: 'páginas y encuadernación' },
  { title: 'Imposición', catalog: 'presses', options: 'imposición' },
  { title: 'Tapa', catalog: 'covers', options: 'tapa' },
];

/**
 * The five steps read as a spec sheet whether or not any of them is open: each
 * closed step still shows what it currently says, so the whole sheet can be
 * read at a glance and opened only where something needs changing.
 *
 * Built on <details>, which handles the keyboard and announces the expanded
 * state for free. Until R-19 they also carried a shared `name`, which made
 * them exclusive: opening one closed the last. The design canvas opens and
 * closes them independently and starts with all five open, which is what a
 * spec sheet is — the whole of it, in order, with the part you are working on
 * where you left it rather than where the last click put it.
 *
 * Steps are not panels: pages and binding are one step because a page count
 * that a binding method rejects is a single decision, not two.
 */
export function SpecSteps() {
  const summaries = useStepSummaries();
  /*
   * Five steps open is the whole sheet in order, which is what a sheet is —
   * on a screen wide enough to put it beside everything else. On a phone the
   * page is one column, the five open steps are 3300px of it, and everything
   * the tool works out is below them. Closed, the sheet is five lines that
   * still say what they hold, which is the property the accordion was built
   * for and what makes it readable at that width.
   */
  const startClosed = useIsPhone();
  const contents = [
    <CanvasDesigner key="format" />,
    <SubstrateSelector key="substrate" />,
    <>
      <SpineCalculator key="spine" />
      <BindingPanel key="binding" />
    </>,
    <ImpositionVisualizer key="imposition" />,
    <CoverPanel key="cover" />,
  ];

  return (
    <>
      {STEPS.map((step, index) => (
        <details key={step.title} className="spec-step" open={!startClosed}>
          <summary className="spec-step-summary">
            <span className="spec-step-number">{String(index + 1).padStart(2, '0')}</span>
            <h2 className="panel-title spec-step-title">{step.title}</h2>
            <StepOptions catalog={step.catalog} label={step.options} />
            {/* What the step says while it is closed, under its title rather
                than beside it: a long title used to squeeze the value into an
                ellipsis, and the whole point of the line is that it is read.
                It stays inside the summary because everything else inside a
                <details> is what the closed state hides. */}
            <span className="spec-step-value">{summaries[index]}</span>
          </summary>
          <div className="spec-step-body">{contents[index]}</div>
        </details>
      ))}
    </>
  );
}
