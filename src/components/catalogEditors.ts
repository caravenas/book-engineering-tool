import { useBookStore, getAllPresses, getAllSheetSizes, getAllBindings, getAllProportions, getAllGrammageOptions, getAllSubstrates, getAllCovers } from '../store/useBookStore';
import { getCatalogOrigin } from './CatalogOrigin';
import { toNumber, type CatalogEditor, type FormValues } from './CatalogEntryForm';
import type { Binding, Cover, GrammageOption, Press, Proportion, SheetSize, Substrate } from '../types';

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
    editCustomPress,
    patchPress,
    unpatchPress,
    hidePress,
    showPress,
    clearCustomPressError,
  } = useBookStore();

  const presses = catalog ? getAllPresses(catalog, customPresses, pressPatches, hiddenPressIds) : customPresses;

  return {
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
    editOwn: changes => editCustomPress(pressId, changes),
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
    addCustomSheetSize, removeCustomSheetSize, editCustomSheetSize, patchSheetSize, unpatchSheetSize, hideSheetSize, showSheetSize,
    clearCustomSheetSizeError,
  } = useBookStore();

  const sheets = catalog ? getAllSheetSizes(catalog, customSheetSizes, sheetSizePatches, hiddenSheetSizeIds) : customSheetSizes;

  return {
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
    editOwn: changes => editCustomSheetSize(sheetSizeId, changes),
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
    addCustomBinding, removeCustomBinding, editCustomBinding, patchBinding, unpatchBinding, hideBinding, showBinding,
    clearCustomBindingError,
  } = useBookStore();

  const bindings = catalog ? getAllBindings(catalog, customBindings, bindingPatches, hiddenBindingIds) : customBindings;

  return {
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
    editOwn: changes => editCustomBinding(bindingId, changes),
    unpatch: () => unpatchBinding(bindingId),
    hide: () => hideBinding(bindingId),
    remove: () => removeCustomBinding(bindingId),
    hiddenCount: hiddenBindingIds.length,
    restoreHidden: () => hiddenBindingIds.forEach(id => showBinding(id)),
  };
}

/**
 * A proportion is keyed by its own label. A factory one cannot be renamed,
 * because a patch records a difference against a key and renaming would move
 * the key itself — so the label is shown and not offered. One of your own is
 * replaced rather than patched, so there the label is yours to change, and
 * the store carries the selection across to the new one.
 */
export function useProportionEditor(): CatalogEditor<Proportion> {
  const {
    catalog, proportionId, customProportions, proportionPatches, hiddenProportionLabels, customProportionError,
    addCustomProportion, removeCustomProportion, editCustomProportion, patchProportion, unpatchProportion, hideProportion, showProportion,
    clearCustomProportionError,
  } = useBookStore();

  const proportions = catalog
    ? getAllProportions(catalog, customProportions, proportionPatches, hiddenProportionLabels)
    : customProportions;
  const label = proportionId ?? '';
  const origin = getCatalogOrigin(label, customProportions.map(item => item.label), proportionPatches.map(patch => patch.label));

  return {
    addLabel: '+ Nueva proporción',
    addSubmitLabel: 'Añadir proporción',
    hiddenLine: count => (count === 1
      ? '1 proporción de fábrica oculta.'
      : `${count} proporciones de fábrica ocultas.`),
    restoreLabel: 'Mostrar proporciones ocultas',
    fields: [
      { key: 'label', label: 'Etiqueta', kind: 'text', readOnly: origin !== 'own' },
      { key: 'ratioWidth', label: 'Ancho de la razón', kind: 'number' },
      { key: 'ratioHeight', label: 'Alto de la razón', kind: 'number' },
      { key: 'description', label: 'Descripción', kind: 'text' },
    ],
    entry: proportions.find(item => item.label === label) ?? null,
    factory: catalog?.proportions.find(item => item.label === label) ?? null,
    origin,
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
      // Only ever present for an entry of your own: the field is read-only
      // otherwise, and a read-only field is never counted as changed.
      if (changed.has('label')) changes.label = String(values.label).trim();
      return changes;
    },
    add: (values: FormValues) => addCustomProportion(
      String(values.label).trim(),
      toNumber(values.ratioWidth),
      toNumber(values.ratioHeight),
      String(values.description).trim()
    ),
    patch: changes => patchProportion(label, changes),
    editOwn: changes => editCustomProportion(label, changes),
    unpatch: () => unpatchProportion(label),
    hide: () => hideProportion(label),
    remove: () => removeCustomProportion(label),
    hiddenCount: hiddenProportionLabels.length,
    restoreHidden: () => hiddenProportionLabels.forEach(item => showProportion(item)),
  };
}

