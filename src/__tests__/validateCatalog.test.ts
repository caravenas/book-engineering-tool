import { describe, expect, it } from 'vitest';
import { validateCatalog } from '../config/validateCatalog';
import type { CatalogFiles, ConfigError } from '../config/validateCatalog';

function assertError(errors: ConfigError[], file: string, path: string): ConfigError {
  const match = errors.find(error => error.file === file && error.path === path);
  expect(match, `expected an error for ${file} ${path}`).toBeDefined();
  const error = match as ConfigError;
  expect(typeof error.message).toBe('string');
  expect(error.message.length).toBeGreaterThan(0);
  return error;
}

function validSustratos() {
  return {
    source: 'Datos de prueba.',
    substrates: [
      {
        id: 'bond',
        name: 'Bond',
        type: 'bond',
        description: 'Papel bond.',
        options: [{ grammage: 90, caliper: 115 }],
      },
    ],
  };
}

function validPliegos() {
  return {
    source: 'Datos de prueba.',
    sheetSizes: [
      { id: 'carta', name: 'Carta', width_mm: 216, height_mm: 279 },
    ],
  };
}

function validFormatos() {
  return {
    proportions: [
      { label: '1:1', ratio: [1, 1], description: 'Cuadrada' },
      { label: '2:3', ratio: [2, 3], description: 'Clásica' },
      { label: '3:4', ratio: [3, 4], description: 'Fotográfica' },
      { label: '4:5', ratio: [4, 5], description: 'Cuarta' },
    ],
    defaults: {
      substrateId: 'bond',
      grammage: 90,
      sheetSizeId: 'carta',
      pageWidth_mm: 140,
      proportionId: '2:3',
      bleed_mm: 3,
      totalPages: 32,
    },
  };
}

function validInput(): CatalogFiles {
  return {
    'sustratos.json': validSustratos(),
    'pliegos.json': validPliegos(),
    'formatos.json': validFormatos(),
  };
}

