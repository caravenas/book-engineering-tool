import { useBookStore, getAllPresses, getAllSheetSizes, getAllBindings, getAllProportions, getAllGrammageOptions } from '../store/useBookStore';
import { getCatalogOrigin } from './CatalogOrigin';
import { toNumber, type CatalogEditor, type FormValues } from './CatalogEntryForm';
import type { Binding, GrammageOption, Press, Proportion, SheetSize } from '../types';

/**
 * What each catalog has that the others do not: the shape of an entry, and
 * how its fields map onto the arguments the store adds with and the changes
 * it patches with. Everything else about editing a catalog entry is the same
 * everywhere and lives in CatalogEntryForm.
 */
export function usePressEditor(): CatalogEditor<Press> {
  const {
    catalog,
    pressId,
    customPresses,
    pressPatches,
    hiddenPressIds,
    customPressError,
    addCustomPress,
    removeCustomPress,
    patchPress,
    unpatchPress,
    hidePress,
    showPress,
    clearCustomPressError,
  } = useBookStore();

  const presses = catalog ? getAllPresses(catalog, customPresses, pressPatches, hiddenPressIds) : customPresses;

  return {
    ownNote: 'Una prensa tuya no se edita: elimínala y vuelve a añadirla con las medidas nuevas.',
    addLabel: '+ Nueva prensa',
    addSubmitLabel: 'Añadir prensa',
    hiddenLine: count => (count === 1
      ? '1 prensa de fábrica oculta.'
      : `${count} prensas de fábrica ocultas.`),
    restoreLabel: 'Mostrar prensas ocultas',
    fields: [
      { key: 'name', label: 'Nombre', kind: 'text' },
      { key: 'maxSheetWidth_mm', label: 'Pliego máximo · ancho', kind: 'number' },
      { key: 'maxSheetHeight_mm', label: 'Pliego máximo · alto', kind: 'number' },
      { key: 'gripperMargin_mm', label: 'Pinza', kind: 'number' },
      { key: 'sideMargin_mm', label: 'Lateral', kind: 'number' },
      { key: 'tailMargin_mm', label: 'Cola', kind: 'number' },
      { key: 'gutter_mm', label: 'Calle', kind: 'number' },
    ],
    entry: presses.find(item => item.id === pressId) ?? null,
    factory: catalog?.presses.find(item => item.id === pressId) ?? null,
    origin: getCatalogOrigin(pressId, customPresses.map(item => item.id), pressPatches.map(patch => patch.id)),
    error: customPressError,
    clearError: clearCustomPressError,
    read: press => ({
      name: press.name,
      maxSheetWidth_mm: String(press.maxSheetWidth_mm),
      maxSheetHeight_mm: String(press.maxSheetHeight_mm),
      gripperMargin_mm: String(press.gripperMargin_mm),
      sideMargin_mm: String(press.sideMargin_mm),
      tailMargin_mm: String(press.tailMargin_mm),
      gutter_mm: String(press.gutter_mm),
    }),
    toChanges: (values, changed) => {
      const changes: Record<string, unknown> = {};
      if (changed.has('name')) changes.name = String(values.name).trim();
      for (const key of ['maxSheetWidth_mm', 'maxSheetHeight_mm', 'gripperMargin_mm', 'sideMargin_mm', 'tailMargin_mm', 'gutter_mm']) {
        if (changed.has(key)) changes[key] = toNumber(values[key]);
      }
      return changes;
    },
    add: (values: FormValues) => addCustomPress(
      String(values.name).trim(),
      toNumber(values.maxSheetWidth_mm),
      toNumber(values.maxSheetHeight_mm),
      toNumber(values.gripperMargin_mm),
      toNumber(values.sideMargin_mm),
      toNumber(values.tailMargin_mm),
      toNumber(values.gutter_mm)
    ),
    patch: changes => patchPress(pressId, changes),
    unpatch: () => unpatchPress(pressId),
    hide: () => hidePress(pressId),
    remove: () => removeCustomPress(pressId),
    hiddenCount: hiddenPressIds.length,
    restoreHidden: () => hiddenPressIds.forEach(id => showPress(id)),
  };
}

