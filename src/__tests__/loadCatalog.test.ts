import { describe, expect, it } from 'vitest';
import { loadCatalog } from '../config/loadCatalog';

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number; contentType?: string } = {}): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    headers: { get: () => init.contentType ?? 'application/json' },
    json: async () => body,
  } as unknown as Response;
}

const validSustratos = {
  source: 'Datos de prueba.',
  substrates: [{
    id: 'bond', name: 'Bond', type: 'bond', description: 'Papel',
    options: [{ grammage: 90, caliper: 115 }],
  }],
};
const validPliegos = {
  source: 'Datos de prueba.',
  sheetSizes: [{ id: 'carta', name: 'Carta', width_mm: 216, height_mm: 279 }],
};
const validFormatos = {
  proportions: [{ label: '2:3', ratio: [2, 3], description: 'Clásica' }],
  defaults: {
    substrateId: 'bond', grammage: 90, sheetSizeId: 'carta',
    pageWidth_mm: 140, proportionId: '2:3', bleed_mm: 3, totalPages: 32,
  },
};

describe('loadCatalog', () => {
  it('validates the catalog when all three files load successfully', async () => {
    const fetchStub = async (url: string) => {
      if (url.endsWith('sustratos.json')) return jsonResponse(validSustratos);
      if (url.endsWith('pliegos.json')) return jsonResponse(validPliegos);
      return jsonResponse(validFormatos);
    };

    const result = await loadCatalog(fetchStub as typeof fetch);
    expect(result.ok).toBe(true);
  });

  it('reports a ConfigError with an empty path for a network failure', async () => {
    const fetchStub = async (url: string) => {
      if (url.endsWith('sustratos.json')) throw new TypeError('Failed to fetch');
      if (url.endsWith('pliegos.json')) return jsonResponse(validPliegos);
      return jsonResponse(validFormatos);
    };

    const result = await loadCatalog(fetchStub as typeof fetch);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const error = result.errors.find(e => e.file === 'sustratos.json');
    expect(error).toBeDefined();
    expect(error?.path).toBe('');
    expect(error?.message).not.toMatch(/Failed to fetch/);
  });

  it('reports a ConfigError for a 404 response', async () => {
    const fetchStub = async (url: string) => {
      if (url.endsWith('pliegos.json')) return jsonResponse(null, { ok: false, status: 404 });
      if (url.endsWith('sustratos.json')) return jsonResponse(validSustratos);
      return jsonResponse(validFormatos);
    };

    const result = await loadCatalog(fetchStub as typeof fetch);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const error = result.errors.find(e => e.file === 'pliegos.json');
    expect(error).toBeDefined();
    expect(error?.path).toBe('');
    expect(error?.message).toContain('404');
  });

  it('reports a ConfigError for invalid JSON', async () => {
    const fetchStub = async (url: string) => {
      if (url.endsWith('formatos.json')) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: async () => { throw new SyntaxError('Unexpected token'); },
        } as unknown as Response;
      }
      if (url.endsWith('sustratos.json')) return jsonResponse(validSustratos);
      return jsonResponse(validPliegos);
    };

    const result = await loadCatalog(fetchStub as typeof fetch);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContainEqual(
      expect.objectContaining({ file: 'formatos.json', path: '' })
    );
  });

  it('reports "no encontrado" when the server returns an HTML fallback page instead of JSON', async () => {
    const fetchStub = async (url: string) => {
      if (url.endsWith('pliegos.json')) {
        return jsonResponse({}, { contentType: 'text/html; charset=utf-8' });
      }
      if (url.endsWith('sustratos.json')) return jsonResponse(validSustratos);
      return jsonResponse(validFormatos);
    };

    const result = await loadCatalog(fetchStub as typeof fetch);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const error = result.errors.find(e => e.file === 'pliegos.json');
    expect(error).toBeDefined();
    expect(error?.message).toContain('HTML');
    expect(error?.message).not.toMatch(/JSON válido/);
  });

  it('reports a timeout ConfigError when a file does not respond in time', async () => {
    const fetchStub = (_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(new DOMException('The operation timed out.', 'TimeoutError'));
      });
    });

    const result = await loadCatalog(fetchStub as typeof fetch, 5);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toHaveLength(3);
    for (const error of result.errors) {
      expect(error.path).toBe('');
      expect(error.message).toContain('no respondió');
    }
  });

  it('reports a timeout, not invalid JSON, when the connection succeeds but reading the body times out', async () => {
    const fetchStub = (_url: string, init?: RequestInit) => Promise.resolve({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: () => new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation timed out.', 'TimeoutError'));
        });
      }),
    } as unknown as Response);

    const result = await loadCatalog(fetchStub as typeof fetch, 5);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toHaveLength(3);
    for (const error of result.errors) {
      expect(error.path).toBe('');
      expect(error.message).toContain('no respondió');
      expect(error.message).not.toContain('JSON');
    }
  });

  it('validates the files that did load even when another file fails, skipping only the reference checks that need it', async () => {
    const fetchStub = async (url: string) => {
      if (url.endsWith('pliegos.json')) return jsonResponse(null, { ok: false, status: 404 });
      if (url.endsWith('sustratos.json')) {
        return jsonResponse({
          source: 'Datos de prueba.',
          substrates: [{
            id: 'bond', name: 'Bond', type: 'bond', description: 'Papel',
            options: [{ grammage: 90, caliper: -1 }],
          }],
        });
      }
      return jsonResponse(validFormatos);
    };

    const result = await loadCatalog(fetchStub as typeof fetch);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some(e => e.file === 'pliegos.json' && e.path === '')).toBe(true);
    expect(result.errors.some(e => e.file === 'sustratos.json' && e.path === 'substrates[0].options[0].caliper')).toBe(true);
    expect(result.errors.some(e => e.path === 'defaults.sheetSizeId')).toBe(false);
  });

  it('reports errors for every file that fails together', async () => {
    const fetchStub = async (url: string) => {
      if (url.endsWith('sustratos.json')) throw new TypeError('Failed to fetch');
      if (url.endsWith('pliegos.json')) return jsonResponse(null, { ok: false, status: 500 });
      return jsonResponse(validFormatos);
    };

    const result = await loadCatalog(fetchStub as typeof fetch);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toHaveLength(2);
    expect(result.errors.map(error => error.file).sort()).toEqual(['pliegos.json', 'sustratos.json']);
  });
});
