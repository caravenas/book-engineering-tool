import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SpecSheetPage } from '../components/SpecSheetPage';
import { ResultFigures } from '../components/ResultFigures';
import { useBookStore } from '../store/useBookStore';
import { loadShippedCatalog } from './testCatalog';
import type { Catalog, ProvisionalCatalogs } from '../types';

/**
 * UX-8: the spec sheet that is printed. What is asserted is the text it
 * carries against the store and against the screen, not how it is laid out:
 * jsdom lays nothing out, so the page's width and what print hides are
 * measured in `e2e/specSheet.spec.ts`.
 */
const shipped = loadShippedCatalog();
useBookStore.getState().initialize(shipped);
const initialState = useBookStore.getState();

afterEach(() => {
  cleanup();
  useBookStore.setState(initialState);
});

function withProvisional(provisional: Partial<ProvisionalCatalogs>): Catalog {
  return { ...shipped, provisional: { ...shipped.provisional, ...provisional } };
}

/** Every row of the sheet, by the name written on it. */
function rows(): Map<string, string> {
  const result = new Map<string, string>();
  for (const row of document.querySelectorAll('.sheet-row')) {
    result.set(row.querySelector('dt')!.textContent!, row.querySelector('dd')!.textContent!.replace(/\s+/g, ' ').trim());
  }
  return result;
}

function rowValue(label: string): string {
  const value = rows().get(label);
  if (value === undefined) throw new Error(`The sheet has no row «${label}»`);
  return value;
}

