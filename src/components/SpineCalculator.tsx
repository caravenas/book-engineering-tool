import { useBookStore, parsePositiveSafeInteger, getSafeSpineResult, getAllBindings } from '../store/useBookStore';
import { pageCountStep } from '../engine/binding';

/**
 * How many booklets are drawn before the drawing gives up and leaves the
 * count to the sentence beside it. A hundred-signature book is a row of
 * indistinguishable marks, which says less than the number does.
 */
const MAX_DRAWN_SIGNATURES = 24;

export function SpineCalculator() {
  const {
    catalog,
    totalPagesInput,
    totalPages,
    setTotalPagesInput,
    bindingId,
    customBindings,
    bindingPatches,
    hiddenBindingIds,
    signaturePlan,
    spineResult,
    spineError,
    bindingPageCount,
  } = useBookStore();

  const typedPages = parsePositiveSafeInteger(totalPagesInput);
  const hasInvalidPageCount = typedPages === null;
  const safeResult = getSafeSpineResult(totalPagesInput, spineResult);

  const binding = catalog
    ? getAllBindings(catalog, customBindings, bindingPatches, hiddenBindingIds).find(item => item.id === bindingId)
    : undefined;
  const pagesPerSignature = signaturePlan?.selected?.scheme.pagesPerSignature ?? null;

  /*
   * The counter moves by whole signatures, or by whatever smaller multiple the
   * method demands, so pressing + cannot land on a count the binding rules
   * then reject. The step comes from the engine that judges the count, not
   * from a second copy of the rule here.
   */
  let step: number | null = null;
  try {
    step = binding ? pageCountStep(binding, pagesPerSignature) : null;
  } catch {
    step = null;
  }

  /**
   * Where a press of − or + lands, or null when there is nowhere to go.
   *
   * From a count the binding already accepts it is one step away, inside the
   * method's range. From a count it rejects — off the multiple, or past the
   * maximum — it is the nearest count the method does accept in that
   * direction, which the engine has already worked out in the course of
   * refusing this one. One press therefore always ends on a valid count
   * instead of walking a hundred pages back to the range four at a time.
   */
  function pagesFrom(direction: 1 | -1): number | null {
    if (typedPages === null || !binding) return null;

    if (bindingPageCount && !bindingPageCount.ok) {
      return direction === 1 ? bindingPageCount.nearestAbove : bindingPageCount.nearestBelow;
    }

    if (step === null) return null;
    const next = typedPages + direction * step;
    return next >= Math.max(step, binding.minPages) && next <= binding.maxPages ? next : null;
  }

  const previous = pagesFrom(-1);
  const next = pagesFrom(1);
  const signatures = signaturePlan?.selected?.signatures ?? null;
  const sheets = hasInvalidPageCount ? null : Math.ceil(totalPages / 2);

  return (
    <div className="panel" id="spine-calculator">
      <p className="calculation-note">
        El lomo, el calibre y el peso son referencias preliminares.
        Confirma materiales y encuadernación antes de producir.
      </p>

      <div className="form-group page-counter">
        <label className="form-label" htmlFor="input-pages">Páginas</label>
        <div className="page-counter-row">
          <button
            type="button"
            className="counter-button"
            aria-label="Quitar una firma"
            disabled={previous === null}
            onClick={() => previous !== null && setTotalPagesInput(String(previous))}
          >
            −
          </button>
          {/*
            * The figure stays typeable: a book of 248 pages is one number to
            * write and thirteen presses of a button, and the counter is for
            * deciding a length rather than for reaching a known one.
            */}
          <span className="page-counter-value">
            <input
              type="number"
              className="measure-input"
              value={totalPagesInput}
              onChange={event => setTotalPagesInput(event.target.value)}
              step={step ?? 1}
              min={1}
              id="input-pages"
              aria-invalid={hasInvalidPageCount}
              aria-describedby="pages-page-count-requirement"
            />
            <span className="page-counter-unit">pág.</span>
          </span>
          <button
            type="button"
            className="counter-button"
            aria-label="Añadir una firma"
            disabled={next === null}
            onClick={() => next !== null && setTotalPagesInput(String(next))}
          >
            +
          </button>
        </div>

        {/* What those pages are made of: one mark per booklet, and the count
            in words for whoever is reading rather than looking. */}
        {signatures !== null && sheets !== null && (
          <div className="signature-row">
            {signatures <= MAX_DRAWN_SIGNATURES && (
              <span className="signature-icons" aria-hidden="true">
                {Array.from({ length: signatures }, (_, index) => (
                  <span key={index} className="signature-icon" />
                ))}
              </span>
            )}
            <span className="signature-text">
              {signatures === 1 ? '1 firma' : `${signatures} firmas`}
              {pagesPerSignature !== null && ` de ${pagesPerSignature}`}
              {` · ${sheets} hojas`}
            </span>
          </div>
        )}

        <p className="calculation-note" id="pages-page-count-requirement">
          {hasInvalidPageCount || step === null
            ? 'Introduce un número entero seguro mayor que cero para recuperar las referencias de lomo y peso.'
            : `Múltiplos de ${step} para esta encuadernación; escribe cualquier otro número si lo necesitas.`}
        </p>
      </div>

      {!safeResult && (
        <p className="calculation-note">
          Corrige los valores indicados para recuperar las referencias de lomo y peso.
        </p>
      )}

      {bindingPageCount && !bindingPageCount.ok && (
        <p className="calculation-error" id="binding-page-count-message" role="status">{bindingPageCount.message}</p>
      )}

      {spineError && (
        <p className="calculation-error" id="pages-calculation-error" role="alert">{spineError}</p>
      )}

    </div>
  );
}