/**
 * A cover is the one catalog entry made of another: it names the paper it is
 * printed on and the weight of that paper, so its material is offered as a
 * choice among the papers the tool actually has rather than typed.
 *
 * Its measurements depend on what it is. A soft cover has no boards and a
 * hard one has no flaps, and the ones its kind forbids must be exactly zero
 * or the engine draws a template nobody can cut â so the form does not offer
 * them, and the editor supplies the zeros.
 */
export function useCoverEditor(): CatalogEditor<Cover> {
  const {
    catalog, coverId, customCovers, coverPatches, hiddenCoverIds, customCoverError,
    customSubstrates, substratePatches, hiddenSubstrateIds,
    addCustomCover, editCustomCover, removeCustomCover, patchCover, unpatchCover,
    hideCover, showCover, clearCustomCoverError,
  } = useBookStore();

  const covers = catalog ? getAllCovers(catalog, customCovers, coverPatches, hiddenCoverIds) : customCovers;
  const substrates = catalog
    ? getAllSubstrates(catalog, customSubstrates, substratePatches, hiddenSubstrateIds)
    : customSubstrates;

  const isHard = (values: FormValues) => String(values.kind) === 'dura';
  const readCover = (values: FormValues): Omit<Cover, 'id'> => {
    const hard = isHard(values);
    return {
      name: String(values.name).trim(),
      kind: hard ? 'dura' : 'blanda',
      substrateId: String(values.substrateId),
      grammage: toNumber(values.grammage),
      flapWidth_mm: hard ? 0 : toNumber(values.flapWidth_mm),
      squares_mm: hard ? toNumber(values.squares_mm) : 0,
      hingeGap_mm: hard ? toNumber(values.hingeGap_mm) : 0,
      turnIn_mm: hard ? toNumber(values.turnIn_mm) : 0,
      boardThickness_mm: hard ? toNumber(values.boardThickness_mm) : 0,
    };
  };

  return {
    addLabel: '+ Nueva tapa',
    addSubmitLabel: 'Añadir tapa',
    hiddenLine: count => (count === 1
      ? '1 tapa de fábrica oculta.'
      : `${count} tapas de fábrica ocultas.`),
    restoreLabel: 'Mostrar tapas ocultas',
    fields: [
      { key: 'name', label: 'Nombre', kind: 'text' },
      {
        key: 'kind',
        label: 'Tipo',
        kind: 'choice',
        choices: [{ value: 'blanda', label: 'Blanda' }, { value: 'dura', label: 'Dura' }],
      },
      {
        key: 'substrateId',
        label: 'Papel de la tapa',
        kind: 'choice',
        choices: substrates.map(item => ({ value: item.id, label: item.name })),
      },
      { key: 'grammage', label: 'Gramaje de la tapa', kind: 'number' },
      { key: 'flapWidth_mm', label: 'Ancho de solapa', kind: 'number', showWhen: values => !isHard(values) },
      { key: 'squares_mm', label: 'Ceja', kind: 'number', showWhen: isHard },
      { key: 'hingeGap_mm', label: 'Canal de bisagra', kind: 'number', showWhen: isHard },
      { key: 'turnIn_mm', label: 'Doblez de forro', kind: 'number', showWhen: isHard },
      { key: 'boardThickness_mm', label: 'Grosor de cartón', kind: 'number', showWhen: isHard },
    ],
    entry: covers.find(item => item.id === coverId) ?? null,
    factory: catalog?.covers.find(item => item.id === coverId) ?? null,
    origin: getCatalogOrigin(coverId, customCovers.map(item => item.id), coverPatches.map(patch => patch.id)),
    error: customCoverError,
    clearError: clearCustomCoverError,
    read: cover => ({
      name: cover.name,
      kind: cover.kind,
      substrateId: cover.substrateId,
      grammage: String(cover.grammage),
      flapWidth_mm: String(cover.flapWidth_mm),
      squares_mm: String(cover.squares_mm),
      hingeGap_mm: String(cover.hingeGap_mm),
      turnIn_mm: String(cover.turnIn_mm),
      boardThickness_mm: String(cover.boardThickness_mm),
    }),
    /*
     * Changing the kind rewrites every measurement, not only the ones on
     * screen: the four a soft cover forbids have to go to zero, and they are
     * not shown to be diffed. So a kind change carries the whole shape.
     */
    toChanges: (values, changed) => {
      const complete = readCover(values);
      if (changed.has('kind')) {
        const { name, ...shape } = complete;
        return changed.has('name') ? complete : shape;
      }
      const changes: Record<string, unknown> = {};
      if (changed.has('name')) changes.name = complete.name;
      if (changed.has('substrateId')) changes.substrateId = complete.substrateId;
      if (changed.has('grammage')) changes.grammage = complete.grammage;
      for (const key of ['flapWidth_mm', 'squares_mm', 'hingeGap_mm', 'turnIn_mm', 'boardThickness_mm'] as const) {
        if (changed.has(key)) changes[key] = complete[key];
      }
      return changes;
    },
    add: (values: FormValues) => addCustomCover(readCover(values)),
    patch: changes => patchCover(coverId, changes),
    editOwn: changes => editCustomCover(coverId, changes),
    unpatch: () => unpatchCover(coverId),
    hide: () => hideCover(coverId),
    remove: () => removeCustomCover(coverId),
    hiddenCount: hiddenCoverIds.length,
    restoreHidden: () => hiddenCoverIds.forEach(id => showCover(id)),
  };
}

