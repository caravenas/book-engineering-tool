import { useBookStore, getAllBindings, getSelectedBindingInfo } from '../store/useBookStore';
import { useCatalogPanel } from './CatalogPanel';
import { ConfigSourceNote } from './ConfigSourceNote';
import { getCatalogOrigin, CatalogOriginNote } from './CatalogOrigin';

export function BindingPanel() {
  const { open: openCatalog } = useCatalogPanel();
  const {
    catalog,
    bindingId,
    customBindings,
    bindingPatches,
    hiddenBindingIds,
    userLayerStorageAvailable,
    setBinding,
    bindingPageCount,
    bindingSpine,
    bindingError,
  } = useBookStore();


  const allBindings = catalog ? getAllBindings(catalog, customBindings, bindingPatches, hiddenBindingIds) : customBindings;
  const isSelectedBindingCustom = customBindings.some(binding => binding.id === bindingId);
  const bindingOrigin = getCatalogOrigin(bindingId, customBindings.map(binding => binding.id), bindingPatches.map(patch => patch.id));
  const { hasFlatSpine } = getSelectedBindingInfo(allBindings, bindingId);


  return (
    <div className="panel" id="binding-panel">

      <div className="form-group" role="group" aria-labelledby="binding-group-label">
        <div className="form-label-row">
          <span id="binding-group-label" className="form-label">Encuadernación</span>
          <button
            type="button"
            className="step-options"
            aria-label="Opciones de encuadernación"
            aria-haspopup="dialog"
            onClick={() => openCatalog('bindings')}
          >
            ···
          </button>
        </div>
        <label className="visually-hidden" htmlFor="select-binding">Encuadernación seleccionada</label>
        <select
          className="form-input"
          value={bindingId}
          onChange={event => setBinding(event.target.value)}
          id="select-binding"
          aria-describedby={bindingPageCount && !bindingPageCount.ok ? 'binding-page-count-message' : undefined}
        >
          {allBindings.map(binding => (
            <option key={binding.id} value={binding.id}>{binding.name}</option>
          ))}
        </select>
        <CatalogOriginNote origin={bindingOrigin} />
        {isSelectedBindingCustom ? (
          <ConfigSourceNote text={userLayerStorageAvailable ? 'encuadernación personalizada' : 'encuadernación personalizada, guardada solo para esta sesión'} />
        ) : catalog && (
          <ConfigSourceNote file="config/encuadernaciones.json" text={catalog.bindingsSource} />
        )}
      </div>

      {bindingPageCount && !bindingPageCount.ok && (
        <p className="calculation-note" id="binding-page-count-message" role="status">{bindingPageCount.message}</p>
      )}

      {bindingError && (
        <p className="calculation-error" id="binding-calculation-error" role="status">{bindingError}</p>
      )}

      {bindingSpine && !hasFlatSpine && (
        <p className="calculation-note" style={{ marginTop: 'var(--space-2)' }}>
          Este método no tiene lomo plano: el libro queda con un pliegue, no un lomo cuadrado.
        </p>
      )}
    </div>
  );
}
