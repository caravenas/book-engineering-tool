import { useBookStore, getPlannedCover } from '../store/useBookStore';
import { formatMm, formatWeightParts, formatArea } from '../engine/units';
import { ResultList, ResultRow } from './ResultList';

/**
 * The cover panel's stat cards and their accompanying notes, read straight
 * from the store instead of taking props: R-3 moves this into its own
 * column, where the panel that draws it today won't be able to pass it
 * anything. The soft and hard cover cases are mutually exclusive branches of
 * the same result, so they live in one component instead of two.
 */
export function CoverResults() {
  const { coverPlan } = useBookStore();
  const plan = getPlannedCover(coverPlan);

  if (plan && plan.kind === 'blanda') {
    return (
      <>
        <ResultList>
          <ResultRow label="Ancho del pliego de tapa" unit="mm">{formatMm(plan.sheetWidth_mm)}</ResultRow>
          <ResultRow label="Alto del pliego de tapa" unit="mm">{formatMm(plan.sheetHeight_mm)}</ResultRow>
          <ResultRow label="Peso del papel de tapa" unit={formatWeightParts(plan.paperWeight_g).unit}>{formatWeightParts(plan.paperWeight_g).value}</ResultRow>
        </ResultList>

        <ul className="cover-sections-list" aria-label="Secciones del pliego de tapa">
          <li>Solapa: {formatMm(plan.sections.flapLeft_mm)} mm</li>
          <li>Contratapa: {formatMm(plan.sections.back_mm)} mm</li>
          <li>Lomo: {formatMm(plan.sections.spine_mm)} mm</li>
          <li>Portada: {formatMm(plan.sections.front_mm)} mm</li>
          <li>Solapa: {formatMm(plan.sections.flapRight_mm)} mm</li>
        </ul>

        {plan.sections.spine_mm === 0 && (
          <p className="calculation-note" style={{ marginTop: 'var(--space-2)' }}>
            Este método pliega una sola hoja por el centro, así que la tapa no tiene panel de lomo.
          </p>
        )}
      </>
    );
  }

  if (plan && plan.kind === 'dura') {
    return (
      <>
        <ResultList>
          <ResultRow label="Ancho del cartón lateral" unit="mm">{formatMm(plan.boardWidth_mm)}</ResultRow>
          <ResultRow label="Alto del cartón" unit="mm">{formatMm(plan.boardHeight_mm)}</ResultRow>
          <ResultRow label="Ancho del cartón de lomo" unit="mm">{formatMm(plan.spineBoardWidth_mm)}</ResultRow>
          <ResultRow label="Ancho del forro" unit="mm">{formatMm(plan.wrapWidth_mm)}</ResultRow>
          <ResultRow label="Alto del forro" unit="mm">{formatMm(plan.wrapHeight_mm)}</ResultRow>
          <ResultRow label="Peso del forro" unit={formatWeightParts(plan.paperWeight_g).unit}>{formatWeightParts(plan.paperWeight_g).value}</ResultRow>
          <ResultRow label="Área de cartón lateral" unit="m²">{formatArea(plan.sideBoardArea_m2)}</ResultRow>
          <ResultRow label="Área de cartón de lomo" unit="m²">{formatArea(plan.spineBoardArea_m2)}</ResultRow>
          <ResultRow label="Área total de cartón" unit="m²">{formatArea(plan.boardArea_m2)}</ResultRow>
        </ResultList>
        <p className="calculation-note" style={{ marginTop: 'var(--space-2)' }}>
          No se calcula el peso del cartón: el catálogo no declara una densidad de cartón, e inventar una produciría un número ficticio.
        </p>
      </>
    );
  }

  return null;
}
