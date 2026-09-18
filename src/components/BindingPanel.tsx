import { useState } from 'react';
import { useBookStore, getAllBindings } from '../store/useBookStore';
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
    customBindings,
    customBindingError,
    userLayerStorageAvailable,
    setBinding,
    addCustomBinding,
    removeCustomBinding,
    clearCustomBindingError,
    bindingPageCount,
    bindingSpine,
    bindingCreep,
    bindingError,
  } = useBookStore();

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [name, setName] = useState('');
  const [pageMultiple, setPageMultiple] = useState('');
  const [minPages, setMinPages] = useState('');
  const [maxPages, setMaxPages] = useState('');
  const [spineAllowance, setSpineAllowance] = useState('');
  const [nests, setNests] = useState(false);
  const [requiresSignatureMultiple, setRequiresSignatureMultiple] = useState(false);

  const allBindings = catalog ? getAllBindings(catalog, customBindings) : customBindings;
  const isSelectedBindingCustom = customBindings.some(binding => binding.id === bindingId);
  const selectedBinding = allBindings.find(binding => binding.id === bindingId) ?? null;
  const hasFlatSpine = selectedBinding ? !selectedBinding.nests : true;

  const handleToggleCustomForm = () => {
    setShowCustomForm(!showCustomForm);
    clearCustomBindingError();
  };

  const handleAddCustom = () => {
    const added = addCustomBinding(
      name,
      Number(pageMultiple),
      Number(minPages),
      Number(maxPages),
      Number(spineAllowance),
      nests,
      requiresSignatureMultiple
    );

    if (added) {
      setShowCustomForm(false);
      setName('');
      setPageMultiple('');
      setMinPages('');
      setMaxPages('');
      setSpineAllowance('');
      setNests(false);
      setRequiresSignatureMultiple(false);
    }
  };

  return (
    <div className="panel" id="binding-panel">
      <h2 className="panel-title">Encuadernación</h2>

      <div
        className="form-group"
        role="group"
        aria-labelledby="binding-group-label"
      >
        <div className="form-label-row">
          <span id="binding-group-label" className="form-label">Encuadernación</span>
          <button
            type="button"
            onClick={handleToggleCustomForm}
            aria-expanded={showCustomForm}
            aria-controls="custom-binding-form"
            aria-label={showCustomForm ? 'Cancelar encuadernación personalizada' : 'Añadir encuadernación personalizada'}
            style={{
              background: 'none', border: 'none', color: 'var(--color-amber-600)',
              cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600,
            }}
          >
            {showCustomForm ? 'Cancelar' : '+ Person.'}
          </button>
        </div>

        {showCustomForm ? (
          <div id="custom-binding-form" style={{ background: 'transparent', border: 'none', marginBottom: 'var(--space-3)' }}>
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <label className="form-label" htmlFor="input-custom-binding-name">Nombre</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={event => setName(event.target.value)}
                id="input-custom-binding-name"
              />
            </div>
            <div className="input-row" style={{ marginBottom: 'var(--space-3)' }}>
              <div>
                <label className="form-label" htmlFor="input-custom-binding-page-multiple">Múltiplo de páginas</label>
                <input
                  type="number"
                  className="form-input"
                  value={pageMultiple}
                  onChange={event => setPageMultiple(event.target.value)}
                  min="2"
                  id="input-custom-binding-page-multiple"
                  aria-describedby={customBindingError ? 'custom-binding-error' : undefined}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="input-custom-binding-spine-allowance">Aporte al lomo</label>
                <div className="input-with-unit">
                  <input
                    type="number"
                    className="form-input"
                    value={spineAllowance}
                    onChange={event => setSpineAllowance(event.target.value)}
                    min="0"
                    id="input-custom-binding-spine-allowance"
                    aria-describedby={customBindingError ? 'custom-binding-error' : undefined}
                  />
                  <span className="input-unit">mm</span>
                </div>
              </div>
            </div>
            <div className="input-row" style={{ marginBottom: 'var(--space-3)' }}>
              <div>
                <label className="form-label" htmlFor="input-custom-binding-min-pages">Mínimo de páginas</label>
                <input
                  type="number"
                  className="form-input"
                  value={minPages}
                  onChange={event => setMinPages(event.target.value)}
                  min="1"
                  id="input-custom-binding-min-pages"
                  aria-describedby={customBindingError ? 'custom-binding-error' : undefined}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="input-custom-binding-max-pages">Máximo de páginas</label>
                <input
                  type="number"
                  className="form-input"
                  value={maxPages}
                  onChange={event => setMaxPages(event.target.value)}
                  min="1"
                  id="input-custom-binding-max-pages"
                  aria-describedby={customBindingError ? 'custom-binding-error' : undefined}
                />
              </div>
            </div>
            <div className="input-row" style={{ marginBottom: 'var(--space-3)' }}>
              <label className="form-label" htmlFor="input-custom-binding-nests" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                <input
                  type="checkbox"
                  checked={nests}
                  onChange={event => setNests(event.target.checked)}
                  id="input-custom-binding-nests"
                />
                Anida pliegos plegados
              </label>
              <label className="form-label" htmlFor="input-custom-binding-requires-signature-multiple" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                <input
                  type="checkbox"
                  checked={requiresSignatureMultiple}
                  onChange={event => setRequiresSignatureMultiple(event.target.checked)}
                  id="input-custom-binding-requires-signature-multiple"
                />
                Requiere múltiplo de firma
              </label>
            </div>
            {customBindingError && (
              <p className="calculation-error" id="custom-binding-error" role="alert">
                {customBindingError}
              </p>
            )}
            <button
              type="button"
              onClick={handleAddCustom}
              style={{
                width: '100%',
                padding: 'var(--space-2)',
                background: 'var(--color-text-primary)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Crear encuadernación
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <label className="visually-hidden" htmlFor="select-binding">Encuadernación seleccionada</label>
            <select
              className="form-input"
              value={bindingId}
              onChange={event => setBinding(event.target.value)}
              id="select-binding"
              aria-describedby={bindingPageCount && !bindingPageCount.ok ? 'binding-page-count-message' : undefined}
              style={{ flex: 1 }}
            >
              {allBindings.map(binding => (
                <option key={binding.id} value={binding.id}>{binding.name}</option>
              ))}
            </select>
            {isSelectedBindingCustom && (
              <button
                type="button"
                className="remove-sheet-button"
                onClick={() => removeCustomBinding(bindingId)}
                title="Eliminar encuadernación personalizada"
                aria-label="Eliminar encuadernación personalizada"
                style={{
                  background: 'rgba(244, 63, 94, 0.15)',
                  color: 'var(--color-danger-foreground)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  width: '42px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                }}
              >
                ×
              </button>
            )}
          </div>
        )}
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
