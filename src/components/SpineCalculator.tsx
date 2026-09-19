import { useBookStore, parsePositiveSafeInteger, getSafeSpineResult } from '../store/useBookStore';
import { formatRoundedValue } from '../engine/units';
import { SpineResults } from './SpineResults';

export function SpineCalculator() {
  const {
    totalPages,
    totalPagesInput,
    setTotalPagesInput,
    spineResult,
    spineError,
    pageWidth_mm,
    pageHeight_mm,
    selectedGrammage,
  } = useBookStore();

  const hasInvalidPageCount = parsePositiveSafeInteger(totalPagesInput) === null;
  const safeResult = getSafeSpineResult(totalPagesInput, spineResult);
  const spineBarWidth = safeResult
    ? Math.max(2, Math.min(60, safeResult.thickness_mm * 3))
    : null;
  const coverHeight = 100;
  const sheetCount = Math.ceil(totalPages / 2);

  return (
    <div className="panel" id="spine-calculator">
      <h2 className="panel-title">Lomo y peso del interior</h2>
      <p className="calculation-note">
        El lomo, el calibre y el peso son referencias preliminares.
        Confirma materiales y encuadernación antes de producir.
      </p>

      <div className="spine-calculator-grid">
        <div>
          <div className="form-group">
            <label className="form-label" htmlFor="input-pages" style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
              NÚMERO DE PÁGINAS
            </label>
            <input
              type="number"
              className="form-input"
              value={totalPagesInput}
              onChange={event => setTotalPagesInput(event.target.value)}
              step={1}
              min={1}
              id="input-pages"
              aria-invalid={hasInvalidPageCount}
              aria-describedby="pages-page-count-requirement"
              style={{ borderRadius: '8px', border: '1px solid var(--color-text-primary)', padding: 'var(--space-2) var(--space-3)' }}
            />
            <p className="calculation-note" id="pages-page-count-requirement">
              Introduce un número entero seguro mayor que cero para recuperar las referencias de lomo y peso.
            </p>
          </div>

          {safeResult && spineBarWidth !== null && (
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
          )}
        </div>

        <div>
          {safeResult && spineBarWidth !== null ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                  {formatRoundedValue(safeResult.thickness_mm, 2)} mm
                </div>
                <div style={{ width: '60px', height: '60px', border: '1px solid var(--color-text-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <div style={{ width: spineBarWidth, height: '100%', background: 'var(--color-text-primary)' }} />
                </div>
              </div>

              <SpineResults />
            </>
          ) : (
            <p className="calculation-note">
              Corrige los valores indicados para recuperar las referencias de lomo y peso.
            </p>
          )}
        </div>
      </div>

      {spineError && (
        <p className="calculation-error" id="pages-calculation-error" role="alert">{spineError}</p>
      )}

      {safeResult && (
        <div style={{ marginTop: 'var(--space-6)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
          <p style={{ fontSize: '11px', color: 'var(--color-text-primary)', lineHeight: 1.6, fontFamily: 'var(--font-mono)' }}>
            Hojas físicas = ⌈{totalPages} ÷ 2⌉ = {sheetCount} hojas<br />
            Lomo estimado = {sheetCount} hojas × calibre<br />
            Peso interior estimado = ({formatRoundedValue(pageWidth_mm / 1000, 4)} × {formatRoundedValue(pageHeight_mm / 1000, 4)}) m² × {sheetCount} hojas × {selectedGrammage} g/m²
          </p>
        </div>
      )}
    </div>
  );
}
