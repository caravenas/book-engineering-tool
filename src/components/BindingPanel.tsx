import { useBookStore, getAllBindings, getSelectedBindingInfo } from '../store/useBookStore';
import { validatePageCount } from '../engine/binding';
import { getCatalogOrigin, ORIGIN_LABEL } from './CatalogOrigin';
import { OptionField, OptionCard } from './OptionGroup';
import type { Binding } from '../types';

/**
 * The spine of a book bound this way, seen from the end. Everything it draws
 * comes from what `encuadernaciones.json` declares, so a method a print shop
 * adds is drawn like the rest instead of falling back to a blank rectangle:
 *
 * - a method that nests its sheets is folded, so the spine is one crease, and
 *   the two marks on it are the staples that hold the crease shut;
 * - a method that demands whole signatures is sewn, drawn as the broken line
 *   of a stitch running along the spine;
 * - anything else is glued, and the glue line is as thick as the allowance
 *   the method adds to the spine.
 */
function SpineFigure({ binding }: { binding: Binding }) {
  const nests = binding.nests;
  const sewn = !nests && binding.requiresSignatureMultiple;
  const glueWidth = Math.min(4, Math.max(1, binding.spineAllowance_mm));

  return (
    <svg className="spine-figure" viewBox="0 0 96 16" width="96" height="16" aria-hidden="true">
      <rect x="2" y="2" width="92" height="12" fill="none" stroke="currentColor" strokeWidth="1" />
      <line
        x1="2"
        y1="8"
        x2="94"
        y2="8"
        stroke="currentColor"
        strokeWidth={nests || sewn ? 1 : glueWidth}
        strokeDasharray={sewn ? '6 4' : undefined}
      />
      {nests && (
        <>
          <circle cx="34" cy="8" r="2" fill="currentColor" />
          <circle cx="62" cy="8" r="2" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

export function BindingPanel() {
  const {
    catalog,
    bindingId,
    customBindings,
    bindingPatches,
    hiddenBindingIds,
    userLayerStorageAvailable,
    setBinding,
    totalPages,
    signaturePlan,
    bindingSpine,
    bindingError,
  } = useBookStore();

  const allBindings = catalog ? getAllBindings(catalog, customBindings, bindingPatches, hiddenBindingIds) : customBindings;
  const isSelectedBindingCustom = customBindings.some(binding => binding.id === bindingId);
  const bindingOrigin = getCatalogOrigin(bindingId, customBindings.map(binding => binding.id), bindingPatches.map(patch => patch.id));
  const { hasFlatSpine } = getSelectedBindingInfo(allBindings, bindingId);
  const pagesPerSignature = signaturePlan?.selected?.scheme.pagesPerSignature ?? null;

  /**
   * Why this method cannot hold the book as it currently stands, or null when
   * it can. Only the range is treated this way: a count that is off the
   * method's multiple is a page count away from working, and the counter in
   * this same step moves by that multiple, so disabling the method would
   * stand between the reader and the fix. A count outside the range is a
   * property of the method, and it is said on the method.
   *
   * The judgement itself stays in the engine that owns the rule; what is
   * written here is only the short form of it, since the card has room for a
   * clause and not for a sentence.
   */
  function whyUnavailable(binding: Binding): string | null {
    // The method in use is never disabled: it would leave a chosen option
    // that cannot be chosen, and the reason for it is already reported in
    // full beside the page count.
    if (binding.id === bindingId) return null;

    try {
      const result = validatePageCount(binding, totalPages, pagesPerSignature);
      if (result.ok) return null;
      if (result.reason === 'above-max') return `hasta ${binding.maxPages} págs.`;
      if (result.reason === 'below-min') return `desde ${binding.minPages} págs.`;
      return null;
    } catch {
      return null;
    }
  }

  return (
    <div className="panel" id="binding-panel">

      <OptionField
        label="Encuadernación"
        id="binding-group"
        columns={2}
        fromCatalog
        marginalia={ORIGIN_LABEL[bindingOrigin]}
        note={isSelectedBindingCustom && !userLayerStorageAvailable && (
          <p className="config-source-note">encuadernación personalizada, guardada solo para esta sesión</p>
        )}
      >
        {allBindings.map(binding => (
          <OptionCard
            key={binding.id}
            id={`binding-${binding.id}`}
            name={binding.name}
            selected={binding.id === bindingId}
            disabledReason={whyUnavailable(binding)}
            onSelect={() => setBinding(binding.id)}
            figure={<SpineFigure binding={binding} />}
          />
        ))}
      </OptionField>

      {bindingError && (
        <p className="calculation-error" id="binding-calculation-error" role="status">{bindingError}</p>
      )}

      {bindingSpine && !hasFlatSpine && (
        <p className="calculation-note" style={{ marginTop: 'var(--space-2)' }}>
          Este método no tiene lomo plano: el libro queda con un pliegue, no un lomo cuadrado.
        </p>
      )}
    </div>
  );
}
