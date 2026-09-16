import { describe, it, expect } from 'vitest';
import { planSignatures, layoutSide, selectBestOption } from '../engine/signatures';
import type { FoldingScheme, Press, SignatureOption, SignaturePlanInput } from '../types';
import sustratosRaw from '../../public/config/sustratos.json?raw';
import pliegosRaw from '../../public/config/pliegos.json?raw';
import maquinasRaw from '../../public/config/maquinas.json?raw';
import esquemasRaw from '../../public/config/esquemas.json?raw';
import encuadernacionesRaw from '../../public/config/encuadernaciones.json?raw';
import tapasRaw from '../../public/config/tapas.json?raw';
import formatosRaw from '../../public/config/formatos.json?raw';
import { validateCatalog } from '../config/validateCatalog';

function makePress(overrides: Partial<Press> = {}): Press {
  return {
    id: 'press1',
    name: 'Prensa de prueba',
    maxSheetWidth_mm: 2000,
    maxSheetHeight_mm: 2000,
    gripperMargin_mm: 10,
    sideMargin_mm: 5,
    tailMargin_mm: 10,
    gutter_mm: 2,
    ...overrides,
  };
}

// 16-page scheme (cols=2, rows=4), independent hand-built fixture: does not
// depend on the shipped public/config/esquemas.json.
const SCHEME_16: FoldingScheme = {
  id: 'scheme16',
  name: 'Esquema de 16 páginas',
  pagesPerSignature: 16,
  cols: 2,
  rows: 4,
  sides: {
    front: [
      { page: 16, rotation: 180 }, { page: 1, rotation: 0 },
      { page: 14, rotation: 180 }, { page: 3, rotation: 0 },
      { page: 12, rotation: 180 }, { page: 5, rotation: 0 },
      { page: 10, rotation: 180 }, { page: 7, rotation: 0 },
    ],
    back: [
      { page: 2, rotation: 180 }, { page: 15, rotation: 0 },
      { page: 4, rotation: 180 }, { page: 13, rotation: 0 },
      { page: 6, rotation: 180 }, { page: 11, rotation: 0 },
      { page: 8, rotation: 180 }, { page: 9, rotation: 0 },
    ],
  },
};

// 8-page scheme (cols=2, rows=2).
const SCHEME_8: FoldingScheme = {
  id: 'scheme8',
  name: 'Esquema de 8 páginas',
  pagesPerSignature: 8,
  cols: 2,
  rows: 2,
  sides: {
    front: [
      { page: 8, rotation: 180 }, { page: 1, rotation: 0 },
      { page: 6, rotation: 180 }, { page: 3, rotation: 0 },
    ],
    back: [
      { page: 2, rotation: 180 }, { page: 7, rotation: 0 },
      { page: 4, rotation: 180 }, { page: 5, rotation: 0 },
    ],
  },
};

function baseInput(overrides: Partial<SignaturePlanInput> = {}): SignaturePlanInput {
  return {
    pageWidth_mm: 100,
    pageHeight_mm: 150,
    bleed_mm: 0,
    sheetWidth_mm: 300,
    sheetHeight_mm: 700,
    press: makePress(),
    schemes: [SCHEME_16],
    totalPages: 32,
    ...overrides,
  };
}

