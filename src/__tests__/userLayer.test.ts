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
