import { useBookStore, getAllBindings, getAllCovers, getAllPresses, getAllSubstrates, parsePositiveSafeInteger } from '../store/useBookStore';
import { getPageDisplayDimensions } from '../engine/units';
import { CanvasDesigner } from './CanvasDesigner';
import { SubstrateSelector } from './SubstrateSelector';
import { SpineCalculator } from './SpineCalculator';
import { BindingPanel } from './BindingPanel';
import { ImpositionVisualizer } from './ImpositionVisualizer';
import { CoverPanel } from './CoverPanel';

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
function useStepSummaries(): string[] {
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

const STEP_TITLES = [
  'Formato',
  'Papel interior',
  'Páginas y encuadernación',
  'Imposición',
  'Tapa',
];

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
