import { useBookStore } from '../store/useBookStore';
import { SUBSTRATES } from '../data/substrates';

export function SubstrateSelector() {
  const { substrateId, selectedGrammage, setSubstrate, setGrammage } = useBookStore();

  const currentSubstrate = SUBSTRATES.find(s => s.id === substrateId);
  const currentOption = currentSubstrate?.options.find(o => o.grammage === selectedGrammage);

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
        <div className="segment-group">
          {currentSubstrate?.options.map(opt => (
            <button
              key={opt.grammage}
              className={`segment-btn ${selectedGrammage === opt.grammage ? 'active' : ''}`}
              onClick={() => setGrammage(opt.grammage)}
              id={`grammage-${opt.grammage}`}
            >
              {opt.grammage}g
            </button>
          ))}
        </div>
      </div>

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
