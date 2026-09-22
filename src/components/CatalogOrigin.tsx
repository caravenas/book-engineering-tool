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
 * Where the selected entry comes from, said in words rather than by a colour
 * or a symbol, beside the label of the field it describes. It used to sit
 * under the control as a line of its own, which read as a caption to the
 * value and put the answer one line away from the question.
 *
 * It appears on the five catalogs that can be changed and nowhere else:
 * saying "de fábrica" beside a field that could never be anything else is
 * noise, not information.
 *
 * R-13 makes it a note in the margin of the label row rather than a pill
 * beside the label, and gives it company: the same margin now also carries
 * which other control decides this value, so a field has one place where
 * everything about the provenance of its value is written.
 */
export function OriginBadge({ origin }: { origin: CatalogOrigin }) {
  return <span className="field-marginalia">{ORIGIN_LABEL[origin]}</span>;
}
