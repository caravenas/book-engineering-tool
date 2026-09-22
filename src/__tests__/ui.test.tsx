import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SpecSteps } from '../components/SpecSteps';
import { CatalogPanelProvider } from '../components/CatalogPanel';

/** Editing a catalog lives in the catalog panel; a step only opens it. */
function openCatalogFor(what: 'prensa' | 'pliego' | 'encuadernación' | 'proporción') {
  fireEvent.click(screen.getByRole('button', { name: `Opciones de ${what}` }));
}

function openPressCatalog() {
  openCatalogFor('prensa');
}

/** Grammages live inside their paper in the catalog since R-4c, and since
 *  R-10 that catalog holds the paper itself, so the way in is named for it. */
function openGrammageCatalog() {
  fireEvent.click(screen.getByRole('button', { name: 'Opciones de papel' }));
}
import {
  CanvasDesignerScreen,
  SpineCalculatorScreen,
  BindingPanelScreen,
  ImpositionVisualizerScreen,
  CoverPanelScreen,
  SubstrateSelectorScreen,
} from './screens';
import { useBookStore, getAllProportions } from '../store/useBookStore';
import { OptionField, OptionCard } from '../components/OptionGroup';
import { loadShippedCatalog } from './testCatalog';

useBookStore.getState().initialize(loadShippedCatalog());
const initialState = useBookStore.getState();

afterEach(() => {
  cleanup();
  useBookStore.setState(initialState);
});

describe('Spec steps (R-3b)', () => {
  // Six panels became five steps, and the titles were renamed with them:
  // pages and binding are one decision, so they are one step.
  it('names the five steps in order', () => {
    const { container } = render(<CatalogPanelProvider><SpecSteps /></CatalogPanelProvider>);

    const titles = Array.from(container.querySelectorAll('.panel-title'))
      .map(title => title.textContent?.trim());

    expect(titles).toEqual([
      'Formato',
      'Papel interior',
      'Páginas y encuadernación',
      'Imposición',
      'Tapa',
    ]);
  });

  it('shows what each closed step currently says, so the sheet reads without opening it', () => {
    const { container } = render(<CatalogPanelProvider><SpecSteps /></CatalogPanelProvider>);

    const values = Array.from(container.querySelectorAll('.spec-step-value'))
      .map(value => value.textContent?.trim());

    expect(values).toEqual([
      '140 × 210 mm · 2:3',
      'Couché Mate · 150 g/m²',
      '32 págs · Grapa (caballete)',
      'Prensa formato 70×100',
      'Tapa blanda sin solapas',
    ]);
  });
});

