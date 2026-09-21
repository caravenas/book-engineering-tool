import { useBookStore, getAllBindings, getAllCovers } from '../store/useBookStore';
import { useCatalogPanel } from './CatalogPanel';
import type { Binding, Cover } from '../types';

/**
 * A cover is compatible with a binding when it's soft, or when it's hard and
 * the binding doesn't nest its signatures (i.e. has a flat spine). `binding`
 * is `null` when the configured binding id isn't in the catalog, in which
 * case only soft covers are offered.
 */
function isCoverCompatible(cover: Cover, binding: Binding | null): boolean {
  return cover.kind === 'blanda' || binding?.nests === false;
}

export function CoverPanel() {
  const { open: openCatalog } = useCatalogPanel();
  const {
    catalog, coverId, bindingId, customBindings, bindingPatches, hiddenBindingIds,
    customCovers, coverPatches, hiddenCoverIds, setCover, coverPlan, coverError,
  } = useBookStore();

  const covers = catalog ? getAllCovers(catalog, customCovers, coverPatches, hiddenCoverIds) : customCovers;

  const selectedBinding = catalog
    ? getAllBindings(catalog, customBindings, bindingPatches, hiddenBindingIds).find(binding => binding.id === bindingId) ?? null
    : null;

  return (
    <div className="panel" id="cover-panel">
      <p className="calculation-note">
        Medidas, peso y plantilla de la tapa son referencias preliminares a partir del lomo final calculado.
        Confirma encajado y tolerancias de producción con tu taller antes de producir.
      </p>

      <div className="form-group">
        <div className="form-label-row">
          <label className="form-label" htmlFor="select-cover">Tipo de tapa</label>
          <button
            type="button"
            className="step-options"
            aria-label="Opciones de tapa"
            aria-haspopup="dialog"
            onClick={() => openCatalog('covers')}
          >
            ···
          </button>
        </div>
        <select
          className="form-input"
          value={coverId}
          onChange={event => setCover(event.target.value)}
          id="select-cover"
        >
          {covers
            .filter(cover => isCoverCompatible(cover, selectedBinding) || cover.id === coverId)
            .map(cover => (
              <option
                key={cover.id}
                value={cover.id}
                disabled={!isCoverCompatible(cover, selectedBinding)}
              >
                {cover.name}
              </option>
            ))}
        </select>
      </div>

      {coverError && (
        <p className="calculation-error" role="alert">{coverError}</p>
      )}

      {coverPlan && !coverPlan.ok && (
        <p className="calculation-note" role="status">{coverPlan.message}</p>
      )}

    </div>
  );
}