describe('The spec sheet with the default configuration (UX-8, criterion 1)', () => {
  it('lists every input of the book with the value the store holds', () => {
    render(<SpecSheetPage onBack={() => {}} />);
    const state = useBookStore.getState();

    expect(rowValue('Orientación')).toBe('Vertical');
    expect(rowValue('Proporción')).toBe(state.proportionId);
    expect(rowValue('Página (ancho × alto)')).toBe(`${state.pageWidth_mm} × ${state.pageHeight_mm} mm`);
    expect(rowValue('Sangrado')).toBe(`${state.bleed_mm} mm`);
    expect(rowValue('Papel')).toBe(state.catalog!.substrates.find(item => item.id === state.substrateId)!.name);
    expect(rowValue('Gramaje')).toBe(`${state.selectedGrammage} g/m²`);
    expect(rowValue('Páginas')).toBe(String(state.totalPages));
    expect(rowValue('Encuadernación')).toBe(state.catalog!.bindings.find(item => item.id === state.bindingId)!.name);
    expect(rowValue('Prensa')).toBe(state.catalog!.presses.find(item => item.id === state.pressId)!.name);
    expect(rowValue('Pliego')).toBe(state.catalog!.sheetSizes.find(item => item.id === state.sheetSizeId)!.name);
    expect(rowValue('Tapa')).toBe(state.catalog!.covers.find(item => item.id === state.coverId)!.name);
    expect(rowValue('Esquema de plegado')).toContain(state.signaturePlan!.selected!.scheme.name);
  });

  it('lists every figure of the engines with the value the store holds', () => {
    render(<SpecSheetPage onBack={() => {}} />);
    const { spineResult, bindingSpine, bindingCreep, signaturePlan, coverPlan } = useBookStore.getState();
    const plan = signaturePlan!.selected!;
    const cover = coverPlan?.ok ? coverPlan.cover : null;
    if (cover?.kind !== 'blanda') throw new Error('The default cover is soft');

    const round = (value: number, decimals: number) => String(Math.round(value * 10 ** decimals) / 10 ** decimals);
    expect(rowValue('Lomo del papel')).toBe(`${round(spineResult!.thickness_mm, 2)} mm`);
    expect(rowValue('Aporte de la encuadernación')).toBe(`${round(bindingSpine!.allowance_mm, 2)} mm`);
    expect(rowValue('Grosor del papel en el pliegue')).toBe(`${round(bindingSpine!.total_mm, 2)} mm`);
    expect(rowValue('Corrimiento máximo')).toContain(`${round(bindingCreep!.maxShift_mm, 3)} mm`);
    expect(rowValue('Peso del papel interior')).toBe(`${round(spineResult!.totalWeight_g, 1)} g`);
    expect(rowValue('Peso del papel de tapa')).toBe(`${round(cover.paperWeight_g, 1)} g`);
    expect(rowValue('Peso del papel por ejemplar')).toBe(`${round(spineResult!.totalWeight_g + cover.paperWeight_g, 1)} g`);
    expect(rowValue('Firmas por ejemplar')).toBe(String(plan.signatures));
    expect(rowValue('Páginas en blanco')).toBe(String(plan.blankPages));
    expect(rowValue('Pliegos de prensa por ejemplar')).toBe(String(plan.sheetsPerCopy));
    expect(rowValue('Desperdicio del pliego')).toBe(`${round(plan.wastePercentage, 1)} %`);
    expect(rowValue('Hoja de tapa (ancho × alto)')).toBe(`${round(cover.sheetWidth_mm, 2)} × ${round(cover.sheetHeight_mm, 2)} mm`);
  });

  it('says the same as the figures the screen draws', () => {
    const screenFigures = render(<ResultFigures />);
    const onScreen = (label: string) => (
      screenFigures.getByText(label).closest('.figure')!.querySelector('.stat-value')!.textContent
    );
    const screenValues = {
      'Grosor del papel en el pliegue': onScreen('Grosor del papel en el pliegue'),
      'Peso del papel por ejemplar': onScreen('Peso del papel por ejemplar'),
      'Pliegos de prensa por ejemplar': onScreen('Pliegos de prensa por ejemplar'),
      'Firmas por ejemplar': onScreen('Firmas por ejemplar'),
      'Aprovechamiento del pliego': onScreen('Aprovechamiento del pliego'),
    };
    cleanup();

    render(<SpecSheetPage onBack={() => {}} />);
    for (const [label, value] of Object.entries(screenValues)) {
      expect(rowValue(label).startsWith(value!), `${label}: «${rowValue(label)}» against the screen's «${value}»`).toBe(true);
    }
  });

  it('adds the page in millimetres when the unit is imperial', () => {
    useBookStore.getState().setUnitSystem('imperial');
    render(<SpecSheetPage onBack={() => {}} />);
    const { pageWidth_mm, pageHeight_mm } = useBookStore.getState();

    expect(rowValue('Página (ancho × alto)')).toContain('″');
    expect(rowValue('Página en milímetros (ancho × alto)')).toBe(`${pageWidth_mm} × ${pageHeight_mm} mm`);
    expect(rowValue('Sangrado en milímetros')).toBe(`${useBookStore.getState().bleed_mm} mm`);
  });

  it('leaves the millimetre rows out when the unit is metric', () => {
    render(<SpecSheetPage onBack={() => {}} />);
    expect(rows().has('Página en milímetros (ancho × alto)')).toBe(false);
  });

  it('marks an entry that is the user\'s own, or edited, and says nothing of a factory one', () => {
    render(<SpecSheetPage onBack={() => {}} />);
    expect(rowValue('Prensa')).not.toContain('·');
    cleanup();

    useBookStore.getState().patchPress('prensa_70x100', { gripperMargin_mm: 12 });
    render(<SpecSheetPage onBack={() => {}} />);
    expect(rowValue('Prensa')).toContain('editado');
  });
});