export function useSheetSizeEditor(): CatalogEditor<SheetSize> {
  const {
    catalog, sheetSizeId, customSheetSizes, sheetSizePatches, hiddenSheetSizeIds, customSheetSizeError,
    addCustomSheetSize, removeCustomSheetSize, patchSheetSize, unpatchSheetSize, hideSheetSize, showSheetSize,
    clearCustomSheetSizeError,
  } = useBookStore();

  const sheets = catalog ? getAllSheetSizes(catalog, customSheetSizes, sheetSizePatches, hiddenSheetSizeIds) : customSheetSizes;

  return {
    ownNote: 'Un pliego tuyo no se edita: elimínalo y vuelve a añadirlo con las medidas nuevas.',
    addLabel: '+ Nuevo pliego',
    addSubmitLabel: 'Añadir pliego',
    hiddenLine: count => (count === 1
      ? '1 pliego de fábrica oculto.'
      : `${count} pliegos de fábrica ocultos.`),
    restoreLabel: 'Mostrar pliegos ocultos',
    fields: [
      { key: 'name', label: 'Nombre', kind: 'text' },
      { key: 'width_mm', label: 'Ancho', kind: 'number' },
      { key: 'height_mm', label: 'Alto', kind: 'number' },
    ],
    entry: sheets.find(item => item.id === sheetSizeId) ?? null,
    factory: catalog?.sheetSizes.find(item => item.id === sheetSizeId) ?? null,
    origin: getCatalogOrigin(sheetSizeId, customSheetSizes.map(item => item.id), sheetSizePatches.map(patch => patch.id)),
    error: customSheetSizeError,
    clearError: clearCustomSheetSizeError,
    read: sheet => ({ name: sheet.name, width_mm: String(sheet.width_mm), height_mm: String(sheet.height_mm) }),
    toChanges: (values, changed) => {
      const changes: Record<string, unknown> = {};
      if (changed.has('name')) changes.name = String(values.name).trim();
      if (changed.has('width_mm')) changes.width_mm = toNumber(values.width_mm);
      if (changed.has('height_mm')) changes.height_mm = toNumber(values.height_mm);
      return changes;
    },
    add: (values: FormValues) => addCustomSheetSize(
      String(values.name).trim(), toNumber(values.width_mm), toNumber(values.height_mm)
    ),
    patch: changes => patchSheetSize(sheetSizeId, changes),
    unpatch: () => unpatchSheetSize(sheetSizeId),
    hide: () => hideSheetSize(sheetSizeId),
    remove: () => removeCustomSheetSize(sheetSizeId),
    hiddenCount: hiddenSheetSizeIds.length,
    restoreHidden: () => hiddenSheetSizeIds.forEach(id => showSheetSize(id)),
  };
}

export function useBindingEditor(): CatalogEditor<Binding> {
  const {
    catalog, bindingId, customBindings, bindingPatches, hiddenBindingIds, customBindingError,
    addCustomBinding, removeCustomBinding, patchBinding, unpatchBinding, hideBinding, showBinding,
    clearCustomBindingError,
  } = useBookStore();

  const bindings = catalog ? getAllBindings(catalog, customBindings, bindingPatches, hiddenBindingIds) : customBindings;

  return {
    ownNote: 'Una encuadernación tuya no se edita: elimínala y vuelve a añadirla con los valores nuevos.',
    addLabel: '+ Nueva encuadernación',
    addSubmitLabel: 'Añadir encuadernación',
    hiddenLine: count => (count === 1
      ? '1 encuadernación de fábrica oculta.'
      : `${count} encuadernaciones de fábrica ocultas.`),
    restoreLabel: 'Mostrar encuadernaciones ocultas',
    fields: [
      { key: 'name', label: 'Nombre', kind: 'text' },
      { key: 'pageMultiple', label: 'Múltiplo de páginas', kind: 'number' },
      { key: 'minPages', label: 'Mínimo de páginas', kind: 'number' },
      { key: 'maxPages', label: 'Máximo de páginas', kind: 'number' },
      { key: 'spineAllowance_mm', label: 'Aporte al lomo', kind: 'number' },
      { key: 'nests', label: 'Anida los pliegos', kind: 'boolean' },
      { key: 'requiresSignatureMultiple', label: 'Exige múltiplo de firma', kind: 'boolean' },
    ],
    entry: bindings.find(item => item.id === bindingId) ?? null,
    factory: catalog?.bindings.find(item => item.id === bindingId) ?? null,
    origin: getCatalogOrigin(bindingId, customBindings.map(item => item.id), bindingPatches.map(patch => patch.id)),
    error: customBindingError,
    clearError: clearCustomBindingError,
    read: binding => ({
      name: binding.name,
      pageMultiple: String(binding.pageMultiple),
      minPages: String(binding.minPages),
      maxPages: String(binding.maxPages),
      spineAllowance_mm: String(binding.spineAllowance_mm),
      nests: binding.nests,
      requiresSignatureMultiple: binding.requiresSignatureMultiple,
    }),
    toChanges: (values, changed) => {
      const changes: Record<string, unknown> = {};
      if (changed.has('name')) changes.name = String(values.name).trim();
      for (const key of ['pageMultiple', 'minPages', 'maxPages', 'spineAllowance_mm']) {
        if (changed.has(key)) changes[key] = toNumber(values[key]);
      }
      for (const key of ['nests', 'requiresSignatureMultiple']) {
        if (changed.has(key)) changes[key] = Boolean(values[key]);
      }
      return changes;
    },
    add: (values: FormValues) => addCustomBinding(
      String(values.name).trim(),
      toNumber(values.pageMultiple),
      toNumber(values.minPages),
      toNumber(values.maxPages),
      toNumber(values.spineAllowance_mm),
      Boolean(values.nests),
      Boolean(values.requiresSignatureMultiple)
    ),
    patch: changes => patchBinding(bindingId, changes),
    unpatch: () => unpatchBinding(bindingId),
    hide: () => hideBinding(bindingId),
    remove: () => removeCustomBinding(bindingId),
    hiddenCount: hiddenBindingIds.length,
    restoreHidden: () => hiddenBindingIds.forEach(id => showBinding(id)),
  };
}

