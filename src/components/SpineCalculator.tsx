import { useBookStore } from '../store/useBookStore';
import { roundTo } from '../engine/units';

export function SpineCalculator() {
  const {
    totalPages, setTotalPages,
    spineResult,
    pageWidth_mm, pageHeight_mm,
    selectedGrammage,
  } = useBookStore();

  const thickness = spineResult?.thickness_mm ?? 0;
  const weight = spineResult?.totalWeight_g ?? 0;

  // Scale the spine bar visual (max display width: 60px for ~20mm spine)
  const spineBarWidth = Math.max(2, Math.min(60, thickness * 3));
  const coverHeight = 100;

  return (
    <div className="panel" id="spine-calculator">
      <h2 className="panel-title">
        <span className="icon">📏</span>
        Lomo y Peso
      </h2>

      {/* Page count input */}
      <div className="form-group">
        <label className="form-label">Número de páginas</label>
        <input
          type="number"
          className="form-input"
          value={totalPages}
          onChange={e => setTotalPages(parseInt(e.target.value, 10) || 4)}
          step={4}
          min={4}
          max={500}
          id="input-pages"
        />
        <p style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-muted)',
          marginTop: 'var(--space-1)',
        }}>
          Múltiplo de 4 ({totalPages / 2} hojas)
        </p>
      </div>

      {/* Spine Visual */}
      <div className="spine-visual">
        <div className="spine-cover back" style={{ height: coverHeight }} />
        <div className="spine-bar" style={{ width: spineBarWidth, height: coverHeight }}>
          {thickness > 0 && (
            <div className="spine-label">{roundTo(thickness, 2)} mm</div>
          )}
        </div>
        <div className="spine-cover front" style={{ height: coverHeight }} />
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value amber">{roundTo(thickness, 2)}</div>
          <div className="stat-label">Lomo (mm)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value sky">
            {weight >= 1000
              ? `${roundTo(weight / 1000, 2)} kg`
              : `${roundTo(weight, 1)} g`
            }
          </div>
          <div className="stat-label">Peso total</div>
        </div>
        <div className="stat-card">
          <div className="stat-value emerald">{totalPages / 2}</div>
          <div className="stat-label">Hojas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value rose">{selectedGrammage}g</div>
          <div className="stat-label">Gramaje</div>
        </div>
      </div>

      {/* Formula explanation */}
      <div style={{
        marginTop: 'var(--space-5)',
        padding: 'var(--space-3) var(--space-4)',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
      }}>
        <p style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-muted)',
          lineHeight: 1.7,
          fontFamily: 'var(--font-mono)',
        }}>
          Lomo = ({totalPages} ÷ 2) × calibre<br />
          Peso = ({roundTo(pageWidth_mm / 1000, 4)} × {roundTo(pageHeight_mm / 1000, 4)}) m² × {totalPages / 2} hojas × {selectedGrammage} g/m²
        </p>
      </div>
    </div>
  );
}
