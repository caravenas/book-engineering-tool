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

function validMaquinas() {
  return {
    source: 'Datos de prueba.',
    presses: [
      {
        id: 'prensa1',
        name: 'Prensa 1',
        maxSheetWidth_mm: 500,
        maxSheetHeight_mm: 700,
        gripperMargin_mm: 10,
        sideMargin_mm: 5,
        tailMargin_mm: 5,
        gutter_mm: 3,
      },
    ],
  };
}

function validEsquemas() {
  return {
    source: 'Datos de prueba.',
    foldingSchemes: [
      {
        id: 'esquema1',
        name: 'Esquema 1',
        pagesPerSignature: 8,
        cols: 2,
        rows: 2,
        sides: {
          front: [
            { page: 8, rotation: 180 },
            { page: 1, rotation: 0 },
            { page: 6, rotation: 180 },
            { page: 3, rotation: 0 },
          ],
          back: [
            { page: 2, rotation: 180 },
            { page: 7, rotation: 0 },
            { page: 4, rotation: 180 },
            { page: 5, rotation: 0 },
          ],
        },
      },
    ],
  };
}

function validEncuadernaciones() {
  return {
    source: 'Datos de prueba.',
    bindings: [
      {
        id: 'grapa',
        name: 'Grapa',
        pageMultiple: 4,
        minPages: 8,
        maxPages: 64,
        spineAllowance_mm: 0,
        nests: true,
        requiresSignatureMultiple: false,
      },
    ],
  };
}

function validTapas() {
  return {
    source: 'Datos de prueba.',
    covers: [
      {
        id: 'blanda',
        name: 'Tapa blanda',
        kind: 'blanda',
        substrateId: 'bond',
        grammage: 90,
        flapWidth_mm: 0,
        squares_mm: 0,
        hingeGap_mm: 0,
        turnIn_mm: 0,
        boardThickness_mm: 0,
      },
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
      pressId: 'prensa1',
      bindingId: 'grapa',
      coverId: 'blanda',
    },
  };
}