/**
 * A proportion is keyed by its own label, so renaming one is not a patch it
 * can carry: the store patches only its ratio and its description, and the
 * label is left out of the fields for that reason rather than by oversight.
 */
export function useProportionEditor(): CatalogEditor<Proportion> {
  const {
    catalog, proportionId, customProportions, proportionPatches, hiddenProportionLabels, customProportionError,
    addCustomProportion, removeCustomProportion, patchProportion, unpatchProportion, hideProportion, showProportion,
    clearCustomProportionError,
  } = useBookStore();

  const proportions = catalog
    ? getAllProportions(catalog, customProportions, proportionPatches, hiddenProportionLabels)
    : customProportions;
  const label = proportionId ?? '';

  return {
    ownNote: 'Una proporción tuya no se edita: elimínala y vuelve a añadirla con la razón nueva.',
    addLabel: '+ Nueva proporción',
    addSubmitLabel: 'Añadir proporción',
    hiddenLine: count => (count === 1
      ? '1 proporción de fábrica oculta.'
      : `${count} proporciones de fábrica ocultas.`),
    restoreLabel: 'Mostrar proporciones ocultas',
    fields: [
      { key: 'label', label: 'Etiqueta', kind: 'text', readOnly: true },
      { key: 'ratioWidth', label: 'Ancho de la razón', kind: 'number' },
      { key: 'ratioHeight', label: 'Alto de la razón', kind: 'number' },
      { key: 'description', label: 'Descripción', kind: 'text' },
    ],
    entry: proportions.find(item => item.label === label) ?? null,
    factory: catalog?.proportions.find(item => item.label === label) ?? null,
    origin: getCatalogOrigin(label, customProportions.map(item => item.label), proportionPatches.map(patch => patch.label)),
    error: customProportionError,
    clearError: clearCustomProportionError,
    read: proportion => ({
      label: proportion.label,
      ratioWidth: String(proportion.ratio[0]),
      ratioHeight: String(proportion.ratio[1]),
      description: proportion.description,
    }),
    toChanges: (values, changed) => {
      const changes: Record<string, unknown> = {};
      // The ratio is one field made of two boxes: either one moving rewrites it.
      if (changed.has('ratioWidth') || changed.has('ratioHeight')) {
        changes.ratio = [toNumber(values.ratioWidth), toNumber(values.ratioHeight)];
      }
      if (changed.has('description')) changes.description = String(values.description).trim();
      return changes;
    },
    add: (values: FormValues) => addCustomProportion(
      String(values.label).trim(),
      toNumber(values.ratioWidth),
      toNumber(values.ratioHeight),
      String(values.description).trim()
    ),
    patch: changes => patchProportion(label, changes),
    unpatch: () => unpatchProportion(label),
    hide: () => hideProportion(label),
    remove: () => removeCustomProportion(label),
    hiddenCount: hiddenProportionLabels.length,
    restoreHidden: () => hiddenProportionLabels.forEach(item => showProportion(item)),
  };
}

/**
 * A grammage hangs off a paper and is keyed by its own value, so it has no id
 * to patch and nothing to hide: you add yours and you remove it again. The
 * editor says so by leaving `patch`, `unpatch` and `hide` out, and the form
 * shows only what the catalog can actually do.
 */
export function useGrammageEditor(): CatalogEditor<GrammageOption> {
  const {
    catalog, substrateId, selectedGrammage, customGrammages, customGrammageError,
    addCustomGrammage, removeCustomGrammage, clearCustomGrammageError,
  } = useBookStore();

  const options = catalog ? getAllGrammageOptions(catalog, substrateId, customGrammages) : [];
  const isOwn = customGrammages.some(custom => custom.substrateId === substrateId && custom.grammage === selectedGrammage);

  return {
    ownNote: 'Los gramajes no se editan ni se ocultan: puedes añadir los tuyos y quitarlos.',
    addLabel: '+ Nuevo gramaje',
    addSubmitLabel: 'Añadir gramaje',
    hiddenLine: () => '',
    restoreLabel: '',
    fields: [
      { key: 'grammage', label: 'Gramaje', kind: 'number' },
      { key: 'caliper', label: 'Calibre declarado', kind: 'number' },
    ],
    entry: options.find(option => option.grammage === selectedGrammage) ?? null,
    factory: null,
    origin: isOwn ? 'own' : 'factory',
    error: customGrammageError,
    clearError: clearCustomGrammageError,
    read: option => ({ grammage: String(option.grammage), caliper: String(option.caliper) }),
    toChanges: () => ({}),
    add: (values: FormValues) => addCustomGrammage(substrateId, toNumber(values.grammage), toNumber(values.caliper)),
    remove: () => removeCustomGrammage(substrateId, selectedGrammage),
    hiddenCount: 0,
    restoreHidden: () => {},
  };
}
