import { useBookStore, getAllBindings, getAllCovers } from '../store/useBookStore';
import { OptionField, OptionCard } from './OptionGroup';
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

/**
 * The cover opened out flat, the way it is printed: the two panels with the
 * spine between them, the flaps drawn as the dashed creases they are folded
 * at, and a hard cover's panels drawn as the thicker things they are, since
 * they are board and not paper.
 *
 * The spine is the book's own, so every cover draws the same one, and a hard
 * cover adds its two boards to it. The drawing is schematic: it says which of
 * the three shapes this cover is, and the measurements that matter are
 * reported as figures in the results column.
 */
function CoverFigure({ cover, spine_mm }: { cover: Cover; spine_mm: number }) {
  const hasFlaps = cover.flapWidth_mm > 0;
  const boards = cover.boardThickness_mm > 0;
  const spineWidth = Math.min(16, Math.max(3, (spine_mm + 2 * cover.boardThickness_mm) / 2));

  return (
    <span className="cover-figure">
      {hasFlaps && <span className="cover-flap" style={{ width: `${Math.max(4, cover.flapWidth_mm / 8)}px` }} />}
      <span className={`cover-panel${boards ? ' board' : ''}`} />
      <span className={`cover-spine${boards ? ' board' : ''}`} style={{ width: `${spineWidth}px` }} />
      <span className={`cover-panel${boards ? ' board' : ''}`} />
      {hasFlaps && <span className="cover-flap" style={{ width: `${Math.max(4, cover.flapWidth_mm / 8)}px` }} />}
    </span>
  );
}

export function CoverPanel() {
  const {
    catalog, coverId, bindingId, customBindings, bindingPatches, hiddenBindingIds,
    customCovers, coverPatches, hiddenCoverIds, setCover, coverPlan, coverError,
    bindingSpine,
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

      <OptionField
        label="Tipo de tapa"
        id="cover-group"
        columns={1}
        fromCatalog
      >
        {covers.map(cover => (
          <OptionCard
            key={cover.id}
            id={`cover-${cover.id}`}
            row
            name={cover.name}
            selected={cover.id === coverId}
            /* A hard cover needs a flat spine to glue its boards to, which a
               method that nests its sheets does not have. Said on the cover
               that cannot be made rather than after choosing it — except on
               the one in use, which would leave a chosen option nobody can
               choose. */
            disabledReason={
              cover.id === coverId || isCoverCompatible(cover, selectedBinding)
                ? null
                : 'necesita un lomo plano'
            }
            onSelect={() => setCover(cover.id)}
            figure={<CoverFigure cover={cover} spine_mm={bindingSpine?.total_mm ?? 0} />}
          />
        ))}
      </OptionField>

      {coverError && (
        <p className="calculation-error" role="alert">{coverError}</p>
      )}

      {coverPlan && !coverPlan.ok && (
        <p className="calculation-note" role="status">{coverPlan.message}</p>
      )}

    </div>
  );
}
