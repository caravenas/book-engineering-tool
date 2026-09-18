import { describe, expect, it } from 'vitest';
import {
  emptyUserLayer,
  isUserLayerStorageAvailable,
  readUserLayer,
  USER_LAYER_SCHEMA_VERSION,
  USER_LAYER_STORAGE_KEY,
  writeUserLayer,
} from '../config/userLayer';
import type { UserLayer } from '../types';
import { FakeStorage } from './fakeStorage';

function sampleLayer(): UserLayer {
  return {
    customProportions: [{ label: 'Panorámico', ratio: [21, 9], description: 'Formato ancho para álbumes.' }],
    customGrammages: [{ substrateId: 'bond', grammage: 100, caliper: 130 }],
    customSheetSizes: [{ id: 'custom_sheet_1', name: 'Pliego especial', width_mm: 700, height_mm: 1000 }],
    customPresses: [{
      id: 'custom_press_1',
      name: 'Prensa de prueba',
      maxSheetWidth_mm: 720,
      maxSheetHeight_mm: 1020,
      gripperMargin_mm: 10,
      sideMargin_mm: 5,
      tailMargin_mm: 5,
      gutter_mm: 3,
    }],
    customBindings: [{
      id: 'custom_binding_1',
      name: 'Encuadernación de prueba',
      pageMultiple: 4,
      minPages: 8,
      maxPages: 400,
      spineAllowance_mm: 2,
      nests: true,
      requiresSignatureMultiple: false,
    }],
    proportionPatches: [{ label: '1:1', changes: { description: 'Descripción editada.' } }],
    sheetSizePatches: [{ id: 'pliego_70x100', changes: { name: 'Pliego renombrado' } }],
    pressPatches: [{ id: 'prensa_70x100', changes: { gutter_mm: 4 } }],
    bindingPatches: [{ id: 'grapa', changes: { spineAllowance_mm: 1 } }],
    hiddenProportionLabels: ['2:3'],
    hiddenSheetSizeIds: ['tabloide'],
    hiddenPressIds: ['prensa_sra3'],
    hiddenBindingIds: ['hotmelt'],
  };
}

describe('isUserLayerStorageAvailable', () => {
  it('is true for a working storage', () => {
    expect(isUserLayerStorageAvailable(new FakeStorage())).toBe(true);
  });

  it('is false when storage throws on write', () => {
    expect(isUserLayerStorageAvailable(new FakeStorage({ throwOnWrite: true }))).toBe(false);
  });

  it('is false when there is no storage at all', () => {
    expect(isUserLayerStorageAvailable(null)).toBe(false);
  });
});

describe('writeUserLayer', () => {
  it('saves the layer and reports success', () => {
    const storage = new FakeStorage();
    expect(writeUserLayer(sampleLayer(), storage)).toBe(true);
    expect(storage.getItem(USER_LAYER_STORAGE_KEY)).not.toBeNull();
  });

  it('reports failure without throwing when storage rejects the write', () => {
    const storage = new FakeStorage({ throwOnWrite: true });
    expect(() => writeUserLayer(sampleLayer(), storage)).not.toThrow();
    expect(writeUserLayer(sampleLayer(), storage)).toBe(false);
  });

  it('reports failure without throwing when there is no storage at all', () => {
    expect(writeUserLayer(sampleLayer(), null)).toBe(false);
  });
});

