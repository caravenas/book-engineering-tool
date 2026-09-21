import { useBookStore } from '../store/useBookStore';
import { roundTo } from '../engine/units';
import { ResultList, ResultRow } from './ResultList';

/**
 * The imposition visualizer's summary stats, read straight from the store
 * instead of taking props: R-3 moves this into its own column, where the
 * panel that draws it today won't be able to pass it anything.
 */
export function ImpositionResults() {
  const { signaturePlan, signatureError } = useBookStore();
  const selected = signaturePlan?.selected ?? null;

  /*
   * No selection and no error is a real state: when no folding scheme fits the
   * sheet, the store reports a plan with nothing chosen and nothing to say
   * about it. The full explanation lives with the sheet drawing, which is a
   * view the reader may not be looking at, so the column that just emptied
   * says why rather than going blank.
   */
  if (!selected) {
    return signatureError ? null : (
      <p className="calculation-note" role="status">
        Sin imposición: ningún esquema de plegado cabe con el pliego y la prensa elegidos.
        La vista Pliego lo explica.
      </p>
    );
  }

  return (
    <ResultList>
      <ResultRow label="Páginas / cara del pliego">{selected.cols * selected.rows}</ResultRow>
      <ResultRow label="Firmas por ejemplar">{selected.signatures}</ResultRow>
      <ResultRow label="Páginas en blanco">{selected.blankPages}</ResultRow>
      <ResultRow label="Pliegos de prensa por ejemplar">{selected.sheetsPerCopy}</ResultRow>
      <ResultRow label="Área imprimible no utilizada">{roundTo(selected.wastePercentage, 1)}%</ResultRow>
      <ResultRow label="Orientación de página">{selected.pageRotated ? 'Rotada' : 'Normal'}</ResultRow>
    </ResultList>
  );
}
