import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CanvasDesigner } from '../components/CanvasDesigner';
import { ImpositionVisualizer } from '../components/ImpositionVisualizer';
import { SpineCalculator } from '../components/SpineCalculator';
import { BindingPanel } from '../components/BindingPanel';
import { SubstrateSelector } from '../components/SubstrateSelector';
import { CoverPanel } from '../components/CoverPanel';
import { useBookStore } from '../store/useBookStore';
import { loadShippedCatalog } from './testCatalog';

useBookStore.getState().initialize(loadShippedCatalog());
const initialState = useBookStore.getState();

afterEach(() => {
  cleanup();
  useBookStore.setState(initialState);
});

describe('Panel layout (UX-1)', () => {
  it('renders the panel titles in the order laid out in App.tsx', () => {
    const { container } = render(
      <>
        <CanvasDesigner />
        <SubstrateSelector />
        <SpineCalculator />
        <BindingPanel />
        <ImpositionVisualizer />
        <CoverPanel />
      </>
    );

    const titles = Array.from(container.querySelectorAll('.panel-title'))
      .map(title => title.textContent?.trim());

    expect(titles).toEqual([
      'Formato de página',
      'Sustrato (Papel)',
      'Lomo y peso del interior',
      'Encuadernación',
      'Imposición por firmas',
      'Tapa',
    ]);
  });
});

