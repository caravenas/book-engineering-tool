import { useState } from 'react';
import { useBookStore, getAllGrammageOptions } from '../store/useBookStore';
import { SUBSTRATES } from '../data/substrates';

export function SubstrateSelector() {
  const {
    substrateId,
    selectedGrammage,
    customGrammages,
    customGrammageError,
    setSubstrate,
    setGrammage,
    addCustomGrammage,
    removeCustomGrammage,
    clearCustomGrammageError,
  } = useBookStore();

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customG, setCustomG] = useState('');
  const [customCaliper, setCustomCaliper] = useState('');

  const currentSubstrate = SUBSTRATES.find(substrate => substrate.id === substrateId);
  const allOptions = getAllGrammageOptions(substrateId, customGrammages);
  const currentOption = allOptions.find(option => option.grammage === selectedGrammage);

  const handleToggleCustomForm = () => {
    setShowCustomForm(!showCustomForm);
    clearCustomGrammageError();
  };

  const handleAddCustom = () => {
    const grammage = Number(customG);
    const caliper = Number(customCaliper);
    const added = addCustomGrammage(substrateId, grammage, caliper);

    if (added) {
      setShowCustomForm(false);
      setCustomG('');
      setCustomCaliper('');
    }
  };

  return (
    <div className="panel" id="substrate-selector">
      <h2 className="panel-title">Sustrato (Papel)</h2>

      <div className="form-group">
        <label className="form-label" htmlFor="select-substrate">Tipo de papel</label>
        <select
          className="form-input"
          value={substrateId}
          onChange={event => setSubstrate(event.target.value)}
          id="select-substrate"
        >
          {SUBSTRATES.map(substrate => (
            <option key={substrate.id} value={substrate.id}>
              {substrate.name}
            </option>
          ))}
        </select>
      </div>

      {currentSubstrate && (
        <div className="form-group">
          <p style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-muted)',
            lineHeight: 1.5,
            fontStyle: 'italic',
          }}>
            {currentSubstrate.description}
          </p>
        </div>
      )}

      <div className="form-group" role="group" aria-labelledby="grammage-group-label">
        <span className="form-label" id="grammage-group-label">Gramaje</span>
        <div className="grammage-options">
          {allOptions.map(option => {
            const isCustom = customGrammages.some(custom => (
              custom.substrateId === substrateId && custom.grammage === option.grammage
            ));
            const isActive = selectedGrammage === option.grammage;

            return (
              <div className="grammage-option" key={option.grammage}>
                <button
                  type="button"
                  onClick={() => setGrammage(option.grammage)}
                  aria-pressed={isActive}
                  id={`grammage-${substrateId}-${option.grammage}`}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: isActive ? '3px solid #E63946' : '3px solid transparent',
                    padding: '0 0 2px 0',
                    fontSize: '14px',
                    fontWeight: isActive ? 700 : 500,
                    color: 'var(--color-text-primary)',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s',
                  }}
                >
                  {`${option.grammage} g/m²`}{isCustom && ' *'}
                </button>
                {isCustom && (
                  <button
                    type="button"
                    className="remove-grammage-button"
                    onClick={() => removeCustomGrammage(substrateId, option.grammage)}
                    aria-label={`Eliminar gramaje personalizado de ${option.grammage} gramos por metro cuadrado`}
                    title={`Eliminar gramaje personalizado de ${option.grammage} gramos por metro cuadrado`}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={handleToggleCustomForm}
            aria-label={showCustomForm ? 'Cancelar gramaje personalizado' : 'Añadir gramaje personalizado'}
            aria-expanded={showCustomForm}
            aria-controls="custom-grammage-form"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              color: 'var(--color-text-primary)',
            }}
          >
            {showCustomForm ? 'Cancelar' : '+'}
          </button>
        </div>
      </div>

      {showCustomForm && (
        <div
          className="form-group"
          id="custom-grammage-form"
          style={{
            background: 'transparent',
            border: 'none',
            marginTop: 'var(--space-2)',
          }}
        >
          <p className="calculation-note">
            Introduce explícitamente el gramaje y el calibre declarado para este sustrato.
          </p>
          <div className="input-row" style={{ marginBottom: 'var(--space-3)' }}>
            <div>
              <label className="form-label" htmlFor="input-custom-grammage">Gramaje personalizado (g/m²)</label>
              <div className="input-with-unit">
                <input
                  type="number"
                  className="form-input"
                  value={customG}
                  onChange={event => setCustomG(event.target.value)}
                  min="1"
                  id="input-custom-grammage"
                  aria-describedby={customGrammageError ? 'custom-grammage-error' : undefined}
                />
                <span className="input-unit">g/m²</span>
              </div>
            </div>
            <div>
              <label className="form-label" htmlFor="input-custom-caliper">Calibre personalizado</label>
              <div className="input-with-unit">
                <input
                  type="number"
                  className="form-input"
                  value={customCaliper}
                  onChange={event => setCustomCaliper(event.target.value)}
                  min="1"
                  id="input-custom-caliper"
                  aria-describedby={customGrammageError ? 'custom-grammage-error' : undefined}
                />
                <span className="input-unit">μm</span>
              </div>
            </div>
          </div>
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
            Añadir gramaje
          </button>
        </div>
      )}

      {customGrammageError && (
        <p className="calculation-error" id="custom-grammage-error" role="alert">{customGrammageError}</p>
      )}

      {currentOption && (
        <div style={{ marginTop: 'var(--space-6)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
          <div className="stat-label" style={{ marginBottom: 'var(--space-2)' }}>Calibre declarado</div>
          <div style={{ fontSize: '3.5rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>
            {currentOption.caliper} <span style={{ fontSize: '2rem' }}>μm</span>
          </div>
        </div>
      )}
    </div>
  );
}
