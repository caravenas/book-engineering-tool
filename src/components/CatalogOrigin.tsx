export type CatalogOrigin = 'own' | 'edited' | 'factory';

/**
 * Origin of the selected catalog entry against the user layer: its key (an
 * id, or for proportions a label) found among the custom entries is "own",
 * found among the patches is "edited", anything else is "factory". Order
 * matters: the custom check runs first, so an own entry is never reported
 * as edited even if its key happens to match a patched factory id.
 */
export function getCatalogOrigin(
  selectedKey: string | null,
  customKeys: string[],
  patchedKeys: string[]
): CatalogOrigin {
  if (selectedKey === null) return 'factory';
  if (customKeys.includes(selectedKey)) return 'own';
  if (patchedKeys.includes(selectedKey)) return 'edited';
  return 'factory';
}

export const ORIGIN_LABEL: Record<CatalogOrigin, string> = {
  own: 'tuyo',
  edited: 'editado',
  factory: 'de fábrica',
};

/**
 * Plain-text origin badge for the selected catalog entry: readable by a
 * screen reader without depending on color or a symbol. It accompanies the
 * existing `ConfigSourceNote`, it does not replace it.
 */
export function CatalogOriginNote({ origin }: { origin: CatalogOrigin }) {
  return <p className="config-source-note">{ORIGIN_LABEL[origin]}</p>;
}
