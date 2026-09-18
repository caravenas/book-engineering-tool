import { describe, expect, it } from 'vitest';
import { createBookStore } from '../store/useBookStore';
import { readUserLayer, USER_LAYER_STORAGE_KEY } from '../config/userLayer';
import { loadShippedCatalog } from './testCatalog';
import { FakeStorage } from './fakeStorage';

const catalog = loadShippedCatalog();

describe('user layer persistence: round trip across a remount', () => {
  it('persists an alta in each of the five catalogs and merges them back on the next initialize', () => {
    const storage = new FakeStorage();

    // First "mount": add one entry to each of the five custom catalogs.
    const firstMount = createBookStore(storage);
    firstMount.getState().initialize(catalog);

    expect(firstMount.getState().addCustomProportion('Panorámico', 21, 9, 'Formato ancho para álbumes.')).toBe(true);
    expect(firstMount.getState().addCustomGrammage('bond', 100, 130)).toBe(true);
    expect(firstMount.getState().addCustomSheetSize('Pliego especial', 700, 1000)).toBe(true);
    expect(firstMount.getState().addCustomPress('Prensa de prueba', 720, 1020, 10, 5, 5, 3)).toBe(true);
    expect(firstMount.getState().addCustomBinding('Encuadernación de prueba', 4, 8, 400, 2, true, false)).toBe(true);

    expect(firstMount.getState().userLayerWriteFailed).toBe(false);

    // "Remount the app": a fresh store instance reads whatever the first one wrote.
    const persisted = readUserLayer(storage);
    const secondMount = createBookStore(storage);
    secondMount.getState().initialize(catalog, persisted);

    const state = secondMount.getState();
    expect(state.customProportions.map(p => p.label)).toContain('Panorámico');
    expect(state.customGrammages).toContainEqual({ substrateId: 'bond', grammage: 100, caliper: 130 });
    expect(state.customSheetSizes.map(s => s.name)).toContain('Pliego especial');
    expect(state.customPresses.map(p => p.name)).toContain('Prensa de prueba');
    expect(state.customBindings.map(b => b.name)).toContain('Encuadernación de prueba');

    // The recovered entries are usable, not just present in the list.
    const recoveredSheet = state.customSheetSizes.find(s => s.name === 'Pliego especial');
    expect(recoveredSheet).toBeDefined();
    secondMount.getState().setSheetSize(recoveredSheet!.id);
    expect(secondMount.getState().sheetSizeId).toBe(recoveredSheet!.id);
    expect(secondMount.getState().impositionError).toBeNull();
  });
});

describe('user layer persistence: a write that fails mid-session', () => {
  it('keeps the new entry in memory, marks the write as failed, and never throws', () => {
    const storage = new FakeStorage();
    const store = createBookStore(storage);
    store.getState().initialize(catalog);
    expect(store.getState().userLayerStorageAvailable).toBe(true);

    // A prior alta already succeeded and was saved...
    expect(store.getState().addCustomProportion('Ya guardada', 3, 2, 'Entrada previa guardada con éxito.')).toBe(true);
    expect(store.getState().userLayerWriteFailed).toBe(false);
    const savedBeforeFailure = readUserLayer(storage);
    expect(savedBeforeFailure.customProportions.map(p => p.label)).toContain('Ya guardada');

    // ...then the quota fills up mid-session.
    storage.throwOnWrite = true;

    expect(() => store.getState().addCustomProportion('Solo en memoria', 4, 3, 'No se pudo guardar.')).not.toThrow();
    expect(store.getState().addCustomProportion('Solo en memoria 2', 5, 4, 'No se pudo guardar tampoco.')).toBe(true);

    const state = store.getState();
    expect(state.userLayerWriteFailed).toBe(true);
    // The in-memory addition survives even though persisting it failed.
    expect(state.customProportions.map(p => p.label)).toContain('Solo en memoria 2');
    // The data saved before the failure is untouched: the failed write never overwrote it with a partial payload.
    expect(readUserLayer(storage).customProportions.map(p => p.label)).toContain('Ya guardada');
  });
});

describe('user layer persistence: storage unavailable from startup', () => {
  it('initializes with factory data and leaves every action enabled', () => {
    const store = createBookStore(null);
    store.getState().initialize(catalog);

    expect(store.getState().userLayerStorageAvailable).toBe(false);
    expect(store.getState().customProportions).toEqual([]);
    expect(store.getState().impositionResult).not.toBeNull();

    // No action is disabled: altas still work in memory for the session, they just can't be saved.
    expect(store.getState().addCustomProportion('Solo en memoria', 3, 2, 'Sin almacenamiento disponible.')).toBe(true);
    const state = store.getState();
    expect(state.customProportions.map(p => p.label)).toContain('Solo en memoria');
    expect(state.userLayerWriteFailed).toBe(true);
  });
});

describe('user layer persistence: garbage input is discarded without breaking startup', () => {
  it('discards corrupt JSON and starts with factory data', () => {
    const storage = new FakeStorage();
    storage.seed(USER_LAYER_STORAGE_KEY, '{not valid json');

    const store = createBookStore(storage);
    expect(() => store.getState().initialize(catalog, readUserLayer(storage))).not.toThrow();
    expect(store.getState().customProportions).toEqual([]);
    expect(store.getState().impositionResult).not.toBeNull();
  });

  it('discards a value of unexpected shape and starts with factory data', () => {
    const storage = new FakeStorage();
    storage.seed(USER_LAYER_STORAGE_KEY, JSON.stringify({ version: 1, customProportions: 'not an array' }));

    const store = createBookStore(storage);
    expect(() => store.getState().initialize(catalog, readUserLayer(storage))).not.toThrow();
    expect(store.getState().customProportions).toEqual([]);
    expect(store.getState().impositionResult).not.toBeNull();
  });

  it('drops an orphaned grammage referencing a substrate that no longer exists, keeping the rest', () => {
    const storage = new FakeStorage();
    const store = createBookStore(storage);
    store.getState().initialize(catalog);

    expect(store.getState().addCustomGrammage('bond', 100, 130)).toBe(true);
    expect(store.getState().addCustomProportion('Sobrevive', 3, 2, 'Esta sí sigue existiendo.')).toBe(true);

    const persisted = readUserLayer(storage);
    const withOrphan = {
      ...persisted,
      customGrammages: [...persisted.customGrammages, { substrateId: 'sustrato-eliminado', grammage: 250, caliper: 300 }],
    };

    const remounted = createBookStore(storage);
    expect(() => remounted.getState().initialize(catalog, withOrphan)).not.toThrow();

    const state = remounted.getState();
    expect(state.customGrammages).toEqual([{ substrateId: 'bond', grammage: 100, caliper: 130 }]);
    expect(state.customProportions.map(p => p.label)).toContain('Sobrevive');
    expect(state.impositionResult).not.toBeNull();
  });
});
