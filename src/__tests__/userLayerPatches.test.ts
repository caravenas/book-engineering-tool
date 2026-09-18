import { describe, expect, it } from 'vitest';
import { createBookStore, getAllBindings, getAllPresses } from '../store/useBookStore';
import { readUserLayer } from '../config/userLayer';
import { loadShippedCatalog } from './testCatalog';
import { FakeStorage } from './fakeStorage';
import type { Catalog } from '../types';

const catalog = loadShippedCatalog();

describe('UX-6: patching a factory entry', () => {
  it('applies only the changed fields and the effective catalog (and calculations) reflect them', () => {
    const storage = new FakeStorage();
    const store = createBookStore(storage);
    store.getState().initialize(catalog);

    // Shipped default: bindingId 'grapa', spineAllowance_mm 0, so bindingSpine.allowance_mm is 0.
    expect(store.getState().bindingId).toBe('grapa');
    expect(store.getState().bindingSpine).toEqual({ interior_mm: 1.92, allowance_mm: 0, total_mm: 1.92 });

    expect(store.getState().patchBinding('grapa', { spineAllowance_mm: 2 })).toBe(true);

    const state = store.getState();
    expect(state.bindingPatches).toEqual([{ id: 'grapa', changes: { spineAllowance_mm: 2 } }]);
    // Every other field of the factory entry survives untouched.
    const patchedBinding = getAllBindings(catalog, state.customBindings, state.bindingPatches, state.hiddenBindingIds)
      .find(b => b.id === 'grapa');
    expect(patchedBinding).toEqual({
      id: 'grapa', name: 'Grapa (caballete)', pageMultiple: 4, minPages: 8, maxPages: 64,
      spineAllowance_mm: 2, nests: true, requiresSignatureMultiple: false,
    });
    // The recalculated binding spine picks up the patched allowance immediately.
    expect(state.bindingSpine).toEqual({ interior_mm: 1.92, allowance_mm: 2, total_mm: 3.92 });
    expect(state.customBindingError).toBeNull();
  });

  it('rejects a patch that would leave the entry invalid, with a message, and does not save it', () => {
    const storage = new FakeStorage();
    const store = createBookStore(storage);
    store.getState().initialize(catalog);

    // minPages (8) would exceed maxPages (4) on 'grapa'.
    expect(store.getState().patchBinding('grapa', { maxPages: 4 })).toBe(false);
    expect(store.getState().bindingPatches).toEqual([]);
    expect(store.getState().customBindingError).toContain('inválidos');
    expect(readUserLayer(storage).bindingPatches).toEqual([]);
  });

  it('persists the patch across a remount, same as an alta', () => {
    const storage = new FakeStorage();
    const firstMount = createBookStore(storage);
    firstMount.getState().initialize(catalog);
    expect(firstMount.getState().patchPress('prensa_70x100', { gutter_mm: 8 })).toBe(true);

    const persisted = readUserLayer(storage);
    const secondMount = createBookStore(storage);
    secondMount.getState().initialize(catalog, persisted);

    const state = secondMount.getState();
    const press = getAllPresses(catalog, state.customPresses, state.pressPatches, state.hiddenPressIds)
      .find(p => p.id === 'prensa_70x100');
    expect(press?.gutter_mm).toBe(8);
  });

  it('unpatching reverts the entry to its factory values', () => {
    const storage = new FakeStorage();
    const store = createBookStore(storage);
    store.getState().initialize(catalog);
    store.getState().patchBinding('grapa', { spineAllowance_mm: 2 });

    store.getState().unpatchBinding('grapa');
    const state = store.getState();
    expect(state.bindingPatches).toEqual([]);
    expect(state.bindingSpine).toEqual({ interior_mm: 1.92, allowance_mm: 0, total_mm: 1.92 });
  });
});

describe('UX-6: hiding a factory entry', () => {
  it('excludes a hidden entry from the effective catalog without touching the factory file', () => {
    const storage = new FakeStorage();
    const store = createBookStore(storage);
    store.getState().initialize(catalog);

    store.getState().hideBinding('hotmelt');
    const state = store.getState();

    expect(state.hiddenBindingIds).toEqual(['hotmelt']);
    expect(getAllBindings(catalog, state.customBindings, state.bindingPatches, state.hiddenBindingIds)
      .some(b => b.id === 'hotmelt')).toBe(false);
    // The factory catalog itself is never mutated.
    expect(catalog.bindings.some(b => b.id === 'hotmelt')).toBe(true);
  });

  it('reselects a visible entry when the currently selected one is hidden', () => {
    const storage = new FakeStorage();
    const store = createBookStore(storage);
    store.getState().initialize(catalog);

    expect(store.getState().pressId).toBe('prensa_70x100');
    store.getState().hidePress('prensa_70x100');

    const state = store.getState();
    expect(state.pressId).not.toBe('prensa_70x100');
    expect(state.hiddenPressIds).toEqual(['prensa_70x100']);
    expect(getAllPresses(catalog, state.customPresses, state.pressPatches, state.hiddenPressIds)
      .some(p => p.id === state.pressId)).toBe(true);
  });

  it('showing a hidden entry brings it back into the effective catalog', () => {
    const storage = new FakeStorage();
    const store = createBookStore(storage);
    store.getState().initialize(catalog);

    store.getState().hideBinding('hotmelt');
    store.getState().showBinding('hotmelt');

    const state = store.getState();
    expect(state.hiddenBindingIds).toEqual([]);
    expect(getAllBindings(catalog, state.customBindings, state.bindingPatches, state.hiddenBindingIds)
      .some(b => b.id === 'hotmelt')).toBe(true);
  });
});

