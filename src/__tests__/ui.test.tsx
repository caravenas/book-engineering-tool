import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CanvasDesigner } from '../components/CanvasDesigner';
import { calculateImposition } from '../engine/imposition';
import { ImpositionVisualizer } from '../components/ImpositionVisualizer';
import { SpineCalculator } from '../components/SpineCalculator';
import { SubstrateSelector } from '../components/SubstrateSelector';
import { useBookStore } from '../store/useBookStore';
import { loadShippedCatalog } from './testCatalog';

useBookStore.getState().initialize(loadShippedCatalog());
const initialState = useBookStore.getState();

afterEach(() => {
  cleanup();
  useBookStore.setState(initialState);
});

describe('Honest and recoverable UI', () => {
  it('describes the bounded comparison and announces a partial preview', () => {
    useBookStore.setState({
      bleed_mm: 0,
      impositionResult: calculateImposition(1, 1, 251, 1),
      impositionError: null,
    });

    render(<ImpositionVisualizer />);

    expect(screen.getByRole('heading', { name: 'Aprovechamiento geométrico' })).toBeTruthy();
    expect(screen.getByText(/Compara dos rejillas uniformes/)).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain(
      'Vista previa parcial: se muestran 250 de 251 ubicaciones.'
    );
    expect(screen.getByRole('status').textContent).toContain(
      'Los cálculos conservan el total completo.'
    );
  });

  it('omits unreadable page numbers without hiding placements or totals', () => {
    useBookStore.setState({
      bleed_mm: 0,
      impositionResult: calculateImposition(1, 1, 251, 1),
      impositionError: null,
    });

    const denseLayout = render(<ImpositionVisualizer />);

    expect(denseLayout.container.querySelectorAll('.page-number')).toHaveLength(0);
    expect(denseLayout.container.querySelectorAll('.page-rect')).toHaveLength(250);
    expect(screen.getByText('251')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain(
      'Vista previa parcial: se muestran 250 de 251 ubicaciones.'
    );
    denseLayout.unmount();

    useBookStore.setState({
      bleed_mm: 0,
      impositionResult: calculateImposition(140, 210, 432, 279),
      impositionError: null,
    });

    const normalLayout = render(<ImpositionVisualizer />);

    expect(normalLayout.container.querySelectorAll('.page-number').length).toBeGreaterThan(0);
  });

  it('withholds malformed SVG geometry from injected state', () => {
    useBookStore.setState({
      bleed_mm: 5,
      impositionResult: {
        pagesPerSide: 1,
        cols: 1,
        rows: 1,
        rotated: false,
        wastePercentage: 0,
        usedArea_mm2: 100,
        totalArea_mm2: 100,
        placements: [{ x: 0, y: 0, width: 10, height: 10, rotated: false }],
        previewTruncated: false,
        usesBestOrientation: true,
      },
      impositionError: null,
    });

    const imposition = render(<ImpositionVisualizer />);

    expect(imposition.container.querySelector('.imposition-svg')).toBeNull();
    expect(screen.getByText(/Completa valores válidos para ver la referencia geométrica/)).toBeTruthy();
  });

  it('withholds SVG geometry when transformed bleed insets collapse', () => {
    useBookStore.setState({
      sheetSizeId: 'precision-sheet',
      customSheetSizes: [{
        id: 'precision-sheet',
        name: 'Pliego de precisión',
        width_mm: 1e20,
        height_mm: 1e20,
      }],
      bleed_mm: 3,
      impositionResult: {
        pagesPerSide: 1,
        cols: 1,
        rows: 1,
        rotated: false,
        wastePercentage: 0,
        usedArea_mm2: 4_000_000,
        totalArea_mm2: 1e40,
        placements: [{ x: 1, y: 1, width: 2000, height: 2000, rotated: false }],
        previewTruncated: false,
        usesBestOrientation: true,
      },
      impositionError: null,
    });

    const imposition = render(<ImpositionVisualizer />);

    expect(imposition.container.querySelector('.imposition-svg')).toBeNull();
    expect(screen.getByText(/Completa valores válidos para ver la referencia geométrica/)).toBeTruthy();
  });

  it('exposes independent calculation failures as alerts without zero results', () => {
    useBookStore.setState({
      impositionResult: null,
      impositionError: 'Corrige las dimensiones para recuperar el aprovechamiento geométrico.',
    });
    const layout = render(<ImpositionVisualizer />);

    expect(screen.getByRole('alert').textContent).toContain('Corrige las dimensiones');
    expect(layout.container.textContent).not.toContain('Ubicaciones / cara');
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

    expect(screen.getByLabelText('Rotación')).toBeTruthy();
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
    const originalResult = useBookStore.getState().impositionResult;
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
    expect(useBookStore.getState().sheetSizeId).toBe('tabloide');
    expect(useBookStore.getState().impositionResult).toBe(originalResult);

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
    expect(useBookStore.getState().impositionResult).not.toBeNull();
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

    const sheetsCard = screen.getByRole('group', { name: 'Hojas' });
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
    expect(screen.getByText(/^Fuente: /).textContent).toContain('config/sustratos.json');
    substrateSelector.unmount();

    useBookStore.getState().addCustomGrammage('couche_matte', 999, 100);
    render(<SubstrateSelector />);
    expect(screen.getByText('Fuente: gramaje personalizado')).toBeTruthy();
    expect(screen.queryByText(/config\/sustratos\.json/)).toBeNull();
  });

  it('shows the config source for a shipped sheet size and the custom-source note for a custom one', () => {
    const impositionVisualizer = render(<ImpositionVisualizer />);
    expect(screen.getByText(/^Fuente: /).textContent).toContain('config/pliegos.json');
    impositionVisualizer.unmount();

    useBookStore.getState().addCustomSheetSize('Pliego personalizado', 500, 700);
    render(<ImpositionVisualizer />);
    expect(screen.getByText('Fuente: pliego personalizado')).toBeTruthy();
    expect(screen.queryByText(/config\/pliegos\.json/)).toBeNull();
  });
});
