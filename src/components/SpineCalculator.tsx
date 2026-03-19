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
        Lomo y Peso
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', marginTop: 'var(--space-4)' }}>
        {/* Left Column */}
        <div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>NÚMERO DE PÁGINAS</label>
            <input
              type="number"
              className="form-input"
              value={totalPages}
              onChange={e => setTotalPages(parseInt(e.target.value, 10) || 4)}
              step={4}
              min={4}
              max={500}
              id="input-pages"
              style={{ borderRadius: '8px', border: '1px solid var(--color-text-primary)', padding: 'var(--space-2) var(--space-3)' }}
            />
          </div>

          {/* Spine Visual */}
          <div style={{ marginTop: 'var(--space-8)', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, marginBottom: '4px' }}>LOMO</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px' }}>→|</span>
              <div style={{ width: '4px', height: '14px', background: 'transparent' }} />
              <span style={{ fontSize: '14px' }}>|←</span>
            </div>
            <div className="spine-visual" style={{ minHeight: 'auto', padding: 0 }}>
              <div className="spine-cover back" style={{ height: coverHeight, width: '40px', borderRight: 'none' }} />
              <div className="spine-bar" style={{ width: spineBarWidth, height: coverHeight, background: 'transparent', borderTop: '1px solid var(--color-text-primary)', borderBottom: '1px solid var(--color-text-primary)' }}>
                <div style={{ width: '1px', height: '100%', background: 'var(--color-text-primary)', margin: '0 auto' }} />
              </div>
              <div className="spine-cover front" style={{ height: coverHeight, width: '40px', borderLeft: 'none' }} />
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div>
          {/* Square drawing with line */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
              {roundTo(thickness, 2)} mm
            </div>
            <div style={{ width: '60px', height: '60px', border: '1px solid var(--color-text-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ width: spineBarWidth, height: '100%', background: 'var(--color-text-primary)' }} />
            </div>
          </div>

          {/* Stats */}
          <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
              <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>{roundTo(thickness, 2)}</div>
              <div className="stat-label">Lomo (mm)</div>
            </div>
            <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
              <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
                {weight >= 1000 ? `${roundTo(weight / 1000, 2)} kg` : `${roundTo(weight, 1)} g`}
              </div>
              <div className="stat-label">Peso total</div>
            </div>
            <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
              <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>{totalPages / 2}</div>
              <div className="stat-label">Hojas</div>
            </div>
            <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
              <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>{selectedGrammage}g</div>
              <div className="stat-label">Gramaje</div>
            </div>
          </div>
        </div>
      </div>

      {/* Formula explanation */}
      <div style={{ marginTop: 'var(--space-6)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
        <p style={{ fontSize: '11px', color: 'var(--color-text-primary)', lineHeight: 1.6, fontFamily: 'var(--font-mono)' }}>
          Lomo = ({totalPages} ÷ 2) × calibre<br />
          Peso = ({roundTo(pageWidth_mm / 1000, 4)} × {roundTo(pageHeight_mm / 1000, 4)}) m² × {totalPages / 2} hojas × {selectedGrammage} g/m²
        </p>
      </div>
    </div>
  );
}
