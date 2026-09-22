import { useCatalogPanel, type CatalogId } from './CatalogPanel';

/**
 * The way from a step into the catalog behind it.
 *
 * It lives in the margin of the step's title, as a note's call rather than as
 * a button, which is how the design canvas resolves it and what it is: a mark
 * saying there is more about this step somewhere else. R-19 moves it up here
 * from the individual fields, where there were six of them — one per catalog
 * — and makes it one per step, opening the catalog that step leans on most.
 * The others are one click away, in the catalog's own navigation.
 */
export function StepOptions({ catalog, label }: { catalog: CatalogId; label: string }) {
  const { open } = useCatalogPanel();

  return (
    <button
      type="button"
      className="step-options"
      aria-label={`Opciones de ${label}`}
      aria-haspopup="dialog"
      onClick={event => {
        /*
         * The call sits inside the step's own <summary>, where a click could
         * fold the step away behind the catalog it just opened. Chromium does
         * not run the summary's toggle when the click lands on an interactive
         * descendant — e2e/sheet.spec.ts holds it to that — and this says so
         * rather than leaning on it, since no other engine is tested here.
         */
        event.stopPropagation();
        open(catalog);
      }}
    >
      ···
    </button>
  );
}
