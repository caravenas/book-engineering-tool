import { useProvisionalCatalogs } from './catalogNames';

/** How many catalogs can be provisional at once: the six that declare it. */
const CATALOGS_WITH_PROVENANCE = 6;

/**
 * One claim about the whole catalog, beside the name of the tool — and one
 * the data can contradict.
 *
 * It said «Datos de ejemplo» unconditionally until R-30, which made it the
 * only statement in the interface that stayed true no matter what the files
 * said. Now it counts the files that declare themselves provisional: all six
 * and it says so plainly, some of them and it says how many, none of them and
 * there is nothing to say, so it does not appear.
 */
export function SampleDataBadge() {
  const provisional = useProvisionalCatalogs();
  if (provisional.length === 0) return null;

  const all = provisional.length === CATALOGS_WITH_PROVENANCE;
  const some = provisional.length === 1
    ? 'Datos de ejemplo en 1 catálogo'
    : `Datos de ejemplo en ${provisional.length} catálogos`;

  return (
    // Which ones, for whoever wants to know which of the six are still the
    // repository's. The badge itself stays a badge: a sentence naming four
    // catalogs does not belong in a header.
    <span className="header-badge" title={provisional.join(' · ')}>
      {all ? 'Datos de ejemplo' : some}
    </span>
  );
}
