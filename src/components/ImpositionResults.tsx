import { useBookStore } from '../store/useBookStore';
import { roundTo } from '../engine/units';

/**
 * The imposition visualizer's summary stats, read straight from the store
 * instead of taking props: R-3 moves this into its own column, where the
 * panel that draws it today won't be able to pass it anything.
 */
export function ImpositionResults() {
  const { signaturePlan } = useBookStore();
  const selected = signaturePlan?.selected ?? null;

  if (!selected) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', marginTop: 'var(--space-6)' }}>
      <div style={{ padding: 'var(--space-3)', textAlign: 'center', borderRight: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{selected.cols * selected.rows}</div>
        <div className="stat-label">Páginas / cara del pliego</div>
      </div>
      <div style={{ padding: 'var(--space-3)', textAlign: 'center', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{selected.signatures}</div>
        <div className="stat-label">Firmas por ejemplar</div>
      </div>
      <div style={{ padding: 'var(--space-3)', textAlign: 'center', borderRight: '1px solid var(--color-border)' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{selected.blankPages}</div>
        <div className="stat-label">Páginas en blanco</div>
      </div>
      <div style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{selected.sheetsPerCopy}</div>
        <div className="stat-label">Pliegos de prensa por ejemplar</div>
      </div>
      <div style={{ padding: 'var(--space-3)', textAlign: 'center', borderRight: '1px solid var(--color-border)', borderTop: '1px solid var(--color-border)' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{roundTo(selected.wastePercentage, 1)}%</div>
        <div className="stat-label">Área imprimible no utilizada</div>
      </div>
      <div style={{ padding: 'var(--space-3)', textAlign: 'center', borderTop: '1px solid var(--color-border)' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{selected.pageRotated ? 'Rotada' : 'Normal'}</div>
        <div className="stat-label">Orientación de página</div>
      </div>
    </div>
  );
}