describe('planSignatures', () => {
  it('gives 2 signatures, 0 blanks and 2 sheets per copy for 32 pages with a 16-page scheme that fits', () => {
    const result = planSignatures(baseInput({ totalPages: 32 }));

    expect(result.selected).not.toBeNull();
    const selected = result.selected!;
    expect(selected.scheme.id).toBe('scheme16');
    expect(selected.signatures).toBe(2);
    expect(selected.blankPages).toBe(0);
    expect(selected.sheetsPerCopy).toBe(2);
    expect(selected.pageRotated).toBe(false);
    expect(selected.printingMode).toBe('planchas-separadas');
  });

  it('gives 2 signatures and 2 blanks for 30 pages with the same 16-page scheme', () => {
    const result = planSignatures(baseInput({ totalPages: 30 }));

    expect(result.selected).not.toBeNull();
    const selected = result.selected!;
    expect(selected.signatures).toBe(2);
    expect(selected.blankPages).toBe(2);
    expect(selected.sheetsPerCopy).toBe(2);
  });

  it('excludes a scheme that only fits once margins and gutters are subtracted from the sheet', () => {
    // Page 100×100mm, scheme 2×1, sheet 200×100mm: with zero margins and zero
    // gutter, the grid fits exactly (200 <= 200, 100 <= 100).
    const scheme: FoldingScheme = {
      id: 'scheme4',
      name: 'Esquema de 4 páginas',
      pagesPerSignature: 4,
      cols: 2,
      rows: 1,
      sides: {
        front: [{ page: 4, rotation: 180 }, { page: 1, rotation: 0 }],
        back: [{ page: 2, rotation: 180 }, { page: 3, rotation: 0 }],
      },
    };
    const input = baseInput({
      pageWidth_mm: 100,
      pageHeight_mm: 100,
      bleed_mm: 0,
      sheetWidth_mm: 200,
      sheetHeight_mm: 100,
      schemes: [scheme],
      totalPages: 4,
    });

    const withoutMargins = planSignatures({
      ...input,
      press: makePress({ sideMargin_mm: 0, gripperMargin_mm: 0, tailMargin_mm: 0, gutter_mm: 0 }),
    });
    expect(withoutMargins.options).toHaveLength(1);
    expect(withoutMargins.selected).not.toBeNull();

    const withMargins = planSignatures({
      ...input,
      press: makePress({ sideMargin_mm: 5, gripperMargin_mm: 5, tailMargin_mm: 5, gutter_mm: 0 }),
    });
    expect(withMargins.options).toHaveLength(0);
    expect(withMargins.selected).toBeNull();
  });

  it('selects the scheme that wastes the least paper', () => {
    // Same cell size (100×100mm) for both schemes, but SCHEME_16 (8 cells)
    // uses more of the printable area than SCHEME_8 (4 cells), so it wastes less.
    const input = baseInput({
      pageWidth_mm: 100,
      pageHeight_mm: 100,
      bleed_mm: 0,
      sheetWidth_mm: 300,
      sheetHeight_mm: 700,
      schemes: [SCHEME_8, SCHEME_16],
      totalPages: 32,
    });

    const result = planSignatures(input);
    expect(result.options.map(o => o.scheme.id)).toEqual(['scheme8', 'scheme16']);
    expect(result.selected?.scheme.id).toBe('scheme16');
  });

  it('breaks a genuine waste tie deterministically, independent of array order', () => {
    // Two legitimate, different 8-page schemes sharing the same 2×2 grid and
    // cell size: their usedArea (and therefore waste) is genuinely identical,
    // unlike the previous fixture's cols×rows=4/pagesPerSignature=16 scheme,
    // which the validator would reject (cols × rows must equal pagesPerSignature / 2).
    const schemeA: FoldingScheme = {
      id: 'schemeA',
      name: 'Esquema A',
      pagesPerSignature: 8,
      cols: 2,
      rows: 2,
      sides: {
        front: [{ page: 8, rotation: 180 }, { page: 1, rotation: 0 }, { page: 6, rotation: 180 }, { page: 3, rotation: 0 }],
        back: [{ page: 2, rotation: 180 }, { page: 7, rotation: 0 }, { page: 4, rotation: 180 }, { page: 5, rotation: 0 }],
      },
    };
    const schemeB: FoldingScheme = {
      id: 'schemeB',
      name: 'Esquema B',
      pagesPerSignature: 8,
      cols: 2,
      rows: 2,
      sides: {
        front: [{ page: 6, rotation: 180 }, { page: 3, rotation: 0 }, { page: 8, rotation: 180 }, { page: 1, rotation: 0 }],
        back: [{ page: 4, rotation: 180 }, { page: 5, rotation: 0 }, { page: 2, rotation: 180 }, { page: 7, rotation: 0 }],
      },
    };

    const input = baseInput({
      pageWidth_mm: 100,
      pageHeight_mm: 100,
      bleed_mm: 0,
      totalPages: 32,
    });

    const forward = planSignatures({ ...input, schemes: [schemeA, schemeB] });
    const backward = planSignatures({ ...input, schemes: [schemeB, schemeA] });

    expect(forward.options).toHaveLength(2);
    expect(forward.options[0].wastePercentage).toBe(forward.options[1].wastePercentage);
    expect(forward.selected?.scheme.id).toBe(backward.selected?.scheme.id);
    // Deterministic secondary tie-break: lexicographically smaller scheme id.
    expect(forward.selected?.scheme.id).toBe('schemeA');
  });

  it('selects the least-waste scheme even when it has the smaller pagesPerSignature (selectBestOption)', () => {
    // planSignatures cannot construct this scenario through real geometry
    // within one call (usedArea scales with cols × rows, which scales with
    // pagesPerSignature for any validator-legal scheme sharing one printable
    // area), so selectBestOption -- the pure ranking step -- is exercised
    // directly with synthetic options to prove waste dominates pagesPerSignature.
    const makeOption = (id: string, pagesPerSignature: number, usedArea_mm2: number): SignatureOption => ({
      scheme: { id, name: id, pagesPerSignature, cols: 1, rows: 1, sides: { front: [], back: [] } },
      pageRotated: false,
      cols: 1,
      rows: 1,
      pagesPerSheet: 2,
      cellWidth_mm: 1,
      cellHeight_mm: 1,
      gutter_mm: 0,
      sideMargin_mm: 0,
      gripperMargin_mm: 0,
      signatures: 1,
      blankPages: 0,
      sheetsPerCopy: 1,
      usedArea_mm2,
      printableArea_mm2: 100,
      wastePercentage: ((100 - usedArea_mm2) / 100) * 100,
      printingMode: 'planchas-separadas',
    });

    const small = makeOption('small', 8, 90);
    const large = makeOption('large', 16, 50);

    expect(selectBestOption([small, large])?.scheme.id).toBe('small');
    expect(selectBestOption([large, small])?.scheme.id).toBe('small');
  });

  it('returns selected: null when no scheme fits', () => {
    const result = planSignatures(baseInput({
      pageWidth_mm: 1000,
      pageHeight_mm: 1000,
      schemes: [SCHEME_16],
    }));

    expect(result.options).toHaveLength(0);
    expect(result.selected).toBeNull();
  });

  it('fits a scheme only when the page cell is rotated 90°', () => {
    const scheme: FoldingScheme = {
      id: 'scheme2',
      name: 'Esquema de 2 páginas',
      pagesPerSignature: 2,
      cols: 1,
      rows: 1,
      sides: {
        front: [{ page: 2, rotation: 0 }],
        back: [{ page: 1, rotation: 0 }],
      },
    };
    // Cell 200×50mm: too wide for a 100mm-wide printable area normally,
    // but 50×200mm (rotated) fits within 100×250mm.
    const input: SignaturePlanInput = {
      pageWidth_mm: 200,
      pageHeight_mm: 50,
      bleed_mm: 0,
      sheetWidth_mm: 100,
      sheetHeight_mm: 250,
      press: makePress({ sideMargin_mm: 0, gripperMargin_mm: 0, tailMargin_mm: 0, gutter_mm: 0 }),
      schemes: [scheme],
      totalPages: 2,
    };

    const result = planSignatures(input);
    expect(result.selected).not.toBeNull();
    expect(result.selected?.pageRotated).toBe(true);
    expect(result.selected?.cellWidth_mm).toBe(50);
    expect(result.selected?.cellHeight_mm).toBe(200);
  });

  it('pins wastePercentage to an exact value computed from the printable area, not the full sheet', () => {
    // Page 100×100mm (no bleed), scheme 2×2 (4 cells): usedArea = 4×100×100 = 40000mm².
    // Press margins/gutter: side5, gripper10, tail10, gutter2 (from makePress()).
    // Sheet 300×700: printableWidth=300-10=290, printableHeight=700-20=680.
    const scheme: FoldingScheme = {
      id: 'scheme4x2x2',
      name: 'Esquema 2x2',
      pagesPerSignature: 8,
      cols: 2,
      rows: 2,
      sides: {
        front: [{ page: 8, rotation: 180 }, { page: 1, rotation: 0 }, { page: 6, rotation: 180 }, { page: 3, rotation: 0 }],
        back: [{ page: 2, rotation: 180 }, { page: 7, rotation: 0 }, { page: 4, rotation: 180 }, { page: 5, rotation: 0 }],
      },
    };
    const result = planSignatures(baseInput({
      pageWidth_mm: 100,
      pageHeight_mm: 100,
      bleed_mm: 0,
      schemes: [scheme],
      totalPages: 8,
    }));

    const printableArea = 290 * 680;
    const usedArea = 4 * 100 * 100;
    const expectedWaste = ((printableArea - usedArea) / printableArea) * 100;

    expect(result.selected?.usedArea_mm2).toBe(usedArea);
    expect(result.selected?.printableArea_mm2).toBe(printableArea);
    expect(result.selected?.wastePercentage).toBeCloseTo(expectedWaste, 10);
  });

  it('a non-zero gutter can exclude a scheme that fits with gutter_mm: 0', () => {
    // Page 100×100mm, scheme 2×1, sheet 200×100mm, zero margins: exact fit at gutter 0.
    const scheme: FoldingScheme = {
      id: 'gutterScheme',
      name: 'Esquema de calle',
      pagesPerSignature: 4,
      cols: 2,
      rows: 1,
      sides: {
        front: [{ page: 4, rotation: 180 }, { page: 1, rotation: 0 }],
        back: [{ page: 2, rotation: 180 }, { page: 3, rotation: 0 }],
      },
    };
    const input = baseInput({
      pageWidth_mm: 100,
      pageHeight_mm: 100,
      bleed_mm: 0,
      sheetWidth_mm: 200,
      sheetHeight_mm: 100,
      schemes: [scheme],
      totalPages: 4,
    });

    const zeroGutter = planSignatures({
      ...input,
      press: makePress({ sideMargin_mm: 0, gripperMargin_mm: 0, tailMargin_mm: 0, gutter_mm: 0 }),
    });
    expect(zeroGutter.options).toHaveLength(1);

    const withGutter = planSignatures({
      ...input,
      press: makePress({ sideMargin_mm: 0, gripperMargin_mm: 0, tailMargin_mm: 0, gutter_mm: 1 }),
    });
    expect(withGutter.options).toHaveLength(0);
    expect(withGutter.reason).toBe('no-scheme-fits');
  });

  it('reports reason "sheet-exceeds-press" when the sheet fits the press in neither orientation', () => {
    const input = baseInput({
      sheetWidth_mm: 800,
      sheetHeight_mm: 1200,
      press: makePress({ maxSheetWidth_mm: 500, maxSheetHeight_mm: 700 }),
    });

    const result = planSignatures(input);
    expect(result.options).toHaveLength(0);
    expect(result.selected).toBeNull();
    expect(result.reason).toBe('sheet-exceeds-press');
  });

  it('accepts a sheet that only fits the press when rotated', () => {
    const input = baseInput({
      sheetWidth_mm: 700,
      sheetHeight_mm: 300,
      press: makePress({ maxSheetWidth_mm: 500, maxSheetHeight_mm: 800 }),
    });

    const result = planSignatures(input);
    expect(result.reason).not.toBe('sheet-exceeds-press');
  });

  it('skips a malformed scheme instead of letting it prevent every other option from being evaluated', () => {
    const malformed = { ...SCHEME_8, cols: Number.NaN } as unknown as FoldingScheme;
    const result = planSignatures(baseInput({ schemes: [malformed, SCHEME_16] }));

    expect(result.options).toHaveLength(1);
    expect(result.selected?.scheme.id).toBe('scheme16');
  });

  describe('printingMode detection', () => {
    it('reports "tiro-retiro" for a scheme whose rows share rotation between front and back (work-and-turn eligible)', () => {
      const scheme: FoldingScheme = {
        id: 'mirrorScheme',
        name: 'Esquema espejado',
        pagesPerSignature: 8,
        cols: 2,
        rows: 2,
        sides: {
          front: [{ page: 8, rotation: 0 }, { page: 1, rotation: 0 }, { page: 6, rotation: 180 }, { page: 3, rotation: 180 }],
          back: [{ page: 2, rotation: 0 }, { page: 7, rotation: 0 }, { page: 4, rotation: 180 }, { page: 5, rotation: 180 }],
        },
      };
      const result = planSignatures(baseInput({ schemes: [scheme], pageWidth_mm: 100, pageHeight_mm: 100 }));
      expect(result.selected?.printingMode).toBe('tiro-retiro');
    });

    it('reports "planchas-separadas" for a scheme whose mirrored rotations do not match', () => {
      const scheme: FoldingScheme = {
        id: 'nonMirrorScheme',
        name: 'Esquema no espejado',
        pagesPerSignature: 8,
        cols: 2,
        rows: 2,
        sides: {
          front: [{ page: 8, rotation: 180 }, { page: 1, rotation: 0 }, { page: 6, rotation: 180 }, { page: 3, rotation: 0 }],
          back: [{ page: 2, rotation: 180 }, { page: 7, rotation: 0 }, { page: 4, rotation: 180 }, { page: 5, rotation: 0 }],
        },
      };
      const result = planSignatures(baseInput({ schemes: [scheme], pageWidth_mm: 100, pageHeight_mm: 100 }));
      expect(result.selected?.printingMode).toBe('planchas-separadas');
    });
  });

  it('produces a valid, non-null plan for the shipped maquinas.json/esquemas.json/formatos.json defaults', () => {
    const result = validateCatalog({
      'sustratos.json': JSON.parse(sustratosRaw),
      'pliegos.json': JSON.parse(pliegosRaw),
      'maquinas.json': JSON.parse(maquinasRaw),
      'esquemas.json': JSON.parse(esquemasRaw),
      'encuadernaciones.json': JSON.parse(encuadernacionesRaw),
      'tapas.json': JSON.parse(tapasRaw),
      'formatos.json': JSON.parse(formatosRaw),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { catalog } = result;
    const press = catalog.presses.find(p => p.id === catalog.defaults.pressId)!;
    const sheet = catalog.sheetSizes.find(s => s.id === catalog.defaults.sheetSizeId)!;

    const plan = planSignatures({
      pageWidth_mm: catalog.defaults.pageWidth_mm,
      pageHeight_mm: catalog.defaults.pageWidth_mm * 1.5, // 2:3 proportion, matching the store's derivation
      bleed_mm: catalog.defaults.bleed_mm,
      sheetWidth_mm: sheet.width_mm,
      sheetHeight_mm: sheet.height_mm,
      press,
      schemes: catalog.foldingSchemes,
      totalPages: catalog.defaults.totalPages,
    });

    expect(plan.selected).not.toBeNull();
    expect(plan.reason).toBeNull();
  });
});

describe('layoutSide', () => {
  it('places every slot inside the printable area, keeping page order, rotation, and full page coverage', () => {
    const input = baseInput({ totalPages: 32 });
    const result = planSignatures(input);
    const option = result.selected!;

    const printableLeft = option.sideMargin_mm;
    const printableRight = input.sheetWidth_mm - option.sideMargin_mm;
    const printableTop = option.gripperMargin_mm;
    const printableBottom = input.sheetHeight_mm - input.press.tailMargin_mm;

    const front = layoutSide(option, 'front');
    const back = layoutSide(option, 'back');

    expect(front).toHaveLength(option.cols * option.rows);
    expect(back).toHaveLength(option.cols * option.rows);

    for (const placement of [...front, ...back]) {
      expect(placement.x_mm).toBeGreaterThanOrEqual(printableLeft);
      expect(placement.x_mm + placement.width_mm).toBeLessThanOrEqual(printableRight + 1e-9);
      expect(placement.y_mm).toBeGreaterThanOrEqual(printableTop);
      expect(placement.y_mm + placement.height_mm).toBeLessThanOrEqual(printableBottom + 1e-9);
    }

    front.forEach((placement, index) => {
      expect(placement.page).toBe(SCHEME_16.sides.front[index].page);
      expect(placement.rotation).toBe(SCHEME_16.sides.front[index].rotation);
    });
    back.forEach((placement, index) => {
      expect(placement.page).toBe(SCHEME_16.sides.back[index].page);
      expect(placement.rotation).toBe(SCHEME_16.sides.back[index].rotation);
    });

    const allPages = [...front, ...back].map(p => p.page).sort((a, b) => a - b);
    expect(allPages).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
  });

  it('pins exact x_mm/y_mm for the first, second, and last slot', () => {
    // baseInput: press sideMargin5, gripperMargin10, gutter2; page 100×150, bleed0.
    // scheme16: cols=2, rows=4, so slot index 1 is col1/row0 and index 7 is col1/row3.
    const result = planSignatures(baseInput({ totalPages: 32 }));
    const front = layoutSide(result.selected!, 'front');

    expect(front[0]).toMatchObject({ x_mm: 5, y_mm: 10 });
    expect(front[1]).toMatchObject({ x_mm: 5 + (100 + 2), y_mm: 10 });
    const lastIndex = front.length - 1;
    const lastRow = Math.floor(lastIndex / result.selected!.cols);
    expect(front[lastIndex]).toMatchObject({
      x_mm: 5 + (100 + 2),
      y_mm: 10 + lastRow * (150 + 2),
    });
  });

  it('pins exact width_mm/height_mm and rotation for a pageRotated: true option', () => {
    const scheme: FoldingScheme = {
      id: 'scheme2',
      name: 'Esquema de 2 páginas',
      pagesPerSignature: 2,
      cols: 1,
      rows: 1,
      sides: {
        front: [{ page: 2, rotation: 0 }],
        back: [{ page: 1, rotation: 180 }],
      },
    };
    const input: SignaturePlanInput = {
      pageWidth_mm: 200,
      pageHeight_mm: 50,
      bleed_mm: 0,
      sheetWidth_mm: 100,
      sheetHeight_mm: 250,
      press: makePress({ sideMargin_mm: 0, gripperMargin_mm: 0, tailMargin_mm: 0, gutter_mm: 0 }),
      schemes: [scheme],
      totalPages: 2,
    };

    const result = planSignatures(input);
    expect(result.selected?.pageRotated).toBe(true);

    const front = layoutSide(result.selected!, 'front');
    expect(front[0]).toEqual({ page: 2, rotation: 90, x_mm: 0, y_mm: 0, width_mm: 50, height_mm: 200 });

    const back = layoutSide(result.selected!, 'back');
    expect(back[0]).toEqual({ page: 1, rotation: 270, x_mm: 0, y_mm: 0, width_mm: 50, height_mm: 200 });
  });
});

describe('planSignatures input validation', () => {
  it.each([
    [{ pageWidth_mm: 0 }],
    [{ pageWidth_mm: Number.NaN }],
    [{ pageHeight_mm: -1 }],
    [{ sheetWidth_mm: Number.POSITIVE_INFINITY }],
    [{ sheetHeight_mm: 0 }],
  ])('rejects non-finite or non-positive page and sheet dimensions %#', (overrides) => {
    expect(() => planSignatures(baseInput(overrides))).toThrow(RangeError);
  });

  it('rejects a negative bleed', () => {
    expect(() => planSignatures(baseInput({ bleed_mm: -1 }))).toThrow(RangeError);
  });

  it.each([
    [0],
    [-5],
    [1.5],
    [Number.NaN],
  ])('rejects a non-positive or non-integer totalPages: %p', (totalPages) => {
    expect(() => planSignatures(baseInput({ totalPages }))).toThrow(RangeError);
  });

  it('reports reason "margins-exceed-sheet" instead of throwing for a non-positive printable area', () => {
    // P8: margins bigger than the sheet is a state reachable from the UI
    // (e.g. picking a small custom sheet after a large press), so it must
    // produce a `reason`, not throw.
    const input = baseInput({
      sheetWidth_mm: 20,
      press: makePress({ sideMargin_mm: 15 }),
    });
    const result = planSignatures(input);
    expect(result.options).toHaveLength(0);
    expect(result.selected).toBeNull();
    expect(result.reason).toBe('margins-exceed-sheet');
  });
});
