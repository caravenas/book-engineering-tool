import { useState, useEffect } from 'react';
import { useBookStore, getAllGrammageOptions } from '../store/useBookStore';
import { SUBSTRATES } from '../data/substrates';

export function SubstrateSelector() {
  const {
    substrateId,
    selectedGrammage,
    customGrammages,
    setSubstrate,
    setGrammage,
    addCustomGrammage,
    removeCustomGrammage
  } = useBookStore();

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customG, setCustomG] = useState('');
  const [customCaliper, setCustomCaliper] = useState('');

  const currentSubstrate = SUBSTRATES.find(s => s.id === substrateId);
  const allOptions = getAllGrammageOptions(substrateId, customGrammages);
  const currentOption = allOptions.find(o => o.grammage === selectedGrammage);

  // Auto-calculate caliper when grammage changes
  useEffect(() => {
    if (customG && currentSubstrate && currentSubstrate.options.length > 0) {
      const gVal = parseInt(customG, 10);
      if (!isNaN(gVal) && gVal > 0) {
        // Find average ratio (caliper / grammage) for this substrate
        const avgRatio = currentSubstrate.options.reduce(
          (sum, opt) => sum + (opt.caliper / opt.grammage), 0
        ) / currentSubstrate.options.length;

        const estimatedCaliper = Math.round(gVal * avgRatio);
        setCustomCaliper(estimatedCaliper.toString());
      } else {
        setCustomCaliper('');
      }
    } else if (!customG) {
      setCustomCaliper('');
    }
  }, [customG, currentSubstrate]);

  const handleAddCustom = () => {
    const gVal = parseInt(customG, 10);
    const cVal = parseInt(customCaliper, 10);

    if (gVal > 0 && cVal > 0) {
      addCustomGrammage(substrateId, gVal, cVal);
      setShowCustomForm(false);
      setCustomG('');
      setCustomCaliper('');
    }
  };

  return (
    <div className="panel" id="substrate-selector">
      <h2 className="panel-title">
        Sustrato (Papel)
      </h2>

      {/* Paper type */}
      <div className="form-group">
        <label className="form-label">Tipo de papel</label>
        <select
          className="form-input"
          value={substrateId}
          onChange={e => setSubstrate(e.target.value)}
          id="select-substrate"
        >
          {SUBSTRATES.map(s => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
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

      {/* Grammage */}
      <div className="form-group">
        <label className="form-label">Gramaje</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', marginTop: 'var(--space-2)', padding: 'var(--space-2)' }}>
          {allOptions.map(opt => {
            const isCustom = customGrammages.some(cg => cg.grammage === opt.grammage);
            const isActive = selectedGrammage === opt.grammage;
            return (
              <button
                key={opt.grammage}
                onClick={() => setGrammage(opt.grammage)}
                onContextMenu={(e) => {
                  if (isCustom) {
                    e.preventDefault();
                    removeCustomGrammage(substrateId, opt.grammage);
                  }
                }}
                title={isCustom ? "Click derecho para eliminar" : ""}
                id={`grammage-${opt.grammage}`}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '3px solid #E63946' : '3px solid transparent',
                  padding: '0 0 2px 0',
                  fontSize: '14px',
                  fontWeight: isActive ? 700 : 500,
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s'
                }}
              >
                {opt.grammage}g {isCustom && '*'}
              </button>
            );
          })}
          <button
            onClick={() => setShowCustomForm(!showCustomForm)}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              color: 'var(--color-text-primary)'
            }}
          >
            +
          </button>
        </div>
      </div>

      {/* Custom Grammage Form */}
      {showCustomForm && (
        <div className="form-group" style={{
          background: 'transparent',
          border: 'none',
          marginTop: 'var(--space-2)'
        }}>
          <div className="input-row" style={{ marginBottom: 'var(--space-3)' }}>
            <div className="input-with-unit">
              <input
                type="number"
                className="form-input"
                placeholder="Gramaje"
                value={customG}
                onChange={e => setCustomG(e.target.value)}
                min="1"
              />
              <span className="input-unit">g</span>
            </div>
            <div className="input-with-unit">
              <input
                type="number"
                className="form-input"
                placeholder="Calibre"
                value={customCaliper}
                onChange={e => setCustomCaliper(e.target.value)}
                min="1"
              />
              <span className="input-unit">μm</span>
            </div>
          </div>
          <button
            onClick={handleAddCustom}
            style={{
              width: '100%',
              padding: 'var(--space-2)',
              background: 'var(--color-text-primary)', /* Negro carbón o #000 */
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Añadir Gramaje
          </button>
        </div>
      )}

      {/* Caliper display */}
      {currentOption && (
        <div style={{ marginTop: 'var(--space-6)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
          <div className="stat-label" style={{ marginBottom: 'var(--space-2)' }}>Calibre</div>
          <div style={{ fontSize: '3.5rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>
            {currentOption.caliper} <span style={{ fontSize: '2rem' }}>μm</span>
          </div>
        </div>
      )}
    </div>
  );
}
