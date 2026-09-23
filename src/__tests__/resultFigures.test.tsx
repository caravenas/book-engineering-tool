import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ResultFigures } from '../components/ResultFigures';
import { BookHero } from '../components/BookHero';
import { useBookStore } from '../store/useBookStore';
import { loadShippedCatalog } from './testCatalog';

/**
 * R-23 draws six of the results instead of listing them. Three of the six say
 * something the rows they replaced did not, and those three are what is
 * pinned here: a weight that adds the interior to the cover, a spine named
 * for what the method actually makes, and an edge that counts the boards.
 *
 * What is asserted is the text, not the geometry: jsdom lays nothing out, so
 * a drawing's width there is zero whatever the CSS says. The drawings are
 * measured in `e2e/`, which runs in a browser.
 */

useBookStore.getState().initialize(loadShippedCatalog());
const initialState = useBookStore.getState();

afterEach(() => {
  cleanup();
  useBookStore.setState(initialState);
});

/** The big number of a figure, found by the name over it. */
function figureValue(label: string): string {
  const figure = screen.getByText(label).closest('.figure') as HTMLElement;
  return figure.querySelector('.stat-value')?.textContent ?? '';
}

/** The marginalia beside a figure's name. */
function figureAside(label: string): string {
  const figure = screen.getByText(label).closest('.figure') as HTMLElement;
  return figure.querySelector('.figure-aside')?.textContent ?? '';
}

describe('The six drawn figures (R-23)', () => {
  it('weighs the interior and the cover together, and names both addends', () => {
    render(<ResultFigures />);

    const { spineResult, coverPlan } = useBookStore.getState();
    const interior = spineResult?.totalWeight_g ?? 0;
    const cover = coverPlan?.ok ? coverPlan.cover.paperWeight_g : 0;
    expect(interior).toBeGreaterThan(0);
    expect(cover).toBeGreaterThan(0);

    // The figure is the sum, to the tenth of a gram the formatter prints.
    expect(figureValue('Peso del papel por ejemplar')).toBe((Math.round((interior + cover) * 10) / 10).toFixed(1));
    // And it says what it is made of, because a total that hides its parts
    // cannot be checked against a quote.
    expect(figureAside('Peso del papel por ejemplar')).toContain(`interior ${(Math.round(interior * 10) / 10).toFixed(1)} g`);
    expect(figureAside('Peso del papel por ejemplar')).toContain(`tapa ${(Math.round(cover * 10) / 10).toFixed(1)} g`);
  });

  it('says the board is not in the weight when the cover has board', () => {
    render(<ResultFigures />);
    // The shipped default is a soft cover: nothing is left out, so nothing is
    // claimed to be.
    expect(figureAside('Peso del papel por ejemplar')).not.toContain('sin el cartón');
    cleanup();

    useBookStore.getState().setBinding('hotmelt');
    useBookStore.getState().setCover('dura_estandar');
    render(<ResultFigures />);

    expect(figureAside('Peso del papel por ejemplar')).toContain('sin el cartón');
  });

  it('names the spine for what the method actually makes', () => {
    // The shipped default nests its sheets, so there is no flat spine to name.
    render(<ResultFigures />);
    expect(screen.getByText('Grosor del papel en el pliegue')).toBeTruthy();
    expect(screen.queryByText('Lomo final con encuadernación')).toBeNull();
    cleanup();

    useBookStore.getState().setBinding('hotmelt');
    render(<ResultFigures />);

    expect(screen.getByText('Lomo final con encuadernación')).toBeTruthy();
    expect(screen.queryByText('Grosor del papel en el pliegue')).toBeNull();
  });

  it('draws one press sheet per sheet the copy costs', () => {
    const { container } = render(<ResultFigures />);

    const sheets = useBookStore.getState().signaturePlan?.selected?.sheetsPerCopy ?? 0;
    expect(sheets).toBeGreaterThan(0);
    expect(container.querySelectorAll('.sheet-icon')).toHaveLength(sheets);
    expect(figureValue('Pliegos de prensa por ejemplar')).toBe(String(sheets));
  });

  it('draws nothing while the page count is not a number', () => {
    useBookStore.getState().setTotalPagesInput('');
    const { container } = render(<ResultFigures />);

    // Every figure comes from the page count, so an unusable one empties the
    // whole set rather than leaving some of them reporting the last good book.
    expect(container.querySelectorAll('.figure')).toHaveLength(0);
  });
});

describe('The book at scale (R-23)', () => {
  it('counts both boards into the edge it draws, and the spine into neither', () => {
    useBookStore.getState().setBinding('hotmelt');
    useBookStore.getState().setCover('dura_estandar');
    const { container } = render(<BookHero />);

    const { bindingSpine, catalog } = useBookStore.getState();
    const board = catalog?.covers.find(cover => cover.id === 'dura_estandar')?.boardThickness_mm ?? 0;
    expect(board).toBeGreaterThan(0);

    const edge = (bindingSpine?.total_mm ?? 0) + 2 * board;
    const values = [...container.querySelectorAll('.hero-value')].map(node => node.textContent);
    expect(values).toContain(`${edge} mm`);
    // The drawing declares its exaggeration rather than leaving the reader to
    // find that the spine does not match the page beside it.
    expect(container.textContent).toContain('canto ×8');
  });
});
