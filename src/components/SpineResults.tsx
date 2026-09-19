import { useBookStore, getSafeSpineResult } from '../store/useBookStore';
import { formatRoundedValue } from '../engine/units';

/**
 * The spine panel's summary stats, read straight from the store instead of
 * taking props: R-2 moves this into its own component, where the panel that
 * draws the spine preview today won't be able to pass it anything.
 */
export function SpineResults() {
  const { totalPagesInput, spineResult, totalPages, selectedGrammage } = useBookStore();

  const safeResult = getSafeSpineResult(totalPagesInput, spineResult);
  const sheetCount = Math.ceil(totalPages / 2);

  if (!safeResult) return null;

  return (
    <div className="stat-grid spine-stat-grid" style={{ gap: '8px' }}>
      <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
        <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
          {formatRoundedValue(safeResult.thickness_mm, 2)}
        </div>
        <div className="stat-label">Lomo estimado (mm)</div>
      </div>
      <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
        <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
          {safeResult.totalWeight_g >= 1000
            ? `${formatRoundedValue(safeResult.totalWeight_g / 1000, 2)} kg`
            : `${formatRoundedValue(safeResult.totalWeight_g, 1)} g`}
        </div>
        <div className="stat-label">Peso estimado del papel interior</div>
      </div>
      <div className="stat-card" role="group" aria-label="Hojas de papel (interior)" style={{ borderRadius: '12px', padding: '10px 4px' }}>
        <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>{sheetCount}</div>
        <div className="stat-label">Hojas de papel (interior)</div>
      </div>
      <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
        <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>{selectedGrammage} g/m²</div>
        <div className="stat-label">Gramaje</div>
      </div>
    </div>
  );
}