describe('Honest and recoverable UI', () => {
  it('exposes independent calculation failures as alerts without zero results', () => {
    useBookStore.setState({
      signaturePlan: null,
      signatureError: 'Corrige las dimensiones para recuperar la imposición por firmas.',
    });
    const layout = render(<ImpositionVisualizerScreen />);

    expect(screen.getByRole('alert').textContent).toContain('Corrige las dimensiones');
    expect(layout.container.textContent).not.toContain('Páginas / cara del pliego');
    layout.unmount();

    useBookStore.setState({
      spineResult: null,
      spineError: 'Corrige páginas, gramaje y calibre para recuperar las referencias.',
    });
    const spine = render(<SpineCalculatorScreen />);

    expect(screen.getByRole('alert').textContent).toContain('Corrige páginas');
    expect(spine.container.textContent).not.toContain('Peso estimado del papel interior');
  });

  it('recovers from finite inputs whose preview geometry overflows or underflows', () => {
    useBookStore.setState({
      pageWidth_mm: 1,
      pageHeight_mm: 1,
      bleed_mm: Number.MAX_VALUE,
    });

    const overflowedCanvas = render(<CanvasDesignerScreen />);

    expect(overflowedCanvas.container.querySelector('.page-preview')).toBeNull();
    expect(screen.getByText(/Introduce dimensiones finitas mayores que cero/)).toBeTruthy();
    for (const input of [
      screen.getByLabelText('Ancho', { selector: '#input-width' }),
      screen.getByLabelText('Alto', { selector: '#input-height' }),
      screen.getByLabelText('Sangrado'),
    ]) {
      expect((input as HTMLInputElement).value).not.toContain('Infinity');
      expect((input as HTMLInputElement).value).not.toContain('NaN');
    }
    overflowedCanvas.unmount();

    useBookStore.setState({
      pageWidth_mm: Number.MIN_VALUE,
      pageHeight_mm: Number.MAX_VALUE,
      bleed_mm: 0,
    });

    const underflowedCanvas = render(<CanvasDesignerScreen />);

    expect(underflowedCanvas.container.querySelector('.page-preview')).toBeNull();
    expect(screen.getByText(/Introduce dimensiones finitas mayores que cero/)).toBeTruthy();
  });

  it('draws a page whose scaled size lands exactly on the bound', () => {
    // 100 x 150 mm with 3 mm of bleed scales to exactly the height of its box,
    // and binary arithmetic overshoots that by 6e-14, which used to fail the
    // fit check and replace the drawing with a message about invalid
    // dimensions. One size in twenty-eight did this.
    useBookStore.setState({ pageWidth_mm: 100, pageHeight_mm: 150, bleed_mm: 3 });
    const { container } = render(<CanvasDesignerScreen />);

    const preview = container.querySelector('.page-preview') as HTMLDivElement | null;
    expect(preview, 'the drawing must survive its own scaling').not.toBeNull();
    expect(parseFloat(preview!.style.height)).toBeLessThanOrEqual(420);
  });

  it('fits the bleed-inclusive preview and preserves a nonzero display value', () => {
    useBookStore.setState({ pageWidth_mm: 140, pageHeight_mm: 210, bleed_mm: 100 });
    const oversizedBleed = render(<CanvasDesignerScreen />);
    const preview = oversizedBleed.container.querySelector('.page-preview') as HTMLDivElement;
    const safeZone = oversizedBleed.container.querySelector('.page-preview .safe-zone') as HTMLDivElement;

    expect(parseFloat(preview.style.width)).toBeLessThanOrEqual(360);
    expect(parseFloat(preview.style.height)).toBeLessThanOrEqual(420);
    expect(parseFloat(safeZone.style.left)).toBeGreaterThan(0);
    expect(parseFloat(safeZone.style.top)).toBeGreaterThan(0);
    expect(parseFloat(safeZone.style.left) + parseFloat(safeZone.style.width))
      .toBeLessThan(parseFloat(preview.style.width));
    expect(parseFloat(safeZone.style.top) + parseFloat(safeZone.style.height))
      .toBeLessThan(parseFloat(preview.style.height));
    oversizedBleed.unmount();

    useBookStore.setState({ pageWidth_mm: 0.04, pageHeight_mm: 0.04, bleed_mm: 0 });
    render(<CanvasDesignerScreen />);

    expect((screen.getByLabelText('Ancho', { selector: '#input-width' }) as HTMLInputElement).value).toBe('0.04');
  });

  it('provides named groups, labels, and interactive states for modified controls', () => {
    const canvas = render(<CanvasDesignerScreen />);
    const formatGroup = screen.getByRole('group', { name: 'Orientación' });
    const verticalButton = within(formatGroup).getByRole('button', { name: 'Vertical' });

    expect(verticalButton.getAttribute('type')).toBe('button');
    expect(verticalButton.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('group', { name: 'Proporción' })).toBeTruthy();
    expect(screen.getByLabelText('Ancho', { selector: '#input-width' })).toBeTruthy();
    expect(screen.getByLabelText('Alto', { selector: '#input-height' })).toBeTruthy();
    expect(screen.getByLabelText('Sangrado')).toBeTruthy();
    canvas.unmount();

    render(<SubstrateSelectorScreen />);
    const grammageGroup = screen.getByRole('group', { name: 'Gramaje' });
    expect(within(grammageGroup).getByRole('button', { name: '150 g/m²' }).getAttribute('aria-pressed')).toBe('true');
    openGrammageCatalog();
    fireEvent.click(screen.getByRole('button', { name: '+ Nuevo gramaje' }));
    const form = document.getElementById('custom-entry-form') as HTMLElement;
    expect(within(form).getByLabelText('Gramaje')).toBeTruthy();
    expect(within(form).getByLabelText('Calibre declarado')).toBeTruthy();
  });

  it('keeps every selector in the imposition step named, and names the way out to the catalog', () => {
    render(<ImpositionVisualizerScreen />);

    expect(screen.getByLabelText('Prensa')).toBeTruthy();
    expect(screen.getByLabelText('Esquema de plegado')).toBeTruthy();
    expect(screen.getByLabelText('Cara mostrada')).toBeTruthy();

    // The step used to swap its selector for an inline form; adding and
    // editing live in the catalog since R-4b, so the selector stays put and
    // the group gains one control that says where the rest went.
    const group = screen.getByRole('group', { name: 'Tamaño del pliego' });
    const sheetSelect = within(group).getByLabelText('Pliego seleccionado');
    const sheetSelectLabel = within(group).getByText('Pliego seleccionado', { selector: 'label' });
    expect(sheetSelect.id).toBe('select-sheet-size');
    expect(sheetSelectLabel.getAttribute('for')).toBe('select-sheet-size');

    const options = within(group).getByRole('button', { name: 'Opciones de pliego' });
    expect(options.getAttribute('aria-haspopup')).toBe('dialog');

    fireEvent.click(options);
    expect(document.getElementById('select-sheet-size')).toBe(sheetSelect);
    expect(screen.getByRole('button', { name: '+ Nuevo pliego' })).toBeTruthy();
  });

  it('announces the custom grammage disclosure state and controlled form', () => {
    render(<SubstrateSelectorScreen />);

    openGrammageCatalog();
    const customGrammageToggle = screen.getByRole('button', { name: '+ Nuevo gramaje' });
    expect(customGrammageToggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.getElementById('custom-entry-form')).toBeNull();

    fireEvent.click(customGrammageToggle);

    expect(customGrammageToggle.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById('custom-entry-form')).not.toBeNull();

    fireEvent.click(customGrammageToggle);

    expect(customGrammageToggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.getElementById('custom-entry-form')).toBeNull();
  });

  it('shows a duplicate error and removes a custom grammage through its accessible button', () => {
    useBookStore.setState({
      substrateId: 'couche_matte',
      selectedGrammage: 160,
      customGrammages: [{ substrateId: 'couche_matte', grammage: 160, caliper: 130 }],
      customGrammageError: 'Ya existe el gramaje 160 g para Couché Mate. Introduce otro gramaje o cancela.',
    });

    render(<SubstrateSelectorScreen />);

    // The complaint and the way to remove a grammage of your own moved into
    // the catalog with the form that raises them.
    openGrammageCatalog();
    expect(screen.getByRole('alert').textContent).toContain('Introduce otro gramaje');
    const removeButton = screen.getByRole('button', { name: 'Eliminar' });
    expect(removeButton.getAttribute('type')).toBe('button');
    fireEvent.click(removeButton);

    expect(useBookStore.getState().customGrammages).toEqual([]);
    expect(useBookStore.getState().selectedGrammage).toBe(90);
    expect(screen.queryByRole('button', { name: 'Eliminar' })).toBeNull();
  });

  it('preserves an invalid custom-sheet draft selection and recovers after valid dimensions', () => {
    useBookStore.getState().recalculate();
    render(<ImpositionVisualizerScreen />);

    openCatalogFor('pliego');
    fireEvent.click(screen.getByRole('button', { name: '+ Nuevo pliego' }));
    fireEvent.click(screen.getByRole('button', { name: 'Añadir pliego' }));

    expect(screen.getByRole('alert').textContent).toContain('Introduce ancho y alto');
    const widthInput = screen.getByLabelText('Ancho');
    const heightInput = screen.getByLabelText('Alto');
    expect(widthInput.getAttribute('aria-invalid')).toBe('true');
    expect(widthInput.getAttribute('aria-describedby')).toBe('catalog-entry-error');
    expect(heightInput.getAttribute('aria-invalid')).toBe('true');
    expect(heightInput.getAttribute('aria-describedby')).toBe('catalog-entry-error');
    expect(useBookStore.getState().sheetSizeId).toBe('pliego_70x100');

    fireEvent.change(widthInput, { target: { value: '500' } });
    expect(widthInput.getAttribute('aria-invalid')).toBe('false');
    expect(heightInput.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toContain('Introduce ancho y alto');

    fireEvent.change(heightInput, { target: { value: '700' } });
    expect(widthInput.getAttribute('aria-invalid')).toBe('false');
    expect(heightInput.getAttribute('aria-invalid')).toBe('false');
    expect(screen.getByRole('alert').textContent).toContain('Introduce ancho y alto');
    fireEvent.click(screen.getByRole('button', { name: 'Añadir pliego' }));

    expect(useBookStore.getState().sheetSizeId).toMatch(/^custom_sheet_/);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('keeps the pages input valid when another spine input causes an error', () => {
    useBookStore.setState({
      totalPages: 32,
      spineResult: null,
      spineError: 'Corrige las dimensiones para recuperar las referencias de lomo y peso.',
    });

    render(<SpineCalculatorScreen />);
    const pagesInput = screen.getByRole('spinbutton', { name: 'Número de páginas' });

    expect(pagesInput.getAttribute('aria-invalid')).toBe('false');
    expect(pagesInput.getAttribute('aria-describedby')).toBe('pages-page-count-requirement');
    expect(screen.getByRole('alert').textContent).toContain('Corrige las dimensiones');
  });

  it('formats extreme finite spine values without Infinity or NaN', () => {
    useBookStore.setState({
      spineResult: {
        thickness_mm: Number.MAX_VALUE,
        totalWeight_g: Number.MAX_VALUE,
      },
      spineError: null,
    });

    const spine = render(<SpineCalculatorScreen />);
    const text = spine.container.textContent ?? '';

    expect(text).toContain(Number.MAX_VALUE.toExponential());
    expect(text).toContain(`${(Number.MAX_VALUE / 1000).toExponential()} kg`);
    expect(text).not.toContain('Infinity');
    expect(text).not.toContain('NaN');
  });

  it('preserves invalid page-count text while calculations invalidate, then recovers', () => {
    useBookStore.getState().recalculate();
    render(<SpineCalculatorScreen />);
    const pagesInput = screen.getByRole('spinbutton', { name: 'Número de páginas' });

    fireEvent.change(pagesInput, { target: { value: '' } });

    expect(useBookStore.getState().totalPages).toBe(0);
    expect((pagesInput as HTMLInputElement).value).toBe('');
    expect(useBookStore.getState().spineResult).toBeNull();
    expect(pagesInput.getAttribute('aria-invalid')).toBe('true');
    expect(pagesInput.getAttribute('aria-describedby')).toBe('pages-page-count-requirement');
    expect(screen.getByText(/Introduce un número entero seguro mayor que cero/)).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('entero seguro mayor que cero');

    fireEvent.change(pagesInput, { target: { value: '33.0000000000000001' } });

    expect(useBookStore.getState().totalPages).toBe(0);
    expect((pagesInput as HTMLInputElement).value).toBe('33.0000000000000001');
    expect(useBookStore.getState().spineResult).toBeNull();
    expect(pagesInput.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toContain('entero seguro mayor que cero');

    fireEvent.change(pagesInput, { target: { value: '33' } });

    expect(useBookStore.getState().totalPages).toBe(33);
    expect((pagesInput as HTMLInputElement).value).toBe('33');
    expect(useBookStore.getState().spineResult).not.toBeNull();
    expect(pagesInput.getAttribute('aria-invalid')).toBe('false');
    expect(screen.queryByRole('alert')).toBeNull();

    expect(screen.getByText('Hojas de papel (interior)').nextSibling?.textContent).toBe('17');
    const formulaCopy = screen.getByText((_, element) => (
      element?.tagName === 'P'
      && element.textContent?.includes('Hojas físicas = ⌈33 ÷ 2⌉ = 17 hojas') === true
    ));
    expect(formulaCopy.textContent).toContain('Lomo estimado = 17 hojas × calibre');
    expect(formulaCopy.textContent).toContain('× 17 hojas × 150 g/m²');
  });

  it('keeps the formulas folded away behind "Cómo se calcula", and out of the step', () => {
    const { container } = render(<SpineCalculatorScreen />);

    // jsdom renders a closed <details> children and all, so a text query alone
    // would pass whether or not the drawer exists. What is asserted is the
    // drawer: closed to begin with, and holding the formulas.
    const drawer = container.querySelector('details.how-panel') as HTMLDetailsElement;
    expect(drawer).toBeTruthy();
    expect(drawer.open).toBe(false);
    expect(drawer.querySelector('summary')?.textContent).toBe('Cómo se calcula');
    expect(drawer.textContent).toContain('Hojas físicas');

    // And nowhere else: the step that takes the page count no longer carries
    // the derivation it used to show under the field.
    expect(container.querySelector('#spine-calculator')?.textContent).not.toContain('Hojas físicas');
  });

  it('no longer repeats the provenance of the catalog under every control', () => {
    const substrate = render(<SubstrateSelectorScreen />);
    expect(substrate.container.textContent).not.toContain('config/sustratos.json');
    substrate.unmount();

    const imposition = render(<ImpositionVisualizerScreen />);
    expect(imposition.container.textContent).not.toContain('config/pliegos.json');
    expect(imposition.container.textContent).not.toContain('config/maquinas.json');
  });
});

describe('Binding selector', () => {
  it('renders the four shipped methods and switching changes the displayed rules', () => {
    render(<BindingPanelScreen />);
    const select = screen.getByLabelText('Encuadernación seleccionada') as HTMLSelectElement;

    expect(Array.from(select.options).map(option => option.value).sort()).toEqual([
      'cosido', 'grapa', 'hotmelt', 'pur',
    ]);
    expect(select.value).toBe('grapa');
    expect(screen.getByText('Aporte de la encuadernación (mm)').nextSibling?.textContent).toBe('0');

    fireEvent.change(select, { target: { value: 'hotmelt' } });

    expect(useBookStore.getState().bindingId).toBe('hotmelt');
    expect(screen.getByText('Aporte de la encuadernación (mm)').nextSibling?.textContent).toBe('2');
  });

  it('shows an accessible message naming the nearest valid page counts for an invalid count', () => {
    useBookStore.getState().setTotalPages(33); // grapa requires a multiple of 4
    render(<BindingPanelScreen />);

    const message = screen.getByRole('status');
    expect(message.textContent).toContain('32');
    expect(message.textContent).toContain('36');
  });

  it('renders the spine split into interior paper, binding allowance, and total', () => {
    render(<BindingPanelScreen />);

    // grapa nests, so the third figure is labeled as the fold thickness, not a flat spine.
    expect(screen.getByText('Lomo del papel interior (mm)').nextSibling?.textContent).toBe('1.92');
    expect(screen.getByText('Aporte de la encuadernación (mm)').nextSibling?.textContent).toBe('0');
    expect(screen.getByText('Grosor del papel en el pliegue (mm)').nextSibling?.textContent).toBe('1.92');
  });

  it('reports creep as a figure, explains it in the drawer, and drops both for a method without it', () => {
    const { container } = render(<BindingPanelScreen />);

    expect(screen.getByText('Corrimiento máx. (mm)').nextSibling?.textContent).toBe('0.96');
    const drawer = container.querySelector('details.how-panel') as HTMLDetailsElement;
    expect(drawer.open).toBe(false);
    expect(drawer.textContent).toContain('8 pliegos anidados');
    // The step that chooses the method no longer carries the longest text in
    // the app under its dropdown.
    expect(container.querySelector('#binding-panel')?.textContent).not.toContain('Corrimiento');

    fireEvent.change(screen.getByLabelText('Encuadernación seleccionada'), { target: { value: 'hotmelt' } });

    expect(screen.queryByText('Corrimiento máx. (mm)')).toBeNull();
    expect(screen.queryByText(/Corrimiento \(creep\)/)).toBeNull();
  });

  it('says where the selected method comes from beside its label, not under the dropdown', () => {
    const { container } = render(<BindingPanelScreen />);

    const badge = container.querySelector('.form-label-row .field-marginalia');
    expect(badge?.textContent).toBe('de fábrica');
    expect(container.textContent).not.toContain('config/encuadernaciones.json');
  });
});

describe('UX-6: components read the effective catalog', () => {
  it('excludes a hidden press from the press dropdown', () => {
    useBookStore.getState().hidePress('prensa_70x100');
    render(<ImpositionVisualizerScreen />);

    const select = screen.getByLabelText('Prensa seleccionada') as HTMLSelectElement;
    expect(Array.from(select.options).map(option => option.value)).not.toContain('prensa_70x100');
  });

  it('shows a patched binding name in the dropdown instead of its factory name', () => {
    useBookStore.getState().patchBinding('grapa', { name: 'Grapa personalizada' });
    render(<BindingPanelScreen />);

    const select = screen.getByLabelText('Encuadernación seleccionada') as HTMLSelectElement;
    expect(select.value).toBe('grapa');
    expect(within(select).getByRole('option', { name: 'Grapa personalizada' })).toBeTruthy();
    expect(within(select).queryByRole('option', { name: 'Grapa (caballete)' })).toBeNull();
  });
});

describe('Hide and restore factory entries (UX-6)', () => {
  it('hides the selected factory press with its own control, shows a restore line, and restores it', () => {
    render(<ImpositionVisualizerScreen />);
    const select = screen.getByLabelText('Prensa seleccionada') as HTMLSelectElement;
    expect(Array.from(select.options).map(option => option.value)).toContain('prensa_70x100');
    expect(screen.queryByText(/prensa de fábrica oculta/)).toBeNull();

    openPressCatalog();
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar' }));

    expect(Array.from(select.options).map(option => option.value)).not.toContain('prensa_70x100');
    expect(screen.getByText(/1 prensa de fábrica oculta/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar prensas ocultas' }));

    expect(Array.from(select.options).map(option => option.value)).toContain('prensa_70x100');
    expect(screen.queryByText(/prensa de fábrica oculta/)).toBeNull();
  });

  it('hides the selected factory sheet size with its own control, shows a restore line, and restores it', () => {
    render(<ImpositionVisualizerScreen />);
    const select = screen.getByLabelText('Pliego seleccionado') as HTMLSelectElement;
    expect(Array.from(select.options).map(option => option.value)).toContain('pliego_70x100');
    expect(screen.queryByText(/pliego de fábrica oculto/)).toBeNull();

    openCatalogFor('pliego');
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar' }));

    expect(Array.from(select.options).map(option => option.value)).not.toContain('pliego_70x100');
    expect(screen.getByText(/1 pliego de fábrica oculto/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar pliegos ocultos' }));

    expect(Array.from(select.options).map(option => option.value)).toContain('pliego_70x100');
    expect(screen.queryByText(/pliego de fábrica oculto/)).toBeNull();
  });

  it('hides the selected factory binding with its own control, shows a restore line, and restores it', () => {
    render(<BindingPanelScreen />);
    const select = screen.getByLabelText('Encuadernación seleccionada') as HTMLSelectElement;
    expect(Array.from(select.options).map(option => option.value)).toContain('grapa');
    expect(screen.queryByText(/encuadernación de fábrica oculta/)).toBeNull();

    openCatalogFor('encuadernación');
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar' }));

    expect(Array.from(select.options).map(option => option.value)).not.toContain('grapa');
    expect(screen.getByText(/1 encuadernación de fábrica oculta/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar encuadernaciones ocultas' }));

    expect(Array.from(select.options).map(option => option.value)).toContain('grapa');
    expect(screen.queryByText(/encuadernación de fábrica oculta/)).toBeNull();
  });

  it('hides the selected factory proportion with its own control, shows a restore line, and restores it', () => {
    render(<CanvasDesignerScreen />);
    const proportionGroup = screen.getByRole('group', { name: 'Proporción' });
    expect(within(proportionGroup).getByRole('button', { name: '2:3' })).toBeTruthy();
    expect(screen.queryByText(/proporción de fábrica oculta/)).toBeNull();

    openCatalogFor('proporción');
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar' }));

    expect(within(proportionGroup).queryByRole('button', { name: '2:3' })).toBeNull();
    expect(screen.getByText(/1 proporción de fábrica oculta/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar proporciones ocultas' }));

    expect(within(proportionGroup).getByRole('button', { name: '2:3' })).toBeTruthy();
    expect(screen.queryByText(/proporción de fábrica oculta/)).toBeNull();
  });
});

describe('Catalog origin badge (UX-6)', () => {
  it('shows "de fábrica" for an untouched factory binding', () => {
    render(<BindingPanelScreen />);

    expect(screen.getAllByText('de fábrica').length).toBeGreaterThan(0);
  });

  it('shows "editado" for a patched factory binding', () => {
    useBookStore.getState().patchBinding('grapa', { name: 'Grapa personalizada' });
    render(<BindingPanelScreen />);

    expect(screen.getAllByText('editado').length).toBeGreaterThan(0);
  });

  it('shows "tuyo" for a custom binding', () => {
    const added = useBookStore.getState().addCustomBinding('Encuadernación de prueba', 4, 8, 64, 5, true, false);
    expect(added).toBe(true);
    render(<BindingPanelScreen />);

    expect(screen.getByText('tuyo')).toBeTruthy();
  });
});

describe('Edit a factory press or sheet size (UX-6)', () => {
  it('edits a field of a factory press from the interface, and the badge switches to "editado"', () => {
    useBookStore.getState().setPress('prensa_70x100');
    render(<ImpositionVisualizerScreen />);

    openPressCatalog();
    expect((screen.getByLabelText('Pliego máximo · ancho') as HTMLInputElement).value).toBe('720');

    fireEvent.change(screen.getByLabelText('Pliego máximo · ancho'), { target: { value: '800' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(useBookStore.getState().pressPatches).toEqual([
      { id: 'prensa_70x100', changes: { maxSheetWidth_mm: 800 } },
    ]);
    expect(within(screen.getByRole('group', { name: 'Prensa' })).getByText('editado')).toBeTruthy();
  });

  it('persists two edits made in separate save actions, instead of the last one overwriting the first', () => {
    useBookStore.getState().setPress('prensa_70x100');
    render(<ImpositionVisualizerScreen />);

    openPressCatalog();
    fireEvent.change(screen.getByLabelText('Pliego máximo · ancho'), { target: { value: '800' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    // Re-open the form: it must pre-load with the effective (already patched) values.
    openPressCatalog();
    expect((screen.getByLabelText('Pliego máximo · ancho') as HTMLInputElement).value).toBe('800');
    fireEvent.change(screen.getByLabelText('Cola'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(useBookStore.getState().pressPatches).toEqual([
      { id: 'prensa_70x100', changes: { maxSheetWidth_mm: 800, tailMargin_mm: 20 } },
    ]);
  });

  it('restores a patched press to its factory values with the undo control', () => {
    useBookStore.getState().setPress('prensa_70x100');
    useBookStore.getState().patchPress('prensa_70x100', { maxSheetWidth_mm: 800 });
    render(<ImpositionVisualizerScreen />);
    const pressGroup = screen.getByRole('group', { name: 'Prensa' });

    expect(within(pressGroup).getByText('editado')).toBeTruthy();
    openPressCatalog();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a fábrica' }));

    expect(useBookStore.getState().pressPatches).toEqual([]);
    expect(within(pressGroup).getByText('de fábrica')).toBeTruthy();
  });

  it('edits a field of a factory sheet size from the interface, and the badge switches to "editado"', () => {
    useBookStore.getState().setSheetSize('pliego_70x100');
    render(<ImpositionVisualizerScreen />);

    openCatalogFor('pliego');
    expect((screen.getByLabelText('Ancho') as HTMLInputElement).value).toBe('700');

    fireEvent.change(screen.getByLabelText('Ancho'), { target: { value: '750' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(useBookStore.getState().sheetSizePatches).toEqual([
      { id: 'pliego_70x100', changes: { width_mm: 750 } },
    ]);
    expect(within(screen.getByRole('group', { name: 'Tamaño del pliego' })).getByText('editado')).toBeTruthy();
  });

  it('persists two sheet size edits made in separate save actions, instead of the last one overwriting the first', () => {
    useBookStore.getState().setSheetSize('pliego_70x100');
    render(<ImpositionVisualizerScreen />);

    openCatalogFor('pliego');
    fireEvent.change(screen.getByLabelText('Ancho'), { target: { value: '750' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    // Re-open the form: it must pre-load with the effective (already patched) values.
    openCatalogFor('pliego');
    expect((screen.getByLabelText('Ancho') as HTMLInputElement).value).toBe('750');
    fireEvent.change(screen.getByLabelText('Alto'), { target: { value: '1050' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(useBookStore.getState().sheetSizePatches).toEqual([
      { id: 'pliego_70x100', changes: { width_mm: 750, height_mm: 1050 } },
    ]);
  });

  it('restores a patched sheet size to its factory values with the undo control', () => {
    useBookStore.getState().setSheetSize('pliego_70x100');
    useBookStore.getState().patchSheetSize('pliego_70x100', { width_mm: 750 });
    render(<ImpositionVisualizerScreen />);
    const sheetGroup = screen.getByRole('group', { name: 'Tamaño del pliego' });

    expect(within(sheetGroup).getByText('editado')).toBeTruthy();
    openCatalogFor('pliego');
    fireEvent.click(screen.getByRole('button', { name: 'Volver a fábrica' }));

    expect(useBookStore.getState().sheetSizePatches).toEqual([]);
    expect(within(sheetGroup).getByText('de fábrica')).toBeTruthy();
  });

  it('cancelling the press edit form clears the store error and leaves the patch untouched', () => {
    useBookStore.getState().setPress('prensa_70x100');
    render(<ImpositionVisualizerScreen />);

    openPressCatalog();
    fireEvent.change(screen.getByLabelText('Pliego máximo · ancho'), { target: { value: '-5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(screen.getByRole('alert').textContent).toContain('Los cambios dejarían la prensa con datos inválidos.');

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('alert')).toBeNull();
    expect(useBookStore.getState().pressPatches).toEqual([]);
  });
});

describe('Edit a factory binding or proportion (UX-6)', () => {
  it('edits a field of a factory binding from the interface, and the badge switches to "editado"', () => {
    render(<BindingPanelScreen />);

    openCatalogFor('encuadernación');
    expect((screen.getByLabelText('Aporte al lomo') as HTMLInputElement).value).toBe('0');

    fireEvent.change(screen.getByLabelText('Aporte al lomo'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(useBookStore.getState().bindingPatches).toEqual([
      { id: 'grapa', changes: { spineAllowance_mm: 5 } },
    ]);
    expect(screen.getAllByText('editado').length).toBeGreaterThan(0);
  });

  it('persists two edits made in separate save actions, instead of the last one overwriting the first', () => {
    render(<BindingPanelScreen />);

    openCatalogFor('encuadernación');
    fireEvent.change(screen.getByLabelText('Aporte al lomo'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    // Re-open the form: it must pre-load with the effective (already patched) values.
    openCatalogFor('encuadernación');
    expect((screen.getByLabelText('Aporte al lomo') as HTMLInputElement).value).toBe('5');
    fireEvent.change(screen.getByLabelText('Mínimo de páginas'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(useBookStore.getState().bindingPatches).toEqual([
      { id: 'grapa', changes: { spineAllowance_mm: 5, minPages: 12 } },
    ]);
  });

  it('restores a patched binding to its factory values with the undo control', () => {
    useBookStore.getState().patchBinding('grapa', { spineAllowance_mm: 5 });
    render(<BindingPanelScreen />);

    expect(screen.getAllByText('editado').length).toBeGreaterThan(0);
    openCatalogFor('encuadernación');
    fireEvent.click(screen.getByRole('button', { name: 'Volver a fábrica' }));

    expect(useBookStore.getState().bindingPatches).toEqual([]);
    expect(screen.getAllByText('de fábrica').length).toBeGreaterThan(0);
  });

  it('edits a field of a factory proportion from the interface, and the badge switches to "editado"', () => {
    render(<CanvasDesignerScreen />);

    openCatalogFor('proporción');
    expect((screen.getByLabelText('Ancho de la razón') as HTMLInputElement).value).toBe('2');

    fireEvent.change(screen.getByLabelText('Ancho de la razón'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(useBookStore.getState().proportionPatches).toEqual([
      { label: '2:3', changes: { ratio: [4, 3] } },
    ]);
    expect(screen.getAllByText('editado').length).toBeGreaterThan(0);
  });

  it('persists two proportion edits made in separate save actions, instead of the last one overwriting the first', () => {
    render(<CanvasDesignerScreen />);

    openCatalogFor('proporción');
    fireEvent.change(screen.getByLabelText('Ancho de la razón'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    // Re-open the form: it must pre-load with the effective (already patched) values.
    openCatalogFor('proporción');
    expect((screen.getByLabelText('Ancho de la razón') as HTMLInputElement).value).toBe('4');
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Proporción personalizada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(useBookStore.getState().proportionPatches).toEqual([
      { label: '2:3', changes: { ratio: [4, 3], description: 'Proporción personalizada' } },
    ]);
  });

  it('restores a patched proportion to its factory values with the undo control', () => {
    useBookStore.getState().patchProportion('2:3', { ratio: [4, 3] });
    render(<CanvasDesignerScreen />);

    expect(screen.getAllByText('editado').length).toBeGreaterThan(0);
    openCatalogFor('proporción');
    fireEvent.click(screen.getByRole('button', { name: 'Volver a fábrica' }));

    expect(useBookStore.getState().proportionPatches).toEqual([]);
    expect(screen.getAllByText('de fábrica').length).toBeGreaterThan(0);
  });

  it('cancelling the binding edit form clears the store error and leaves the patch untouched', () => {
    render(<BindingPanelScreen />);

    openCatalogFor('encuadernación');
    fireEvent.change(screen.getByLabelText('Aporte al lomo'), { target: { value: '-5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(screen.getByRole('alert').textContent).toContain('Los cambios dejarían la encuadernación con datos inválidos.');

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('alert')).toBeNull();
    expect(useBookStore.getState().bindingPatches).toEqual([]);
  });
});

describe('Signature imposition preview', () => {
  it('renders the page numbers of the selected side', () => {
    useBookStore.getState().setSheetSize('pliego_70x100');
    render(<ImpositionVisualizerScreen />);

    expect(useBookStore.getState().signaturePlan?.selected?.scheme.id).toBe('esquema_16pp');
    expect(screen.getByText('16')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
  });

  it("switches to the back's numbers with the side toggle", () => {
    useBookStore.getState().setSheetSize('pliego_70x100');
    render(<ImpositionVisualizerScreen />);

    expect(screen.queryByText('9')).toBeNull();
    fireEvent.change(screen.getByLabelText('Cara mostrada'), { target: { value: 'back' } });
    expect(screen.getByText('9')).toBeTruthy();
    expect(screen.queryByText('16')).toBeNull();
  });

  it('changes the numbers when a different folding scheme is chosen', () => {
    useBookStore.getState().setSheetSize('pliego_70x100');
    render(<ImpositionVisualizerScreen />);
    const svg = () => document.querySelector('.imposition-svg') as HTMLElement;

    expect(within(svg()).queryByText('8')).toBeNull();
    fireEvent.change(screen.getByLabelText('Esquema de plegado'), { target: { value: 'esquema_8pp' } });

    expect(useBookStore.getState().signaturePlan?.selected?.scheme.id).toBe('esquema_8pp');
    expect(within(svg()).getByText('8')).toBeTruthy();
  });

  it('shows an accessible message instead of an empty preview when nothing fits', () => {
    // A custom sheet far too small for either shipped folding scheme's
    // printable area, regardless of press: forces the no-fit state explicitly
    // instead of relying on which sheet the shipped defaults happen to use.
    useBookStore.getState().addCustomSheetSize('Diminuto', 100, 100);
    expect(useBookStore.getState().signaturePlan?.selected).toBeNull();

    render(<ImpositionVisualizerScreen />);

    const statuses = screen.getAllByRole('status').map(status => status.textContent ?? '');
    expect(statuses.some(text => text.includes('Ningún esquema de plegado disponible cabe en el pliego'))).toBe(true);
    expect(statuses.some(text => text.includes('Sin imposición'))).toBe(true);
    expect(document.querySelector('.imposition-svg')).toBeNull();
  });

  it('says where the press and the sheet come from beside their labels', () => {
    render(<ImpositionVisualizerScreen />);

    expect(within(screen.getByRole('group', { name: 'Prensa' })).getByText('de fábrica')).toBeTruthy();
    expect(within(screen.getByRole('group', { name: 'Tamaño del pliego' })).getByText('de fábrica')).toBeTruthy();
  });

  it('names the press-sheet stat apart from the folded, per-4-page sheet used for creep', () => {
    useBookStore.getState().setSheetSize('pliego_70x100');
    render(<ImpositionVisualizerScreen />);

    expect(screen.getByText('Pliegos de prensa por ejemplar')).toBeTruthy();
  });
});

describe('Cover panel', () => {
  it('only offers the two soft covers as selectable with the shipped default (saddle-stitch) binding, and switching changes the displayed measurements', () => {
    render(<CoverPanelScreen />);
    const select = screen.getByLabelText('Tipo de tapa') as HTMLSelectElement;

    expect(Array.from(select.options).map(option => option.value).sort()).toEqual([
      'blanda_simple', 'blanda_solapas',
    ]);
    expect(select.value).toBe('blanda_simple');
    // grapa (the shipped default binding) has no flat spine, so blanda_simple's
    // sheet is 2*0 + 2*140 + 0 + 2*3 = 286.
    expect(screen.getByText('Ancho del pliego de tapa (mm)').nextSibling?.textContent).toBe('286');

    fireEvent.change(select, { target: { value: 'blanda_solapas' } });

    expect(useBookStore.getState().coverId).toBe('blanda_solapas');
    expect(screen.getByText('Ancho del pliego de tapa (mm)').nextSibling?.textContent).not.toBe('286');
  });

  it('offers all three covers as selectable with a flat-spine binding', () => {
    useBookStore.getState().setBinding('hotmelt');
    render(<CoverPanelScreen />);
    const select = screen.getByLabelText('Tipo de tapa') as HTMLSelectElement;

    expect(Array.from(select.options).map(option => option.value).sort()).toEqual([
      'blanda_simple', 'blanda_solapas', 'dura_estandar',
    ]);
    for (const option of Array.from(select.options)) {
      expect(option.disabled).toBe(false);
    }
  });

  it('offers the hard cover as selectable when a custom flat-spine binding is selected (regression)', () => {
    useBookStore.getState().addCustomBinding('Rústica de prueba', 2, 2, 2000, 2, false, false);
    render(<CoverPanelScreen />);
    const select = screen.getByLabelText('Tipo de tapa') as HTMLSelectElement;

    expect(Array.from(select.options).map(option => option.value).sort()).toEqual([
      'blanda_simple', 'blanda_solapas', 'dura_estandar',
    ]);
    const hardCoverOption = Array.from(select.options).find(option => option.value === 'dura_estandar');
    expect(hardCoverOption?.disabled).toBe(false);

    fireEvent.change(select, { target: { value: 'dura_estandar' } });
    expect(useBookStore.getState().coverId).toBe('dura_estandar');
  });

  it('keeps an incompatible cover as a disabled option instead of removing it, when the binding changes underneath it', () => {
    useBookStore.getState().setBinding('hotmelt');
    useBookStore.getState().setCover('dura_estandar');
    render(<CoverPanelScreen />);
    const select = screen.getByLabelText('Tipo de tapa') as HTMLSelectElement;

    act(() => {
      useBookStore.getState().setBinding('grapa');
    });

    expect(useBookStore.getState().coverId).toBe('dura_estandar');
    expect(select.value).toBe('dura_estandar');
    const durastandarOption = Array.from(select.options).find(option => option.value === 'dura_estandar');
    expect(durastandarOption).toBeTruthy();
    expect(durastandarOption?.disabled).toBe(true);
    expect(durastandarOption?.textContent).toBe('Tapa dura estándar');
    expect(screen.getByText(/no admite una tapa dura/).textContent?.length).toBeGreaterThan(0);
  });

  it('shows the five sections in order for a soft cover', () => {
    render(<CoverPanelScreen />);
    const list = screen.getByLabelText('Secciones del pliego de tapa');
    const items = within(list).getAllByRole('listitem').map(item => item.textContent);

    // grapa has no flat spine, so the shipped default has no spine panel.
    expect(items).toEqual([
      'Solapa: 0 mm',
      'Contratapa: 143 mm',
      'Lomo: 0 mm',
      'Portada: 143 mm',
      'Solapa: 0 mm',
    ]);
  });

  it('shows boards, spine board, and wrap for a hard cover paired with a flat-spine binding', () => {
    useBookStore.getState().setBinding('hotmelt');
    useBookStore.getState().setCover('dura_estandar');
    render(<CoverPanelScreen />);

    expect(useBookStore.getState().coverPlan?.ok).toBe(true);
    expect(screen.getByText('Ancho del cartón lateral (mm)')).toBeTruthy();
    expect(screen.getByText('Alto del cartón (mm)')).toBeTruthy();
    expect(screen.getByText('Ancho del cartón de lomo (mm)')).toBeTruthy();
    expect(screen.getByText('Ancho del forro (mm)')).toBeTruthy();
    expect(screen.getByText('Alto del forro (mm)')).toBeTruthy();
    expect(screen.getByText('Área de cartón lateral (m²)')).toBeTruthy();
    expect(screen.getByText('Área de cartón de lomo (m²)')).toBeTruthy();
    expect(screen.getByText('Área total de cartón (m²)')).toBeTruthy();
    expect(screen.getByText(/No se calcula el peso del cartón/)).toBeTruthy();
  });

  it('shows the engine message for a hard cover paired with the saddle-stitch binding', () => {
    useBookStore.getState().setCover('dura_estandar');
    render(<CoverPanelScreen />);

    expect(useBookStore.getState().coverPlan).toMatchObject({ ok: false, reason: 'binding-has-no-flat-spine' });
    expect(screen.getByText(/no admite una tapa dura/).textContent?.length).toBeGreaterThan(0);
    expect(screen.queryByText('Ancho del cartón lateral (mm)')).toBeNull();
  });

  /*
   * Covers are read-only, so the step carries no origin badge: saying "de
   * fábrica" beside a field that could never say anything else is noise.
   * Their provenance is at the foot of the sheet with the rest.
   */
  it('carries neither a source note nor an origin badge', () => {
    const { container } = render(<CoverPanelScreen />);
    expect(container.textContent).not.toContain('config/tapas.json');
    expect(container.querySelector('.origin-badge')).toBeNull();
  });
});

// jsdom never lays out the page, so it cannot honestly confirm either the
// real 44x44 tap-target size or that a keyboard focus ring is visually
// perceptible: `getBoundingClientRect` returns zeros and no styles are
// actually painted. What follows only checks that the two delete buttons
// carry the class that the CSS hooks the enlarged tap area to; the 44x44
// size itself and the focus ring's perceptibility are verified in a real
// browser via `npm run preview`.
describe('Focus visibility and delete-button tap targets (UX-3)', () => {
  it('removes a grammage of your own from the catalog, where the control is a full-sized button', () => {
    useBookStore.setState({
      substrateId: 'couche_matte',
      selectedGrammage: 160,
      customGrammages: [{ substrateId: 'couche_matte', grammage: 160, caliper: 130 }],
    });

    render(<SubstrateSelectorScreen />);

    openGrammageCatalog();
    const removeButton = screen.getByRole('button', { name: 'Eliminar' });

    // The 21px chip with a ::before overlay grown to a usable tap target is
    // gone: in the catalog it is an ordinary button, and e2e/inventory.spec.ts
    // measures that the catalog's controls are big enough.
    expect(removeButton.className).toContain('catalog-danger');
    fireEvent.click(removeButton);
    expect(useBookStore.getState().customGrammages).toEqual([]);
  });

  it('removes a sheet of your own from the catalog, where the control is a full-sized button', () => {
    useBookStore.getState().recalculate();
    render(<ImpositionVisualizerScreen />);

    openCatalogFor('pliego');
    fireEvent.click(screen.getByRole('button', { name: '+ Nuevo pliego' }));
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Pliego mío' } });
    fireEvent.change(screen.getByLabelText('Ancho'), { target: { value: '500' } });
    fireEvent.change(screen.getByLabelText('Alto'), { target: { value: '700' } });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir pliego' }));
    expect(useBookStore.getState().customSheetSizes).toHaveLength(1);

    // The 27px button with a ::before overlay grown to a usable tap target is
    // gone: in the catalog it is an ordinary button, sized like the rest.
    // e2e/inventory.spec.ts measures that the rest are big enough.
    const removeButton = screen.getByRole('button', { name: 'Eliminar' });
    expect(removeButton.className).toContain('catalog-danger');

    fireEvent.click(removeButton);
    expect(useBookStore.getState().customSheetSizes).toHaveLength(0);
  });
});

describe('Editing a press in the catalog (R-4a)', () => {
  /**
   * R-8: a press of your own used to be added and then frozen — correcting a
   * mistyped gripper meant deleting it and typing all seven fields again.
   * This drives the whole correction through the interface, because the store
   * action existing is not the same as the form reaching it.
   */
  it('saves a correction to a press of your own, through the form', () => {
    render(<ImpositionVisualizerScreen />);
    openPressCatalog();
    fireEvent.click(screen.getByRole('button', { name: '+ Nueva prensa' }));
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Prensa mía' } });
    for (const [label, value] of [
      ['Pliego máximo · ancho', '500'], ['Pliego máximo · alto', '700'],
      ['Pinza', '10'], ['Cola', '5'], ['Lateral', '5'], ['Calle', '4'],
    ]) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
    fireEvent.click(screen.getByRole('button', { name: 'Añadir prensa' }));
    expect(useBookStore.getState().customPresses).toHaveLength(1);
    const { id } = useBookStore.getState().customPresses[0];

    expect((screen.getByLabelText('Nombre') as HTMLInputElement).readOnly).toBe(false);
    fireEvent.change(screen.getByLabelText('Pinza'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Prensa mía, corregida' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    // Replaced, not duplicated, and the fields nobody touched survive.
    expect(useBookStore.getState().customPresses).toHaveLength(1);
    expect(useBookStore.getState().customPresses[0]).toMatchObject({
      id, name: 'Prensa mía, corregida', gripperMargin_mm: 12, maxSheetWidth_mm: 500, gutter_mm: 4,
    });
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('keeps a rejected correction on screen with the store\u2019s reason, and changes nothing', () => {
    render(<ImpositionVisualizerScreen />);
    openPressCatalog();
    fireEvent.click(screen.getByRole('button', { name: '+ Nueva prensa' }));
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Prensa mía' } });
    for (const [label, value] of [
      ['Pliego máximo · ancho', '500'], ['Pliego máximo · alto', '700'],
      ['Pinza', '10'], ['Cola', '5'], ['Lateral', '5'], ['Calle', '4'],
    ]) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
    fireEvent.click(screen.getByRole('button', { name: 'Añadir prensa' }));

    // A gripper and a tail that swallow the sheet leave no printable area,
    // which is the invariant maquinas.json is validated against.
    fireEvent.change(screen.getByLabelText('Pinza'), { target: { value: '400' } });
    fireEvent.change(screen.getByLabelText('Cola'), { target: { value: '400' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(useBookStore.getState().customPresses[0].gripperMargin_mm).toBe(10);
    expect(screen.getByRole('alert').textContent).toContain('inválidos');
    // The typed values stay, so the correction can be corrected.
    expect((screen.getByLabelText('Pinza') as HTMLInputElement).value).toBe('400');
  });

  it('drops the patch when every field is put back to its factory value', () => {
    useBookStore.getState().setPress('prensa_70x100');
    useBookStore.getState().patchPress('prensa_70x100', { maxSheetWidth_mm: 800 });
    render(<ImpositionVisualizerScreen />);

    openPressCatalog();
    fireEvent.change(screen.getByLabelText('Pliego máximo · ancho'), { target: { value: '720' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    // A patch that records no difference is not a patch: leaving it behind
    // would keep the entry marked as edited and bounce the field back to 800.
    expect(useBookStore.getState().pressPatches).toEqual([]);
    expect((screen.getByLabelText('Pliego máximo · ancho') as HTMLInputElement).value).toBe('720');
  });

  it('does not carry a half-typed draft onto the press that replaces a hidden one', () => {
    useBookStore.getState().setPress('prensa_70x100');
    render(<ImpositionVisualizerScreen />);

    openPressCatalog();
    fireEvent.change(screen.getByLabelText('Pliego máximo · ancho'), { target: { value: '999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar' }));

    // The selection moved to the only press left; the draft belonged to the
    // one that just went away.
    expect(useBookStore.getState().pressId).toBe('prensa_sra3');
    expect((screen.getByLabelText('Pliego máximo · ancho') as HTMLInputElement).value).toBe('330');
  });
});

describe('Custom press quick-add (UX-4)', () => {
  it('opens the form with the + button, adds a valid press through the real flow, surfaces the store error for an invalid one, and removes the custom press', () => {
    render(<ImpositionVisualizerScreen />);

    openPressCatalog();
    const toggle = screen.getByRole('button', { name: '+ Nueva prensa' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById('custom-entry-form')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Prensa de prueba' } });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir prensa' }));
    expect(screen.getByRole('alert').textContent).toContain('Introduce las medidas de la prensa');
    expect(useBookStore.getState().customPresses).toHaveLength(0);

    fireEvent.change(screen.getByLabelText('Pliego máximo · ancho'), { target: { value: '500' } });
    fireEvent.change(screen.getByLabelText('Pliego máximo · alto'), { target: { value: '700' } });
    fireEvent.change(screen.getByLabelText('Pinza'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Cola'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Lateral'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Calle'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir prensa' }));

    const newPressId = useBookStore.getState().pressId;
    expect(newPressId).toMatch(/^custom_press_/);
    expect(useBookStore.getState().customPresses).toHaveLength(1);
    expect(document.getElementById('custom-entry-form')).toBeNull();
    const select = screen.getByLabelText('Prensa seleccionada') as HTMLSelectElement;
    expect(select.value).toBe(newPressId);
    expect(within(screen.getByRole('group', { name: 'Prensa' })).getByText('tuyo')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(useBookStore.getState().customPresses).toHaveLength(0);
    expect(useBookStore.getState().pressId).not.toBe(newPressId);
  });
});

describe('Custom binding quick-add (UX-4)', () => {
  it('opens the form with the + button, adds a valid binding through the real flow, surfaces the store error for an invalid one, and removes the custom binding', () => {
    render(<BindingPanelScreen />);

    openCatalogFor('encuadernación');
    const toggle = screen.getByRole('button', { name: '+ Nueva encuadernación' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById('custom-entry-form')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Encuadernación de prueba' } });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir encuadernación' }));
    expect(screen.getByRole('alert').textContent).toContain('múltiplo de páginas');
    expect(useBookStore.getState().customBindings).toHaveLength(0);

    fireEvent.change(screen.getByLabelText('Múltiplo de páginas'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Mínimo de páginas'), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText('Máximo de páginas'), { target: { value: '64' } });
    fireEvent.change(screen.getByLabelText('Aporte al lomo'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir encuadernación' }));

    const newBindingId = useBookStore.getState().bindingId;
    expect(newBindingId).toMatch(/^custom_binding_/);
    expect(useBookStore.getState().customBindings).toHaveLength(1);
    expect(document.getElementById('custom-entry-form')).toBeNull();
    const select = screen.getByLabelText('Encuadernación seleccionada') as HTMLSelectElement;
    expect(select.value).toBe(newBindingId);
    expect(within(screen.getByRole('group', { name: 'Encuadernación' })).getByText('tuyo')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(useBookStore.getState().customBindings).toHaveLength(0);
    expect(useBookStore.getState().bindingId).not.toBe(newBindingId);
  });
});

describe('Custom proportion quick-add (UX-4)', () => {
  it('opens the form with the + button, adds a valid proportion as a new segmented button that stays before Manual, surfaces the store error for an invalid one, and removes the custom proportion', () => {
    render(<CanvasDesignerScreen />);

    openCatalogFor('proporción');
    const toggle = screen.getByRole('button', { name: '+ Nueva proporción' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById('custom-entry-form')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Añadir proporción' }));
    expect(screen.getByRole('alert').textContent).toContain('etiqueta');
    expect(useBookStore.getState().customProportions).toHaveLength(0);

    fireEvent.change(screen.getByLabelText('Etiqueta'), { target: { value: '4:5' } });
    fireEvent.change(screen.getByLabelText('Ancho de la razón'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Alto de la razón'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Proporción de prueba' } });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir proporción' }));

    expect(useBookStore.getState().customProportions).toHaveLength(1);
    expect(useBookStore.getState().proportionId).toBe('4:5');
    expect(document.getElementById('custom-entry-form')).toBeNull();

    const proportionGroup = screen.getByRole('group', { name: 'Proporción' });
    const groupButtons = within(proportionGroup).getAllByRole('button');
    expect(groupButtons[groupButtons.length - 1].textContent).toBe('Manual');
    const newButton = within(proportionGroup).getByRole('button', { name: '4:5' });
    expect(newButton.getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('#canvas-designer .field-marginalia')?.textContent).toBe('tuyo');

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(useBookStore.getState().customProportions).toHaveLength(0);
    expect(useBookStore.getState().proportionId).not.toBe('4:5');
  });
});

/**
 * A proportion is keyed by its label, so a factory one cannot be renamed: a
 * patch is a difference recorded against a key, and renaming would move the
 * key. One of your own is replaced outright, so there the label is yours.
 */
describe('Renaming a proportion of your own (R-8)', () => {
  it('offers the label for editing only when the proportion is yours', () => {
    render(<CanvasDesignerScreen />);
    openCatalogFor('proporción');

    // The default selection is a factory proportion.
    expect((screen.getByLabelText('Etiqueta') as HTMLInputElement).readOnly).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: '+ Nueva proporción' }));
    fireEvent.change(screen.getByLabelText('Etiqueta'), { target: { value: '4:5' } });
    fireEvent.change(screen.getByLabelText('Ancho de la razón'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Alto de la razón'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Formato de prueba.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir proporción' }));

    expect((screen.getByLabelText('Etiqueta') as HTMLInputElement).readOnly).toBe(false);
  });

  it('carries the selection to the new label, and applies the new ratio to the page', () => {
    render(<CanvasDesignerScreen />);
    openCatalogFor('proporción');
    fireEvent.click(screen.getByRole('button', { name: '+ Nueva proporción' }));
    fireEvent.change(screen.getByLabelText('Etiqueta'), { target: { value: '4:5' } });
    fireEvent.change(screen.getByLabelText('Ancho de la razón'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Alto de la razón'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Formato de prueba.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir proporción' }));
    expect(useBookStore.getState().proportionId).toBe('4:5');

    fireEvent.change(screen.getByLabelText('Etiqueta'), { target: { value: 'Panorámico' } });
    fireEvent.change(screen.getByLabelText('Ancho de la razón'), { target: { value: '16' } });
    fireEvent.change(screen.getByLabelText('Alto de la razón'), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    const state = useBookStore.getState();
    expect(state.customProportions).toHaveLength(1);
    expect(state.customProportions[0].label).toBe('Panorámico');
    // Not left pointing at a label that no longer exists.
    expect(state.proportionId).toBe('Panorámico');
    expect(state.pageHeight_mm).toBeCloseTo(state.pageWidth_mm * 9 / 16, 6);
    expect(screen.getByRole('button', { name: 'Panorámico' })).toBeTruthy();
  });

  it('refuses a rename onto a factory label and keeps the entry as it was', () => {
    render(<CanvasDesignerScreen />);
    openCatalogFor('proporción');
    fireEvent.click(screen.getByRole('button', { name: '+ Nueva proporción' }));
    fireEvent.change(screen.getByLabelText('Etiqueta'), { target: { value: '4:5' } });
    fireEvent.change(screen.getByLabelText('Ancho de la razón'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Alto de la razón'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Formato de prueba.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir proporción' }));

    fireEvent.change(screen.getByLabelText('Etiqueta'), { target: { value: '2:3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(useBookStore.getState().customProportions[0].label).toBe('4:5');
    expect(useBookStore.getState().proportionId).toBe('4:5');
    expect(screen.getByRole('alert').textContent).toContain('Ya existe');
  });
});

/**
 * The half of "machines or materials" that was missing: until R-10 a print
 * shop that bought a paper the catalog does not list had to edit
 * `public/config/sustratos.json`. This drives the whole flow through the
 * catalog panel, because the store action existing is not the same as the
 * interface reaching it.
 */
describe('Adding a paper from the catalog (R-10)', () => {
  function openPaperCatalog() {
    fireEvent.click(screen.getByRole('button', { name: 'Opciones de papel' }));
  }

  it('adds a paper with its first weight, and the step offers it', () => {
    render(<SubstrateSelectorScreen />);
    openPaperCatalog();

    fireEvent.click(screen.getByRole('button', { name: '+ Nuevo papel' }));
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Verjurado del taller' } });
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Lo compramos a granel.' } });
    fireEvent.change(screen.getByLabelText('Primer gramaje'), { target: { value: '120' } });
    fireEvent.change(screen.getByLabelText('Calibre de ese gramaje'), { target: { value: '160' } });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir papel' }));

    expect(useBookStore.getState().customSubstrates).toHaveLength(1);
    expect(useBookStore.getState().selectedGrammage).toBe(120);

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar catálogo' }));
    const card = document.getElementById(`substrate-${useBookStore.getState().customSubstrates[0].id}`);
    expect(card?.textContent).toContain('Verjurado del taller');
    expect(card?.getAttribute('aria-pressed')).toBe('true');
  });

  /**
   * The two weight fields are asked for once, when the paper is created. A
   * paper with no weights cannot be selected, so it has to have one; offering
   * them again in the edit form would suggest editing the weight list from
   * the wrong place, since that list is right below.
   */
  it('asks for the first weight only while adding', () => {
    render(<SubstrateSelectorScreen />);
    openPaperCatalog();

    expect(screen.queryByLabelText('Primer gramaje')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '+ Nuevo papel' }));
    expect(screen.getByLabelText('Primer gramaje')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByLabelText('Primer gramaje')).toBeNull();
  });

  it('keeps a rejected paper on screen with the store’s reason', () => {
    render(<SubstrateSelectorScreen />);
    openPaperCatalog();

    fireEvent.click(screen.getByRole('button', { name: '+ Nuevo papel' }));
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Bond' } });
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Duplicado.' } });
    fireEvent.change(screen.getByLabelText('Primer gramaje'), { target: { value: '120' } });
    fireEvent.change(screen.getByLabelText('Calibre de ese gramaje'), { target: { value: '160' } });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir papel' }));

    expect(useBookStore.getState().customSubstrates).toHaveLength(0);
    expect(screen.getByRole('alert').textContent).toContain('Ya existe');
    expect((screen.getByLabelText('Nombre') as HTMLInputElement).value).toBe('Bond');
  });

  it('edits a factory paper as a patch and offers to put it back', () => {
    render(<SubstrateSelectorScreen />);
    openPaperCatalog();

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Couché de la casa' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(useBookStore.getState().substratePatches).toEqual([
      { id: 'couche_matte', changes: { name: 'Couché de la casa' } },
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Volver a fábrica' }));
    expect(useBookStore.getState().substratePatches).toHaveLength(0);
  });
});

/**
 * The catalog that needed the form to grow two things: a field that chooses
 * among another catalog's entries, and fields that only apply to some kinds
 * of entry. A soft cover has no boards and a hard one has no flaps, so the
 * form offers the measurements the chosen kind actually uses and no others.
 */
describe('Adding a cover from the catalog (R-11)', () => {
  function openCoverCatalog() {
    fireEvent.click(screen.getByRole('button', { name: 'Opciones de tapa' }));
  }

  it('offers the measurements the chosen kind uses, and hides the rest', () => {
    render(<CoverPanelScreen />);
    openCoverCatalog();
    fireEvent.click(screen.getByRole('button', { name: '+ Nueva tapa' }));

    // A new cover starts soft, which is the first choice offered.
    expect(screen.getByLabelText('Ancho de solapa')).toBeTruthy();
    expect(screen.queryByLabelText('Grosor de cartón')).toBeNull();

    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'dura' } });

    expect(screen.queryByLabelText('Ancho de solapa')).toBeNull();
    expect(screen.getByLabelText('Grosor de cartón')).toBeTruthy();
    expect(screen.getByLabelText('Ceja')).toBeTruthy();
  });

  it('adds a hard cover and the step offers it for a binding that allows one', () => {
    useBookStore.getState().setBinding('hotmelt');
    render(<CoverPanelScreen />);
    openCoverCatalog();
    fireEvent.click(screen.getByRole('button', { name: '+ Nueva tapa' }));

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Dura del taller' } });
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'dura' } });
    fireEvent.change(screen.getByLabelText('Papel de la tapa'), { target: { value: 'cardboard_sulfate' } });
    fireEvent.change(screen.getByLabelText('Gramaje de la tapa'), { target: { value: '300' } });
    fireEvent.change(screen.getByLabelText('Ceja'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Canal de bisagra'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('Doblez de forro'), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText('Grosor de cartón'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir tapa' }));

    expect(useBookStore.getState().customCovers).toHaveLength(1);
    expect(useBookStore.getState().customCovers[0]).toMatchObject({
      name: 'Dura del taller', kind: 'dura', flapWidth_mm: 0, boardThickness_mm: 2,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar catálogo' }));
    const select = screen.getByLabelText('Tipo de tapa') as HTMLSelectElement;
    expect(Array.from(select.options).map(option => option.textContent)).toContain('Dura del taller');
  });

  it('keeps a cover the store refuses on screen, with the reason it gave', () => {
    render(<CoverPanelScreen />);
    openCoverCatalog();
    fireEvent.click(screen.getByRole('button', { name: '+ Nueva tapa' }));

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Imposible' } });
    // A weight the chosen paper does not sell.
    fireEvent.change(screen.getByLabelText('Gramaje de la tapa'), { target: { value: '999' } });
    fireEvent.change(screen.getByLabelText('Ancho de solapa'), { target: { value: '80' } });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir tapa' }));

    expect(useBookStore.getState().customCovers).toHaveLength(0);
    expect(screen.getByRole('alert').textContent).toContain('999 g/m²');
    expect((screen.getByLabelText('Nombre') as HTMLInputElement).value).toBe('Imposible');
  });
});

/**
 * Until R-9 the form edited whatever the book was made of, and the list above
 * it neither let you pick another nor said which one you were looking at. The
 * decision this settles: choosing in the catalog points the form at an entry
 * and leaves the book alone. Opening the catalog to fix a typo in a press
 * nobody is using must not quietly reprint the book on it.
 */
describe('Choosing which entry the catalog edits (R-9)', () => {
  it('points the form at the chosen press without changing the one the book uses', () => {
    render(<ImpositionVisualizerScreen />);
    const usedBefore = useBookStore.getState().pressId;
    openPressCatalog();

    const other = screen.getByRole('button', { name: /^Prensa formato SRA3, / });
    fireEvent.click(other);

    // The form follows.
    expect((screen.getByLabelText('Nombre') as HTMLInputElement).value).toBe('Prensa formato SRA3');
    // The book does not.
    expect(useBookStore.getState().pressId).toBe(usedBefore);
    expect((screen.getByLabelText('Prensa seleccionada') as HTMLSelectElement).value).toBe(usedBefore);
  });

  it('marks the row the form is on, and moves the mark when another is chosen', () => {
    render(<ImpositionVisualizerScreen />);
    openPressCatalog();

    const used = screen.getByRole('button', { name: /^Prensa formato 70×100, / });
    const other = screen.getByRole('button', { name: /^Prensa formato SRA3, / });
    // It opens on the entry the book is made of, so that one is marked.
    expect(used.getAttribute('aria-current')).toBe('true');
    expect(other.getAttribute('aria-current')).toBeNull();

    fireEvent.click(other);

    expect(other.getAttribute('aria-current')).toBe('true');
    expect(used.getAttribute('aria-current')).toBeNull();
  });

  it('edits the chosen entry, not the one in use', () => {
    render(<ImpositionVisualizerScreen />);
    const usedBefore = useBookStore.getState().pressId;
    openPressCatalog();
    fireEvent.click(screen.getByRole('button', { name: /^Prensa formato SRA3, / }));

    fireEvent.change(screen.getByLabelText('Pinza'), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(useBookStore.getState().pressPatches).toEqual([
      { id: 'prensa_sra3', changes: { gripperMargin_mm: 15 } },
    ]);
    // The half the name promises and the assertion above does not make: the
    // press the book is made of is untouched.
    expect(useBookStore.getState().pressId).toBe(usedBefore);
    expect(usedBefore).not.toBe('prensa_sra3');
  });

  it('goes back to the book’s entry when the catalog changes', () => {
    render(<ImpositionVisualizerScreen />);
    openPressCatalog();
    fireEvent.click(screen.getByRole('button', { name: /^Prensa formato SRA3, / }));
    expect((screen.getByLabelText('Nombre') as HTMLInputElement).value).toBe('Prensa formato SRA3');

    fireEvent.click(screen.getByRole('button', { name: /^Pliegos, / }));
    fireEvent.click(screen.getByRole('button', { name: /^Prensas, / }));

    expect((screen.getByLabelText('Nombre') as HTMLInputElement).value).toBe('Prensa formato 70×100');
  });

  /**
   * A key outlives nothing: hiding the entry the form is on takes it out of
   * the list, and the form falls back to the book's entry rather than sitting
   * on something that is no longer there.
   */
  it('falls back to the book’s entry when the one being edited is hidden', () => {
    render(<ImpositionVisualizerScreen />);
    openPressCatalog();
    fireEvent.click(screen.getByRole('button', { name: /^Prensa formato SRA3, / }));
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar' }));

    expect(useBookStore.getState().hiddenPressIds).toEqual(['prensa_sra3']);
    expect((screen.getByLabelText('Nombre') as HTMLInputElement).value).toBe('Prensa formato 70×100');
  });

  it('shows the weights of the paper being edited, not of the one in use', () => {
    render(<SubstrateSelectorScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Opciones de papel' }));

    // Couché Mate, the default, sells five weights; Bond sells three.
    expect(screen.getByRole('heading', { name: /^Gramajes de Couché Mate/ })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /^Bond, 3 gramajes/ }));

    expect(screen.getByRole('heading', { name: /^Gramajes de Bond/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^75 g\/m²/ })).toBeTruthy();
    // And the book is still made of the paper it was made of.
    expect(useBookStore.getState().substrateId).toBe('couche_matte');
  });
});

/**
 * What an independent review of R-9 found. Both were real and both came from
 * the same oversight: R-9 decoupled "the entry being edited" from "the entry
 * the book is made of", and two things were left reading the second.
 */
describe('What the review of the catalog list found', () => {
  it('does not carry a draft typed for one entry onto another', () => {
    render(<ImpositionVisualizerScreen />);
    openPressCatalog();

    // Type a draft for one entry without saving it.
    fireEvent.click(screen.getByRole('button', { name: /^Prensa formato SRA3, / }));
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'A MEDIO ESCRIBIR' } });

    // Then point the form at another.
    fireEvent.click(screen.getByRole('button', { name: /^Prensa formato 70×100, / }));

    // The form was keyed on the book's press, which had not changed, so the
    // draft survived onto the entry chosen next and saving would have written
    // it there.
    expect((screen.getByLabelText('Nombre') as HTMLInputElement).value).toBe('Prensa formato 70×100');
    expect(useBookStore.getState().pressPatches).toEqual([]);
  });

  it('says whether the binding being edited has a flat spine, not the one in use', () => {
    // The book is made of a saddle stitch, which nests and has no flat spine.
    expect(useBookStore.getState().bindingId).toBe('grapa');
    const { container } = render(<BindingPanelScreen />);
    openCatalogFor('encuadernación');
    // Scoped to the catalog: the step itself carries its own note about the
    // binding the book uses, and that one is right either way.
    const panel = container.querySelector('.catalog-content') as HTMLElement;
    expect(within(panel).getByText(/no tiene lomo plano/)).toBeTruthy();

    // Point the form at one that does have a flat spine.
    fireEvent.click(screen.getByRole('button', { name: /^Hotmelt/ }));

    expect(within(panel).queryByText(/no tiene lomo plano/)).toBeNull();
    // And the book is still bound the way it was.
    expect(useBookStore.getState().bindingId).toBe('grapa');
  });
});

describe('Drawn options (R-13)', () => {
  /** The effective proportions, read from the store rather than written here:
   *  what the step must offer is whatever the catalog has, not a list a test
   *  keeps in step with `public/config/formatos.json` by hand. */
  function effectiveProportionLabels(): string[] {
    const state = useBookStore.getState();
    return getAllProportions(
      state.catalog!,
      state.customProportions,
      state.proportionPatches,
      state.hiddenProportionLabels
    ).map(proportion => proportion.label);
  }

  it('offers every proportion the catalog has, and marks exactly one', () => {
    const labels = effectiveProportionLabels();
    // The shipped catalog has five. Until R-13 the step showed three, so a
    // list this long is the point of the assertion, not incidental to it.
    expect(labels.length).toBeGreaterThan(3);

    render(<CanvasDesignerScreen />);
    const group = screen.getByRole('group', { name: 'Proporción' });
    const cards = within(group).getAllByRole('button');

    expect(cards.map(card => card.textContent)).toEqual([...labels, 'Manual']);
    expect(cards.filter(card => card.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
  });

  it('can choose a proportion that did not fit in the segmented control', () => {
    const labels = effectiveProportionLabels();
    const lastLabel = labels[labels.length - 1];
    expect(useBookStore.getState().proportionId).not.toBe(lastLabel);

    render(<CanvasDesignerScreen />);
    const group = screen.getByRole('group', { name: 'Proporción' });
    fireEvent.click(within(group).getByRole('button', { name: lastLabel }));

    expect(useBookStore.getState().proportionId).toBe(lastLabel);
  });

  /**
   * The drawing is the control, so it has to show what choosing it would do.
   * The store applies a ratio to the short side of the orientation in use, so
   * the same 2:3 makes a tall page in vertical and a wide one in landscape,
   * and the two cards must not look alike.
   */
  it('draws each proportion in the orientation currently chosen', () => {
    render(<CanvasDesignerScreen />);
    const group = screen.getByRole('group', { name: 'Proporción' });
    const shapeOf = (label: string) =>
      within(group).getByRole('button', { name: label }).querySelector('.proportion-shape') as HTMLElement;

    const upright = shapeOf('2:3');
    expect(parseFloat(upright.style.height)).toBeGreaterThan(parseFloat(upright.style.width));

    fireEvent.click(screen.getByRole('button', { name: 'Apaisado' }));

    const onItsSide = shapeOf('2:3');
    expect(parseFloat(onItsSide.style.height)).toBeLessThan(parseFloat(onItsSide.style.width));
  });

  /**
   * No control in step 01 has an incompatible option, so the state is proved
   * against the component that defines it. From R-16 on, real controls use it:
   * a binding the page count rules out, a sheet the press cannot hold.
   */
  it('disables an option that cannot be chosen, says why on it, and refuses the click', () => {
    const chosen: string[] = [];
    render(
      <OptionField label="Prueba" id="test-group">
        <OptionCard name="Posible" figure={null} selected={false} onSelect={() => chosen.push('posible')} />
        <OptionCard
          name="Imposible"
          figure={null}
          selected={false}
          disabledReason="no cabe en la prensa"
          onSelect={() => chosen.push('imposible')}
        />
      </OptionField>
    );

    const impossible = screen.getByRole('button', { name: /Imposible/ });
    expect(impossible.hasAttribute('disabled')).toBe(true);
    expect(impossible.textContent).toContain('no cabe en la prensa');

    fireEvent.click(impossible);
    expect(chosen).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'Posible' }));
    expect(chosen).toEqual(['posible']);
  });
});

describe('The weights as a scale (R-15)', () => {
  /** The chosen paper as the catalog declares it, weights and calipers. */
  function chosenPaper() {
    const state = useBookStore.getState();
    const substrate = state.catalog!.substrates.find(item => item.id === state.substrateId);
    if (!substrate) throw new Error(`no hay papel ${state.substrateId} en el catálogo`);
    return substrate;
  }

  function notchHeights(): Map<number, number> {
    const group = screen.getByRole('group', { name: 'Gramaje' });
    const heights = new Map<number, number>();
    for (const notch of within(group).getAllByRole('button')) {
      const grammage = Number(notch.id.split('-').pop());
      const bar = notch.querySelector('.grammage-notch') as HTMLElement;
      heights.set(grammage, parseFloat(bar.style.height));
    }
    return heights;
  }

  it('rebuilds the scale from the weights the chosen paper actually has', () => {
    render(<SubstrateSelectorScreen />);
    expect(useBookStore.getState().substrateId).toBe('couche_matte');
    expect([...notchHeights().keys()]).toEqual(chosenPaper().options.map(option => option.grammage));

    // Bond is sold in three weights, none of them the 150 the book starts on.
    fireEvent.click(screen.getByRole('button', { name: /^Bond/ }));

    expect(useBookStore.getState().substrateId).toBe('bond');
    expect([...notchHeights().keys()]).toEqual(chosenPaper().options.map(option => option.grammage));
  });

  /**
   * The notch is how thick the paper is, and thickness is declared per weight
   * in `sustratos.json` rather than derived from the weight by a factor: the
   * design canvas models it as `weight × factor`, which would throw away the
   * one number a print shop can measure for itself.
   */
  it('draws each notch from the declared caliper, and says that caliper', () => {
    render(<SubstrateSelectorScreen />);

    const heights = notchHeights();
    const declared = chosenPaper().options;

    /*
     * Compared as shares of each range rather than as pixels, so what is
     * asserted is that the caliper is what the height is made of, without
     * restating the arithmetic that turns one into the other. Ordering alone
     * would not do: inside one paper the weights and the calipers rise
     * together, so a notch drawn from the weight would pass an ordering check
     * and still be drawing the wrong quantity.
     */
    const shareOf = (value: number, values: number[]) =>
      (value - Math.min(...values)) / (Math.max(...values) - Math.min(...values));
    const allHeights = [...heights.values()];
    const allCalipers = declared.map(option => option.caliper);

    for (const option of declared) {
      expect(shareOf(heights.get(option.grammage)!, allHeights))
        .toBeCloseTo(shareOf(option.caliper, allCalipers), 6);
    }

    const chosen = declared.find(option => option.grammage === useBookStore.getState().selectedGrammage)!;
    expect(document.querySelector('.caliper-value')?.textContent).toContain(String(chosen.caliper));
  });

  it('marks a weight this shop added, and says so where it is announced', () => {
    render(<SubstrateSelectorScreen />);
    openGrammageCatalog();
    fireEvent.click(screen.getByRole('button', { name: '+ Nuevo gramaje' }));
    const form = document.getElementById('custom-entry-form') as HTMLElement;
    fireEvent.change(within(form).getByLabelText('Gramaje'), { target: { value: '170' } });
    fireEvent.change(within(form).getByLabelText('Calibre declarado'), { target: { value: '140' } });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir gramaje' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar catálogo' }));

    const group = screen.getByRole('group', { name: 'Gramaje' });
    const own = within(group).getByRole('button', { name: '170 g/m², personalizado' });
    expect(own.textContent).toContain('*');
    // And the factory weights keep saying nothing about it.
    expect(within(group).getByRole('button', { name: '150 g/m²' }).textContent).not.toContain('*');
  });
});
