import sustratosRaw from '../../public/config/sustratos.json?raw';
import pliegosRaw from '../../public/config/pliegos.json?raw';
import maquinasRaw from '../../public/config/maquinas.json?raw';
import esquemasRaw from '../../public/config/esquemas.json?raw';
import encuadernacionesRaw from '../../public/config/encuadernaciones.json?raw';
import formatosRaw from '../../public/config/formatos.json?raw';
import { StrictMode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { useBookStore } from '../store/useBookStore';
import * as loadCatalogModule from '../config/loadCatalog';

const RAW_CONFIG_FILES: Record<string, string> = {
  'sustratos.json': sustratosRaw,
  'pliegos.json': pliegosRaw,
  'maquinas.json': maquinasRaw,
  'esquemas.json': esquemasRaw,
  'encuadernaciones.json': encuadernacionesRaw,
  'formatos.json': formatosRaw,
};

function readConfigFile(name: string): unknown {
  return JSON.parse(RAW_CONFIG_FILES[name]);
}

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number; contentType?: string } = {}): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    headers: { get: () => init.contentType ?? 'application/json' },
    json: async () => body,
  } as unknown as Response;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('App runtime config loading', () => {
  it('always shows the header and a status message while the catalog loads', () => {
    vi.stubGlobal('fetch', () => new Promise<Response>(() => {}));

    render(<App />);

    expect(screen.getByRole('heading', { name: 'PliegoStack' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('Cargando configuración');
  });

  it('shows an accessible alert listing file, path, and message when a config file fails to load', async () => {
    const fetchStub = async (url: string) => {
      if (url.endsWith('sustratos.json')) return jsonResponse(null, { ok: false, status: 404 });
      if (url.endsWith('pliegos.json')) return jsonResponse(readConfigFile('pliegos.json'));
      if (url.endsWith('maquinas.json')) return jsonResponse(readConfigFile('maquinas.json'));
      if (url.endsWith('esquemas.json')) return jsonResponse(readConfigFile('esquemas.json'));
      return jsonResponse(readConfigFile('formatos.json'));
    };
    vi.stubGlobal('fetch', fetchStub);

    render(<App />);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('No se pudo cargar la configuración');
    expect(alert.textContent).toContain('sustratos.json');
    expect(alert.textContent).toContain('404');
    expect(alert.textContent).toContain('Revisa los archivos en config/');
    expect(screen.getByRole('heading', { name: 'PliegoStack' })).toBeTruthy();
  });

  it('shows an accessible alert with the field path when a loaded file fails validation', async () => {
    const brokenSustratos = readConfigFile('sustratos.json') as { substrates: Array<{ options: Array<{ caliper: number }> }> };
    brokenSustratos.substrates[0].options[0].caliper = -1;

    const fetchStub = async (url: string) => {
      if (url.endsWith('sustratos.json')) return jsonResponse(brokenSustratos);
      if (url.endsWith('pliegos.json')) return jsonResponse(readConfigFile('pliegos.json'));
      if (url.endsWith('maquinas.json')) return jsonResponse(readConfigFile('maquinas.json'));
      if (url.endsWith('esquemas.json')) return jsonResponse(readConfigFile('esquemas.json'));
      return jsonResponse(readConfigFile('formatos.json'));
    };
    vi.stubGlobal('fetch', fetchStub);

    render(<App />);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('substrates[0].options[0].caliper');
  });

  it('renders the calculators grid once the catalog loads successfully and applies the shipped defaults', async () => {
    const fetchStub = async (url: string) => {
      if (url.endsWith('sustratos.json')) return jsonResponse(readConfigFile('sustratos.json'));
      if (url.endsWith('pliegos.json')) return jsonResponse(readConfigFile('pliegos.json'));
      if (url.endsWith('maquinas.json')) return jsonResponse(readConfigFile('maquinas.json'));
      if (url.endsWith('esquemas.json')) return jsonResponse(readConfigFile('esquemas.json'));
      if (url.endsWith('encuadernaciones.json')) return jsonResponse(readConfigFile('encuadernaciones.json'));
      return jsonResponse(readConfigFile('formatos.json'));
    };
    vi.stubGlobal('fetch', fetchStub);

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Canvas Designer' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Sustrato (Papel)' })).toBeTruthy();
    expect((screen.getByLabelText('Tipo de papel') as HTMLSelectElement).value).toBe('couche_matte');
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('calls initialize exactly once even under StrictMode double effects', async () => {
    const fetchStub = async (url: string) => {
      if (url.endsWith('sustratos.json')) return jsonResponse(readConfigFile('sustratos.json'));
      if (url.endsWith('pliegos.json')) return jsonResponse(readConfigFile('pliegos.json'));
      if (url.endsWith('maquinas.json')) return jsonResponse(readConfigFile('maquinas.json'));
      if (url.endsWith('esquemas.json')) return jsonResponse(readConfigFile('esquemas.json'));
      if (url.endsWith('encuadernaciones.json')) return jsonResponse(readConfigFile('encuadernaciones.json'));
      return jsonResponse(readConfigFile('formatos.json'));
    };
    vi.stubGlobal('fetch', fetchStub);
    const initializeSpy = vi.spyOn(useBookStore.getState(), 'initialize');

    render(
      <StrictMode>
        <App />
      </StrictMode>
    );

    expect(await screen.findByRole('heading', { name: 'Canvas Designer' })).toBeTruthy();
    expect(initializeSpy).toHaveBeenCalledTimes(1);
  });

  it('shows the generic error without a leading colon when loading rejects unexpectedly', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(loadCatalogModule, 'loadCatalog').mockRejectedValue(new Error('boom'));

    render(<App />);

    const alert = await screen.findByRole('alert');
    const item = alert.querySelector('li');
    expect(item?.textContent).toBe('Ocurrió un error inesperado al cargar la configuración.');
    expect(item?.textContent?.trimStart().startsWith(':')).toBe(false);
    expect(console.error).toHaveBeenCalled();
  });
});
