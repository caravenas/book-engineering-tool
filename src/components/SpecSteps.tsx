import { useStepSummaries } from './specSummaries';
import { CanvasDesigner } from './CanvasDesigner';
import { SubstrateSelector } from './SubstrateSelector';
import { SpineCalculator } from './SpineCalculator';
import { BindingPanel } from './BindingPanel';
import { ImpositionVisualizer } from './ImpositionVisualizer';
import { CoverPanel } from './CoverPanel';

const STEP_TITLES = [
  'Formato',
  'Papel interior',
  'Páginas y encuadernación',
  'Imposición',
  'Tapa',
];

/**
 * The five steps read as a spec sheet whether or not any of them is open: each
 * closed step still shows what it currently says, so the whole sheet can be
 * read at a glance and opened only where something needs changing.
 *
 * Built on <details name>, which gives the accordion its exclusive behaviour,
 * its keyboard handling and its announced expanded state for free. Where that
 * attribute is not supported the steps simply all open at once, which is a
 * worse layout rather than a broken one.
 *
 * Steps are not panels: pages and binding are one step because a page count
 * that a binding method rejects is a single decision, not two.
 */
export function SpecSteps() {
  const summaries = useStepSummaries();
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
      {STEP_TITLES.map((title, index) => (
        <details
          key={title}
          name="ficha"
          className="spec-step"
          open={index === 0}
        >
          <summary className="spec-step-summary">
            <span className="spec-step-number">{String(index + 1).padStart(2, '0')}</span>
            <h2 className="panel-title spec-step-title">{title}</h2>
            <span className="spec-step-value">{summaries[index]}</span>
          </summary>
          <div className="spec-step-body">{contents[index]}</div>
        </details>
      ))}
    </>
  );
}
