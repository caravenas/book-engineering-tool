import { useBookStore, parsePositiveSafeInteger, getSafeSpineResult } from '../store/useBookStore';

export function SpineCalculator() {
  const {
    totalPagesInput,
    setTotalPagesInput,
    spineResult,
    spineError,
  } = useBookStore();

  const hasInvalidPageCount = parsePositiveSafeInteger(totalPagesInput) === null;
  const safeResult = getSafeSpineResult(totalPagesInput, spineResult);

  return (
    <div className="panel" id="spine-calculator">
      <p className="calculation-note">
        El lomo, el calibre y el peso son referencias preliminares.
        Confirma materiales y encuadernación antes de producir.
      </p>

      <div className="form-group">
        <label className="form-label" htmlFor="input-pages" style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
          Número de páginas
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

    </div>
  );
}
