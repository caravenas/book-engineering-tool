import { useBookStore } from '../store/useBookStore';
import type { CatalogId } from './CatalogPanel';

/**
 * What each catalog is called, in one place.
 *
 * The editor's navigation and the header's badge both name them, and two
 * lists of the same seven names are two lists free to drift the day one of
 * them is renamed.
 */
export const CATALOG_TITLES: Record<CatalogId, string> = {
  proportions: 'Proporciones',
  substrates: 'Papeles',
  bindings: 'Encuadernaciones',
  presses: 'Prensas',
  sheetSizes: 'Pliegos',
  foldingSchemes: 'Esquemas de plegado',
  covers: 'Tapas',
};

/**
 * The catalogs whose file still declares itself provisional, by name.
 *
 * Read from `provisional` in each JSON rather than assumed: everything else
 * the interface says about where the numbers come from is read from the
 * files, and until R-30 this one claim was not — a print shop that replaced
 * `public/config/` with its own data went on being told it was an example.
 *
 * `formatos.json` is not among them, and declares no provenance either: a
 * ratio has none. 2:3 is 2:3 in every shop.
 */
export function useProvisionalCatalogs(): string[] {
  const catalog = useBookStore(state => state.catalog);
  if (!catalog) return [];

  return (Object.keys(catalog.provisional) as (keyof typeof catalog.provisional)[])
    .filter(key => catalog.provisional[key])
    .map(key => CATALOG_TITLES[key]);
}
