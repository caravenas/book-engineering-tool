import sustratosRaw from '../../public/config/sustratos.json?raw';
import pliegosRaw from '../../public/config/pliegos.json?raw';
import maquinasRaw from '../../public/config/maquinas.json?raw';
import esquemasRaw from '../../public/config/esquemas.json?raw';
import encuadernacionesRaw from '../../public/config/encuadernaciones.json?raw';
import tapasRaw from '../../public/config/tapas.json?raw';
import formatosRaw from '../../public/config/formatos.json?raw';
import type { ComponentType } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakeStorage } from './fakeStorage';
import { USER_LAYER_STORAGE_KEY, USER_LAYER_SCHEMA_VERSION, emptyUserLayer } from '../config/userLayer';

const RAW_CONFIG_FILES: Record<string, string> = {
  'sustratos.json': sustratosRaw,
  'pliegos.json': pliegosRaw,
  'maquinas.json': maquinasRaw,
  'esquemas.json': esquemasRaw,
  'encuadernaciones.json': encuadernacionesRaw,
  'tapas.json': tapasRaw,
  'formatos.json': formatosRaw,
};

function readConfigFile(name: string): unknown {
  return JSON.parse(RAW_CONFIG_FILES[name]);
}

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => body,
  } as unknown as Response;
}

function stubFetch(): void {
  const fetchStub = async (url: string) => {
    if (url.endsWith('sustratos.json')) return jsonResponse(readConfigFile('sustratos.json'));
    if (url.endsWith('pliegos.json')) return jsonResponse(readConfigFile('pliegos.json'));
    if (url.endsWith('maquinas.json')) return jsonResponse(readConfigFile('maquinas.json'));
    if (url.endsWith('esquemas.json')) return jsonResponse(readConfigFile('esquemas.json'));
    if (url.endsWith('encuadernaciones.json')) return jsonResponse(readConfigFile('encuadernaciones.json'));
    if (url.endsWith('tapas.json')) return jsonResponse(readConfigFile('tapas.json'));
    return jsonResponse(readConfigFile('formatos.json'));
  };
  vi.stubGlobal('fetch', fetchStub);
}

/**
 * Same injection point `persistenceUi.test.tsx` uses: replace the storage the
 * app resolves by default before the dynamic `import('../App')` below, so the
 * store singleton created at that module's load picks up this test's storage.
 */
function mockDefaultStorage(storage: Storage | null): void {
  vi.doMock('../config/userLayer', async () => {
    const actual = await vi.importActual<typeof import('../config/userLayer')>('../config/userLayer');
    return { ...actual, getDefaultUserLayerStorage: () => storage };
  });
}

async function importFreshApp(): Promise<ComponentType> {
  const module = await import('../App');
  return module.default;
}

/** A press id and a binding id that do not exist in any of the test config files above. */
const GHOST_PRESS_ID = 'prensa-fantasma';
const GHOST_BINDING_ID = 'encuadernacion-fantasma';

/** Seed storage with a v2 user layer holding a patch and a hide, both pointing at ids absent from the test catalog. */
function seedOrphanedUserLayer(storage: FakeStorage): void {
  const layer = {
    ...emptyUserLayer(),
    pressPatches: [{ id: GHOST_PRESS_ID, changes: { name: 'Prensa fantasma' } }],
    hiddenBindingIds: [GHOST_BINDING_ID],
  };
  storage.seed(USER_LAYER_STORAGE_KEY, JSON.stringify({ version: USER_LAYER_SCHEMA_VERSION, ...layer }));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.doUnmock('../config/userLayer');
  vi.resetModules();
});

describe('Orphaned user-layer entries (UX-6, §3.3)', () => {
  it('warns once, naming each orphaned target id and which catalog it belonged to', async () => {
    const storage = new FakeStorage();
    seedOrphanedUserLayer(storage);

    stubFetch();
    mockDefaultStorage(storage);
    const App = await importFreshApp();
    render(<App />);

    await screen.findByRole('heading', { name: 'Formato de página' });

    const notices = screen.getAllByRole('status');
    expect(notices).toHaveLength(1);
    const notice = notices[0];
    expect(notice.textContent).toContain(GHOST_PRESS_ID);
    expect(notice.textContent).toContain(GHOST_BINDING_ID);
    expect(notice.textContent).toContain('prensas');
    expect(notice.textContent).toContain('encuadernaciones');
  });

  it('removes one orphan from the notice and from storage without touching the other', async () => {
    const storage = new FakeStorage();
    seedOrphanedUserLayer(storage);

    stubFetch();
    mockDefaultStorage(storage);
    const App = await importFreshApp();
    render(<App />);

    await screen.findByRole('heading', { name: 'Formato de página' });
    fireEvent.click(screen.getByRole('button', { name: `Eliminar «${GHOST_PRESS_ID}»` }));

    const notice = screen.getByRole('status');
    expect(notice.textContent).not.toContain(GHOST_PRESS_ID);
    expect(notice.textContent).toContain(GHOST_BINDING_ID);

    const persisted = JSON.parse(storage.getItem(USER_LAYER_STORAGE_KEY)!);
    expect(persisted.pressPatches).toEqual([]);
    expect(persisted.hiddenBindingIds).toEqual([GHOST_BINDING_ID]);
  });

  it('lets the notice be dismissed and keeps it hidden for the rest of the session', async () => {
    const storage = new FakeStorage();
    seedOrphanedUserLayer(storage);

    stubFetch();
    mockDefaultStorage(storage);
    const App = await importFreshApp();
    render(<App />);

    await screen.findByRole('heading', { name: 'Formato de página' });
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar aviso de registros huérfanos' }));
    expect(screen.queryByRole('status')).toBeNull();

    // Removing an orphan still works after the notice is dismissed; it just
    // does not bring the notice back.
    const persisted = JSON.parse(storage.getItem(USER_LAYER_STORAGE_KEY)!);
    expect(persisted.pressPatches).toHaveLength(1);
    expect(screen.queryByRole('status')).toBeNull();
  });
});
