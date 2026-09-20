import { useBookStore } from '../store/useBookStore';
import { roundTo } from '../engine/units';

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
