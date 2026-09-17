import { useBookStore } from '../store/useBookStore';
import { roundTo } from '../engine/units';
import { ConfigSourceNote } from './ConfigSourceNote';

function formatRoundedValue(value: number, decimals: number): string {
  const roundedValue = roundTo(value, decimals);
  return Number.isFinite(roundedValue) ? String(roundedValue) : value.toExponential();
}

export function BindingPanel() {
  const {
    catalog,
    bindingId,
    setBinding,
    bindingPageCount,
    bindingSpine,
    bindingCreep,
    bindingError,
  } = useBookStore();

  const selectedBinding = catalog?.bindings.find(binding => binding.id === bindingId) ?? null;
  const hasFlatSpine = selectedBinding ? !selectedBinding.nests : true;

  return (
    <div className="panel" id="binding-panel">
      <h2 className="panel-title">Encuadernación</h2>

      <div className="form-group">
        <label className="form-label" htmlFor="select-binding">Encuadernación</label>
        <select
          className="form-input"
          value={bindingId}
          onChange={event => setBinding(event.target.value)}
          id="select-binding"
          aria-describedby={bindingPageCount && !bindingPageCount.ok ? 'binding-page-count-message' : undefined}
        >
          {catalog?.bindings.map(binding => (
            <option key={binding.id} value={binding.id}>{binding.name}</option>
          ))}
        </select>
        {catalog && (
          <ConfigSourceNote file="config/encuadernaciones.json" text={catalog.bindingsSource} />
        )}
      </div>

      {bindingPageCount && !bindingPageCount.ok && (
        <p className="calculation-note" id="binding-page-count-message" role="status">{bindingPageCount.message}</p>
      )}

      {bindingError && (
        <p className="calculation-error" id="binding-calculation-error" role="status">{bindingError}</p>
      )}

      {bindingSpine && (
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
      )}

      {bindingSpine && !hasFlatSpine && (
        <p className="calculation-note" style={{ marginTop: 'var(--space-2)' }}>
          Este método no tiene lomo plano: el libro queda con un pliegue, no un lomo cuadrado.
        </p>
      )}

      {bindingCreep && (
        <p className="calculation-note" style={{ marginTop: 'var(--space-4)' }}>
          Corrimiento (creep): esta encuadernación anida pliegos plegados de 4 páginas, uno dentro de otro; hay {bindingCreep.nestedSheets} pliegos anidados.
          El pliego más externo se desplaza un máximo de {formatRoundedValue(bindingCreep.maxShift_mm, 3)} mm y el más interno no se desplaza.
          Este pliego plegado es distinto del pliego de prensa de Imposición por firmas, porque aquí se cuenta cada grupo de 4 páginas ya plegado, sin importar el esquema de plegado elegido arriba.
        </p>
      )}
    </div>
  );
}
