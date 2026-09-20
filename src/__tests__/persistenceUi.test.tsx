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
 * Replace the storage the app resolves by default, so every test injects its
 * own `Storage` (or `null`, for "unavailable") instead of touching the real
 * browser `window.localStorage`. Registered before the dynamic `import('../App')`
 * below so the store singleton created at that module's load picks it up.
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

const ADD_PROPORTION_BUTTON = 'Añadir proporción personalizada';

function addCustomProportion(label: string): void {
  fireEvent.click(screen.getByRole('button', { name: ADD_PROPORTION_BUTTON }));
  fireEvent.change(screen.getByLabelText('Etiqueta'), { target: { value: label } });
  fireEvent.change(screen.getByLabelText('Proporción (ancho)'), { target: { value: '3' } });
  fireEvent.change(screen.getByLabelText('Proporción (alto)'), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Formato de prueba.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Crear proporción' }));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.doUnmock('../config/userLayer');
  vi.resetModules();
});

describe('Startup: a single loading state (UX-5)', () => {
  it('shows exactly one status role while the catalog is loading, regardless of storage', async () => {
    vi.stubGlobal('fetch', () => new Promise<Response>(() => {}));
    mockDefaultStorage(new FakeStorage());

    const App = await importFreshApp();
    render(<App />);

    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status').textContent).toContain('Cargando configuración');
  });
});

describe('Healthy storage (UX-5)', () => {
  it('survives a full remount of the app: the alta made before reload is read back after it', async () => {
    const storage = new FakeStorage();

    stubFetch();
    mockDefaultStorage(storage);
    const App = await importFreshApp();
    const firstMount = render(<App />);

    await screen.findByRole('heading', { name: 'Formato' });
    expect(screen.queryByRole('status')).toBeNull();

    addCustomProportion('Panorámico');
    expect(screen.getByRole('button', { name: 'Panorámico' })).toBeTruthy();

    // "Reload the page": remounting re-runs the same startup effect, which
    // reads the storage this alta was just written to (the round trip
    // through a genuinely fresh store instance is already covered at the
    // store level by persistence.test.ts; this proves the interface wires
    // that read into `initialize` and renders the result).
    firstMount.unmount();
    stubFetch();
    render(<App />);

    await screen.findByRole('heading', { name: 'Formato' });
    expect(screen.queryAllByRole('status')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Panorámico' })).toBeTruthy();
  });
});

describe('Storage unavailable (UX-5, §3.5)', () => {
  it('mounts the whole app, warns with a status role, disables nothing, and keeps an in-session alta qualified', async () => {
    stubFetch();
    mockDefaultStorage(null);
    const App = await importFreshApp();
    render(<App />);

    await screen.findByRole('heading', { name: 'Formato' });

    const notice = screen.getByRole('status');
    expect(notice.textContent).toContain('No se pudo guardar la configuración personalizada');
    expect(notice.textContent).toContain('se perderán al recargar');

    // The five quick-add actions all stay usable.
    for (const name of [
      'Añadir proporción personalizada',
      'Añadir gramaje personalizado',
      'Añadir pliego personalizado',
      'Añadir encuadernación personalizada',
    ]) {
      expect((screen.getByRole('button', { name }) as HTMLButtonElement).disabled).toBe(false);
    }

    // Adding a press moved into the catalog, so that is where it is checked.
    fireEvent.click(screen.getByRole('button', { name: 'Catálogo' }));
    expect((screen.getByRole('button', { name: '+ Nueva prensa' }) as HTMLButtonElement).disabled).toBe(false);

    addCustomProportion('Solo esta sesión');

    expect(screen.getByRole('button', { name: 'Solo esta sesión' })).toBeTruthy();
    expect(screen.getByText(/proporción personalizada, guardada solo para esta sesión/)).toBeTruthy();
  });

  it('lets the notice be dismissed and keeps it hidden for the rest of the session', async () => {
    stubFetch();
    mockDefaultStorage(null);
    const App = await importFreshApp();
    render(<App />);

    await screen.findByRole('heading', { name: 'Formato' });
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }));
    expect(screen.queryByRole('status')).toBeNull();

    addCustomProportion('Después de cerrar el aviso');

    expect(screen.getByRole('button', { name: 'Después de cerrar el aviso' })).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('A write that fails mid-session (UX-5, §3.5)', () => {
  it('shows the notice without losing the entry the user just added', async () => {
    const storage = new FakeStorage();

    stubFetch();
    mockDefaultStorage(storage);
    const App = await importFreshApp();
    render(<App />);

    await screen.findByRole('heading', { name: 'Formato' });
    expect(screen.queryByRole('status')).toBeNull();

    storage.throwOnWrite = true;
    addCustomProportion('Sobrevive al fallo');

    expect(screen.getByRole('button', { name: 'Sobrevive al fallo' })).toBeTruthy();
    const notice = screen.getByRole('status');
    expect(notice.textContent).toContain('No se pudo guardar la configuración personalizada');
  });
});