describe('Honest and recoverable UI', () => {
  it('exposes independent calculation failures as alerts without zero results', () => {
    useBookStore.setState({
      signaturePlan: null,
      signatureError: 'Corrige las dimensiones para recuperar la imposición por firmas.',
    });
    const layout = render(<ImpositionVisualizer />);

    expect(screen.getByRole('alert').textContent).toContain('Corrige las dimensiones');
    expect(layout.container.textContent).not.toContain('Páginas / cara del pliego');
    layout.unmount();

    useBookStore.setState({
      spineResult: null,
      spineError: 'Corrige páginas, gramaje y calibre para recuperar las referencias.',
    });
    const spine = render(<SpineCalculator />);

    expect(screen.getByRole('alert').textContent).toContain('Corrige páginas');
    expect(spine.container.textContent).not.toContain('Peso estimado del papel interior');
  });

  it('recovers from finite inputs whose preview geometry overflows or underflows', () => {
    useBookStore.setState({
      pageWidth_mm: 1,
      pageHeight_mm: 1,
      bleed_mm: Number.MAX_VALUE,
    });

    const overflowedCanvas = render(<CanvasDesigner />);

    expect(overflowedCanvas.container.querySelector('.page-preview')).toBeNull();
    expect(screen.getByText(/Introduce dimensiones finitas mayores que cero/)).toBeTruthy();
    for (const input of [
      screen.getByLabelText('Ancho (Cerrado)'),
      screen.getByLabelText('Alto (Cerrado)'),
      screen.getByLabelText('Sangrado (Bleed)'),
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

    const underflowedCanvas = render(<CanvasDesigner />);

    expect(underflowedCanvas.container.querySelector('.page-preview')).toBeNull();
    expect(screen.getByText(/Introduce dimensiones finitas mayores que cero/)).toBeTruthy();
  });

  it('fits the bleed-inclusive preview and preserves a nonzero display value', () => {
    useBookStore.setState({ pageWidth_mm: 140, pageHeight_mm: 210, bleed_mm: 100 });
    const oversizedBleed = render(<CanvasDesigner />);
    const preview = oversizedBleed.container.querySelector('.page-preview') as HTMLDivElement;
    const safeZone = oversizedBleed.container.querySelector('.page-preview .safe-zone') as HTMLDivElement;

    expect(parseFloat(preview.style.width)).toBeLessThanOrEqual(120);
    expect(parseFloat(preview.style.height)).toBeLessThanOrEqual(140);
    expect(parseFloat(safeZone.style.left)).toBeGreaterThan(0);
    expect(parseFloat(safeZone.style.top)).toBeGreaterThan(0);
    expect(parseFloat(safeZone.style.left) + parseFloat(safeZone.style.width))
      .toBeLessThan(parseFloat(preview.style.width));
    expect(parseFloat(safeZone.style.top) + parseFloat(safeZone.style.height))
      .toBeLessThan(parseFloat(preview.style.height));
    oversizedBleed.unmount();

    useBookStore.setState({ pageWidth_mm: 0.04, pageHeight_mm: 0.04, bleed_mm: 0 });
    render(<CanvasDesigner />);

    expect((screen.getByLabelText('Ancho (Cerrado)') as HTMLInputElement).value).toBe('0.04');
  });

  it('provides named groups, labels, and interactive states for modified controls', () => {
    const canvas = render(<CanvasDesigner />);
    const formatGroup = screen.getByRole('group', { name: 'Formato' });
    const verticalButton = within(formatGroup).getByRole('button', { name: 'Vertical' });

    expect(verticalButton.getAttribute('type')).toBe('button');
    expect(verticalButton.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('group', { name: 'Proporción' })).toBeTruthy();
    expect(screen.getByLabelText('Ancho (Cerrado)')).toBeTruthy();
    expect(screen.getByLabelText('Alto (Cerrado)')).toBeTruthy();
    expect(screen.getByLabelText('Sangrado (Bleed)')).toBeTruthy();
    canvas.unmount();

    render(<SubstrateSelector />);
    const grammageGroup = screen.getByRole('group', { name: 'Gramaje' });
    expect(within(grammageGroup).getByRole('button', { name: '150 g/m²' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Añadir gramaje personalizado' }));
    expect(screen.getByLabelText('Gramaje personalizado (g/m²)')).toBeTruthy();
    expect(screen.getByLabelText('Calibre personalizado')).toBeTruthy();
  });

  it('keeps the sheet-size group named and its controls labelled across disclosure states', () => {
    render(<ImpositionVisualizer />);

    expect(screen.getByLabelText('Prensa')).toBeTruthy();
    expect(screen.getByLabelText('Esquema de plegado')).toBeTruthy();
    expect(screen.getByLabelText('Cara mostrada')).toBeTruthy();
    const collapsedGroup = screen.getByRole('group', { name: 'Tamaño del pliego' });
    const sheetSelect = within(collapsedGroup).getByLabelText('Pliego seleccionado');
    const sheetSelectLabel = within(collapsedGroup).getByText('Pliego seleccionado', {
      selector: 'label',
    });
    expect(sheetSelect.id).toBe('select-sheet-size');
    expect(sheetSelectLabel.getAttribute('for')).toBe('select-sheet-size');
    expect(document.getElementById('select-sheet-size')).toBe(sheetSelect);

    const customSheetToggle = within(collapsedGroup).getByRole('button', {
      name: 'Añadir pliego personalizado',
    });
    expect(customSheetToggle.getAttribute('aria-expanded')).toBe('false');
    expect(customSheetToggle.getAttribute('aria-controls')).toBe('custom-sheet-form');

    fireEvent.click(customSheetToggle);

    const expandedGroup = screen.getByRole('group', { name: 'Tamaño del pliego' });
    expect(expandedGroup).toBe(collapsedGroup);
    expect(customSheetToggle.getAttribute('aria-expanded')).toBe('true');
    expect(customSheetToggle.getAttribute('aria-label')).toBe('Cancelar pliego personalizado');
    expect(document.getElementById('custom-sheet-form')).toBeTruthy();
    expect(document.getElementById('select-sheet-size')).toBeNull();
    expect(within(expandedGroup).queryByText('Pliego seleccionado', { selector: 'label' })).toBeNull();
    expect(within(expandedGroup).getByLabelText('Nombre (opcional)')).toBeTruthy();
    expect(within(expandedGroup).getByLabelText('Ancho')).toBeTruthy();
    expect(within(expandedGroup).getByLabelText('Alto')).toBeTruthy();
  });

  it('announces the custom grammage disclosure state and controlled form', () => {
    render(<SubstrateSelector />);

    const customGrammageToggle = screen.getByRole('button', {
      name: 'Añadir gramaje personalizado',
    });
    expect(customGrammageToggle.getAttribute('aria-expanded')).toBe('false');
    expect(customGrammageToggle.getAttribute('aria-controls')).toBe('custom-grammage-form');
    expect(document.getElementById('custom-grammage-form')).toBeNull();

    fireEvent.click(customGrammageToggle);

    expect(customGrammageToggle.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById('custom-grammage-form')).not.toBeNull();

    fireEvent.click(customGrammageToggle);

    expect(customGrammageToggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.getElementById('custom-grammage-form')).toBeNull();
  });

  it('shows a duplicate error and removes a custom grammage through its accessible button', () => {
    useBookStore.setState({
      substrateId: 'couche_matte',
      selectedGrammage: 160,
      customGrammages: [{ substrateId: 'couche_matte', grammage: 160, caliper: 130 }],
      customGrammageError: 'Ya existe el gramaje 160 g para Couché Mate. Introduce otro gramaje o cancela.',
    });

    render(<SubstrateSelector />);

    expect(screen.getByRole('alert').textContent).toContain('Introduce otro gramaje');
    const removeButton = screen.getByRole('button', {
      name: 'Eliminar gramaje personalizado de 160 gramos por metro cuadrado',
    });
    expect(removeButton.getAttribute('type')).toBe('button');
    fireEvent.click(removeButton);

    expect(useBookStore.getState().customGrammages).toEqual([]);
    expect(useBookStore.getState().selectedGrammage).toBe(90);
    expect(screen.queryByRole('button', {
      name: 'Eliminar gramaje personalizado de 160 gramos por metro cuadrado',
    })).toBeNull();
  });

  it('preserves an invalid custom-sheet draft selection and recovers after valid dimensions', () => {
    useBookStore.getState().recalculate();
    render(<ImpositionVisualizer />);

    fireEvent.click(screen.getByRole('button', { name: 'Añadir pliego personalizado' }));
    fireEvent.click(screen.getByRole('button', { name: 'Crear pliego' }));

    expect(screen.getByRole('alert').textContent).toContain('Introduce ancho y alto');
    const widthInput = screen.getByLabelText('Ancho');
    const heightInput = screen.getByLabelText('Alto');
    expect(widthInput.getAttribute('aria-invalid')).toBe('true');
    expect(widthInput.getAttribute('aria-describedby')).toBe('custom-sheet-error');
    expect(heightInput.getAttribute('aria-invalid')).toBe('true');
    expect(heightInput.getAttribute('aria-describedby')).toBe('custom-sheet-error');
    expect(useBookStore.getState().sheetSizeId).toBe('pliego_70x100');

    fireEvent.change(widthInput, { target: { value: '500' } });
    expect(widthInput.getAttribute('aria-invalid')).toBe('false');
    expect(heightInput.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toContain('Introduce ancho y alto');

    fireEvent.change(heightInput, { target: { value: '700' } });
    expect(widthInput.getAttribute('aria-invalid')).toBe('false');
    expect(heightInput.getAttribute('aria-invalid')).toBe('false');
    expect(screen.getByRole('alert').textContent).toContain('Introduce ancho y alto');
    fireEvent.click(screen.getByRole('button', { name: 'Crear pliego' }));

    expect(useBookStore.getState().sheetSizeId).toMatch(/^custom_sheet_/);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('keeps the pages input valid when another spine input causes an error', () => {
    useBookStore.setState({
      totalPages: 32,
      spineResult: null,
      spineError: 'Corrige las dimensiones para recuperar las referencias de lomo y peso.',
    });

    render(<SpineCalculator />);
    const pagesInput = screen.getByRole('spinbutton', { name: 'NÚMERO DE PÁGINAS' });

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

    const spine = render(<SpineCalculator />);
    const text = spine.container.textContent ?? '';

    expect(text).toContain(Number.MAX_VALUE.toExponential());
    expect(text).toContain(`${(Number.MAX_VALUE / 1000).toExponential()} kg`);
    expect(text).not.toContain('Infinity');
    expect(text).not.toContain('NaN');
  });

  it('preserves invalid page-count text while calculations invalidate, then recovers', () => {
    useBookStore.getState().recalculate();
    render(<SpineCalculator />);
    const pagesInput = screen.getByRole('spinbutton', { name: 'NÚMERO DE PÁGINAS' });

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

    const sheetsCard = screen.getByRole('group', { name: 'Hojas de papel (interior)' });
    expect(within(sheetsCard).getByText('17')).toBeTruthy();
    const formulaCopy = screen.getByText((_, element) => (
      element?.tagName === 'P'
      && element.textContent?.includes('Hojas físicas = ⌈33 ÷ 2⌉ = 17 hojas') === true
    ));
    expect(formulaCopy.textContent).toContain('Lomo estimado = 17 hojas × calibre');
    expect(formulaCopy.textContent).toContain('× 17 hojas × 150 g/m²');
  });

  it('shows the config source for a shipped grammage and the custom-source note for a custom one', () => {
    const substrateSelector = render(<SubstrateSelector />);
    expect(screen.getByText('config/sustratos.json')).toBeTruthy();
    expect(screen.getByText('Valores de ejemplo; reemplazar por datos reales de la imprenta.')).toBeTruthy();
    expect(screen.queryByText(/^Fuente: /)).toBeNull();
    substrateSelector.unmount();

    useBookStore.getState().addCustomGrammage('couche_matte', 999, 100);
    render(<SubstrateSelector />);
    expect(screen.getByText('gramaje personalizado')).toBeTruthy();
    expect(screen.queryByText(/config\/sustratos\.json/)).toBeNull();
    expect(screen.queryByText(/^Fuente: /)).toBeNull();
  });

  it('shows the config source for a shipped sheet size and the custom-source note for a custom one', () => {
    const impositionVisualizer = render(<ImpositionVisualizer />);
    expect(screen.getByText('config/pliegos.json')).toBeTruthy();
    expect(impositionVisualizer.container.textContent).toContain('Valores de ejemplo; reemplazar por datos reales de la imprenta.');
    expect(screen.queryByText(/^Fuente: /)).toBeNull();
    impositionVisualizer.unmount();

    useBookStore.getState().addCustomSheetSize('Pliego personalizado', 500, 700);
    render(<ImpositionVisualizer />);
    expect(screen.getByText('pliego personalizado')).toBeTruthy();
    expect(screen.queryByText(/config\/pliegos\.json/)).toBeNull();
    expect(screen.queryByText(/^Fuente: /)).toBeNull();
  });
});

describe('Binding selector', () => {
  it('renders the four shipped methods and switching changes the displayed rules', () => {
    render(<BindingPanel />);
    const select = screen.getByLabelText('Encuadernación seleccionada') as HTMLSelectElement;

    expect(Array.from(select.options).map(option => option.value).sort()).toEqual([
      'cosido', 'grapa', 'hotmelt', 'pur',
    ]);
    expect(select.value).toBe('grapa');
    expect(screen.getByText('Aporte de la encuadernación (mm)').previousSibling?.textContent).toBe('0');

    fireEvent.change(select, { target: { value: 'hotmelt' } });

    expect(useBookStore.getState().bindingId).toBe('hotmelt');
    expect(screen.getByText('Aporte de la encuadernación (mm)').previousSibling?.textContent).toBe('2');
  });

  it('shows an accessible message naming the nearest valid page counts for an invalid count', () => {
    useBookStore.getState().setTotalPages(33); // grapa requires a multiple of 4
    render(<BindingPanel />);

    const message = screen.getByRole('status');
    expect(message.textContent).toContain('32');
    expect(message.textContent).toContain('36');
  });

  it('renders the spine split into interior paper, binding allowance, and total', () => {
    render(<BindingPanel />);

    // grapa nests, so the third figure is labeled as the fold thickness, not a flat spine.
    expect(screen.getByText('Lomo del papel interior (mm)').previousSibling?.textContent).toBe('1.92');
    expect(screen.getByText('Aporte de la encuadernación (mm)').previousSibling?.textContent).toBe('0');
    expect(screen.getByText('Grosor del papel en el pliegue (mm)').previousSibling?.textContent).toBe('1.92');
  });

  it('shows the creep block for grapa and hides it for a method that declares no creep', () => {
    render(<BindingPanel />);

    expect(screen.getByText(/Corrimiento \(creep\)/).textContent).toContain('8 pliegos anidados');
    expect(screen.getByText(/Corrimiento \(creep\)/).textContent).toContain('0.96 mm');

    fireEvent.change(screen.getByLabelText('Encuadernación seleccionada'), { target: { value: 'hotmelt' } });

    expect(screen.queryByText(/Corrimiento \(creep\)/)).toBeNull();
  });

  it('shows the config source note for the binding catalog', () => {
    render(<BindingPanel />);
    expect(screen.getByText('config/encuadernaciones.json')).toBeTruthy();
    expect(screen.getByText('Valores de ejemplo; reemplazar por datos reales de la imprenta.')).toBeTruthy();
    expect(screen.queryByText(/^Fuente: /)).toBeNull();
  });
});

describe('Signature imposition preview', () => {
  it('renders the page numbers of the selected side', () => {
    useBookStore.getState().setSheetSize('pliego_70x100');
    render(<ImpositionVisualizer />);

    expect(useBookStore.getState().signaturePlan?.selected?.scheme.id).toBe('esquema_16pp');
    expect(screen.getByText('16')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
  });

  it("switches to the back's numbers with the side toggle", () => {
    useBookStore.getState().setSheetSize('pliego_70x100');
    render(<ImpositionVisualizer />);

    expect(screen.queryByText('9')).toBeNull();
    fireEvent.change(screen.getByLabelText('Cara mostrada'), { target: { value: 'back' } });
    expect(screen.getByText('9')).toBeTruthy();
    expect(screen.queryByText('16')).toBeNull();
  });

  it('changes the numbers when a different folding scheme is chosen', () => {
    useBookStore.getState().setSheetSize('pliego_70x100');
    render(<ImpositionVisualizer />);
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

    render(<ImpositionVisualizer />);

    expect(screen.getByRole('status').textContent).toContain('Ningún esquema de plegado');
    expect(document.querySelector('.imposition-svg')).toBeNull();
  });

  it('shows the source notes for the press and folding-scheme catalogs', () => {
    render(<ImpositionVisualizer />);

    expect(screen.getByText(/config\/maquinas\.json/)).toBeTruthy();
    expect(screen.getByText(/config\/esquemas\.json/)).toBeTruthy();
  });

  it('names the press-sheet stat apart from the folded, per-4-page sheet used for creep', () => {
    useBookStore.getState().setSheetSize('pliego_70x100');
    render(<ImpositionVisualizer />);

    expect(screen.getByText('Pliegos de prensa por ejemplar')).toBeTruthy();
  });
});

describe('Cover panel', () => {
  it('only offers the two soft covers as selectable with the shipped default (saddle-stitch) binding, and switching changes the displayed measurements', () => {
    render(<CoverPanel />);
    const select = screen.getByLabelText('Tipo de tapa') as HTMLSelectElement;

    expect(Array.from(select.options).map(option => option.value).sort()).toEqual([
      'blanda_simple', 'blanda_solapas',
    ]);
    expect(select.value).toBe('blanda_simple');
    // grapa (the shipped default binding) has no flat spine, so blanda_simple's
    // sheet is 2*0 + 2*140 + 0 + 2*3 = 286.
    expect(screen.getByText('Ancho del pliego de tapa (mm)').previousSibling?.textContent).toBe('286');

    fireEvent.change(select, { target: { value: 'blanda_solapas' } });

    expect(useBookStore.getState().coverId).toBe('blanda_solapas');
    expect(screen.getByText('Ancho del pliego de tapa (mm)').previousSibling?.textContent).not.toBe('286');
  });

  it('offers all three covers as selectable with a flat-spine binding', () => {
    useBookStore.getState().setBinding('hotmelt');
    render(<CoverPanel />);
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
    render(<CoverPanel />);
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
    render(<CoverPanel />);
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
    render(<CoverPanel />);
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
    render(<CoverPanel />);

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
    render(<CoverPanel />);

    expect(useBookStore.getState().coverPlan).toMatchObject({ ok: false, reason: 'binding-has-no-flat-spine' });
    expect(screen.getByText(/no admite una tapa dura/).textContent?.length).toBeGreaterThan(0);
    expect(screen.queryByText('Ancho del cartón lateral (mm)')).toBeNull();
  });

  it('shows the config source note for the cover catalog', () => {
    render(<CoverPanel />);
    expect(screen.getByText(/config\/tapas\.json/)).toBeTruthy();
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
  it('renders the custom-grammage remove button with the class whose ::before overlay grows its tap target', () => {
    useBookStore.setState({
      substrateId: 'couche_matte',
      selectedGrammage: 160,
      customGrammages: [{ substrateId: 'couche_matte', grammage: 160, caliper: 130 }],
    });

    render(<SubstrateSelector />);

    const removeButton = screen.getByRole('button', {
      name: 'Eliminar gramaje personalizado de 160 gramos por metro cuadrado',
    });

    expect(removeButton.className).toContain('remove-grammage-button');
  });

  it('renders the custom-sheet remove button with the class whose ::before overlay grows its tap target', () => {
    useBookStore.getState().recalculate();
    render(<ImpositionVisualizer />);

    fireEvent.click(screen.getByRole('button', { name: 'Añadir pliego personalizado' }));
    fireEvent.change(screen.getByLabelText('Ancho'), { target: { value: '500' } });
    fireEvent.change(screen.getByLabelText('Alto'), { target: { value: '700' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear pliego' }));

    const removeButton = screen.getByRole('button', { name: 'Eliminar pliego personalizado' });

    expect(removeButton.className).toContain('remove-sheet-button');
  });
});

describe('Custom press quick-add (UX-4)', () => {
  it('opens the form with the + button, adds a valid press through the real flow, surfaces the store error for an invalid one, and removes the custom press', () => {
    render(<ImpositionVisualizer />);

    const toggle = screen.getByRole('button', { name: 'Añadir prensa personalizada' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById('custom-press-form')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Prensa de prueba' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear prensa' }));
    expect(screen.getByRole('alert').textContent).toContain('Introduce las medidas de la prensa');
    expect(useBookStore.getState().customPresses).toHaveLength(0);

    fireEvent.change(screen.getByLabelText('Ancho máximo de pliego'), { target: { value: '500' } });
    fireEvent.change(screen.getByLabelText('Alto máximo de pliego'), { target: { value: '700' } });
    fireEvent.change(screen.getByLabelText('Margen de pinza'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Margen de cola'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Margen lateral'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Calle'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear prensa' }));

    const newPressId = useBookStore.getState().pressId;
    expect(newPressId).toMatch(/^custom_press_/);
    expect(useBookStore.getState().customPresses).toHaveLength(1);
    expect(document.getElementById('custom-press-form')).toBeNull();
    const select = screen.getByLabelText('Prensa seleccionada') as HTMLSelectElement;
    expect(select.value).toBe(newPressId);
    expect(screen.getByText('prensa personalizada')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar prensa personalizada' }));
    expect(useBookStore.getState().customPresses).toHaveLength(0);
    expect(useBookStore.getState().pressId).not.toBe(newPressId);
  });
});

describe('Custom binding quick-add (UX-4)', () => {
  it('opens the form with the + button, adds a valid binding through the real flow, surfaces the store error for an invalid one, and removes the custom binding', () => {
    render(<BindingPanel />);

    const toggle = screen.getByRole('button', { name: 'Añadir encuadernación personalizada' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById('custom-binding-form')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Encuadernación de prueba' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear encuadernación' }));
    expect(screen.getByRole('alert').textContent).toContain('múltiplo de páginas');
    expect(useBookStore.getState().customBindings).toHaveLength(0);

    fireEvent.change(screen.getByLabelText('Múltiplo de páginas'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Mínimo de páginas'), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText('Máximo de páginas'), { target: { value: '64' } });
    fireEvent.change(screen.getByLabelText('Aporte al lomo'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear encuadernación' }));

    const newBindingId = useBookStore.getState().bindingId;
    expect(newBindingId).toMatch(/^custom_binding_/);
    expect(useBookStore.getState().customBindings).toHaveLength(1);
    expect(document.getElementById('custom-binding-form')).toBeNull();
    const select = screen.getByLabelText('Encuadernación seleccionada') as HTMLSelectElement;
    expect(select.value).toBe(newBindingId);
    expect(screen.getByText('encuadernación personalizada')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar encuadernación personalizada' }));
    expect(useBookStore.getState().customBindings).toHaveLength(0);
    expect(useBookStore.getState().bindingId).not.toBe(newBindingId);
  });
});

describe('Custom proportion quick-add (UX-4)', () => {
  it('opens the form with the + button, adds a valid proportion as a new segmented button that stays before Manual, surfaces the store error for an invalid one, and removes the custom proportion', () => {
    render(<CanvasDesigner />);

    const toggle = screen.getByRole('button', { name: 'Añadir proporción personalizada' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById('custom-proportion-form')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Crear proporción' }));
    expect(screen.getByRole('alert').textContent).toContain('etiqueta');
    expect(useBookStore.getState().customProportions).toHaveLength(0);

    fireEvent.change(screen.getByLabelText('Etiqueta'), { target: { value: '4:5' } });
    fireEvent.change(screen.getByLabelText('Proporción (ancho)'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Proporción (alto)'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Proporción de prueba' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear proporción' }));

    expect(useBookStore.getState().customProportions).toHaveLength(1);
    expect(useBookStore.getState().proportionId).toBe('4:5');
    expect(document.getElementById('custom-proportion-form')).toBeNull();

    const proportionGroup = screen.getByRole('group', { name: 'Proporción' });
    const groupButtons = within(proportionGroup).getAllByRole('button');
    expect(groupButtons[groupButtons.length - 1].textContent).toBe('Manual');
    const newButton = within(proportionGroup).getByRole('button', { name: '4:5' });
    expect(newButton.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('proporción personalizada')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar proporción personalizada' }));
    expect(useBookStore.getState().customProportions).toHaveLength(0);
    expect(useBookStore.getState().proportionId).not.toBe('4:5');
  });
});
