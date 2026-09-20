import { useBookStore, parsePositiveSafeInteger, getSafeSpineResult } from '../store/useBookStore';
import { formatRoundedValue } from '../engine/units';

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
  const sheetCount = Math.ceil(totalPages / 2);

  return (
    <div className="panel" id="spine-calculator">
      <p className="calculation-note">
        El lomo, el calibre y el peso son referencias preliminares.
        Confirma materiales y encuadernación antes de producir.
      </p>

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

      {!safeResult && (
        <p className="calculation-note">
          Corrige los valores indicados para recuperar las referencias de lomo y peso.
        </p>
      )}

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