export function useSubstrateEditor(): CatalogEditor<Substrate> {
  const {
    catalog, substrateId, customSubstrates, substratePatches, hiddenSubstrateIds, customSubstrateError,
    addCustomSubstrate, editCustomSubstrate, removeCustomSubstrate, patchSubstrate, unpatchSubstrate,
    hideSubstrate, showSubstrate, clearCustomSubstrateError,
  } = useBookStore();

  const substrates = catalog
    ? getAllSubstrates(catalog, customSubstrates, substratePatches, hiddenSubstrateIds)
    : customSubstrates;

  return {
    addLabel: '+ Nuevo papel',
    addSubmitLabel: 'Añadir papel',
    hiddenLine: count => (count === 1
      ? '1 papel de fábrica oculto.'
      : `${count} papeles de fábrica ocultos.`),
    restoreLabel: 'Mostrar papeles ocultos',
    fields: [
      { key: 'name', label: 'Nombre', kind: 'text' },
      { key: 'description', label: 'Descripción', kind: 'text' },
      // A paper needs one weight to exist at all; the rest are added below,
      // in the grammage list that hangs off it.
      { key: 'grammage', label: 'Primer gramaje', kind: 'number', onlyWhenAdding: true },
      { key: 'caliper', label: 'Calibre de ese gramaje', kind: 'number', onlyWhenAdding: true },
    ],
    entry: substrates.find(item => item.id === substrateId) ?? null,
    factory: catalog?.substrates.find(item => item.id === substrateId) ?? null,
    origin: getCatalogOrigin(substrateId, customSubstrates.map(item => item.id), substratePatches.map(patch => patch.id)),
    error: customSubstrateError,
    clearError: clearCustomSubstrateError,
    read: substrate => ({
      name: substrate.name,
      description: substrate.description,
      grammage: String(substrate.options[0]?.grammage ?? ''),
      caliper: String(substrate.options[0]?.caliper ?? ''),
    }),
    toChanges: (values, changed) => {
      const changes: Record<string, unknown> = {};
      if (changed.has('name')) changes.name = String(values.name).trim();
      if (changed.has('description')) changes.description = String(values.description).trim();
      return changes;
    },
    add: (values: FormValues) => addCustomSubstrate(
      String(values.name).trim(),
      String(values.description).trim(),
      toNumber(values.grammage),
      toNumber(values.caliper)
    ),
    patch: changes => patchSubstrate(substrateId, changes),
    editOwn: changes => editCustomSubstrate(substrateId, changes),
    unpatch: () => unpatchSubstrate(substrateId),
    hide: () => hideSubstrate(substrateId),
    remove: () => removeCustomSubstrate(substrateId),
    hiddenCount: hiddenSubstrateIds.length,
    restoreHidden: () => hiddenSubstrateIds.forEach(id => showSubstrate(id)),
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
    customSubstrates, substratePatches, hiddenSubstrateIds,
    addCustomGrammage, removeCustomGrammage, clearCustomGrammageError,
  } = useBookStore();

  const options = catalog
    ? getAllGrammageOptions(
        getAllSubstrates(catalog, customSubstrates, substratePatches, hiddenSubstrateIds),
        substrateId,
        customGrammages
      )
    : [];
  const isOwn = customGrammages.some(custom => custom.substrateId === substrateId && custom.grammage === selectedGrammage);

  return {
    readOnlyNote: 'Los gramajes no se editan ni se ocultan: puedes añadir los tuyos y quitarlos.',
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
