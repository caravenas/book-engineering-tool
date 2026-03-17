import { useState } from 'react';
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
        <span className="icon">📄</span>
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
        <div className="segment-group" style={{ flexWrap: 'wrap', gap: '4px', padding: '4px' }}>
          {allOptions.map(opt => {
            const isCustom = customGrammages.some(cg => cg.grammage === opt.grammage);
            return (
              <button
                key={opt.grammage}
                className={`segment-btn ${selectedGrammage === opt.grammage ? 'active' : ''}`}
                onClick={() => setGrammage(opt.grammage)}
                onContextMenu={(e) => {
                  if (isCustom) {
                    e.preventDefault();
                    removeCustomGrammage(substrateId, opt.grammage);
                  }
                }}
                title={isCustom ? "Click derecho para eliminar" : ""}
                id={`grammage-${opt.grammage}`}
              >
                {opt.grammage}g {isCustom && '*'}
              </button>
            );
          })}
          <button 
            className={`segment-btn ${showCustomForm ? 'active' : ''}`}
            onClick={() => setShowCustomForm(!showCustomForm)}
            style={{ flexGrow: 0, minWidth: '40px' }}
          >
            +
          </button>
        </div>
      </div>

      {/* Custom Grammage Form */}
      {showCustomForm && (
        <div className="form-group" style={{ 
          background: 'rgba(0,0,0,0.2)', 
          padding: 'var(--space-3)', 
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--color-border)',
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
              background: 'var(--color-amber-500)',
              color: '#000',
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
        <div className="stat-card" style={{ marginTop: 'var(--space-4)' }}>
          <div className="stat-value amber">{currentOption.caliper} μm</div>
          <div className="stat-label">Calibre (grosor por hoja)</div>
        </div>
      )}
    </div>
  );
}