describe('The spec sheet when something cannot be calculated (UX-8, criterion 2)', () => {
  it('gives the reason and no figure for a hard cover on a method that nests its sheets', () => {
    useBookStore.getState().setCover('dura_estandar');
    render(<SpecSheetPage onBack={() => {}} />);

    const { coverError, coverPlan } = useBookStore.getState();
    const reason = coverError ?? (coverPlan && !coverPlan.ok ? coverPlan.message : '');
    expect(reason).not.toBe('');

    expect(rowValue('Medidas de tapa')).toContain('No calculable');
    expect(rowValue('Medidas de tapa')).toContain(reason);
    expect(rowValue('Peso del papel de tapa')).toContain(reason);
    // The total is the interior and the cover: without the second it is not a weight.
    expect(rowValue('Peso del papel por ejemplar')).toContain('No calculable');
    expect(rowValue('Peso del papel por ejemplar')).not.toMatch(/\d+(\.\d+)? (g|kg)/);
    // What can be worked out is still on the sheet.
    expect(rowValue('Peso del papel interior')).toMatch(/\d+(\.\d+)? g/);
  });

  it('gives the reason for every figure that comes from a page count nobody typed', () => {
    useBookStore.getState().setTotalPagesInput('');
    render(<SpecSheetPage onBack={() => {}} />);

    expect(rowValue('Páginas')).toContain('No calculable');
    for (const label of ['Lomo del papel', 'Peso del papel interior', 'Peso del papel por ejemplar']) {
      expect(rowValue(label), label).toContain('No calculable');
      expect(rowValue(label), label).not.toMatch(/\d+(\.\d+)? (mm|g|kg)/);
    }
  });

  it('says why when a page count is one the method rejects', () => {
    useBookStore.getState().setTotalPagesInput('30');
    render(<SpecSheetPage onBack={() => {}} />);

    const result = useBookStore.getState().bindingPageCount;
    expect(result && !result.ok).toBe(true);
    expect(rowValue('Número de páginas')).toContain(result && !result.ok ? result.message : '');
  });

  it('gives the reason in place of the imposition when no scheme fits the sheet', () => {
    useBookStore.getState().setSheetSize('carta');
    useBookStore.getState().setPageWidth(300);
    render(<SpecSheetPage onBack={() => {}} />);

    const { signaturePlan, signatureError } = useBookStore.getState();
    expect(signaturePlan?.selected ?? null).toBeNull();
    expect(rowValue('Esquema de plegado')).toContain('No calculable');
    if (signatureError) expect(rowValue('Esquema de plegado')).toContain(signatureError);
    for (const label of ['Firmas por ejemplar', 'Pliegos de prensa por ejemplar', 'Desperdicio del pliego']) {
      expect(rowValue(label), label).toContain('No calculable');
    }
  });
});

describe('The spec sheet and where its data comes from (UX-8, criterion 3)', () => {
  function origin(): HTMLElement {
    return screen.getByRole('heading', { name: 'Origen de los datos' }).closest('section')!;
  }

  it('says the data are examples, which catalogs, and cites every source while they are', () => {
    render(<SpecSheetPage onBack={() => {}} />);

    expect(origin().textContent).toContain('Datos de ejemplo: Papeles, Pliegos, Prensas, Esquemas de plegado, Encuadernaciones, Tapas.');
    expect(origin().textContent).toContain('no vienen de una imprenta');
    for (const source of [
      shipped.substratesSource, shipped.sheetSizesSource, shipped.pressesSource,
      shipped.foldingSchemesSource, shipped.bindingsSource, shipped.coversSource,
    ]) {
      expect(origin().textContent).toContain(source);
    }
  });

  it('names only the catalogs that are still examples', () => {
    useBookStore.getState().initialize(withProvisional({ presses: false, sheetSizes: false }));
    render(<SpecSheetPage onBack={() => {}} />);

    expect(origin().textContent).toContain('Datos de ejemplo: Papeles, Esquemas de plegado, Encuadernaciones, Tapas.');
  });

  it('does not say it, and still cites the sources, when no file is an example', () => {
    useBookStore.getState().initialize(withProvisional({
      substrates: false, sheetSizes: false, presses: false,
      foldingSchemes: false, bindings: false, covers: false,
    }));
    render(<SpecSheetPage onBack={() => {}} />);

    // The files' own words are cited as they are written, so what must be
    // absent is the sheet's own claim, not the phrase.
    expect(origin().textContent).not.toContain('Datos de ejemplo:');
    expect(origin().textContent).not.toContain('no vienen de una imprenta');
    expect(origin().querySelector('.sheet-example')).toBeNull();
    expect(origin().textContent).not.toContain('· de ejemplo');
    expect(origin().textContent).toContain(shipped.pressesSource);
  });
});

describe('The spec sheet page', () => {
  it('goes back to the tool and prints through the browser', () => {
    const onBack = vi.fn();
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<SpecSheetPage onBack={onBack} />);

    fireEvent.click(screen.getByRole('button', { name: 'Imprimir o guardar como PDF' }));
    expect(print).toHaveBeenCalledOnce();

    fireEvent.click(within(document.body).getByRole('button', { name: 'Volver a la herramienta' }));
    expect(onBack).toHaveBeenCalledOnce();
    print.mockRestore();
  });
});