describe('readUserLayer round-trip', () => {
  it('reads back exactly what was written', () => {
    const storage = new FakeStorage();
    const layer = sampleLayer();
    writeUserLayer(layer, storage);
    expect(readUserLayer(storage)).toEqual(layer);
  });

  it('returns an empty layer when nothing was ever saved', () => {
    expect(readUserLayer(new FakeStorage())).toEqual(emptyUserLayer());
  });

  it('returns an empty layer without throwing when there is no storage at all', () => {
    expect(() => readUserLayer(null)).not.toThrow();
    expect(readUserLayer(null)).toEqual(emptyUserLayer());
  });

  it('returns an empty layer without throwing when storage throws on read', () => {
    const storage = new FakeStorage({ throwOnRead: true });
    expect(() => readUserLayer(storage)).not.toThrow();
    expect(readUserLayer(storage)).toEqual(emptyUserLayer());
  });

  it('discards corrupt JSON without throwing', () => {
    const storage = new FakeStorage();
    storage.seed(USER_LAYER_STORAGE_KEY, '{not valid json');
    expect(() => readUserLayer(storage)).not.toThrow();
    expect(readUserLayer(storage)).toEqual(emptyUserLayer());
  });

  it('discards a value of unexpected shape without throwing', () => {
    const storage = new FakeStorage();
    storage.seed(USER_LAYER_STORAGE_KEY, JSON.stringify(['not', 'an', 'object']));
    expect(() => readUserLayer(storage)).not.toThrow();
    expect(readUserLayer(storage)).toEqual(emptyUserLayer());
  });

  it('discards a payload from an unsupported schema version', () => {
    const storage = new FakeStorage();
    storage.seed(USER_LAYER_STORAGE_KEY, JSON.stringify({ version: USER_LAYER_SCHEMA_VERSION + 1, ...sampleLayer() }));
    expect(readUserLayer(storage)).toEqual(emptyUserLayer());
  });

  it('migrates a genuine v1 payload (UX-5, before patches/hides existed) without losing its altas', () => {
    const storage = new FakeStorage();
    // Written by hand exactly as UX-5 would have left it: only the five alta
    // lists, no patch/hide fields at all, version 1. Not generated from
    // emptyUserLayer() or any current helper, so this test fails if a future
    // refactor of the v1 shape (not just the migration code) drifts.
    const v1Payload = {
      version: 1,
      customProportions: [
        { label: 'Panorámico', ratio: [21, 9], description: 'Formato ancho para álbumes.' },
      ],
      customGrammages: [
        { substrateId: 'bond', grammage: 100, caliper: 130 },
      ],
      customSheetSizes: [
        { id: 'custom_sheet_1', name: 'Pliego especial', width_mm: 700, height_mm: 1000 },
      ],
      customPresses: [
        {
          id: 'custom_press_1',
          name: 'Prensa de prueba',
          maxSheetWidth_mm: 720,
          maxSheetHeight_mm: 1020,
          gripperMargin_mm: 10,
          sideMargin_mm: 5,
          tailMargin_mm: 5,
          gutter_mm: 3,
        },
      ],
      customBindings: [
        {
          id: 'custom_binding_1',
          name: 'Encuadernación de prueba',
          pageMultiple: 4,
          minPages: 8,
          maxPages: 400,
          spineAllowance_mm: 2,
          nests: true,
          requiresSignatureMultiple: false,
        },
      ],
    };
    storage.seed(USER_LAYER_STORAGE_KEY, JSON.stringify(v1Payload));

    const migrated = readUserLayer(storage);

    expect(migrated.customProportions).toEqual(v1Payload.customProportions);
    expect(migrated.customGrammages).toEqual(v1Payload.customGrammages);
    expect(migrated.customSheetSizes).toEqual(v1Payload.customSheetSizes);
    expect(migrated.customPresses).toEqual(v1Payload.customPresses);
    expect(migrated.customBindings).toEqual(v1Payload.customBindings);
    expect(migrated.proportionPatches).toEqual([]);
    expect(migrated.sheetSizePatches).toEqual([]);
    expect(migrated.pressPatches).toEqual([]);
    expect(migrated.bindingPatches).toEqual([]);
    expect(migrated.hiddenProportionLabels).toEqual([]);
    expect(migrated.hiddenSheetSizeIds).toEqual([]);
    expect(migrated.hiddenPressIds).toEqual([]);
    expect(migrated.hiddenBindingIds).toEqual([]);

    // Writing the migrated layer back upgrades the stored payload to v2
    // without losing any of the altas that survived the migration.
    expect(writeUserLayer(migrated, storage)).toBe(true);
    const rewritten = JSON.parse(storage.getItem(USER_LAYER_STORAGE_KEY)!);
    expect(rewritten.version).toBe(USER_LAYER_SCHEMA_VERSION);
    expect(rewritten.customProportions).toEqual(v1Payload.customProportions);
    expect(rewritten.customPresses).toEqual(v1Payload.customPresses);
    expect(readUserLayer(storage)).toEqual(migrated);
  });

  it('drops individually malformed entries but keeps the well-formed ones in the same list', () => {
    const storage = new FakeStorage();
    const layer = sampleLayer();
    const tampered = {
      version: USER_LAYER_SCHEMA_VERSION,
      customProportions: [...layer.customProportions, { label: '', ratio: [1, 1], description: 'inválida' }],
      customGrammages: [...layer.customGrammages, { substrateId: 'bond', grammage: -5, caliper: 10 }],
      customSheetSizes: layer.customSheetSizes,
      customPresses: layer.customPresses,
      customBindings: layer.customBindings,
    };
    storage.seed(USER_LAYER_STORAGE_KEY, JSON.stringify(tampered));

    const result = readUserLayer(storage);
    expect(result.customProportions).toEqual(layer.customProportions);
    expect(result.customGrammages).toEqual(layer.customGrammages);
  });
});