describe('validateCatalog', () => {
  it('accepts a well-formed catalog', () => {
    const result = validateCatalog(validInput());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.catalog.substrates).toHaveLength(1);
    expect(result.catalog.substratesSource).toBe('Datos de prueba.');
    expect(result.catalog.sheetSizes).toHaveLength(1);
    expect(result.catalog.sheetSizesSource).toBe('Datos de prueba.');
    expect(result.catalog.proportions).toHaveLength(4);
    expect(result.catalog.defaults.substrateId).toBe('bond');
  });

  it('reports a malformed top-level structure for each file', () => {
    const result = validateCatalog({
      'sustratos.json': null,
      'pliegos.json': [1, 2, 3],
      'formatos.json': 'not an object',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    assertError(result.errors, 'sustratos.json', '');
    assertError(result.errors, 'pliegos.json', '');
    assertError(result.errors, 'formatos.json', '');
  });

  it('reports a missing required field', () => {
    const input = validInput();
    input['sustratos.json'] = {
      source: 'Datos de prueba.',
      substrates: [{ id: 'bond', name: 'Bond', type: 'bond', options: [{ grammage: 90, caliper: 115 }] }],
    };

    const result = validateCatalog(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    assertError(result.errors, 'sustratos.json', 'substrates[0].description');
  });

  it('reports a missing "defaults" key and a missing "proportions" key', () => {
    const result = validateCatalog({
      ...validInput(),
      'formatos.json': {},
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    assertError(result.errors, 'formatos.json', 'proportions');
    assertError(result.errors, 'formatos.json', 'defaults');
  });

  it('reports a missing "source" field on sustratos.json and pliegos.json', () => {
    const input = validInput();
    input['sustratos.json'] = { substrates: validSustratos().substrates };
    input['pliegos.json'] = { sheetSizes: validPliegos().sheetSizes };

    const result = validateCatalog(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    assertError(result.errors, 'sustratos.json', 'source');
    assertError(result.errors, 'pliegos.json', 'source');
  });

  it('rejects non-finite and non-positive numbers', () => {
    const input = validInput();
    input['sustratos.json'] = {
      source: 'Datos de prueba.',
      substrates: [{
        id: 'bond', name: 'Bond', type: 'bond', description: 'Papel',
        options: [{ grammage: Number.NaN, caliper: -5 }],
      }],
    };
    input['pliegos.json'] = {
      source: 'Datos de prueba.',
      sheetSizes: [{ id: 'carta', name: 'Carta', width_mm: Infinity, height_mm: 0 }],
    };

    const result = validateCatalog(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    assertError(result.errors, 'sustratos.json', 'substrates[0].options[0].grammage');
    assertError(result.errors, 'sustratos.json', 'substrates[0].options[0].caliper');
    assertError(result.errors, 'pliegos.json', 'sheetSizes[0].width_mm');
    assertError(result.errors, 'pliegos.json', 'sheetSizes[0].height_mm');
  });

  it('rejects null or non-object entries in substrates, sheetSizes, proportions, and options', () => {
    const input = validInput();
    input['sustratos.json'] = {
      source: 'Datos de prueba.',
      substrates: [null, 'not an object', { id: 'bond', name: 'Bond', type: 'bond', description: 'P', options: [null, 42] }],
    };
    input['pliegos.json'] = { source: 'Datos de prueba.', sheetSizes: [null, 7] };
    input['formatos.json'] = { ...validFormatos(), proportions: [null, true] };

    const result = validateCatalog(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    assertError(result.errors, 'sustratos.json', 'substrates[0]');
    assertError(result.errors, 'sustratos.json', 'substrates[1]');
    assertError(result.errors, 'sustratos.json', 'substrates[2].options[0]');
    assertError(result.errors, 'sustratos.json', 'substrates[2].options[1]');
    assertError(result.errors, 'pliegos.json', 'sheetSizes[0]');
    assertError(result.errors, 'pliegos.json', 'sheetSizes[1]');
    assertError(result.errors, 'formatos.json', 'proportions[0]');
    assertError(result.errors, 'formatos.json', 'proportions[1]');
  });

  it('rejects options that are not an array, and an empty options array', () => {
    const input = validInput();
    input['sustratos.json'] = {
      source: 'Datos de prueba.',
      substrates: [
        { id: 'bond', name: 'Bond', type: 'bond', description: 'P', options: 'not an array' },
        { id: 'opalina', name: 'Opalina', type: 'opalina', description: 'P', options: [] },
      ],
    };

    const result = validateCatalog(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    assertError(result.errors, 'sustratos.json', 'substrates[0].options');
    assertError(result.errors, 'sustratos.json', 'substrates[1].options');
  });

  it('rejects a ratio with the wrong length and with non-number entries', () => {
    const input = validInput();
    input['formatos.json'] = {
      ...validFormatos(),
      proportions: [
        { label: 'uno', ratio: [1], description: 'Corta' },
        { label: 'tres', ratio: [1, 2, 3], description: 'Larga' },
        { label: 'texto', ratio: ['a', 'b'], description: 'No numérica' },
      ],
      defaults: { ...validFormatos().defaults, proportionId: 'uno' },
    };

    const result = validateCatalog(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    assertError(result.errors, 'formatos.json', 'proportions[0].ratio');
    assertError(result.errors, 'formatos.json', 'proportions[1].ratio');
    assertError(result.errors, 'formatos.json', 'proportions[2].ratio[0]');
    assertError(result.errors, 'formatos.json', 'proportions[2].ratio[1]');
  });

  it('rejects whitespace-only strings for identifying fields', () => {
    const input = validInput();
    input['sustratos.json'] = {
      source: 'Datos de prueba.',
      substrates: [{ id: '   ', name: 'Bond', type: 'bond', description: 'Papel', options: [{ grammage: 90, caliper: 115 }] }],
    };

    const result = validateCatalog(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    assertError(result.errors, 'sustratos.json', 'substrates[0].id');
  });

  it('rejects ids, labels, and default references with leading or trailing whitespace', () => {
    const input = validInput();
    input['sustratos.json'] = {
      source: 'Datos de prueba.',
      substrates: [{ id: ' bond', name: 'Bond', type: 'bond', description: 'Papel', options: [{ grammage: 90, caliper: 115 }] }],
    };
    input['pliegos.json'] = {
      source: 'Datos de prueba.',
      sheetSizes: [{ id: 'carta ', name: 'Carta', width_mm: 216, height_mm: 279 }],
    };
    input['formatos.json'] = {
      ...validFormatos(),
      defaults: { ...validFormatos().defaults, substrateId: ' bond', sheetSizeId: 'carta ' },
    };

    const result = validateCatalog(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    assertError(result.errors, 'sustratos.json', 'substrates[0].id');
    assertError(result.errors, 'pliegos.json', 'sheetSizes[0].id');
    assertError(result.errors, 'formatos.json', 'defaults.substrateId');
    assertError(result.errors, 'formatos.json', 'defaults.sheetSizeId');
  });

  it('rejects duplicate substrate ids, sheet ids, and proportion labels', () => {
    const input = validInput();
    input['sustratos.json'] = {
      source: 'Datos de prueba.',
      substrates: [
        { id: 'bond', name: 'Bond', type: 'bond', description: 'Papel', options: [{ grammage: 90, caliper: 115 }] },
        { id: 'bond', name: 'Bond otra vez', type: 'bond', description: 'Papel', options: [{ grammage: 90, caliper: 115 }] },
      ],
    };
    input['pliegos.json'] = {
      source: 'Datos de prueba.',
      sheetSizes: [
        { id: 'carta', name: 'Carta', width_mm: 216, height_mm: 279 },
        { id: 'carta', name: 'Carta duplicada', width_mm: 216, height_mm: 279 },
      ],
    };
    input['formatos.json'] = {
      ...validFormatos(),
      proportions: [
        { label: '2:3', ratio: [2, 3], description: 'Clásica' },
        { label: '2:3', ratio: [2, 3], description: 'Duplicada' },
      ],
    };

    const result = validateCatalog(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    assertError(result.errors, 'sustratos.json', 'substrates[1].id');
    assertError(result.errors, 'pliegos.json', 'sheetSizes[1].id');
    assertError(result.errors, 'formatos.json', 'proportions[1].label');
  });

  it('rejects a duplicate grammage within the same substrate', () => {
    const input = validInput();
    input['sustratos.json'] = {
      source: 'Datos de prueba.',
      substrates: [{
        id: 'bond', name: 'Bond', type: 'bond', description: 'Papel',
        options: [{ grammage: 90, caliper: 115 }, { grammage: 90, caliper: 120 }],
      }],
    };

    const result = validateCatalog(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    assertError(result.errors, 'sustratos.json', 'substrates[0].options[1].grammage');
  });

  it('still flags a duplicate grammage when the first copy is otherwise invalid', () => {
    const input = validInput();
    input['sustratos.json'] = {
      source: 'Datos de prueba.',
      substrates: [{
        id: 'bond', name: 'Bond', type: 'bond', description: 'Papel',
        // First copy has an invalid caliper; the second is a real duplicate of its grammage.
        options: [{ grammage: 90, caliper: -1 }, { grammage: 90, caliper: 120 }],
      }],
    };

    const result = validateCatalog(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    assertError(result.errors, 'sustratos.json', 'substrates[0].options[0].caliper');
    assertError(result.errors, 'sustratos.json', 'substrates[0].options[1].grammage');
  });

  it('does not report a false "no existe" when the referenced substrate or grammage exists but another field is invalid', () => {
    const input = validInput();
    input['sustratos.json'] = {
      source: 'Datos de prueba.',
      substrates: [{
        id: 'bond', name: 'Bond', type: 'bond', description: 'Papel',
        // The default grammage (90) exists here, but its caliper is invalid.
        options: [{ grammage: 90, caliper: -1 }],
      }],
    };

    const result = validateCatalog(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    assertError(result.errors, 'sustratos.json', 'substrates[0].options[0].caliper');
    expect(result.errors.some(error => error.path === 'defaults.grammage')).toBe(false);
    expect(result.errors.some(error => error.path === 'defaults.substrateId')).toBe(false);
  });

  it('rejects defaults that reference a nonexistent substrate id, grammage, sheet id, and proportion', () => {
    const input = validInput();
    input['formatos.json'] = {
      proportions: validFormatos().proportions,
      defaults: {
        substrateId: 'missing-substrate',
        grammage: 999,
        sheetSizeId: 'missing-sheet',
        pageWidth_mm: 140,
        proportionId: 'missing-proportion',
        bleed_mm: 3,
        totalPages: 32,
      },
    };

    const result = validateCatalog(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    assertError(result.errors, 'formatos.json', 'defaults.substrateId');
    assertError(result.errors, 'formatos.json', 'defaults.sheetSizeId');
    assertError(result.errors, 'formatos.json', 'defaults.proportionId');
  });

  it('rejects a default grammage that does not exist for the referenced substrate', () => {
    const input = validInput();
    input['formatos.json'] = {
      proportions: validFormatos().proportions,
      defaults: { ...validFormatos().defaults, grammage: 999 },
    };

    const result = validateCatalog(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    assertError(result.errors, 'formatos.json', 'defaults.grammage');
  });

  it('rejects bleed_mm: -1 alone', () => {
    const input = validInput();
    input['formatos.json'] = {
      ...validFormatos(),
      defaults: { ...validFormatos().defaults, bleed_mm: -1 },
    };

    const result = validateCatalog(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    assertError(result.errors, 'formatos.json', 'defaults.bleed_mm');
  });

  it('rejects totalPages: 1.5 alone', () => {
    const input = validInput();
    input['formatos.json'] = {
      ...validFormatos(),
      defaults: { ...validFormatos().defaults, totalPages: 1.5 },
    };

    const result = validateCatalog(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    assertError(result.errors, 'formatos.json', 'defaults.totalPages');
  });

  it('rejects a default proportion that exists but is not among the first three', () => {
    const input = validInput();
    input['formatos.json'] = {
      ...validFormatos(),
      defaults: { ...validFormatos().defaults, proportionId: '4:5' },
    };

    const result = validateCatalog(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    assertError(result.errors, 'formatos.json', 'defaults.proportionId');
  });

  it('collects several unrelated errors at once instead of stopping at the first', () => {
    const result = validateCatalog({
      'sustratos.json': { source: '', substrates: [] },
      'pliegos.json': { source: '', sheetSizes: [] },
      'formatos.json': {
        proportions: [],
        defaults: {
          substrateId: '',
          grammage: -1,
          sheetSizeId: '',
          pageWidth_mm: 0,
          proportionId: '',
          bleed_mm: -1,
          totalPages: 0,
        },
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    const paths = result.errors
      .map(error => `${error.file}:${error.path}`)
      .sort();

    expect(paths).toEqual([
      'formatos.json:defaults.bleed_mm',
      'formatos.json:defaults.grammage',
      'formatos.json:defaults.pageWidth_mm',
      'formatos.json:defaults.proportionId',
      'formatos.json:defaults.sheetSizeId',
      'formatos.json:defaults.substrateId',
      'formatos.json:defaults.totalPages',
      'formatos.json:proportions',
      'pliegos.json:sheetSizes',
      'pliegos.json:source',
      'sustratos.json:source',
      'sustratos.json:substrates',
    ]);
  });

  it('does not report a false "no está entre las tres primeras" error when another entry before index 3 is invalid', () => {
    const input = validInput();
    input['formatos.json'] = {
      proportions: [
        { label: '1:1', ratio: [1, 1], description: 'Cuadrada' },
        { label: '2:3', ratio: [2, 3], description: '' },
        { label: '3:4', ratio: [3, 4], description: 'Fotográfica' },
        { label: '4:5', ratio: [4, 5], description: 'Cuarta' },
      ],
      defaults: { ...validFormatos().defaults, proportionId: '2:3' },
    };

    const result = validateCatalog(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    assertError(result.errors, 'formatos.json', 'proportions[1].description');
    expect(result.errors.some(error => error.path === 'defaults.proportionId')).toBe(false);
  });

  it('does not report a false "no existe" for a grammage that exists only in the first copy of a duplicate substrate id', () => {
    const input = validInput();
    input['sustratos.json'] = {
      source: 'Datos de prueba.',
      substrates: [
        { id: 'bond', name: 'Bond', type: 'bond', description: 'Papel', options: [{ grammage: 90, caliper: 115 }] },
        { id: 'bond', name: 'Bond duplicado', type: 'bond', description: 'Papel', options: [{ grammage: 200, caliper: 300 }] },
      ],
    };
    // defaults (from validFormatos()) still reference substrateId 'bond' and grammage 90.

    const result = validateCatalog(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    assertError(result.errors, 'sustratos.json', 'substrates[1].id');
    expect(result.errors.some(error => error.path === 'defaults.grammage')).toBe(false);
    expect(result.errors.some(error => error.path === 'defaults.substrateId')).toBe(false);
  });

  it('never returns ok when a file is missing from input without being declared unavailable', () => {
    const result = validateCatalog({
      'sustratos.json': validSustratos(),
      'pliegos.json': undefined,
      'formatos.json': validFormatos(),
    });

    expect(result.ok).toBe(false);
  });
});
