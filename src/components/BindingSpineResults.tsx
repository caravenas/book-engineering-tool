import { useBookStore, getAllBindings, getSelectedBindingInfo } from '../store/useBookStore';
import { formatRoundedValue } from '../engine/units';

/**
 * The binding panel's spine stat cards, read straight from the store instead
 * of taking props: R-3 moves this into its own column, where the panel that
 * draws it today won't be able to pass it anything.
 */
export function BindingSpineResults() {
  const { catalog, bindingId, customBindings, bindingPatches, hiddenBindingIds, bindingSpine } = useBookStore();

  const allBindings = catalog ? getAllBindings(catalog, customBindings, bindingPatches, hiddenBindingIds) : customBindings;
  const { hasFlatSpine } = getSelectedBindingInfo(allBindings, bindingId);

  if (!bindingSpine) return null;

  return (
    <div className="stat-grid spine-stat-grid" style={{ gap: '8px', marginTop: 'var(--space-4)' }}>
      <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
        <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
          {formatRoundedValue(bindingSpine.interior_mm, 2)}
        </div>
        <div className="stat-label">Lomo del papel interior (mm)</div>
      </div>
      <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
        <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
          {formatRoundedValue(bindingSpine.allowance_mm, 2)}
        </div>
        <div className="stat-label">Aporte de la encuadernación (mm)</div>
      </div>
      <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
        <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
          {formatRoundedValue(bindingSpine.total_mm, 2)}
        </div>
        <div className="stat-label">
          {hasFlatSpine ? 'Lomo final con encuadernación (mm)' : 'Grosor del papel en el pliegue (mm)'}
        </div>
      </div>
    </div>
  );
}
