import { useBookStore, getPlannedCover } from '../store/useBookStore';
import { formatMm, formatWeight, formatArea } from '../engine/units';

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
        <div className="stat-grid spine-stat-grid" style={{ gap: '8px', marginTop: 'var(--space-4)' }}>
          <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
            <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
              {formatMm(plan.sheetWidth_mm)}
            </div>
            <div className="stat-label">Ancho del pliego de tapa (mm)</div>
          </div>
          <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
            <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
              {formatMm(plan.sheetHeight_mm)}
            </div>
            <div className="stat-label">Alto del pliego de tapa (mm)</div>
          </div>
          <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
            <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
              {formatWeight(plan.paperWeight_g)}
            </div>
            <div className="stat-label">Peso del papel de tapa</div>
          </div>
        </div>

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
        <div className="stat-grid spine-stat-grid" style={{ gap: '8px', marginTop: 'var(--space-4)' }}>
          <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
            <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
              {formatMm(plan.boardWidth_mm)}
            </div>
            <div className="stat-label">Ancho del cartón lateral (mm)</div>
          </div>
          <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
            <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
              {formatMm(plan.boardHeight_mm)}
            </div>
            <div className="stat-label">Alto del cartón (mm)</div>
          </div>
          <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
            <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
              {formatMm(plan.spineBoardWidth_mm)}
            </div>
            <div className="stat-label">Ancho del cartón de lomo (mm)</div>
          </div>
          <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
            <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
              {formatMm(plan.wrapWidth_mm)}
            </div>
            <div className="stat-label">Ancho del forro (mm)</div>
          </div>
          <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
            <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
              {formatMm(plan.wrapHeight_mm)}
            </div>
            <div className="stat-label">Alto del forro (mm)</div>
          </div>
          <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
            <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
              {formatWeight(plan.paperWeight_g)}
            </div>
            <div className="stat-label">Peso del forro</div>
          </div>
          <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
            <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
              {formatArea(plan.sideBoardArea_m2)}
            </div>
            <div className="stat-label">Área de cartón lateral (m²)</div>
          </div>
          <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
            <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
              {formatArea(plan.spineBoardArea_m2)}
            </div>
            <div className="stat-label">Área de cartón de lomo (m²)</div>
          </div>
          <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
            <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
              {formatArea(plan.boardArea_m2)}
            </div>
            <div className="stat-label">Área total de cartón (m²)</div>
          </div>
        </div>
        <p className="calculation-note" style={{ marginTop: 'var(--space-2)' }}>
          No se calcula el peso del cartón: el catálogo no declara una densidad de cartón, e inventar una produciría un número ficticio.
        </p>
      </>
    );
  }

  return null;
}