describe('UX-6: orphaned patches and hides', () => {
  it('keeps an orphaned patch in storage, excludes it from the effective catalog, and reports it', () => {
    const storage = new FakeStorage();
    const store = createBookStore(storage);
    store.getState().initialize(catalog);
    expect(store.getState().patchBinding('hotmelt', { spineAllowance_mm: 9 })).toBe(true);

    // A later factory update removes 'hotmelt' entirely.
    const catalogWithoutHotmelt: Catalog = {
      ...catalog,
      bindings: catalog.bindings.filter(b => b.id !== 'hotmelt'),
    };

    const persisted = readUserLayer(storage);
    const remounted = createBookStore(storage);
    expect(() => remounted.getState().initialize(catalogWithoutHotmelt, persisted)).not.toThrow();

    const state = remounted.getState();
    // Reported for the interface to warn about...
    expect(state.orphanedUserLayerEntries).toContainEqual({ kind: 'bindingPatch', targetId: 'hotmelt' });
    // ...never applied...
    expect(getAllBindings(catalogWithoutHotmelt, state.customBindings, state.bindingPatches, state.hiddenBindingIds)
      .some(b => b.id === 'hotmelt')).toBe(false);
    // ...but never silently deleted from storage either.
    expect(readUserLayer(storage).bindingPatches).toContainEqual({ id: 'hotmelt', changes: { spineAllowance_mm: 9 } });
    expect(state.impositionResult).not.toBeNull();
  });

  it('keeps an orphaned hide in storage, excludes it from the effective catalog, and reports it', () => {
    const storage = new FakeStorage();
    const store = createBookStore(storage);
    store.getState().initialize(catalog);
    store.getState().hideProportion('3:4');

    const catalogWithoutProportion: Catalog = {
      ...catalog,
      proportions: catalog.proportions.filter(p => p.label !== '3:4'),
    };

    const persisted = readUserLayer(storage);
    const remounted = createBookStore(storage);
    remounted.getState().initialize(catalogWithoutProportion, persisted);

    const state = remounted.getState();
    expect(state.orphanedUserLayerEntries).toContainEqual({ kind: 'hiddenProportion', targetId: '3:4' });
    expect(readUserLayer(storage).hiddenProportionLabels).toContain('3:4');
  });
});

describe('UX-6: a patched entry inherits factory changes it never touched', () => {
  it('keeps the user field and picks up the factory field that changed since', () => {
    const storage = new FakeStorage();
    const originalPress = catalog.presses.find(p => p.id === 'prensa_70x100')!;

    const firstMount = createBookStore(storage);
    firstMount.getState().initialize(catalog);
    expect(firstMount.getState().patchPress('prensa_70x100', { gutter_mm: originalPress.gutter_mm + 1 })).toBe(true);

    // A later factory update changes a field the user never touched.
    const updatedCatalog: Catalog = {
      ...catalog,
      presses: catalog.presses.map(press => (
        press.id === 'prensa_70x100'
          ? { ...press, sideMargin_mm: press.sideMargin_mm + 3 }
          : press
      )),
    };

    const persisted = readUserLayer(storage);
    const remounted = createBookStore(storage);
    remounted.getState().initialize(updatedCatalog, persisted);

    const state = remounted.getState();
    const effectivePress = getAllPresses(updatedCatalog, state.customPresses, state.pressPatches, state.hiddenPressIds)
      .find(p => p.id === 'prensa_70x100');

    expect(effectivePress?.gutter_mm).toBe(originalPress.gutter_mm + 1); // the user's edit survives
    expect(effectivePress?.sideMargin_mm).toBe(originalPress.sideMargin_mm + 3); // the factory's update is inherited
    expect(effectivePress?.maxSheetWidth_mm).toBe(originalPress.maxSheetWidth_mm); // untouched fields are unaffected
  });
});