function validInput(): CatalogFiles {
  return {
    'sustratos.json': validSustratos(),
    'pliegos.json': validPliegos(),
    'maquinas.json': validMaquinas(),
    'esquemas.json': validEsquemas(),
    'encuadernaciones.json': validEncuadernaciones(),
    'tapas.json': validTapas(),
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
    expect(result.catalog.presses).toHaveLength(1);
    expect(result.catalog.pressesSource).toBe('Datos de prueba.');
    expect(result.catalog.foldingSchemes).toHaveLength(1);
    expect(result.catalog.foldingSchemesSource).toBe('Datos de prueba.');
    expect(result.catalog.bindings).toHaveLength(1);
    expect(result.catalog.bindingsSource).toBe('Datos de prueba.');
    expect(result.catalog.covers).toHaveLength(1);
    expect(result.catalog.coversSource).toBe('Datos de prueba.');
    expect(result.catalog.proportions).toHaveLength(4);
    expect(result.catalog.defaults.substrateId).toBe('bond');
    expect(result.catalog.defaults.pressId).toBe('prensa1');
    expect(result.catalog.defaults.bindingId).toBe('grapa');
    expect(result.catalog.defaults.coverId).toBe('blanda');
  });

  it('reports a malformed top-level structure for each file', () => {
    const result = validateCatalog({
      'sustratos.json': null,
      'pliegos.json': [1, 2, 3],
      'maquinas.json': 42,
      'esquemas.json': 'not an object',
      'encuadernaciones.json': 'not an object',
      'tapas.json': 'not an object',
      'formatos.json': 'not an object',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    assertError(result.errors, 'sustratos.json', '');
    assertError(result.errors, 'pliegos.json', '');
    assertError(result.errors, 'maquinas.json', '');
    assertError(result.errors, 'esquemas.json', '');
    assertError(result.errors, 'encuadernaciones.json', '');
    assertError(result.errors, 'tapas.json', '');
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

  it('rejects defaults that reference a nonexistent substrate id, grammage, sheet id, proportion, press id, binding id, and cover id', () => {
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
        pressId: 'missing-press',
        bindingId: 'missing-binding',
        coverId: 'missing-cover',
      },
    };

    const result = validateCatalog(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    assertError(result.errors, 'formatos.json', 'defaults.substrateId');
    assertError(result.errors, 'formatos.json', 'defaults.sheetSizeId');
    assertError(result.errors, 'formatos.json', 'defaults.proportionId');
    assertError(result.errors, 'formatos.json', 'defaults.pressId');
    assertError(result.errors, 'formatos.json', 'defaults.bindingId');
    assertError(result.errors, 'formatos.json', 'defaults.coverId');
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
      'maquinas.json': validMaquinas(),
      'esquemas.json': validEsquemas(),
      'encuadernaciones.json': validEncuadernaciones(),
      'tapas.json': validTapas(),
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
          pressId: '',
          bindingId: '',
          coverId: '',
        },
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    const paths = result.errors
      .map(error => `${error.file}:${error.path}`)
      .sort();

    expect(paths).toEqual([
      'formatos.json:defaults.bindingId',
      'formatos.json:defaults.bleed_mm',
      'formatos.json:defaults.coverId',
      'formatos.json:defaults.grammage',
      'formatos.json:defaults.pageWidth_mm',
      'formatos.json:defaults.pressId',
      'formatos.json:defaults.proportionId',
      'formatos.json:defaults.sheetSizeId',
      'formatos.json:defaults.substrateId',
      'formatos.json:defaults.totalPages',
      'formatos.json:proportions',
      'pliegos.json:sheetSizes',
      'pliegos.json:source',
      'sustratos.json:source',
      'sustratos.json:substrates',
      'tapas.json:covers[0].substrateId',
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
      'maquinas.json': validMaquinas(),
      'esquemas.json': validEsquemas(),
      'encuadernaciones.json': validEncuadernaciones(),
      'tapas.json': validTapas(),
      'formatos.json': validFormatos(),
    });

    expect(result.ok).toBe(false);
  });

  describe('presses (maquinas.json)', () => {
    it('rejects non-finite geometry values and negative margins', () => {
      const input = validInput();
      input['maquinas.json'] = {
        source: 'Datos de prueba.',
        presses: [{
          id: 'prensa1',
          name: 'Prensa 1',
          maxSheetWidth_mm: Number.NaN,
          maxSheetHeight_mm: -1,
          gripperMargin_mm: -1,
          sideMargin_mm: -1,
          tailMargin_mm: -1,
          gutter_mm: -1,
        }],
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'maquinas.json', 'presses[0].maxSheetWidth_mm');
      assertError(result.errors, 'maquinas.json', 'presses[0].maxSheetHeight_mm');
      assertError(result.errors, 'maquinas.json', 'presses[0].gripperMargin_mm');
      assertError(result.errors, 'maquinas.json', 'presses[0].sideMargin_mm');
      assertError(result.errors, 'maquinas.json', 'presses[0].tailMargin_mm');
      assertError(result.errors, 'maquinas.json', 'presses[0].gutter_mm');
    });

    it('rejects margins that leave no usable printable area', () => {
      const input = validInput();
      input['maquinas.json'] = {
        source: 'Datos de prueba.',
        presses: [{
          id: 'prensa1',
          name: 'Prensa 1',
          maxSheetWidth_mm: 100,
          maxSheetHeight_mm: 100,
          gripperMargin_mm: 60,
          sideMargin_mm: 60,
          tailMargin_mm: 60,
          gutter_mm: 3,
        }],
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'maquinas.json', 'presses[0].gripperMargin_mm');
      assertError(result.errors, 'maquinas.json', 'presses[0].sideMargin_mm');
    });

    it('rejects duplicate press ids', () => {
      const input = validInput();
      input['maquinas.json'] = {
        source: 'Datos de prueba.',
        presses: [
          validMaquinas().presses[0],
          { ...validMaquinas().presses[0], name: 'Prensa duplicada' },
        ],
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'maquinas.json', 'presses[1].id');
    });

    it('rejects a null and a non-object entry in presses', () => {
      const input = validInput();
      input['maquinas.json'] = {
        source: 'Datos de prueba.',
        presses: [null, 'not an object', validMaquinas().presses[0]],
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'maquinas.json', 'presses[0]');
      assertError(result.errors, 'maquinas.json', 'presses[1]');
    });

    it('does not report a false "no existe" for defaults.pressId when the referenced press has an invalid name', () => {
      const input = validInput();
      input['maquinas.json'] = {
        source: 'Datos de prueba.',
        presses: [{ ...validMaquinas().presses[0], name: '' }],
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'maquinas.json', 'presses[0].name');
      expect(result.errors.some(error => error.path === 'defaults.pressId')).toBe(false);
    });
  });

  describe('folding schemes (esquemas.json)', () => {
    it('rejects a pagesPerSignature that is not a multiple of 4', () => {
      const input = validInput();
      const scheme = validEsquemas().foldingSchemes[0];
      input['esquemas.json'] = {
        source: 'Datos de prueba.',
        foldingSchemes: [{ ...scheme, pagesPerSignature: 6 }],
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'esquemas.json', 'foldingSchemes[0].pagesPerSignature');
    });

    it('rejects a cols × rows product that does not match half of pagesPerSignature', () => {
      const input = validInput();
      const scheme = validEsquemas().foldingSchemes[0];
      input['esquemas.json'] = {
        source: 'Datos de prueba.',
        foldingSchemes: [{ ...scheme, cols: 3, rows: 1 }],
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'esquemas.json', 'foldingSchemes[0].cols');
    });

    it('rejects a rotation of 90 degrees', () => {
      const input = validInput();
      const scheme = validEsquemas().foldingSchemes[0];
      input['esquemas.json'] = {
        source: 'Datos de prueba.',
        foldingSchemes: [{
          ...scheme,
          sides: {
            ...scheme.sides,
            front: [
              { page: 8, rotation: 90 },
              ...scheme.sides.front.slice(1),
            ],
          },
        }],
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'esquemas.json', 'foldingSchemes[0].sides.front[0].rotation');
    });

    it('rejects a scheme with a page missing between front and back', () => {
      const input = validInput();
      const scheme = validEsquemas().foldingSchemes[0];
      input['esquemas.json'] = {
        source: 'Datos de prueba.',
        foldingSchemes: [{
          ...scheme,
          sides: {
            front: scheme.sides.front,
            // Page 5 is replaced by a repeat of page 4: page 5 never appears.
            back: [
              scheme.sides.back[0], scheme.sides.back[1], scheme.sides.back[2],
              { page: 4, rotation: 0 },
            ],
          },
        }],
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'esquemas.json', 'foldingSchemes[0].sides.back[3].page');
      assertError(result.errors, 'esquemas.json', 'foldingSchemes[0].sides');
    });

    it('rejects a scheme with a page duplicated across front and back', () => {
      const input = validInput();
      const scheme = validEsquemas().foldingSchemes[0];
      input['esquemas.json'] = {
        source: 'Datos de prueba.',
        foldingSchemes: [{
          ...scheme,
          sides: {
            front: scheme.sides.front,
            // Page 1 (already on the front) replaces page 5 on the back.
            back: [
              scheme.sides.back[0], scheme.sides.back[1], scheme.sides.back[2],
              { page: 1, rotation: 0 },
            ],
          },
        }],
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'esquemas.json', 'foldingSchemes[0].sides.back[3].page');
    });

    it('rejects a side with the wrong number of slots', () => {
      const input = validInput();
      const scheme = validEsquemas().foldingSchemes[0];
      input['esquemas.json'] = {
        source: 'Datos de prueba.',
        foldingSchemes: [{
          ...scheme,
          sides: { front: scheme.sides.front.slice(0, 3), back: scheme.sides.back },
        }],
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'esquemas.json', 'foldingSchemes[0].sides.front');
    });

    it('rejects a null and a non-object entry in foldingSchemes', () => {
      const input = validInput();
      input['esquemas.json'] = {
        source: 'Datos de prueba.',
        foldingSchemes: [null, 42, validEsquemas().foldingSchemes[0]],
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'esquemas.json', 'foldingSchemes[0]');
      assertError(result.errors, 'esquemas.json', 'foldingSchemes[1]');
    });

    it('rejects a non-object "sides" and a non-array "sides.front"', () => {
      const input = validInput();
      const scheme = validEsquemas().foldingSchemes[0];
      input['esquemas.json'] = {
        source: 'Datos de prueba.',
        foldingSchemes: [
          { ...scheme, id: 'esquema-a', sides: 'not an object' },
          { ...scheme, id: 'esquema-b', sides: { front: 'not an array', back: scheme.sides.back } },
        ],
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'esquemas.json', 'foldingSchemes[0].sides');
      assertError(result.errors, 'esquemas.json', 'foldingSchemes[1].sides.front');
    });

    it('rejects a non-integer page', () => {
      const input = validInput();
      const scheme = validEsquemas().foldingSchemes[0];
      input['esquemas.json'] = {
        source: 'Datos de prueba.',
        foldingSchemes: [{
          ...scheme,
          sides: { ...scheme.sides, front: [{ page: 1.5, rotation: 0 }, ...scheme.sides.front.slice(1)] },
        }],
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'esquemas.json', 'foldingSchemes[0].sides.front[0].page');
    });

    it('rejects a page out of range (9 in an 8-page scheme)', () => {
      const input = validInput();
      const scheme = validEsquemas().foldingSchemes[0];
      input['esquemas.json'] = {
        source: 'Datos de prueba.',
        foldingSchemes: [{
          ...scheme,
          sides: { ...scheme.sides, front: [{ page: 9, rotation: 0 }, ...scheme.sides.front.slice(1)] },
        }],
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'esquemas.json', 'foldingSchemes[0].sides.front[0].page');
    });

    it('rejects a duplicate scheme id', () => {
      const input = validInput();
      const scheme = validEsquemas().foldingSchemes[0];
      input['esquemas.json'] = {
        source: 'Datos de prueba.',
        foldingSchemes: [scheme, { ...scheme, name: 'Duplicado' }],
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'esquemas.json', 'foldingSchemes[1].id');
    });

    it('rejects a pagesPerSignature above the maximum cap without building a huge coverage array', () => {
      const input = validInput();
      const scheme = validEsquemas().foldingSchemes[0];
      input['esquemas.json'] = {
        source: 'Datos de prueba.',
        foldingSchemes: [{ ...scheme, pagesPerSignature: 16000000 }],
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'esquemas.json', 'foldingSchemes[0].pagesPerSignature');
      // The cap must reject this before the coverage check runs at all: no
      // "faltan las páginas" pileup from trying to cover 16 million pages.
      expect(result.errors.some(error => error.path === 'foldingSchemes[0].sides')).toBe(false);
    });

    it('does not report a redundant page-coverage error when a slot was already rejected for a bad rotation', () => {
      const input = validInput();
      const scheme = validEsquemas().foldingSchemes[0];
      input['esquemas.json'] = {
        source: 'Datos de prueba.',
        foldingSchemes: [{
          ...scheme,
          sides: {
            ...scheme.sides,
            front: [{ page: 8, rotation: 90 }, ...scheme.sides.front.slice(1)],
          },
        }],
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'esquemas.json', 'foldingSchemes[0].sides.front[0].rotation');
      expect(result.errors.some(error => error.path === 'foldingSchemes[0].sides')).toBe(false);
    });
  });

  describe('bindings (encuadernaciones.json)', () => {
    it('rejects a minPages greater than maxPages', () => {
      const input = validInput();
      input['encuadernaciones.json'] = {
        source: 'Datos de prueba.',
        bindings: [{ ...validEncuadernaciones().bindings[0], minPages: 64, maxPages: 8 }],
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'encuadernaciones.json', 'bindings[0].minPages');
    });

    it('rejects an odd pageMultiple', () => {
      const input = validInput();
      input['encuadernaciones.json'] = {
        source: 'Datos de prueba.',
        bindings: [{ ...validEncuadernaciones().bindings[0], pageMultiple: 3 }],
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'encuadernaciones.json', 'bindings[0].pageMultiple');
    });

    it('rejects a minPages that is not a multiple of pageMultiple', () => {
      const input = validInput();
      input['encuadernaciones.json'] = {
        source: 'Datos de prueba.',
        bindings: [{ ...validEncuadernaciones().bindings[0], pageMultiple: 4, minPages: 9 }],
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'encuadernaciones.json', 'bindings[0].minPages');
    });

    it('rejects a negative spineAllowance_mm', () => {
      const input = validInput();
      input['encuadernaciones.json'] = {
        source: 'Datos de prueba.',
        bindings: [{ ...validEncuadernaciones().bindings[0], spineAllowance_mm: -1 }],
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'encuadernaciones.json', 'bindings[0].spineAllowance_mm');
    });

    it('rejects a non-boolean requiresSignatureMultiple', () => {
      const input = validInput();
      input['encuadernaciones.json'] = {
        source: 'Datos de prueba.',
        bindings: [{ ...validEncuadernaciones().bindings[0], requiresSignatureMultiple: 'yes' }],
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'encuadernaciones.json', 'bindings[0].requiresSignatureMultiple');
    });

    it('rejects a duplicate binding id', () => {
      const input = validInput();
      const binding = validEncuadernaciones().bindings[0];
      input['encuadernaciones.json'] = {
        source: 'Datos de prueba.',
        bindings: [binding, { ...binding, name: 'Grapa duplicada' }],
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'encuadernaciones.json', 'bindings[1].id');
    });

    it('rejects a missing "source" field on encuadernaciones.json', () => {
      const input = validInput();
      input['encuadernaciones.json'] = { bindings: validEncuadernaciones().bindings };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'encuadernaciones.json', 'source');
    });

    it('rejects a default bindingId that does not exist', () => {
      const input = validInput();
      input['formatos.json'] = {
        ...validFormatos(),
        defaults: { ...validFormatos().defaults, bindingId: 'missing-binding' },
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'formatos.json', 'defaults.bindingId');
    });

    it('rejects a pageMultiple that is not a multiple of 4 for a method whose sheets nest', () => {
      const input = validInput();
      input['encuadernaciones.json'] = {
        source: 'Datos de prueba.',
        // pageMultiple: 2 is valid on its own (even, and minPages/maxPages
        // are valid multiples of it), but nests: true requires a multiple of
        // 4, because nesting folds four pages into each sheet.
        bindings: [{ ...validEncuadernaciones().bindings[0], nests: true, pageMultiple: 2 }],
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'encuadernaciones.json', 'bindings[0].pageMultiple');
    });

    it('does not report a false "no existe" for defaults.bindingId when the referenced binding has an invalid name', () => {
      const input = validInput();
      input['encuadernaciones.json'] = {
        source: 'Datos de prueba.',
        bindings: [{ ...validEncuadernaciones().bindings[0], name: '' }],
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'encuadernaciones.json', 'bindings[0].name');
      expect(result.errors.some(error => error.path === 'defaults.bindingId')).toBe(false);
    });

  });

  describe('covers (tapas.json)', () => {
    function makeCover(overrides: Partial<ReturnType<typeof validTapas>['covers'][0]> = {}) {
      return { ...validTapas().covers[0], ...overrides };
    }

    it('rejects a missing "source" field', () => {
      const input = validInput();
      input['tapas.json'] = { covers: validTapas().covers };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'tapas.json', 'source');
    });

    it('rejects a duplicate cover id', () => {
      const input = validInput();
      const cover = validTapas().covers[0];
      input['tapas.json'] = { source: 'Datos de prueba.', covers: [cover, { ...cover, name: 'Duplicada' }] };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'tapas.json', 'covers[1].id');
    });

    it('rejects a negative millimetre field', () => {
      const input = validInput();
      input['tapas.json'] = {
        source: 'Datos de prueba.',
        covers: [makeCover({ flapWidth_mm: -1 })],
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'tapas.json', 'covers[0].flapWidth_mm');
    });

    it('rejects a substrateId that does not exist in sustratos.json', () => {
      const input = validInput();
      input['tapas.json'] = {
        source: 'Datos de prueba.',
        covers: [makeCover({ substrateId: 'missing-substrate' })],
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'tapas.json', 'covers[0].substrateId');
    });

    it('rejects a grammage that does not exist for the referenced substrate', () => {
      const input = validInput();
      input['tapas.json'] = {
        source: 'Datos de prueba.',
        covers: [makeCover({ grammage: 999 })],
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'tapas.json', 'covers[0].grammage');
    });

    it('rejects a soft cover with a non-zero board thickness', () => {
      const input = validInput();
      input['tapas.json'] = {
        source: 'Datos de prueba.',
        covers: [makeCover({ kind: 'blanda', boardThickness_mm: 2 })],
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'tapas.json', 'covers[0].boardThickness_mm');
    });

    it('rejects a hard cover with a zero hinge gap', () => {
      const input = validInput();
      input['tapas.json'] = {
        source: 'Datos de prueba.',
        covers: [makeCover({
          kind: 'dura', squares_mm: 3, hingeGap_mm: 0, turnIn_mm: 15, boardThickness_mm: 2.5,
        })],
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'tapas.json', 'covers[0].hingeGap_mm');
    });

    it('rejects a hard cover with flaps', () => {
      const input = validInput();
      input['tapas.json'] = {
        source: 'Datos de prueba.',
        covers: [makeCover({
          kind: 'dura', squares_mm: 3, hingeGap_mm: 6, turnIn_mm: 15, boardThickness_mm: 2.5, flapWidth_mm: 80,
        })],
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'tapas.json', 'covers[0].flapWidth_mm');
    });

    it('rejects a default coverId that does not exist', () => {
      const input = validInput();
      input['formatos.json'] = {
        ...validFormatos(),
        defaults: { ...validFormatos().defaults, coverId: 'missing-cover' },
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'formatos.json', 'defaults.coverId');
    });

    it('does not report a false "no existe" for defaults.coverId when the referenced cover has an invalid name', () => {
      const input = validInput();
      input['tapas.json'] = {
        source: 'Datos de prueba.',
        covers: [makeCover({ name: '' })],
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'tapas.json', 'covers[0].name');
      expect(result.errors.some(error => error.path === 'defaults.coverId')).toBe(false);
    });

    it('rejects a "covers" that is not an array', () => {
      const input = validInput();
      input['tapas.json'] = { source: 'Datos de prueba.', covers: 'not an array' };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'tapas.json', 'covers');
    });

    it('rejects an empty "covers" array', () => {
      const input = validInput();
      input['tapas.json'] = { source: 'Datos de prueba.', covers: [] };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'tapas.json', 'covers');
    });

    it('rejects a null and a non-object entry in covers', () => {
      const input = validInput();
      input['tapas.json'] = { source: 'Datos de prueba.', covers: [null, 42, validTapas().covers[0]] };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'tapas.json', 'covers[0]');
      assertError(result.errors, 'tapas.json', 'covers[1]');
    });

    it('rejects a missing "kind" field', () => {
      const input = validInput();
      const { kind: _kind, ...rest } = makeCover();
      input['tapas.json'] = { source: 'Datos de prueba.', covers: [rest] };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'tapas.json', 'covers[0].kind');
    });

    it('rejects an unknown "kind" value', () => {
      const input = validInput();
      input['tapas.json'] = { source: 'Datos de prueba.', covers: [makeCover({ kind: 'rigida' })] };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'tapas.json', 'covers[0].kind');
    });

    it('reports a single message for a cover with grammage: 0, not two on the same path', () => {
      const input = validInput();
      input['tapas.json'] = { source: 'Datos de prueba.', covers: [makeCover({ grammage: 0 })] };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      const grammageErrors = result.errors.filter(error => error.file === 'tapas.json' && error.path === 'covers[0].grammage');
      expect(grammageErrors).toHaveLength(1);
    });

    it('does not report a false "no existe" for defaults.coverId when tapas.json is unavailable', () => {
      const input = validInput();
      input['sustratos.json'] = { ...validSustratos(), source: '' }; // force an unrelated error so result.ok is false

      const result = validateCatalog(input, new Set(['tapas.json']));
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'sustratos.json', 'source');
      expect(result.errors.some(error => error.file === 'tapas.json')).toBe(false);
      expect(result.errors.some(error => error.path === 'defaults.coverId')).toBe(false);
    });

    it('rejects a default coverId naming a hard cover when the default binding nests its sheets', () => {
      const input = validInput();
      // validFormatos().defaults.coverId is 'blanda' and .bindingId is 'grapa'
      // (nests: true): pairing a hard cover with it is contradictory, since a
      // hard case needs a flat, square spine.
      input['tapas.json'] = {
        source: 'Datos de prueba.',
        covers: [makeCover({ kind: 'dura', squares_mm: 3, hingeGap_mm: 6, turnIn_mm: 15, boardThickness_mm: 2.5 })],
      };

      const result = validateCatalog(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      assertError(result.errors, 'formatos.json', 'defaults.coverId');
    });

    describe.each(['squares_mm', 'hingeGap_mm', 'turnIn_mm'] as const)('a soft cover with a non-zero %s', field => {
      it('is rejected', () => {
        const input = validInput();
        input['tapas.json'] = {
          source: 'Datos de prueba.',
          covers: [makeCover({ kind: 'blanda', [field]: 1 })],
        };

        const result = validateCatalog(input);
        expect(result.ok).toBe(false);
        if (result.ok) return;
        assertError(result.errors, 'tapas.json', `covers[0].${field}`);
      });
    });

    describe.each(['squares_mm', 'turnIn_mm', 'boardThickness_mm'] as const)('a hard cover with a zero %s', field => {
      it('is rejected', () => {
        const input = validInput();
        input['tapas.json'] = {
          source: 'Datos de prueba.',
          covers: [makeCover({
            kind: 'dura', squares_mm: 3, hingeGap_mm: 6, turnIn_mm: 15, boardThickness_mm: 2.5, [field]: 0,
          })],
        };

        const result = validateCatalog(input);
        expect(result.ok).toBe(false);
        if (result.ok) return;
        assertError(result.errors, 'tapas.json', `covers[0].${field}`);
      });
    });
  });

  it('rejects a default pressId that does not exist', () => {
    const input = validInput();
    input['formatos.json'] = {
      ...validFormatos(),
      defaults: { ...validFormatos().defaults, pressId: 'missing-press' },
    };

    const result = validateCatalog(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    assertError(result.errors, 'formatos.json', 'defaults.pressId');
  });
});
